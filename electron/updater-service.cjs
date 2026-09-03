const { autoUpdater } = require('electron-updater');
const { shell } = require('electron');

const RELEASES_PAGE = 'https://github.com/pabloskki/aulablocks-arduino/releases/latest';

function createUpdaterService({ platform = process.platform, sendToRenderer }) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  let lastInfo = null;

  autoUpdater.on('update-available', (info) => {
    lastInfo = info;
    sendToRenderer('update-status', {
      state: 'available',
      version: info.version,
      canAutoInstall: platform === 'win32'
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-status', { state: 'not-available' });
  });

  autoUpdater.on('error', (error) => {
    sendToRenderer('update-status', { state: 'error', message: error?.message || 'No se pudo revisar actualizaciones.' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-status', { state: 'downloading', percent: Math.round(progress.percent || 0) });
  });

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('update-status', { state: 'ready' });
  });

  async function checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      sendToRenderer('update-status', { state: 'error', message: error?.message || 'No se pudo revisar actualizaciones.' });
    }
  }

  async function confirmDownload() {
    if (platform !== 'win32') {
      await shell.openExternal(RELEASES_PAGE);
      return;
    }
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      sendToRenderer('update-status', { state: 'error', message: error?.message || 'No se pudo descargar la actualización.' });
    }
  }

  function installNow() {
    if (platform !== 'win32') {
      shell.openExternal(RELEASES_PAGE);
      return;
    }
    autoUpdater.quitAndInstall();
  }

  function openReleasesPage() {
    shell.openExternal(RELEASES_PAGE);
  }

  return { checkForUpdates, confirmDownload, installNow, openReleasesPage };
}

module.exports = { createUpdaterService };
