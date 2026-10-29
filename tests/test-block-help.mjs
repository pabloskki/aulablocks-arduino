import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import * as ES from 'blockly/msg/es';
import { registerArduinoBlocks, toolbox } from '../src/blocks.js';
import { blockHelp, installBlockHelp, refreshSensorHelp } from '../src/block-help.js';
import { sensorHelp } from '../tools/sensor-help.mjs';
import { generateSketch, registerExtensionGenerators } from '../src/generator.js';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
import serviceModule from '../electron/arduino-service.cjs';
const B = BM.Workspace ? BM : BM.default;
B.setLocale(ES.default || ES);
const read = async file => JSON.parse(await fs.readFile(new URL('../' + file, import.meta.url), 'utf8'));
const manifest = await read('sensor-catalog/manifest-help.json');
registerArduinoBlocks();

test('el cuadro de ayuda usa texto plano, no HTML del paquete', () => {
  const container = { textContent: '' };
  const tooltip = '<img src=x onerror=alert(1)> Ayuda del sensor';
  B.Tooltip.getCustomTooltip()(container, { tooltip });
  assert.equal(container.textContent, tooltip);
  assert.equal(container.innerHTML, undefined);
});

test('cada bloque del menú y de variables tiene ayuda infantil en Blockly', () => {
  const w = new B.Workspace();
  try {
    const visible = toolbox.contents.flatMap(category => category.contents || []).map(block => block.type);
    for (const type of [...visible, ...Object.keys(blockHelp)]) {
      assert.ok(blockHelp[type], type);
      const block = w.newBlock(type);
      const help = B.Tooltip.getTooltipOfObject(block);
      assert.ok(help.length > 30 && help.length < 350, `${type}: ${help}`);
    }
    const original = B.Blocks.controls_if.init;
    installBlockHelp(B);
    assert.equal(B.Blocks.controls_if.init, original, 'no envolver init dos veces');
  } finally { w.dispose(); }
});

test('las ayudas cambian con mientras/hasta, y/o y temperatura/humedad', () => {
  const w = new B.Workspace();
  try {
    for (const [type, field, values] of [
      ['controls_whileUntil', 'MODE', [['WHILE', /mientras/], ['UNTIL', /hasta/]]],
      ['logic_operation', 'OP', [['AND', /las dos/], ['OR', /al menos una/]]],
      ['dht_read', 'KIND', [['TEMP', /Celsius/], ['HUM', /porcentaje/]]]
    ]) {
      const block = w.newBlock(type);
      for (const [value, pattern] of values) {
        block.setFieldValue(value, field);
        assert.match(B.Tooltip.getTooltipOfObject(block), pattern);
      }
    }
  } finally { w.dispose(); }
});

const functional = sensor => {
  const { version, releaseNotes, ...rest } = structuredClone(sensor);
  rest.blocks = rest.blocks.map(({ tooltip, ...block }) => block);
  return rest;
};
function sketch(sensor) {
  for (const block of sensor.blocks) delete B.Blocks[block.type];
  B.defineBlocksWithJsonArray(sensor.blocks.map(block => ({ ...block,
    previousStatement: block.codeKind === 'expression' || block.output != null ? undefined : null,
    nextStatement: block.codeKind === 'expression' || block.output != null ? undefined : null
  })));
  registerExtensionGenerators(sensor);
  const w = new B.Workspace();
  try {
    const loop = w.newBlock('arduino_loop');
    let connection = loop.getInput('DO').connection;
    for (const definition of sensor.blocks) {
      const block = w.newBlock(definition.type);
      assert.equal(B.Tooltip.getTooltipOfObject(block), definition.tooltip);
      let statement = block;
      if (block.outputConnection) {
        statement = w.newBlock('serial_print');
        statement.getInput('VALUE').connection.connect(block.outputConnection);
      }
      connection.connect(statement.previousConnection);
      connection = statement.nextConnection;
    }
    return generateSketch(w, [sensor]);
  } finally { w.dispose(); }
}

test('11 paquetes: ayudas completas, mismo código generado, bibliotecas, imágenes y pines', async () => {
  assert.equal(manifest.sensors.length, 11);
  const catalog = await read('sensor-catalog.json');
  const types = new Set();
  for (const item of manifest.sensors) {
    const old = await read(item.previousFile), next = await read(item.file);
    assert.deepEqual(functional(next), functional(old));
    assertCompatibleSensor(old, next);
    assert.equal(sketch(old), sketch(next), item.id);
    // This historical manifest remains immutable when a newer sensor is released.
    const current = catalog.sensors.find(sensor => sensor.id === item.id);
    assert.ok(current);
    const fix = (await read('sensor-catalog/manifest-fixes.json')).sensors.find(sensor => sensor.id === item.id);
    assert.equal(current.file, fix?.file || item.file);
    assert.equal((await read(current.file)).id, item.id);
    const bytes = await fs.readFile(new URL('../' + item.file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    for (const block of next.blocks) {
      assert.equal(block.tooltip, sensorHelp[block.type]);
      assert.ok(block.tooltip.length > 30 && block.tooltip.length < 350);
      types.add(block.type);
    }
  }
  assert.equal(types.size, Object.keys(sensorHelp).length);
});

test('actualizar un sensor refresca la ayuda sin cambiar bloques ya colocados', () => {
  const w = new B.Workspace();
  try {
    const block = w.newBlock('serial_print'), text = w.newBlock('text');
    block.getInput('VALUE').connection.connect(text.outputConnection);
    const before = generateSketch(w);
    refreshSensorHelp(w, [{ type: 'serial_print', tooltip: 'Una nueva ayuda.' }]);
    assert.equal(B.Tooltip.getTooltipOfObject(block), 'Una nueva ayuda.');
    assert.equal(B.Tooltip.getTooltipOfObject(text), blockHelp.text);
    assert.equal(generateSketch(w), before);
    assert.equal(block.getInputTargetBlock('VALUE'), text);
  } finally { w.dispose(); }
});

for (const platform of ['win32', 'linux']) {
  test(`paquetes con ayudas se actualizan offline y conservan las bibliotecas (${platform})`, async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-help-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const service = serviceModule.createArduinoService({ runtimeRoot: path.join(directory, 'runtime'), writableRoot: path.join(directory, 'data'), platform });
    await service.installSensorPackages(await Promise.all(manifest.sensors.map(item => read(item.previousFile))));
    const next = await Promise.all(manifest.sensors.map(item => read(item.file)));
    await service.installSensorPackages(next);
    const catalog = await service.listSensorCatalog();
    assert.equal(catalog.length, 11);
    for (const sensor of next) {
      assert.deepEqual(catalog.find(item => item.id === sensor.id).blocks, sensor.blocks);
      for (const library of sensor.bundledLibraries || []) for (const file of library.files) {
        const bytes = await fs.readFile(path.join(directory, 'data/user/libraries', library.folder, file.path));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      }
    }
  });
}
