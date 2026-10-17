// Actualización mecánica: cambia solo versión, notas y tooltip.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { sensorHelp } from './sensor-help.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'sensor-catalog/manifest-help.json');
try { await fs.access(manifestPath); throw new Error('Esta actualización de ayudas ya existe.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const catalog = JSON.parse(await fs.readFile(path.join(root, 'sensor-catalog.json'), 'utf8'));
const prepared = [], sensors = [], used = new Set();
for (const entry of catalog.sensors) {
  const previousFile = entry.file;
  const next = JSON.parse(await fs.readFile(path.join(root, previousFile), 'utf8'));
  for (const block of next.blocks) {
    if (!sensorHelp[block.type]) throw new Error('Falta ayuda para ' + block.type);
    block.tooltip = sensorHelp[block.type]; used.add(block.type);
  }
  const oldVersion = next.version;
  const version = oldVersion.split('.').map(Number); version[2]++;
  next.version = version.join('.');
  next.releaseNotes = 'Ayudas para niños al pasar el mouse sobre cada bloque: función, resultado y ejemplos. Sin cambios de código Arduino, pines, bibliotecas ni imágenes.';
  const file = previousFile.replace(oldVersion + '.aulasensor', next.version + '.aulasensor');
  const content = JSON.stringify(next, null, 2) + '\n';
  prepared.push({ file, content });
  sensors.push({ id: next.id, previousFile, file, version: next.version, sha256: createHash('sha256').update(content).digest('hex') });
  entry.file = file; entry.version = next.version;
}
for (const type of Object.keys(sensorHelp)) if (!used.has(type)) throw new Error('Ayuda sin bloque: ' + type);
for (const { file, content } of prepared) await fs.writeFile(path.join(root, file), content, { flag: 'wx' });
catalog.updated = '2026-10-17';
catalog.releaseTarget = '0.10.1';
await fs.writeFile(path.join(root, 'sensor-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile(manifestPath, JSON.stringify({ target: '0.10.1', sensors }, null, 2) + '\n');
console.log(`${sensors.length} paquetes preparados con ayudas para ${used.size} bloques.`);
