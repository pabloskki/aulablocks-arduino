const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// Prepare every replacement before calling this function. Keep originals until
// ALL renames succeed, including the catalog and library registry.
async function commitReplacements(entries, io = fs) {
  const journal = [];
  try {
    for (const { source, target } of entries) {
      await io.mkdir(path.dirname(target), { recursive: true });
      const item = { target, backup: target + '.backup-' + crypto.randomUUID(), hadOriginal: false, installed: false };
      journal.push(item);
      try {
        await io.rename(target, item.backup);
        item.hadOriginal = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await io.rename(source, target);
      item.installed = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const item of journal.reverse()) {
      try {
        if (item.installed) await io.rm(item.target, { recursive: true, force: true });
        if (item.hadOriginal) await io.rename(item.backup, item.target);
      } catch (rollbackError) { rollbackErrors.push(item.backup + ': ' + rollbackError.message); }
    }
    if (rollbackErrors.length) error.message += ' Copias de recuperación conservadas: ' + rollbackErrors.join('; ');
    throw error;
  }
  // A failed cleanup must not turn a successful commit into an installation error.
  for (const item of journal) if (item.hadOriginal) await io.rm(item.backup, { recursive: true, force: true }).catch(() => {});
}
module.exports = { commitReplacements };
