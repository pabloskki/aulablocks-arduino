const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aulaBlocks', {
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openFile: (options) => ipcRenderer.invoke('open-file', options),
  listArduinoPorts: () => ipcRenderer.invoke('arduino-list-ports'),
  installCh340Driver: () => ipcRenderer.invoke('driver-install-ch340'),
  listSensorCatalog: () => ipcRenderer.invoke('sensor-catalog-list'),
  installSensorPackage: (sensorPackage) => ipcRenderer.invoke('sensor-package-install', sensorPackage),
  buildArduino: (options) => ipcRenderer.invoke('arduino-build', options),
  startSerialMonitor: (options) => ipcRenderer.invoke('serial-monitor-start', options),
  stopSerialMonitor: () => ipcRenderer.invoke('serial-monitor-stop'),
  sendSerialMonitor: (value) => ipcRenderer.invoke('serial-monitor-send', value),
  onArduinoProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('arduino-progress', listener);
    return () => ipcRenderer.removeListener('arduino-progress', listener);
  },
  onSerialMonitorData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('serial-monitor-data', listener);
    return () => ipcRenderer.removeListener('serial-monitor-data', listener);
  },
  onSerialMonitorStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('serial-monitor-status', listener);
    return () => ipcRenderer.removeListener('serial-monitor-status', listener);
  },
  onRequestClose: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('request-app-close', listener);
    return () => ipcRenderer.removeListener('request-app-close', listener);
  },
  respondToCloseRequest: (canClose) => ipcRenderer.send('app-close-decision', canClose),
  platform: process.platform
});
