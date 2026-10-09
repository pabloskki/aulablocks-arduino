import test from 'node:test';
import assert from 'node:assert/strict';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import * as ES from 'blockly/msg/es';
import { registerArduinoBlocks } from '../src/blocks.js';
import { generateSketch } from '../src/generator.js';
const B = BM.Workspace ? BM : BM.default;
B.setLocale(ES.default || ES);
registerArduinoBlocks();

test('ciclo 1: repetir no oculta variables y cada bucle usa un contador único', () => {
  const w = new B.Workspace();
  const v = w.getVariableMap().createVariable('repetir');
  const loop = w.newBlock('arduino_loop');
  const outer = w.newBlock('controls_repeat_ext');
  const inner = w.newBlock('controls_repeat_ext');
  loop.getInput('DO').connection.connect(outer.previousConnection);
  outer.getInput('DO').connection.connect(inner.previousConnection);
  for (const block of [outer, inner]) {
    const get = w.newBlock('variables_get'); get.setFieldValue(v.getId(), 'VAR');
    block.getInput('TIMES').connection.connect(get.outputConnection);
  }
  const code = generateSketch(w);
  assert.match(code, /float repetir = 0/);
  assert.match(code, /aulablocks_limit_0 = repetir/);
  assert.match(code, /aulablocks_repeat_1/);
  assert.doesNotMatch(code, /int repetir/);
  assert.equal(generateSketch(w), code);
  w.dispose();
});

test('ciclo 1: multiplicación convierte antes de operar, no después', () => {
  const w = new B.Workspace();
  const loop = w.newBlock('arduino_loop'), print = w.newBlock('serial_print'), mul = w.newBlock('math_arithmetic');
  loop.getInput('DO').connection.connect(print.previousConnection);
  print.getInput('VALUE').connection.connect(mul.outputConnection);
  mul.setFieldValue('MULTIPLY', 'OP');
  for (const field of ['A', 'B']) {
    const n = w.newBlock('math_number'); n.setFieldValue(200, 'NUM');
    mul.getInput(field).connection.connect(n.outputConnection);
  }
  assert.ok(generateSketch(w).includes('(static_cast<float>(200) * (200))'));
  w.dispose();
});
