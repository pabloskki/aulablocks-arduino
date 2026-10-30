import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import updaterModule from '../electron/updater-service.cjs';
const { createUpdaterService, readPackageType, isDebInstallation } = updaterModule;
const info = { version: '0.10.5', files: [{ url: 'AulaBlocks-0.10.5-amd64.deb', sha512: 'hash' }] };

function fixture(platform = 'linux', packageType = 'deb', installedDeb = true) {
  const updater = new EventEmitter();
  const events = [], opened = [], installs = [];
  let checks = 0, downloads = 0;
  updater.checkForUpdates = async () => { checks++; updater.emit('update-available', info); };
  updater.downloadUpdate = async () => { downloads++; updater.emit('download-progress', { percent: 49.7 }); updater.emit('update-downloaded', info); };
  updater.quitAndInstall = (...args) => installs.push(args);
  const service = createUpdaterService({ platform, packageType, installedDeb, updater,
    sendToRenderer: (channel, event) => { assert.equal(channel, 'update-status'); events.push(event); },
    openExternal: async url => opened.push(url)
  });
  return { service, updater, events, opened, installs, counts: () => ({ checks, downloads }) };
}

test('Linux .deb y Windows descargan e instalan desde AulaBlocks sin abrir GitHub', async () => {
  for (const platform of ['linux', 'win32']) {
    const f = fixture(platform);
    assert.equal(f.updater.autoDownload, false);
    assert.equal(f.updater.autoInstallOnAppQuit, false);
    await f.service.checkForUpdates({ manual: true });
    assert.equal(f.events.at(-1).canAutoInstall, true);
    await f.service.confirmDownload();
    assert.equal(f.events.at(-1).state, 'ready');
    assert.ok(f.events.some(event => event.state === 'downloading' && event.percent === 50));
    await f.service.installNow();
    assert.deepEqual(f.installs, [[false, true]]);
    assert.deepEqual(f.opened, []);
  }
});

test('no instala antes de una descarga verificada ni duplica operaciones', async () => {
  const f = fixture();
  await f.service.installNow();
  assert.equal(f.installs.length, 0);
  await f.service.confirmDownload();
  assert.equal(f.counts().downloads, 0);
  await Promise.all([f.service.checkForUpdates(), f.service.checkForUpdates()]);
  await Promise.all([f.service.confirmDownload(), f.service.confirmDownload()]);
  assert.deepEqual(f.counts(), { checks: 1, downloads: 1 });
  await Promise.all([f.service.installNow(), f.service.installNow()]);
  assert.equal(f.installs.length, 1);
});

test('una descarga fallida o con hash incorrecto no habilita instalación y permite reintentar', async () => {
  const f = fixture();
  await f.service.checkForUpdates();
  const workingDownload = f.updater.downloadUpdate;
  f.updater.downloadUpdate = async () => {
    const error = new Error('SHA512 no coincide');
    f.updater.emit('error', error); throw error;
  };
  await f.service.confirmDownload();
  assert.equal(f.events.filter(event => event.state === 'error').length, 1);
  assert.ok(!f.events.some(event => event.state === 'ready'));
  await f.service.installNow();
  assert.equal(f.installs.length, 0);
  f.updater.downloadUpdate = workingDownload;
  await f.service.confirmDownload();
  assert.equal(f.events.at(-1).state, 'ready');
});

test('cancelar el permiso de administrador conserva la descarga y permite reintentar', async () => {
  const f = fixture();
  await f.service.checkForUpdates(); await f.service.confirmDownload();
  f.updater.quitAndInstall = () => f.updater.emit('error', new Error('Permiso cancelado'));
  await f.service.installNow();
  assert.equal(f.events.at(-1).state, 'error');
  await f.service.checkForUpdates();
  assert.equal(f.events.at(-1).state, 'ready');
  f.updater.quitAndInstall = (...args) => f.installs.push(args);
  await f.service.installNow();
  assert.equal(f.installs.length, 1);
  assert.deepEqual(f.counts(), { checks: 1, downloads: 1 });
});

test('rechaza metadatos Linux que solo incluyan un archivo portátil', async () => {
  const f = fixture();
  f.updater.checkForUpdates = async () => f.updater.emit('update-available', { version: '0.10.5', files: [{ url: 'app.tar.gz' }] });
  await f.service.checkForUpdates(); await f.service.confirmDownload();
  assert.equal(f.counts().downloads, 0);
  assert.ok(f.events.some(event => event.message?.includes('.deb')));
});

test('copias portátiles no se convierten automáticamente en instalaciones del sistema', async () => {
  const f = fixture('linux', '');
  await f.service.checkForUpdates();
  assert.equal(f.events.length, 0);
  await f.service.checkForUpdates({ manual: true });
  assert.equal(f.events.at(-1).state, 'manual');
  await f.service.confirmDownload();
  assert.equal(f.opened.length, 1);
  assert.deepEqual(f.counts(), { checks: 0, downloads: 0 });
});

test('detecta la marca .deb incluida por el empaquetador', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-package-type-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  assert.equal(readPackageType(root), '');
  await fs.writeFile(path.join(root, 'package-type'), 'deb\n');
  assert.equal(readPackageType(root), 'deb');
});

test('comprueba propiedad del ejecutable en dpkg; una marca .deb en un portátil no basta', async () => {
  const executable = '/opt/AulaBlocks Arduino/aulablocks-arduino';
  assert.equal(isDebInstallation(executable, (command, args, options) => {
    assert.equal(command, 'dpkg-query');
    assert.deepEqual(args, ['-S', executable]);
    assert.equal(options.timeout, 3000);
    return 'aulablocks-arduino: ' + executable + '\n';
  }), true);
  assert.equal(isDebInstallation(executable, () => 'otro-paquete: ' + executable), false);
  assert.equal(isDebInstallation(executable, () => { throw new Error('no encontrado'); }), false);
  const portable = fixture('linux', 'deb', false);
  await portable.service.checkForUpdates({ manual: true });
  assert.equal(portable.events.at(-1).state, 'manual');
  assert.deepEqual(portable.counts(), { checks: 0, downloads: 0 });
});

test('DebUpdater real selecciona el .deb y conserva la verificación SHA512 del proveedor', async () => {
  const require = createRequire(import.meta.url);
  const { DebUpdater } = require('electron-updater/out/DebUpdater');
  const updater = new DebUpdater(null, { version: '0.10.4' });
  const files = ['app.tar.gz', 'app-amd64.deb'].map(file => ({ url: new URL('https://example.com/' + file), info: { url: file, sha512: 'expected-hash' } }));
  let task;
  updater.executeDownload = async options => { task = options; return []; };
  await updater.doDownloadUpdate({ updateInfoAndProvider: { info, provider: { resolveFiles: () => files } } });
  assert.equal(task.fileExtension, 'deb');
  assert.equal(task.fileInfo.url.pathname, '/app-amd64.deb');
  assert.equal(task.fileInfo.info.sha512, 'expected-hash');
});

const main = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const handler = main.slice(main.indexOf('async function handleUpdateStatus('), main.indexOf('\n}', main.indexOf('async function handleUpdateStatus(')) + 2);
function renderer({ pending = false, saveWorks = true, accept = true } = {}) {
  let installed = 0, saved = 0;
  const app = { inert: false };
  const context = vm.createContext({ manualUpdateCheckPending: false, updateDownloadAsked: false,
    hasUnsavedChanges: pending, document: { querySelector: selector => selector === '#app' ? app : {} },
    window: { aulaBlocks: { appVersion: '0.10.4', installUpdateNow: async () => installed++ } },
    askConfirmation: async () => accept, showToast() {}, openModal() {}, console,
    saveProject: async () => { saved++; if (saveWorks) context.hasUnsavedChanges = false; }
  });
  vm.runInContext(handler, context);
  return { app, run: status => { context.status = status; return vm.runInContext('handleUpdateStatus(status)', context); }, counts: () => ({ installed, saved }) };
}

test('impide editar mientras instala y devuelve el control si se cancela el permiso', async () => {
  const r = renderer();
  await r.run({ state: 'installing' });
  assert.equal(r.app.inert, true);
  await r.run({ state: 'error', operation: 'install', message: 'Permiso cancelado' });
  assert.equal(r.app.inert, false);
});

test('antes de instalar guarda cambios y aborta si el guardado falla o se cancela', async () => {
  for (const saveWorks of [true, false]) {
    const r = renderer({ pending: true, saveWorks });
    await r.run({ state: 'ready' });
    assert.deepEqual(r.counts(), { installed: saveWorks ? 1 : 0, saved: 1 });
  }
  const cancelled = renderer({ pending: true, accept: false });
  await cancelled.run({ state: 'ready' });
  assert.deepEqual(cancelled.counts(), { installed: 0, saved: 0 });
});

test('solo una instalación iniciada con éxito permite cerrar sin un segundo diálogo', async () => {
  const source = await fs.readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const start = source.indexOf("nativeAutoUpdater.on('before-quit-for-update'");
  const end = source.indexOf('\n', start);
  const emitter = new EventEmitter();
  const context = vm.createContext({ nativeAutoUpdater: emitter, allowWindowClose: false });
  vm.runInContext(source.slice(start, end), context);
  assert.equal(context.allowWindowClose, false);
  emitter.emit('before-quit-for-update');
  assert.equal(context.allowWindowClose, true);
});
