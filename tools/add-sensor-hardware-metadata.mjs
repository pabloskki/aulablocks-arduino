import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogDirectory = path.join(root, 'sensor-catalog');
const catalogPath = path.join(root, 'sensor-catalog.json');

const hardware = {
  dht11_temperature: one('PIN', 'digital-input'), dht11_humidity: one('PIN', 'digital-input'), dht11_responding: one('PIN', 'digital-input'),
  dht22_temperature: one('PIN', 'digital-input'), dht22_humidity: one('PIN', 'digital-input'), dht22_responding: one('PIN', 'digital-input'),
  tt_encoder_pulses: pair('CHANNEL_A', 'CHANNEL_B', 'digital-input'), tt_encoder_revolutions: pair('CHANNEL_A', 'CHANNEL_B', 'digital-input'), tt_encoder_reset: pair('CHANNEL_A', 'CHANNEL_B', 'digital-input'),
  fc51_obstacle_detected: one('PIN', 'digital-input'), fc51_digital_value: one('PIN', 'digital-input'),
  ldr_light_raw: one('PIN', 'analog-input'), ldr_light_percent: one('PIN', 'analog-input'), ldr_is_dark: one('PIN', 'analog-input'),
  ldr_control_output: { deviceKey: ['PIN'], pins: [{ field: 'PIN', mode: 'analog-input' }, { field: 'OUTPUT', mode: 'digital-output' }] },
  hcsr04_distance_cm: two('TRIG', 'digital-output', 'ECHO', 'digital-input'), hcsr04_object_closer_than: two('TRIG', 'digital-output', 'ECHO', 'digital-input'),
  hcsr501_motion: one('PIN', 'digital-input'),
  servo_sg90_angle: one('PIN', 'pwm-output'),
  tb6612_motor_a: driver(), tb6612_motor_b: driver(),
  tcrt5000_line_digital: one('PIN', 'digital-input'), tcrt5000_reflection_analog: one('PIN', 'analog-input')
};

const pn532Types = new Set([
  'pn532_adafruit_reader_active', 'pn532_adafruit_card_present', 'pn532_adafruit_tag_type',
  'pn532_adafruit_uid_any', 'pn532_adafruit_text_any', 'pn532_adafruit_reset_pin'
]);

const entries = await fs.readdir(catalogDirectory);
const renames = new Map();
for (const filename of entries.filter((entry) => entry.endsWith('.aulasensor'))) {
  const source = path.join(catalogDirectory, filename);
  const sensor = JSON.parse(await fs.readFile(source, 'utf8'));
  for (const block of sensor.blocks) {
    if (pn532Types.has(block.type)) {
      block.hardware = {
        deviceKey: [],
        pins: [
          { pin: 'A4', name: 'SDA', mode: 'i2c', sharedBus: 'i2c' },
          { pin: 'A5', name: 'SCL', mode: 'i2c', sharedBus: 'i2c' },
          ...(block.type === 'pn532_adafruit_reset_pin' ? [{ field: 'PIN', mode: 'digital-output' }] : [])
        ]
      };
    } else if (hardware[block.type]) {
      block.hardware = hardware[block.type];
    } else {
      throw new Error(`Falta metadata de conexiones para ${block.type} en ${filename}`);
    }
  }
  sensor.version = incrementPatch(sensor.version);
  const nextFilename = filename.replace(/-\d+\.\d+\.\d+\.aulasensor$/, `-${sensor.version}.aulasensor`);
  await fs.writeFile(source, `${JSON.stringify(sensor, null, 2)}\n`, 'utf8');
  if (nextFilename !== filename) {
    await fs.rename(source, path.join(catalogDirectory, nextFilename));
    renames.set(`sensor-catalog/${filename}`, `sensor-catalog/${nextFilename}`);
  }
}

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
for (const item of catalog.sensors) {
  if (renames.has(item.file)) item.file = renames.get(item.file);
  const sensor = JSON.parse(await fs.readFile(path.join(root, item.file), 'utf8'));
  item.version = sensor.version;
}
await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Actualizados ${renames.size} paquetes con metadata de pines.`);

function one(field, mode) { return { deviceKey: [field], pins: [{ field, mode }] }; }
function pair(a, b, mode) { return { deviceKey: [a, b], pins: [{ field: a, mode }, { field: b, mode }] }; }
function two(a, aMode, b, bMode) { return { deviceKey: [a, b], pins: [{ field: a, mode: aMode }, { field: b, mode: bMode }] }; }
function driver() {
  return {
    deviceKey: ['IN1', 'IN2', 'PWM'],
    pins: [
      { field: 'IN1', mode: 'digital-output' }, { field: 'IN2', mode: 'digital-output' },
      { field: 'PWM', mode: 'pwm-output' }, { field: 'STBY', mode: 'digital-output', sharedBus: 'tb6612-standby' }
    ]
  };
}
function incrementPatch(version) {
  const [major, minor, patch] = String(version).split('.').map(Number);
  if (![major, minor, patch].every(Number.isInteger)) throw new Error(`Versión no válida: ${version}`);
  return `${major}.${minor}.${patch + 1}`;
}
