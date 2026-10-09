import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateSensorTypes } from '../electron/sensor-types.mjs';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
import serviceModule from '../electron/arduino-service.cjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const delivery = path.join(root, 'sensor-catalog');
test('los 11 paquetes actualizan los anteriores e incluyen sus bibliotecas sin internet', async t => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-beta5-packages-'));
  t.after(() => fs.rm(temporary, { recursive: true, force: true }));
  // Empty runtime intentionally prevents borrowing any bundled library.
  const service = serviceModule.createArduinoService({ runtimeRoot: path.join(temporary, 'empty-runtime'), writableRoot: path.join(temporary, 'data'), platform: 'win32' });
  const manifest = JSON.parse(await fs.readFile(path.join(delivery, 'manifest-beta.5.json'), 'utf8'));
  assert.equal(manifest.sensors.length, 11);
  const previous = [], updated = [];
  for (const item of manifest.sensors) {
    const content = await fs.readFile(path.join(delivery, item.file));
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'), item.sha256);
    const next = JSON.parse(content), old = JSON.parse(await fs.readFile(path.join(root, item.previousFile), 'utf8'));
    validateSensorTypes(next);
    assertCompatibleSensor(old, next);
    assert.equal(next.version, item.version);
    assert.equal(next.blocks.length, old.blocks.length);
    for (let i = 0; i < old.blocks.length; i++) assert.equal(next.blocks[i].code, old.blocks[i].code);
    previous.push(old); updated.push(next);
  }
  await service.installSensorPackages(previous);
  await service.installSensorPackages(updated);
  const installed = await service.listSensorCatalog();
  assert.equal(installed.length, 11);
  for (const item of updated) {
    assert.equal(installed.find(sensor => sensor.id === item.id).version, item.version);
    for (const lib of item.bundledLibraries || []) {
      for (const file of lib.files) {
        const content = await fs.readFile(path.join(temporary, 'data/user/libraries', lib.folder, file.path));
        assert.equal(crypto.createHash('sha256').update(content).digest('hex'), file.sha256);
      }
    }
  }
});
