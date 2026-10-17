import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import serviceModule from '../electron/arduino-service.cjs';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'sensor-catalog/manifest-illustrations.json'), 'utf8'));
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const functional = ({ image, version, releaseNotes, ...rest }) => rest;

test('las once ilustraciones preservan íntegros los bloques, pines y bibliotecas', async () => {
  assert.equal(manifest.sensors.length, 11);
  const catalog = await read('sensor-catalog.json');
  for (const item of manifest.sensors) {
    const previous = await read(item.previousFile), next = await read(item.file);
    assert.deepEqual(functional(next), functional(previous));
    assertCompatibleSensor(previous, next);
    assert.equal(next.version, item.version);
    const current = await read(catalog.sensors.find(s => s.id === next.id).file);
    assert.deepEqual(current.image, next.image);
    assert.equal(next.image.mimeType, 'image/jpeg');
    const image = Buffer.from(next.image.data, 'base64');
    assert.ok(image.length > 1000 && image.length <= 700 * 1024);
    assert.equal(image.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, item.file))).digest('hex'), item.sha256);
  }
});

for (const platform of ['win32', 'linux']) {
  test(`actualización offline con imágenes conserva el catálogo y bibliotecas (${platform})`, async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-images-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const service = serviceModule.createArduinoService({ runtimeRoot: path.join(directory, 'empty-runtime'), writableRoot: path.join(directory, 'data'), platform });
    await service.installSensorPackages(await Promise.all(manifest.sensors.map(item => read(item.previousFile))));
    const next = await Promise.all(manifest.sensors.map(item => read(item.file)));
    await service.installSensorPackages(next);
    const catalog = await service.listSensorCatalog();
    assert.equal(catalog.length, 11);
    for (const sensor of next) {
      const installed = catalog.find(item => item.id === sensor.id);
      assert.equal(installed.version, sensor.version);
      assert.deepEqual(installed.image, sensor.image);
      assert.deepEqual(installed.blocks, sensor.blocks);
      for (const library of sensor.bundledLibraries || []) {
        for (const file of library.files) {
          const bytes = await fs.readFile(path.join(directory, 'data/user/libraries', library.folder, file.path));
          assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
        }
      }
    }
  });
}
