import assert from 'node:assert/strict';
import test from 'node:test';
import { exclusiveExtensionTypes, extensionCategoryName, extensionToolboxCategories } from '../src/extension-categories.js';

const sensors = [
  { id: 'ultrasonico', name: 'Sensor ultrasónico HC-SR04', categoryName: 'HC-SR04', colour: '#2477b3', blocks: [{ type: 'hcsr04_distance_cm' }] },
  { id: 'luz', name: 'Fotoresistencia LDR · entrada analógica', categoryName: 'LDR', blocks: [{ type: 'ldr_light_raw' }] },
  { id: 'nfc', name: 'Lector NFC PN532 · I2C', blocks: [{ type: 'pn532_uid_i2c' }] }
];

test('crea una categoría separada por modelo', () => {
  const categories = extensionToolboxCategories(sensors, '#596780');
  assert.deepEqual(categories.map((category) => category.name), ['HC-SR04', 'LDR', 'PN532']);
  assert.deepEqual(categories.map((category) => category.contents[0].type), ['hcsr04_distance_cm', 'ldr_light_raw', 'pn532_uid_i2c']);
  assert.equal(categories.some((category) => category.name === 'Mis sensores'), false);
});

test('extrae el modelo de paquetes antiguos sin categoryName', () => {
  assert.equal(extensionCategoryName({ name: 'Sensor ultrasónico HC-SR04' }), 'HC-SR04');
  assert.equal(extensionCategoryName({ name: 'Fotoresistencia LDR · entrada analógica' }), 'LDR');
});

test('al quitar un sensor conserva tipos compartidos por otro paquete', () => {
  const first = { blocks: [{ type: 'lectura_compartida' }, { type: 'solo_primero' }] };
  const second = { blockTypes: ['lectura_compartida'] };
  assert.deepEqual(exclusiveExtensionTypes(first, [second]), ['solo_primero']);
});
