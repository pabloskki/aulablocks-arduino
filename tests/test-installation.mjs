import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import test from 'node:test';
import serviceModule from '../electron/arduino-service.cjs';
import transaction from '../electron/file-transaction.cjs';

function library(version, folder = 'Example') {
  return { name: folder, folder, version, files: [{ path: 'Example.h', encoding: 'utf8', content: version }] };
}
function sensor(id, libraries) {
  return { packageFormat: 'aulablocks-sensor', packageVersion: 1, id, name: id, version: '1.0.0',
    libraries: libraries.map(({ name, version }) => ({ name, version })), bundledLibraries: libraries,
    blocks: [{ type: id + '_read', message0: 'read', code: '1', output: 'Number' }] };
}
async function fixture(t, platform = process.platform) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-install-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, service: serviceModule.createArduinoService({ runtimeRoot: path.join(root, 'runtime'), writableRoot: path.join(root, 'data'), platform }) };
}
test('biblioteca dañada no reemplaza ninguna biblioteca anterior', async (t) => {
  const { root, service } = await fixture(t);
  await service.installSensorPackage(sensor('first', [library('1')]));
  const bad = library('2', 'Second');
  bad.files[0].sha256 = 'invalid';
  await assert.rejects(service.installSensorPackage(sensor('first', [library('2'), bad])), /verificación/);
  assert.equal(await fs.readFile(path.join(root, 'data/user/libraries/Example/Example.h'), 'utf8'), '1');
  assert.equal((await service.listSensorCatalog()).length, 1);
});
test('una actualización no rompe otro consumidor de la biblioteca compartida', async (t) => {
  const { service } = await fixture(t);
  await service.installSensorPackage(sensor('dht11', [library('1')]));
  await service.installSensorPackage(sensor('dht22', [library('1')]));
  await assert.rejects(service.installSensorPackage(sensor('dht11', [library('2')])), /incompatibles/);
});
test('restaura bibliotecas y metadatos si falla el último reemplazo', async (t) => {
  const { root } = await fixture(t);
  const entries = [];
  for (const name of ['library', 'registry', 'catalog']) {
    const source = path.join(root, name + '.new'), target = path.join(root, name);
    await fs.writeFile(source, 'new'); await fs.writeFile(target, 'old');
    entries.push({ source, target });
  }
  const io = { ...fs, rename: async (source, target) => {
    if (source === entries[2].source) throw new Error('simulated failure');
    return fs.rename(source, target);
  } };
  await assert.rejects(transaction.commitReplacements(entries, io), /simulated/);
  for (const entry of entries) assert.equal(await fs.readFile(entry.target, 'utf8'), 'old');
});
test('rechaza carpetas de biblioteca que salen del destino', async (t) => {
  const { service } = await fixture(t);
  for (const folder of ['.', '..', '../escape']) {
    await assert.rejects(service.installSensorPackage(sensor('unsafe', [library('1', folder)])), /válida/);
  }
});

test('Windows detecta conflictos aunque cambien mayúsculas de carpeta', async (t) => {
  const { root, service } = await fixture(t, 'win32');
  await service.installSensorPackage(sensor('first', [library('1')]));
  await assert.rejects(service.installSensorPackage(sensor('second', [library('2', 'example')])), /incompatibles/);
  assert.equal(await fs.readFile(path.join(root, 'data/user/libraries/Example/Example.h'), 'utf8'), '1');
});

test('actualiza juntos los consumidores de una biblioteca compartida', async (t) => {
  const { root, service } = await fixture(t);
  await service.installSensorPackages([sensor('a', [library('1')]), sensor('b', [library('1')])]);
  const result = await service.installSensorPackages([sensor('a', [library('2')]), sensor('b', [library('2')])]);
  assert.equal(result.length, 2);
  assert.equal(await fs.readFile(path.join(root, 'data/user/libraries/Example/Example.h'), 'utf8'), '2');
  await assert.rejects(service.installSensorPackage(sensor('a', [library('3')])), /incompatibles/);
});

test('un lote incompatible o dañado no modifica bibliotecas ni catálogo', async (t) => {
  const { root, service } = await fixture(t);
  await service.installSensorPackages([sensor('a', [library('1')]), sensor('b', [library('1')])]);
  const before = await service.listSensorCatalog();
  await assert.rejects(service.installSensorPackages([sensor('a', [library('2')]), sensor('b', [library('3')])]), /incompatibles/);
  const bad = library('2'); bad.files[0].sha256 = 'bad';
  await assert.rejects(service.installSensorPackages([sensor('a', [library('2')]), sensor('b', [bad])]), /verificación/);
  assert.equal(await fs.readFile(path.join(root, 'data/user/libraries/Example/Example.h'), 'utf8'), '1');
  assert.deepEqual(await service.listSensorCatalog(), before);
});

test('ciclo 3: cambio incompatible conserva biblioteca y catálogo anteriores', async (t) => {
  const { root, service } = await fixture(t);
  const original = sensor('a', [library('1')]);
  await service.installSensorPackage(original);
  const changed = sensor('a', [library('2')]); changed.blocks[0].type = 'a_new';
  await assert.rejects(service.installSensorPackage(changed), /incompatible/);
  assert.equal(await fs.readFile(path.join(root, 'data/user/libraries/Example/Example.h'), 'utf8'), '1');
  assert.equal((await service.listSensorCatalog())[0].blocks[0].type, 'a_read');
});

test('ciclo 3: bloques de otro sensor instalado no pueden sobrescribirse', async (t) => {
  const { service } = await fixture(t);
  await service.installSensorPackage(sensor('a', []));
  const other = sensor('b', []); other.blocks[0].type = 'a_read';
  await assert.rejects(service.installSensorPackage(other), /mismo bloque/);
  assert.equal((await service.listSensorCatalog()).length, 1);
});

test('instalación rechaza un sensor con salida sin tipo sin alterar el catálogo', async (t) => {
  const { service } = await fixture(t);
  const invalid = sensor('untyped', []);
  invalid.blocks[0].codeKind = 'expression';
  delete invalid.blocks[0].output;
  await assert.rejects(service.installSensorPackage(invalid), /salida/);
  assert.equal((await service.listSensorCatalog()).length, 0);
});

test('el runtime anterior permanece si no se puede colocar el nuevo', async (t) => {
  const { root } = await fixture(t);
  const target = path.join(root, 'runtime');
  await fs.mkdir(target);
  await fs.writeFile(path.join(target, 'cli'), 'working');
  await assert.rejects(transaction.commitReplacements([{ source: path.join(root, 'missing'), target }]));
  assert.equal(await fs.readFile(path.join(target, 'cli'), 'utf8'), 'working');
});
