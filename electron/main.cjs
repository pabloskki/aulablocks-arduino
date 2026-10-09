const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { saveSafely, validateProject, readRecovery } = require('./project-storage.cjs');
const { createArduinoService } = require('./arduino-service.cjs');
const { installCh340Driver } = require('./driver-service.cjs');
const { createUpdaterService } = require('./updater-service.cjs');
const { createSensorUpdatesService } = require('./sensor-updates-service.cjs');

function arduinoRuntimeRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'arduino-runtime');
  }
  if (process.env.AULABLOCKS_ARDUINO_RUNTIME) return path.resolve(process.env.AULABLOCKS_ARDUINO_RUNTIME);
  const folder = process.platform === 'linux' ? 'arduino-cli-linux' : 'arduino-cli';
  return path.join(__dirname, '..', 'tools', folder);
}

async function ensureLinuxRuntimePermissions() {
  if (process.platform !== 'linux') return;
  try {
    const runtimeRoot = arduinoRuntimeRoot();
    const candidates = [path.join(runtimeRoot, 'bin'), path.join(runtimeRoot, 'data', 'packages')];
    for (const candidate of candidates) await makeExecutablesRunnable(candidate);
  } catch (error) {
    console.warn('No se pudieron revisar los permisos de las herramientas Arduino:', error.message);
  }
}

async function makeExecutablesRunnable(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await makeExecutablesRunnable(item);
    } else if (!path.extname(entry.name) || entry.name.endsWith('.sh')) {
      try {
        await fs.chmod(item, 0o755);
      } catch (error) {
        if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
      }
    }
  }
}

function ch340DriverInfPath() {
  const root = app.isPackaged ? path.join(process.resourcesPath, 'drivers', 'ch340-windows') : path.join(__dirname, '..', 'drivers', 'ch340-windows');
  return path.join(root, 'CH341SER.INF');
}

function arduinoService() {
  if (arduinoService.instance) return arduinoService.instance;
  arduinoService.instance = createArduinoService({
    runtimeRoot: arduinoRuntimeRoot(),
    writableRoot: path.join(app.getPath('userData'), 'arduino'),
    platform: process.platform,
    bundleVersion: app.getVersion()
  });
  return arduinoService.instance;
}

let mainWindow = null;
let allowWindowClose = false;

function sensorUpdatesService() {
  if (sensorUpdatesService.instance) return sensorUpdatesService.instance;
  sensorUpdatesService.instance = createSensorUpdatesService({
    listInstalledSensors: () => arduinoService().listSensorCatalog(),
    installSensorPackages: (packages) => arduinoService().installSensorPackages(packages)
  });
  return sensorUpdatesService.instance;
}

function updaterService() {
  if (updaterService.instance) return updaterService.instance;
  updaterService.instance = createUpdaterService({
    platform: process.platform,
    sendToRenderer: (channel, payload) => {
      if (mainWindow && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send(channel, payload);
    }
  });
  return updaterService.instance;
}

function appIconPath() {
  if (app.isPackaged) return undefined;
  return path.join(__dirname, '..', 'build', 'icon.ico');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 680,
    backgroundColor: '#f6f4ff',
    show: false,
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--app-version=${app.getVersion()}`]
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    if (app.isPackaged) setTimeout(() => updaterService().checkForUpdates(), 4000);
  });
  win.on('close', (event) => {
    if (allowWindowClose) return;
    event.preventDefault();
    win.webContents.send('request-app-close');
  });
  mainWindow = win;
}

ipcMain.handle('save-file', async (_event, options) => {
  const result = await dialog.showSaveDialog({
    title: options.title,
    defaultPath: options.defaultPath,
    filters: options.filters
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await saveSafely(result.filePath, options.content);
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('open-file', async (_event, options) => {
  const result = await dialog.showOpenDialog({
    title: options.title,
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options.filters
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  if (options.multiple) {
    const files = [];
    let totalBytes = 0;
    for (const filePath of result.filePaths) {
      const stats = await fs.stat(filePath);
      totalBytes += stats.size;
      if (stats.size > 40 * 1024 * 1024 || totalBytes > 100 * 1024 * 1024) throw new Error('Los paquetes seleccionados superan el límite de tamaño.');
      files.push({ path: filePath, content: await fs.readFile(filePath, 'utf8') });
    }
    return { canceled: false, ...files[0], files };
  }
  const filePath = result.filePaths[0];
  const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : 40 * 1024 * 1024;
  const stats = await fs.stat(filePath);
  if (stats.size > maxBytes) {
    throw new Error(`El archivo es demasiado grande (${Math.round(stats.size / 1024 / 1024)} MB). AulaBlocks admite hasta ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  const content = await fs.readFile(filePath, 'utf8');
  return { canceled: false, path: filePath, content };
});

ipcMain.handle('driver-install-ch340', async () => {
  if (process.platform !== 'win32') return { ok: false, message: 'Esta acción solo está disponible en Windows.' };
  return installCh340Driver(ch340DriverInfPath());
});
ipcMain.handle('arduino-list-ports', async () => arduinoService().listPorts());
ipcMain.handle('sensor-catalog-list', async () => arduinoService().listSensorCatalog());
ipcMain.handle('project-recovery-read', async () => readRecovery(path.join(app.getPath('userData'), 'recovery', 'last.aulablocks')));
ipcMain.handle('project-recovery-save', async (_event, content) => {
  validateProject(content);
  await saveSafely(path.join(app.getPath('userData'), 'recovery', 'last.aulablocks'), content);
  return { ok: true };
});
ipcMain.handle('sensor-package-install', async (_event, sensorPackage) => arduinoService().installSensorPackage(sensorPackage));
ipcMain.handle('sensor-packages-install', async (_event, packages) => arduinoService().installSensorPackages(packages));
ipcMain.handle('serial-monitor-start', async (event, payload) => arduinoService().startSerialMonitor(
  payload,
  (data) => { if (!event.sender.isDestroyed()) event.sender.send('serial-monitor-data', data); },
  (status) => { if (!event.sender.isDestroyed()) event.sender.send('serial-monitor-status', status); }
));
ipcMain.handle('serial-monitor-stop', async () => arduinoService().stopSerialMonitor());
ipcMain.handle('serial-monitor-send', async (_event, value) => arduinoService().sendSerialMonitor(value));

ipcMain.handle('sensor-updates-check', async () => {
  try {
    return { ok: true, updates: await sensorUpdatesService().checkForUpdates() };
  } catch (error) {
    return { ok: false, message: error.message || 'No pudimos revisar actualizaciones de sensores.' };
  }
});
ipcMain.handle('sensor-updates-list-catalog', async () => {
  try {
    return { ok: true, catalog: await sensorUpdatesService().listCatalog() };
  } catch (error) {
    return { ok: false, message: error.message || 'No pudimos leer el catálogo de sensores en línea.' };
  }
});
ipcMain.handle('sensor-updates-install', async (_event, entries) => sensorUpdatesService().installUpdates(entries));

ipcMain.handle('update-check', async () => updaterService().checkForUpdates());
ipcMain.handle('update-confirm-download', async () => updaterService().confirmDownload());
ipcMain.handle('update-install-now', async () => updaterService().installNow());
ipcMain.handle('update-open-releases-page', async () => updaterService().openReleasesPage());

ipcMain.on('app-close-decision', (_event, canClose) => {
  if (!canClose || !mainWindow) return;
  allowWindowClose = true;
  mainWindow.close();
});

ipcMain.handle('arduino-build', async (event, payload) => {
  try {
    return await arduinoService().buildAndMaybeUpload(payload, (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('arduino-progress', progress);
    });
  } catch (error) {
    return {
      ok: false,
      title: payload?.upload ? 'No pudimos cargarlo' : 'No pudimos comprobarlo',
      message: error.message || 'Ocurrió un problema con las herramientas Arduino.',
      details: error.details || ''
    };
  }
});

app.whenReady().then(async () => {
  try {
    await ensureLinuxRuntimePermissions();
  } catch (error) {
    console.warn('Preparación de herramientas Arduino incompleta:', error.message);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  arduinoService.instance?.stopSerialMonitor();
});
