import assert from 'node:assert/strict';
import test from 'node:test';
import * as BlocklyModule from 'blockly/core';
import 'blockly/blocks';
import { registerArduinoBlocks } from '../src/blocks.js';
import { generateSketch } from '../src/generator.js';

const Blockly = BlocklyModule.Workspace ? BlocklyModule : BlocklyModule.default;
registerArduinoBlocks();

test('divide con decimales incluso si ambos operandos son enteros', () => {
  const workspace = arithmeticWorkspace('DIVIDE', 'ADD');
  assert.match(generateSketch(workspace), /static_cast<float>/);
  workspace.dispose();
});

test('un bloque desactivado no deja inicialización ni la de sus hijos', () => {
  const workspace = new Blockly.Workspace();
  const loop = workspace.newBlock('arduino_loop');
  const condition = workspace.newBlock('controls_if');
  loop.getInput('DO').connection.connect(condition.previousConnection);
  const print = workspace.newBlock('serial_print');
  condition.getInput('DO0').connection.connect(print.previousConnection);
  condition.setDisabledReason(true, 'test');
  assert.doesNotMatch(generateSketch(workspace), /Serial/);
  const nextPrint = workspace.newBlock('serial_print');
  condition.nextConnection.connect(nextPrint.previousConnection);
  assert.match(generateSketch(workspace), /Serial.begin/);
  workspace.dispose();
});

test('conserva los paréntesis de una suma dentro de una multiplicación', () => {
  const workspace = arithmeticWorkspace('MULTIPLY', 'ADD');
  const code = generateSketch(workspace);
  assert.ok(code.includes('(static_cast<float>((static_cast<float>(1) + (2))) * (3))'));
});

test('conserva la agrupación a la derecha en restas anidadas', () => {
  const workspace = arithmeticWorkspace('MINUS', 'MINUS', true);
  const code = generateSketch(workspace);
  assert.ok(code.includes('(static_cast<float>(1) - ((static_cast<float>(2) - (3))))'));
});

test('no inicia Serial cuando el monitor no se utiliza', () => {
  const workspace = new Blockly.Workspace();
  workspace.newBlock('arduino_setup');
  workspace.newBlock('arduino_loop');
  assert.doesNotMatch(generateSketch(workspace), /Serial\.begin/);
});

test('inicia Serial cuando existe un bloque mostrar en monitor', () => {
  const workspace = new Blockly.Workspace();
  workspace.newBlock('arduino_setup');
  const loop = workspace.newBlock('arduino_loop');
  const print = workspace.newBlock('serial_print');
  const text = workspace.newBlock('text');
  text.setFieldValue('hola', 'TEXT');
  print.getInput('VALUE').connection.connect(text.outputConnection);
  loop.getInput('DO').connection.connect(print.previousConnection);
  assert.match(generateSketch(workspace), /Serial\.begin\(9600\);/);
});

function arithmeticWorkspace(outerOperator, innerOperator, innerOnRight = false) {
  const workspace = new Blockly.Workspace();
  workspace.newBlock('arduino_setup');
  const loop = workspace.newBlock('arduino_loop');
  const print = workspace.newBlock('serial_print');
  const outer = workspace.newBlock('math_arithmetic');
  const inner = workspace.newBlock('math_arithmetic');
  const one = number(workspace, 1);
  const two = number(workspace, 2);
  const three = number(workspace, 3);
  outer.setFieldValue(outerOperator, 'OP');
  inner.setFieldValue(innerOperator, 'OP');
  if (innerOnRight) {
    outer.getInput('A').connection.connect(one.outputConnection);
    inner.getInput('A').connection.connect(two.outputConnection);
    inner.getInput('B').connection.connect(three.outputConnection);
    outer.getInput('B').connection.connect(inner.outputConnection);
  } else {
    inner.getInput('A').connection.connect(one.outputConnection);
    inner.getInput('B').connection.connect(two.outputConnection);
    outer.getInput('A').connection.connect(inner.outputConnection);
    outer.getInput('B').connection.connect(three.outputConnection);
  }
  print.getInput('VALUE').connection.connect(outer.outputConnection);
  loop.getInput('DO').connection.connect(print.previousConnection);
  return workspace;
}

function number(workspace, value) {
  const block = workspace.newBlock('math_number');
  block.setFieldValue(value, 'NUM');
  return block;
}
