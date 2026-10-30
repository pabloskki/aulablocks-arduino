const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const RELEASES_PAGE = 'https://github.com/pabloskki/aulablocks-arduino/releases/latest';

function readPackageType(resourcesPath = process.resourcesPath) {
  if (!resourcesPath) return '';
  try { return fs.readFileSync(path.join(resourcesPath, 'package-type'), 'utf8').trim(); }
  catch { return ''; }
}

function isDebInstallation(execPath = process.execPath, query = execFileSync) {
  try {
    const owner = query('dpkg-query', ['-S', execPath], { encoding: 'utf8', timeout: 3000, windowsHide: true });
    return owner.split(/\r?\n/).includes(`aulablocks-arduino: ${execPath}`);
  } catch { return false; }
}

function createUpdaterService({ platform = process.platform, packageType = readPackageType(), installedDeb, sendToRenderer,
  updater, openExternal = url => require('electron').shell.openExternal(url) }) {
  // electron-updater selects DebUpdater using electron-builder's package marker.
  updater ||= require('electron-updater').autoUpdater;
  const canAutoInstall = platform === 'win32' || (platform === 'linux' && packageType === 'deb' && (installedDeb ?? isDebInstallation()));
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  let lastInfo = null;
  let ready = false;
  let checking = null;
  let downloading = null;
  let installing = false;
  let lastError = null;
  const send = payload => sendToRenderer('update-status', { platform, ...payload });
  const reportError = error => {
    if (lastError === error) return;
    lastError = error;
    const operation = installing ? 'install' : downloading ? 'download' : 'check';
    installing = false;
    send({ state: 'error', operation, message: error?.message || 'No se pudo actualizar AulaBlocks.' });
  };
  updater.on('update-available', info => {
    lastInfo = null;
    if (platform === 'linux' && canAutoInstall && !(info.files || [{ url: info.path }]).some(file =>
      String(file.url || '').split(/[?#]/)[0].toLowerCase().endsWith('.deb'))) {
      reportError(new Error('La actualización no incluye el instalador .deb para Linux Mint. Intenta más tarde.'));
      return;
    }
    lastInfo = info;
    send({ state: 'available', version: info.version, canAutoInstall });
  });
  updater.on('update-not-available', () => send({ state: 'not-available' }));
  updater.on('error', reportError);
  updater.on('download-progress', progress => {
    send({ state: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))) });
  });
  updater.on('update-downloaded', () => { ready = true; send({ state: 'ready' }); });

  async function checkForUpdates({ manual = false } = {}) {
    if (!canAutoInstall) {
      if (manual) send({ state: 'manual' });
      return;
    }
    if (installing || downloading) return;
    if (ready) { send({ state: 'ready' }); return; }
    if (checking) return checking;
    lastError = null;
    checking = Promise.resolve().then(() => updater.checkForUpdates()).catch(reportError).finally(() => { checking = null; });
    return checking;
  }

  async function confirmDownload() {
    if (!canAutoInstall) return openExternal(RELEASES_PAGE);
    if (installing) return;
    if (ready) { send({ state: 'ready' }); return; }
    if (downloading) return downloading;
    if (!lastInfo) { reportError(new Error('Busca actualizaciones antes de descargar.')); return; }
    lastError = null;
    send({ state: 'downloading', percent: 0 });
    downloading = Promise.resolve().then(() => updater.downloadUpdate()).catch(reportError).finally(() => { downloading = null; });
    return downloading;
  }

  async function installNow() {
    if (!canAutoInstall) return openExternal(RELEASES_PAGE);
    if (installing) return;
    if (!ready) { reportError(new Error('La actualización todavía no está descargada y verificada.')); return; }
    lastError = null;
    installing = true;
    send({ state: 'installing' });
    await new Promise(resolve => setImmediate(resolve));
    try { updater.quitAndInstall(false, true); }
    catch (error) { reportError(error); }
  }

  function openReleasesPage() { return openExternal(RELEASES_PAGE); }
  return { checkForUpdates, confirmDownload, installNow, openReleasesPage };
}
module.exports = { createUpdaterService, readPackageType, isDebInstallation };
