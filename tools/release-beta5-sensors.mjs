// Mechanical release transformation: preserve block shapes and Arduino code.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateSensorTypes } from '../electron/sensor-types.mjs';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, '../../sensores/Windows/para-AulaBlocks-beta.5');
const catalogPath = path.join(root, 'sensor-catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
if (catalog.releaseTarget === '0.10.0-beta.5') throw new Error('Esta entrega ya se generó; no incrementar versiones nuevamente.');
await fs.mkdir(output, { recursive: true });
const records = [];
const prepared = [];
for (const entry of catalog.sensors) {
  const original = JSON.parse(await fs.readFile(path.join(root, entry.file), 'utf8'));
  const next = structuredClone(original);
  const version = next.version.split('.').map(Number);
  version[2]++;
  next.version = version.join('.');
  next.targetAulaBlocksVersion = '0.10.0-beta.5';
  next.releaseNotes = 'Revisión de compatibilidad con beta.5: tipos de bloques explícitos y bibliotecas incluidas verificadas. Mantiene identificadores, conexiones, pines y código Arduino anteriores.';
  for (const block of next.blocks) block.codeKind ||= block.output ? 'expression' : 'statement';
  validateSensorTypes(next);
  assertCompatibleSensor(original, next);
  for (const dependency of next.libraries || []) {
    if (!(next.bundledLibraries || []).some(lib => lib.name === dependency.name && lib.version === dependency.version)) throw new Error('Falta dependencia incluida: ' + dependency.name);
  }
  for (const library of next.bundledLibraries || []) {
    for (const file of library.files) {
      const hash = crypto.createHash('sha256').update(Buffer.from(file.content, file.encoding === 'base64' ? 'base64' : 'utf8')).digest('hex');
      if (file.sha256 && file.sha256.toLowerCase() !== hash) throw new Error('Biblioteca dañada: ' + library.name + '/' + file.path);
      file.sha256 = hash;
    }
  }
  const filename = path.basename(entry.file).replace(original.version + '.aulasensor', next.version + '.aulasensor');
  const content = JSON.stringify(next, null, 2) + '\n';
  prepared.push({ filename, content });
  records.push({ id: next.id, name: next.name, previousFile: entry.file, previousVersion: original.version, version: next.version, file: filename, sha256: crypto.createHash('sha256').update(content).digest('hex') });
  entry.version = next.version;
  entry.file = 'sensor-catalog/' + filename;
}
for (const { filename, content } of prepared) {
  await fs.writeFile(path.join(output, filename), content);
  await fs.writeFile(path.join(root, 'sensor-catalog', filename), content);
}
catalog.updated = '2026-10-07';
catalog.releaseTarget = '0.10.0-beta.5';
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile(path.join(output, 'MANIFIESTO.json'), JSON.stringify({ target: '0.10.0-beta.5', sensors: records }, null, 2) + '\n');
console.log(output);
for (const item of records) console.log(item.name + ': ' + item.previousVersion + ' -> ' + item.version);
