import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = {
  'actuador-servo-sg90': 'SG90', 'encoder-motor-tt-hall-12ppr': 'TT-Hall',
  'motor-controlador-tb6612fng': 'TB6612FNG', 'sensor-linea-tcrt5000': 'TCRT5000',
  'sensor-luz-fotoresistencia-ldr': 'LDR', 'sensor-movimiento-hc-sr501': 'HC-SR501',
  'sensor-nfc-pn532-i2c': 'PN532', 'sensor-obstaculos-fc51-flying-fish': 'FC-51',
  'sensor-temperatura-dht11': 'DHT11', 'sensor-temperatura-dht22': 'DHT22',
  'sensor-ultrasonico-hc-sr04': 'HC-SR04'
};
const manifestPath = path.join(root, 'sensor-catalog/manifest-illustrations.json');
try { await fs.access(manifestPath); throw new Error('La entrega ilustrada ya existe.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const catalog = JSON.parse(await fs.readFile(path.join(root, 'sensor-catalog.json'), 'utf8'));
const prepared = [], sensors = [];
for (const entry of catalog.sensors) {
  const previousFile = entry.file;
  const previous = JSON.parse(await fs.readFile(path.join(root, previousFile), 'utf8'));
  const bytes = await fs.readFile(path.join(root, 'assets/sensor-illustrations', assets[entry.id] + '.jpg'));
  if (bytes.length > 700 * 1024) throw new Error('Imagen demasiado grande: ' + entry.id);
  const next = structuredClone(previous);
  const version = previous.version.split('.').map(Number); version[2]++;
  next.version = version.join('.');
  next.image = { mimeType: 'image/jpeg', encoding: 'base64', data: bytes.toString('base64'), alt: 'Ilustración de ' + previous.name };
  next.releaseNotes = 'Imagen ilustrada reconocible incluida para uso sin internet. Sin cambios de bloques, código, pines ni bibliotecas.';
  const file = previousFile.replace(previous.version + '.aulasensor', next.version + '.aulasensor');
  const content = JSON.stringify(next, null, 2) + '\n';
  prepared.push({ file, content });
  sensors.push({ id: next.id, previousFile, file, version: next.version, sha256: createHash('sha256').update(content).digest('hex') });
  entry.file = file; entry.version = next.version;
}
for (const { file, content } of prepared) await fs.writeFile(path.join(root, file), content, { flag: 'wx' });
catalog.updated = '2026-10-16';
await fs.writeFile(path.join(root, 'sensor-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile(manifestPath, JSON.stringify({ target: '0.10.0', sensors }, null, 2) + '\n');
console.log('11 paquetes ilustrados preparados; versiones anteriores conservadas.');
