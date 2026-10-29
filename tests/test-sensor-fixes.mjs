import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import { registerArduinoBlocks } from '../src/blocks.js';
import { generateSketch, registerExtensionGenerators } from '../src/generator.js';
import { ultrasonicHelper } from '../src/ultrasonic-code.js';
import { findPinIssues } from '../src/pin-validation.js';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
import { validateSensorTypes } from '../electron/sensor-types.mjs';
import serviceModule from '../electron/arduino-service.cjs';

const read = file => JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
const B = BM.Workspace ? BM : BM.default;
const sensor = read('sensor-catalog/HC-SR04-1.4.5.aulasensor');
const block = (type, fields = {}) => ({ type, getFieldValue: name => fields[name] });
registerArduinoBlocks();
B.defineBlocksWithJsonArray(sensor.blocks);
registerExtensionGenerators(sensor);

// Execute the generated scalar C++ algorithm with a mocked clock and echo.
// Only primitive declarations, static storage, float suffixes and uint32 casts
// are adapted; the same unmodified C++ is compiled by compile-all-sensors.mjs.
function simulatedSensor() {
  const state = { now: 0, echo: 1000, calls: 0, timeouts: [] };
  let cpp = ultrasonicHelper('measure', 9, 8);
  const persistent = [];
  cpp = cpp.replace(/  static (?:bool|unsigned long|float) (.*);/g, (_, declaration) => {
    persistent.push('let ' + declaration + ';');
    return '';
  }).replace('float measure()', 'function measure()')
    .replace('(unsigned long)(millis() - ultima)', '((millis() - ultima) >>> 0)')
    .replace('unsigned long duracion', 'let duracion')
    .replace(/(\d+)UL/g, '$1').replace(/(\d+\.\d+)f/g, '$1').replaceAll('NAN', 'NaN');
  const context = vm.createContext({
    millis: () => state.now, NAN: NaN,
    digitalWrite() {}, delayMicroseconds() {}, LOW: 0, HIGH: 1,
    pulseIn(pin, level, timeout) { state.calls++; state.timeouts.push(timeout); return state.echo; }
  });
  vm.runInContext(persistent.join('\n') + '\n' + cpp, context);
  return { state, measure: () => vm.runInContext('measure()', context) };
}

test('ultrasonido: sin eco no significa 0 cm ni objeto cercano', () => {
  const { state, measure } = simulatedSensor();
  state.echo = 0;
  const result = measure();
  assert.ok(Number.isNaN(result));
  assert.equal(result < 10, false);
  assert.equal(result > 10, false);
  assert.equal(!Number.isNaN(result), false);
  assert.deepEqual(state.timeouts, [30000]);
  state.echo = 1000;
  state.now = 60;
  assert.ok(Math.abs(measure() - 17.15) < 0.001);
});

test('ultrasonido: caché evita repetir pulsos, vence a 60 ms y soporta rollover', () => {
  const { state, measure } = simulatedSensor();
  state.now = 0xfffffff0;
  const first = measure();
  state.echo = 2000;
  state.now = 20;
  assert.equal(measure(), first);
  assert.equal(state.calls, 1);
  state.now = 44;
  assert.ok(measure() > first);
  assert.equal(state.calls, 2);
  assert.equal(simulatedSensor().state.calls, 0);
});

test('HC-SR04: actualización compatible, hash correcto y bloque de validez tipado', () => {
  assertCompatibleSensor(read('sensor-catalog/HC-SR04-1.4.4.aulasensor'), sensor);
  validateSensorTypes(sensor);
  const entry = read('sensor-catalog/manifest-fixes.json').sensors[0];
  const bytes = fs.readFileSync(new URL('../' + entry.file, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  assert.equal(read('sensor-catalog.json').sensors.find(item => item.id === sensor.id).file, entry.file);
  assert.equal(sensor.blocks.find(item => item.type === 'hcsr04_reading_valid').output, 'Boolean');
});

test('HC-SR04: una instalación anterior se actualiza sin internet', async t => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'aulablocks-hcsr04-fix-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const service = serviceModule.createArduinoService({ runtimeRoot: path.join(directory, 'empty-runtime'), writableRoot: path.join(directory, 'data'), platform: 'win32' });
  await service.installSensorPackage(read('sensor-catalog/HC-SR04-1.4.4.aulasensor'));
  await service.installSensorPackage(sensor);
  const installed = await service.listSensorCatalog();
  assert.equal(installed.length, 1);
  assert.equal(installed[0].version, '1.4.5');
  assert.ok(installed[0].blocks.some(item => item.type === 'hcsr04_reading_valid'));
});

test('HC-SR04: distancia, comparación y validez comparten caché solo para el mismo par de pines', () => {
  const w = new B.Workspace();
  try {
    const loop = w.newBlock('arduino_loop');
    let previous;
    for (const [type, trig, echo] of [
      ['hcsr04_distance_cm', '9', '8'], ['hcsr04_object_closer_than', '9', '8'],
      ['hcsr04_reading_valid', '9', '8'], ['hcsr04_distance_cm', '7', '6'],
      ['ultrasonic_read', '5', '4']
    ]) {
      const b = w.newBlock(type);
      b.setFieldValue(trig, 'TRIG'); b.setFieldValue(echo, 'ECHO');
      const print = w.newBlock('serial_print');
      print.getInput('VALUE').connection.connect(b.outputConnection);
      (previous ? previous.nextConnection : loop.getInput('DO').connection).connect(print.previousConnection);
      previous = print;
    }
    const code = generateSketch(w, [sensor]);
    assert.equal((code.match(/float medirHCSR04_9_8\(\)/g) || []).length, 1);
    assert.equal((code.match(/pulseIn\(/g) || []).length, 3);
    assert.ok(code.includes('float medirHCSR04_7_6()'));
    assert.ok(code.includes('float medirDistancia_5_4()'));
    assert.ok(!code.includes('delay(200)'));
    assert.ok(!code.includes('{{'));
  } finally { w.dispose(); }
});

test('zumbador: bloquea PWM 3/11 en ambos tableros y permite 5/6', () => {
  const tb = read('sensor-catalog/TB6612FNG-1.0.4.aulasensor');
  for (const board of ['uno', 'nano']) {
    for (const pin of ['3', '11', '5', '6']) {
      const expected = ['3', '11'].includes(pin) ? ['D' + pin] : [];
      for (const output of [block('analog_write', { PIN: pin }), block('tb6612_motor_a', { IN1: '4', IN2: '7', PWM: pin, STBY: '12' })]) {
        const result = findPinIssues([block('buzzer_tone', { PIN: '8' }), output], [tb], board);
        assert.deepEqual(result.toneTimerConflicts, expected);
        assert.equal(result.conflicts.length, 0);
      }
    }
    assert.deepEqual(findPinIssues([block('analog_write', { PIN: '3' })], [], board).toneTimerConflicts, []);
  }
});

test('validación informa el conflicto del zumbador antes de compilar', () => {
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const source = main.slice(main.indexOf('function projectIssue('), main.indexOf('function openModal('));
  const blocks = [block('arduino_setup'), block('arduino_loop'), block('buzzer_tone', { PIN: '8' }), block('analog_write', { PIN: '3' })];
  const context = vm.createContext({ workspace: { getAllBlocks: () => blocks, getTopBlocks: () => blocks.slice(0, 2) },
    assertConnectionTypes() {}, isExecutableBlock: () => true, findPinIssues, extensions: [],
    document: { querySelector: () => ({ value: 'uno' }) }
  });
  assert.match(vm.runInContext(source + ';projectIssue().title', context), /Zumbador/);
});

test('proyectos antiguos: DHT y buses fijos detectan conexiones incompatibles', () => {
  for (const [a, b] of [
    [block('dht_read', { PIN: '2' }), block('digital_write', { PIN: '2' })],
    [block('lcd_print', { ADDRESS: '27' }), block('analog_sensor', { PIN: 'A4' })],
    [block('rfid_card_present', { SS: '10', RST: '9' }), block('digital_write', { PIN: '11' })]
  ]) assert.ok(findPinIssues([a, b], [], 'uno').conflicts.length > 0);
  assert.equal(findPinIssues([block('thermistor_celsius', { PIN: '2' })], [], 'uno').invalid.length, 1);
  assert.equal(findPinIssues([block('pir_motion', { PIN: 'A7' })], [], 'nano').invalid.length, 1);
});

test('proyectos antiguos: bloques del mismo lector/LCD y buses compartidos no generan falsas colisiones', () => {
  const pn = read('sensor-catalog/PN532-I2C-1.7.14.aulasensor');
  const blocks = [block('lcd_print', { ADDRESS: '27' }), block('lcd_clear', { ADDRESS: '27' }), block('pn532_adafruit_uid_any'),
    ...['rfid_card_present', 'rfid_uid_matches', 'rfid_uid_text'].map(type => block(type, { SS: '10', RST: '9' }))];
  assert.equal(findPinIssues(blocks, [pn], 'uno').conflicts.length, 0);
});
