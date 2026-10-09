const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { commitReplacements } = require('./file-transaction.cjs');
const queues = new Map();

function saveSafely(target, content, io = fs) {
  const key = path.resolve(target).toLowerCase();
  const task = (queues.get(key) || Promise.resolve()).then(async () => {
    await io.mkdir(path.dirname(target), { recursive: true });
    const temporary = target + '.tmp-' + crypto.randomUUID();
    try {
      await io.writeFile(temporary, content, 'utf8');
      try { await io.copyFile(target, target + '.bak'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await commitReplacements([{ source: temporary, target }], io);
    } finally { await io.rm(temporary, { force: true }).catch(() => {}); }
  });
  const settled = task.catch(() => {});
  queues.set(key, settled);
  settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
  return task;
}

function validateProject(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > 15 * 1024 * 1024) throw new Error('Proyecto demasiado grande para recuperación.');
  const parsed = JSON.parse(content);
  if (parsed.format !== 'aulablocks-project' || !parsed.workspace) throw new Error('Proyecto de recuperación no válido.');
  return parsed;
}

async function readRecovery(file) {
  for (const candidate of [file, file + '.bak']) {
    try {
      const content = await fs.readFile(candidate, 'utf8');
      validateProject(content);
      return { content, date: (await fs.stat(candidate)).mtime.toISOString() };
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError) && !error.message.includes('Proyecto')) throw error;
    }
  }
  return null;
}
module.exports = { saveSafely, validateProject, readRecovery };
