import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import * as ES from 'blockly/msg/es';
import { registerArduinoBlocks } from '../src/blocks.js';
import { generateSketch, registerExtensionGenerators } from '../src/generator.js';
import { findPinIssues } from '../src/pin-validation.js';
import serviceModule from '../electron/arduino-service.cjs';
const B = BM.Workspace ? BM : BM.default;
B.setLocale(ES.default || ES);
registerArduinoBlocks();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-classroom-'));
const service = serviceModule.createArduinoService({ runtimeRoot: path.join(root, 'tools/arduino-cli'), writableRoot: temporary });
const workspace = new B.Workspace();
try {
  const packages = await Promise.all(['DHT22-1.0.1', 'HC-SR04-1.4.1', 'Servo-SG90-1.0.2'].map(async name =>
    JSON.parse(await fs.readFile(path.join(root, 'sensor-catalog', name + '.aulasensor'), 'utf8'))));
  await service.installSensorPackages(packages);
  for (const extension of packages) {
    B.defineBlocksWithJsonArray(extension.blocks.map(block => ({
      ...block, previousStatement: block.output != null ? undefined : null,
      nextStatement: block.output != null ? undefined : null
    })));
    registerExtensionGenerators(extension);
  }
  workspace.newBlock('arduino_setup');
  const loop = workspace.newBlock('arduino_loop');
  let previous = null;
  for (const type of ['dht22_temperature', 'dht22_humidity', 'hcsr04_distance_cm', 'servo_sg90_angle']) {
    const sensor = workspace.newBlock(type);
    for (const [field, pin] of Object.entries(type.startsWith('dht') ? { PIN: '2' } : type.startsWith('hcsr') ? { TRIG: '7', ECHO: '8' } : { PIN: '4', ANGLE: '90' })) sensor.setFieldValue(pin, field);
    let statement = sensor;
    if (sensor.outputConnection) { statement = workspace.newBlock('serial_print'); statement.getInput('VALUE').connection.connect(sensor.outputConnection); }
    (previous ? previous.nextConnection : loop.getInput('DO').connection).connect(statement.previousConnection);
    previous = statement;
  }
  const wait = workspace.newBlock('wait_ms'), time = workspace.newBlock('math_number');
  time.setFieldValue(2000, 'NUM');
  wait.getInput('TIME').connection.connect(time.outputConnection);
  previous.nextConnection.connect(wait.previousConnection);
  const code = generateSketch(workspace, packages);
  for (const board of ['uno', 'nano']) {
    const issues = findPinIssues(workspace.getAllBlocks(false), packages, board);
    if (issues.invalid.length || issues.conflicts.length || issues.timerConflicts.length) throw new Error(JSON.stringify(issues));
    await service.buildAndMaybeUpload({ board, upload: false, projectName: 'aula_dht_ultra_servo', code });
    console.log('DHT22 + HC-SR04 + Servo: ' + board + ' OK');
    await service.buildAndMaybeUpload({
      board, upload: false, projectName: 'arithmetic_regression',
      code: 'static_assert((static_cast<float>(200) * (200)) == 40000.0f, "producto");\nstatic_assert((static_cast<float>(1) / (2)) == 0.5f, "division");\nvoid setup() {}\nvoid loop() {}'
    });
    console.log('Aritmética verificada: ' + board + ' OK');
  }
} finally {
  workspace.dispose();
  await fs.rm(temporary, { recursive: true, force: true });
}
