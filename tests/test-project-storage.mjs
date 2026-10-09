import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import storage from '../electron/project-storage.cjs';
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-storage-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, 'project.aulablocks');
}
test('ciclo 2: guardado conserva la versión anterior y serializa escrituras', async t => {
  const file = await fixture(t);
  await storage.saveSafely(file, 'original');
  await Promise.all([storage.saveSafely(file, 'second'), storage.saveSafely(file, 'third')]);
  assert.equal(await fs.readFile(file, 'utf8'), 'third');
  assert.equal(await fs.readFile(file + '.bak', 'utf8'), 'second');
});
test('ciclo 2: fallo al reemplazar no destruye el proyecto', async t => {
  const file = await fixture(t); await storage.saveSafely(file, 'original');
  const io = { ...fs, rename: async (source, target) => {
    if (source.includes('.tmp-')) throw new Error('Simulated disk failure');
    return fs.rename(source, target);
  } };
  await assert.rejects(storage.saveSafely(file, 'new', io), /Simulated/);
  assert.equal(await fs.readFile(file, 'utf8'), 'original');
});
test('ciclo 2: recuperación usa respaldo si el último archivo está corrupto', async t => {
  const file = await fixture(t);
  const content = JSON.stringify({ format: 'aulablocks-project', workspace: {}, name: 'Recuperable' });
  await storage.saveSafely(file, content);
  await storage.saveSafely(file, '{broken');
  assert.equal((await storage.readRecovery(file)).content, content);
});
