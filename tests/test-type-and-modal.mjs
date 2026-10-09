import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import * as BM from 'blockly/core';
import 'blockly/blocks';
import * as ES from 'blockly/msg/es';
import { AulaConnectionChecker, assertConnectionTypes } from '../src/connection-types.js';
import { validateSensorTypes } from '../electron/sensor-types.mjs';
import { protectModalBackground } from '../src/modal-layer.js';
const B = BM.Workspace ? BM : BM.default;
B.setLocale(ES.default || ES);

test('variables antiguas: impide texto/condiciones pero acepta números', () => {
  const w = new B.Workspace({ plugins: { connectionChecker: AulaConnectionChecker } });
  const v = w.getVariableMap().createVariable('antigua', '');
  const setter = w.newBlock('variables_set'); setter.setFieldValue(v.getId(), 'VAR');
  for (const [type, allowed] of [['text', false], ['logic_boolean', false], ['math_number', true]]) {
    const child = w.newBlock(type);
    assert.equal(w.connectionChecker.canConnect(setter.getInput('VALUE').connection, child.outputConnection, false), allowed);
  }
  w.dispose();
});
test('proyecto antiguo inválido se detecta antes de generar código', () => {
  const w = new B.Workspace();
  const setter = w.newBlock('variables_set'), text = w.newBlock('text');
  setter.getInput('VALUE').connection.connect(text.outputConnection);
  assert.throws(() => assertConnectionTypes(w), /incompatible/);
  w.dispose();
});
test('una variable de texto no se admite como número, y sí como texto', () => {
  const w = new B.Workspace({ plugins: { connectionChecker: AulaConnectionChecker } });
  const v = w.getVariableMap().createVariable('texto', 'String');
  const get = w.newBlock('variables_get_dynamic'); get.setFieldValue(v.getId(), 'VAR');
  const math = w.newBlock('math_arithmetic');
  assert.equal(w.connectionChecker.canConnect(math.getInput('A').connection, get.outputConnection, false), false);
  const setter = w.newBlock('variables_set_dynamic'); setter.setFieldValue(v.getId(), 'VAR');
  assert.equal(w.connectionChecker.canConnect(setter.getInput('VALUE').connection, get.outputConnection, false), true);
  w.dispose();
});
test('los once paquetes declaran tipos válidos', () => {
  const directory = new URL('../sensor-catalog/', import.meta.url);
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.aulasensor'))) {
    assert.doesNotThrow(() => validateSensorTypes(JSON.parse(fs.readFileSync(new URL(file, directory)))));
  }
});
test('rechaza salidas y entradas de sensor sin tipo', () => {
  assert.throws(() => validateSensorTypes({ blocks: [{ type: 'bad', codeKind: 'expression' }] }), /salida/);
  assert.throws(() => validateSensorTypes({ blocks: [{ type: 'bad', args0: [{ type: 'input_value', name: 'VALUE' }] }] }), /entrada/);
  assert.doesNotThrow(() => validateSensorTypes({ blocks: [{ type: 'monitor', args0: [{ type: 'input_value', name: 'VALUE', check: ['Number', 'String', 'Boolean'] }] }] }));
});
test('diálogos bloquean el fondo, trasladan el foco y lo restauran', async () => {
  const dom = new JSDOM('<header class="topbar"><button id="origin">Abrir</button></header><main class="workspace-layout"><button id="toolbox">Inicio</button></main><div class="modal-backdrop hidden"><div role="dialog"><button id="cancel">Cancelar</button></div></div>');
  const d = dom.window.document;
  const origin = d.querySelector('#origin'), layer = d.querySelector('.modal-backdrop'), layout = d.querySelector('main');
  layout.inert = false; origin.focus();
  let hidden = 0;
  const stop = protectModalBackground(d, () => hidden++);
  layer.classList.remove('hidden');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(layout.inert, true);
  assert.equal(d.activeElement.id, 'cancel');
  assert.equal(d.body.classList.contains('app-modal-open'), true);
  assert.equal(hidden, 1);
  d.querySelector('#toolbox').focus();
  assert.equal(d.activeElement.id, 'cancel');
  layer.classList.add('hidden');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(layout.inert, false);
  assert.equal(d.activeElement.id, 'origin');
  stop(); dom.window.close();
});
