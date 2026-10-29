import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ultrasonicHelper } from '../src/ultrasonic-code.js';
const root = new URL('../', import.meta.url);
const previousFile = 'sensor-catalog/HC-SR04-1.4.4.aulasensor';
const file = 'sensor-catalog/HC-SR04-1.4.5.aulasensor';
const sensor = JSON.parse(await fs.readFile(new URL(previousFile, root), 'utf8'));
sensor.version = '1.4.5';
sensor.releaseNotes = 'Lecturas con espera máxima de 30 ms y caché por sensor durante 60 ms. Sin eco devuelve NaN. Nuevo bloque para comprobar una lectura válida antes de controlar salidas.';
sensor.codeResources.measure.includes = ['#include <math.h>'];
sensor.codeResources.measure.helpers = [ultrasonicHelper('medirHCSR04_{{TRIG}}_{{ECHO}}', '{{TRIG}}', '{{ECHO}}')];
sensor.codeResources.compare.helpers = [
  'bool hcsr04MasCercaQue_{{TRIG}}_{{ECHO}}(float limite) {\n  float distancia = medirHCSR04_{{TRIG}}_{{ECHO}}();\n  return !isnan(distancia) && distancia > 0 && distancia < limite;\n}'
];
sensor.blocks[0].code = 'medirHCSR04_{{TRIG}}_{{ECHO}}()';
sensor.blocks[0].tooltip = 'Distancia en centímetros. Sin eco devuelve NaN (lectura inválida), nunca 0 cm. Usa «lectura válida» antes de decidir qué hacer con un motor o una bomba. Comparte la medición durante 60 ms.';
sensor.blocks[1].code = 'hcsr04MasCercaQue_{{TRIG}}_{{ECHO}}({{DISTANCE}})';
sensor.blocks[1].tooltip = 'Verdadero solo si hay una lectura válida y el objeto está más cerca del límite. Sin eco devuelve falso. Para detener una bomba o un motor al fallar el sensor, comprueba también «lectura válida».';
sensor.blocks.push({
  ...structuredClone(sensor.blocks[0]),
  type: 'hcsr04_reading_valid', output: 'Boolean',
  message0: 'lectura válida HC-SR04 · TRIG %1 ECHO %2',
  code: '(!isnan(medirHCSR04_{{TRIG}}_{{ECHO}}()))',
  tooltip: 'Verdadero si el sensor recibió eco. Falso si no hay eco o está desconectado. Si es falso, programa la detención de la bomba o del motor. Usa los mismos TRIG y ECHO que en el bloque de distancia.'
});
const content = JSON.stringify(sensor, null, 2) + '\n';
await fs.writeFile(new URL(file, root), content);
const catalogPath = new URL('sensor-catalog.json', root);
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
Object.assign(catalog.sensors.find(item => item.id === sensor.id), { version: sensor.version, file });
catalog.updated = '2026-10-29';
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile(new URL('sensor-catalog/manifest-fixes.json', root), JSON.stringify({
  date: '2026-10-29', sensors: [{ id: sensor.id, previousFile, file, version: sensor.version, sha256: createHash('sha256').update(content).digest('hex') }]
}, null, 2) + '\n');
