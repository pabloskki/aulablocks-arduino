import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExtensionRegistration } from '../src/extension-validation.js';
test('rechaza colisiones con bloques principales y con otro paquete', () => {
  const extension = { id: 'new', name: 'New', blocks: [{ type: 'existing', message0: 'hello', code: '1' }] };
  const definitions = { existing: {} };
  assert.throws(() => validateExtensionRegistration(extension, definitions, new Map()), /ya existe/);
  assert.throws(() => validateExtensionRegistration(extension, definitions, new Map([['existing', 'other']])), /ya existe/);
  assert.doesNotThrow(() => validateExtensionRegistration(extension, definitions, new Map([['existing', 'new']])));
  extension.blocks.push(extension.blocks[0]);
  assert.throws(() => validateExtensionRegistration(extension, {}, new Map()), /repite/);
});
