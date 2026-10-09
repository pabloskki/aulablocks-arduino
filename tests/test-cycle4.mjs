import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { findPinIssues } from '../src/pin-validation.js';
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const block = (type, pin) => ({ type, getFieldValue: () => pin });
test('ciclo 4: Servo externo impide PWM 9/10 pero permite otros pines', () => {
  const servo = JSON.parse(fs.readFileSync(new URL('../sensor-catalog/Servo-SG90-1.0.2.aulasensor', import.meta.url)));
  for (const board of ['uno', 'nano']) {
    for (const pin of ['9', '10']) assert.equal(findPinIssues([block('servo_sg90_angle', '4'), block('analog_write', pin)], [servo], board).timerConflicts.length, 1);
    assert.equal(findPinIssues([block('servo_sg90_angle', '4'), block('analog_write', '5')], [servo], board).timerConflicts.length, 0);
    assert.equal(findPinIssues([block('analog_write', '9')], [servo], board).timerConflicts.length, 0);
  }
});
test('ciclo 4: error de generación no se envía al compilador', async () => {
  const source = main.slice(main.indexOf('async function runArduino('), main.indexOf('function setUploadStatus('));
  let message;
  const context = vm.createContext({
    isBuilding: false, projectIssue: () => null, updateCode: () => false, generationError: 'Recurso ausente',
    document: { querySelector: () => ({ value: 'uno' }) },
    window: { aulaBlocks: { buildArduino: () => assert.fail('No debe compilar') } },
    openModal: (title, detail) => { message = detail; }
  });
  await vm.runInContext(source + ';runArduino(false)', context);
  assert.equal(message, 'Recurso ausente');
});
test('ciclo 4: bloques sueltos desactivados no impiden comprobar', () => {
  const source = main.slice(main.indexOf('function projectIssue('), main.indexOf('function openModal('));
  const starts = [{ type: 'arduino_setup' }, { type: 'arduino_loop' }];
  const context = vm.createContext({
    workspace: { getAllBlocks: () => starts, getTopBlocks: () => [...starts, { type: 'text', disabled: true }] },
    isExecutableBlock: b => !b.disabled, assertConnectionTypes: () => {}, extensions: [],
    document: { querySelector: () => ({ value: 'uno' }) },
    findPinIssues: () => ({ invalid: [], conflicts: [], timerConflicts: [] })
  });
  assert.equal(vm.runInContext(source + ';projectIssue()', context), null);
  starts.push({ type: 'arduino_loop' });
  assert.match(vm.runInContext('projectIssue().title', context), /repetidos/);
});

test('revisión final: cambios durante guardar siguen marcados pendientes', async () => {
  const source = main.slice(main.indexOf('async function saveProject('), main.indexOf('async function openProject('));
  let finishSave, project = { name: 'initial' };
  const context = vm.createContext({
    JSON, currentPath: null, hasUnsavedChanges: true,
    projectData: () => project, fileSafeName: () => 'project',
    document: { querySelector: () => ({ value: 'project' }) },
    saveText: () => new Promise(resolve => { finishSave = resolve; }),
    showToast: () => {}, openModal: () => assert.fail('No debe fallar')
  });
  const pending = vm.runInContext(source + ';saveProject()', context);
  project = { name: 'edited while saving' };
  finishSave({ canceled: false, path: 'project.aulablocks' });
  await pending;
  assert.equal(context.hasUnsavedChanges, true);
});
