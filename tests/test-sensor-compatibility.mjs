import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
const original = { id: 'x', name: 'Sensor', blocks: [{ type: 'x_read', codeKind: 'expression', output: 'Number', args0: [{ name: 'PIN', type: 'field_number', value: 2 }] }] };
test('ciclo 3: permite código corregido y bloques nuevos', () => {
  const next = structuredClone(original);
  next.blocks[0].code = 'fixed()';
  next.blocks.push({ type: 'x_extra' });
  assert.doesNotThrow(() => assertCompatibleSensor(original, next));
});
test('ciclo 3: impide borrar conexiones o cambiar tipo de un bloque', () => {
  for (const change of [
    item => { item.blocks[0].args0 = []; },
    item => { item.blocks[0].output = 'String'; }
  ]) {
    const next = structuredClone(original); change(next);
    assert.throws(() => assertCompatibleSensor(original, next), /incompatible/);
  }
});
