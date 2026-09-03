const CATALOG_URL = 'https://raw.githubusercontent.com/pabloskki/aulablocks-arduino/main/sensor-catalog.json';

function compareVersions(a, b) {
  const partsA = String(a || '0').split('.').map(Number);
  const partsB = String(b || '0').split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const numberA = partsA[index] || 0;
    const numberB = partsB[index] || 0;
    if (numberA !== numberB) return numberA > numberB ? 1 : -1;
  }
  return 0;
}

function createSensorUpdatesService({ listInstalledSensors, installSensorPackage }) {
  async function checkForUpdates() {
    const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`No se pudo leer el catálogo de sensores (código ${response.status}).`);
    const manifest = await response.json();
    const remoteSensors = Array.isArray(manifest?.sensors) ? manifest.sensors : [];

    const installed = await listInstalledSensors();
    const installedById = new Map(installed.map((item) => [item.id, item]));

    const results = remoteSensors.map((remote) => {
      const local = installedById.get(remote.id);
      const localVersion = local?.version || null;
      const hasUpdate = !localVersion || compareVersions(remote.version, localVersion) > 0;
      return {
        id: remote.id,
        name: remote.name,
        localVersion,
        remoteVersion: remote.version,
        file: remote.file,
        hasUpdate,
        isNew: !localVersion
      };
    });

    return results.filter((item) => item.hasUpdate);
  }

  async function installUpdate(entry) {
    const rawUrl = `https://raw.githubusercontent.com/pabloskki/aulablocks-arduino/main/${entry.file}`;
    const response = await fetch(rawUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`No se pudo descargar ${entry.name} (código ${response.status}).`);
    const sensorPackage = await response.json();
    return installSensorPackage(sensorPackage);
  }

  async function installUpdates(entries) {
    const results = [];
    for (const entry of entries) {
      try {
        await installUpdate(entry);
        results.push({ id: entry.id, name: entry.name, ok: true });
      } catch (error) {
        results.push({ id: entry.id, name: entry.name, ok: false, message: error.message });
      }
    }
    return results;
  }

  return { checkForUpdates, installUpdates };
}

module.exports = { createSensorUpdatesService, compareVersions };
