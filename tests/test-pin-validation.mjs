import assert from 'node:assert/strict';
import test from 'node:test';
import { findPinIssues, normalizePin } from '../src/pin-validation.js';

const block = (type, fields = {}) => ({ type, getFieldValue: (name) => fields[name] });

test('botón y salida no se confunden con un dispositivo único', () => {
  assert.equal(findPinIssues([block('button_pressed', { PIN: '9' }), block('digital_write', { PIN: '9' })], [], 'uno').conflicts.length, 1);
});

test('rechaza pines desconocidos y capacidades incorrectas', () => {
  for (const [type, pin] of [['digital_write', '99'], ['analog_write', '4'], ['analog_read', '2']]) {
    assert.equal(findPinIssues([block(type, { PIN: pin })], [], 'uno').invalid.length, 1);
  }
  assert.equal(findPinIssues([block('digital_write', { PIN: 'A7' })], [], 'nano').invalid.length, 1);
  assert.equal(findPinIssues([block('servo_write', { PIN: '4' })], [], 'uno').invalid.length, 0);
});

test('paquetes antiguos informan una advertencia sin conflicto', () => {
  const result = findPinIssues([block('old')], [{ blocks: [{ type: 'old' }] }], 'uno');
  assert.deepEqual(result, { invalid: [], conflicts: [], unknown: ['old'], timerConflicts: [] });
});
const sensor = {
  id: 'hcsr04', name: 'HC-SR04', blocks: [{
    type: 'distance',
    hardware: { deviceKey: ['TRIG', 'ECHO'], pins: [{ field: 'TRIG', mode: 'digital-output' }, { field: 'ECHO', mode: 'digital-input' }] }
  }]
};

test('detecta dos conexiones distintas en el mismo pin', () => {
  const result = findPinIssues([block('distance', { TRIG: '9', ECHO: '9' })], [sensor], 'uno');
  assert.equal(result.conflicts.length, 1);
});

test('no confunde dos bloques del mismo sensor físico con dos sensores', () => {
  const blocks = [block('distance', { TRIG: '9', ECHO: '8' }), block('distance', { TRIG: '9', ECHO: '8' })];
  assert.equal(findPinIssues(blocks, [sensor], 'uno').conflicts.length, 0);
});

test('permite compartir el bus I2C', () => {
  const i2c = (id, type) => ({ id, name: id, blocks: [{ type, hardware: { deviceKey: [], pins: [{ pin: 'A4', name: 'SDA', mode: 'i2c', sharedBus: 'i2c' }, { pin: 'A5', name: 'SCL', mode: 'i2c', sharedBus: 'i2c' }] } }] });
  const extensions = [i2c('nfc', 'nfc_read'), i2c('display', 'display_write')];
  assert.equal(findPinIssues([block('nfc_read'), block('display_write')], extensions, 'uno').conflicts.length, 0);
});

test('detecta un sensor analógico conectado sobre SDA', () => {
  const i2c = { id: 'nfc', name: 'PN532', blocks: [{ type: 'nfc', hardware: { deviceKey: [], pins: [{ pin: 'A4', name: 'SDA', mode: 'i2c', sharedBus: 'i2c' }] } }] };
  const result = findPinIssues([block('nfc'), block('analog_read', { PIN: 'A4' })], [i2c], 'uno');
  assert.equal(result.conflicts.length, 1);
});

test('valida los pines disponibles según la placa', () => {
  assert.equal(normalizePin('14'), 'A0');
  assert.equal(findPinIssues([block('analog_read', { PIN: 'A7' })], [], 'uno').invalid.length, 1);
  assert.equal(findPinIssues([block('analog_read', { PIN: 'A7' })], [], 'nano').invalid.length, 0);
});
