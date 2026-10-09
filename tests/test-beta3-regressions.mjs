import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { findPinIssues } from '../src/pin-validation.js';
import updatesModule from '../electron/sensor-updates-service.cjs';

test('PWM y salida digital comparten pin sin permitir colisión con una entrada', () => {
  const block = type => ({ type, getFieldValue: () => '9' });
  assert.equal(findPinIssues([block('analog_write'), block('digital_write')], [], 'uno').conflicts.length, 0);
  assert.ok(findPinIssues([block('analog_write'), block('button_pressed')], [], 'uno').conflicts.length);
});

test('monitor muestra fragmentos sin salto de línea y limita su tamaño', () => {
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const source = main.slice(main.indexOf('function appendSerialData('), main.indexOf('function clearSerialMonitor('));
  const elements = {};
  const context = vm.createContext({ document: { querySelector: id => elements[id] ||= { textContent: '', scrollHeight: 0 } } });
  vm.runInContext("let serialLines=[]; let serialPending='';" + source, context);
  vm.runInContext("appendSerialData('Buscando...');", context);
  assert.equal(elements['#serial-monitor-log'].textContent, 'Buscando...');
  vm.runInContext("appendSerialData(' tarjeta\\n');", context);
  assert.equal(elements['#serial-monitor-log'].textContent, 'Buscando... tarjeta');
  vm.runInContext("appendSerialData('x'.repeat(10000));", context);
  assert.equal(vm.runInContext('serialPending.length', context), 4000);
});

test('cerrar espera confirmación y nunca programa cierre por tiempo', () => {
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const source = main.slice(main.indexOf("win.on('close'"), main.indexOf('  mainWindow = win;'));
  let handler, prevented = false, requested = false;
  vm.runInNewContext(source, {
    allowWindowClose: false,
    win: { on: (_, fn) => { handler = fn; }, webContents: { send: () => { requested = true; } }, close: () => assert.fail('Cierre sin permiso') },
    setTimeout: () => assert.fail('No debe existir cierre automático')
  });
  handler({ preventDefault: () => { prevented = true; } });
  assert.ok(prevented && requested);
});

test('actualizador descarga todos los paquetes antes de instalar el lote', async (t) => {
  const entries = [{ id: 'a', name: 'a', file: 'a.json' }, { id: 'b', name: 'b', file: 'b.json' }];
  let calls = 0, batch;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ id: entries[calls++].id }) }));
  const service = updatesModule.createSensorUpdatesService({
    listInstalledSensors: async () => [],
    installSensorPackages: async packages => { assert.equal(calls, 2); batch = packages; return packages.map(extension => ({ extension })); }
  });
  assert.ok((await service.installUpdates(entries)).every(item => item.ok));
  assert.equal(batch.length, 2);
});

test('una descarga fallida no instala una parte del lote', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Sin conexión'); });
  const service = updatesModule.createSensorUpdatesService({
    listInstalledSensors: async () => [],
    installSensorPackages: async () => assert.fail('No debe instalar nada')
  });
  assert.equal((await service.installUpdates([{ id: 'a', file: 'a' }]))[0].ok, false);
});
