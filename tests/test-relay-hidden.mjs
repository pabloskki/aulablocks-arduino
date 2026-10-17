import test from 'node:test';
import assert from 'node:assert/strict';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import { registerArduinoBlocks, toolbox } from '../src/blocks.js';
import { generateSketch } from '../src/generator.js';

const B = BM.Workspace ? BM : BM.default;
registerArduinoBlocks();

test('el relé no se ofrece en el menú de bloques', () => {
  assert.ok(!JSON.stringify(toolbox).includes('relay_set'));
});

test('los proyectos anteriores conservan sus bloques de relé al abrirlos', () => {
  const original = new B.Workspace();
  const restored = new B.Workspace();
  try {
    const loop = original.newBlock('arduino_loop');
    const relay = original.newBlock('relay_set');
    relay.setFieldValue('2', 'PIN');
    relay.setFieldValue('ON', 'STATE');
    loop.getInput('DO').connection.connect(relay.previousConnection);
    const code = generateSketch(original);
    B.serialization.workspaces.load(B.serialization.workspaces.save(original), restored);
    assert.equal(restored.getBlocksByType('relay_set', false).length, 1);
    assert.equal(generateSketch(restored), code);
    assert.match(code, /digitalWrite\(2, LOW\)/);
  } finally {
    original.dispose();
    restored.dispose();
  }
});
