import * as BlocklyModule from 'blockly/core';
import 'blockly/blocks';
import { generateSketch, registerExtensionGenerators } from '../src/generator.js';

const Blockly = BlocklyModule.Workspace ? BlocklyModule : BlocklyModule.default;
const extension = {
  id: 'test-code-resources',
  name: 'Prueba de recursos',
  codeResources: {
    core: {
      includes: ['#include <CoreSolo.h>'],
      globals: ['int recurso_core = 1;'],
      setup: ['iniciarCore();'],
      helpers: ['void funcionCore() {}']
    },
    optional: {
      requires: ['core'],
      includes: ['#include <Opcional.h>'],
      globals: ['int recurso_opcional = 2;'],
      setup: ['iniciarOpcional();'],
      helpers: ['void funcionOpcional() {}']
    }
  },
  blocks: [
    { type: 'resource_core_block', message0: 'núcleo', args0: [], output: 'Number', codeKind: 'expression', code: 'recurso_core', requires: ['core'] },
    { type: 'resource_optional_block', message0: 'opcional', args0: [], output: 'Number', codeKind: 'expression', code: 'recurso_opcional', requires: ['optional'] }
  ]
};

Blockly.defineBlocksWithJsonArray(extension.blocks);
registerExtensionGenerators(extension);

const coreWorkspace = new Blockly.Workspace();
const coreBlock = coreWorkspace.newBlock('resource_core_block');
const coreCode = generateSketch(coreWorkspace, [extension]);
for (const expected of ['CoreSolo.h', 'recurso_core', 'iniciarCore()', 'funcionCore']) {
  if (!coreCode.includes(expected)) throw new Error(`Falta el recurso utilizado: ${expected}`);
}
for (const absent of ['Opcional.h', 'recurso_opcional', 'iniciarOpcional()', 'funcionOpcional']) {
  if (coreCode.includes(absent)) throw new Error(`Se generó un recurso de un bloque ausente: ${absent}`);
}
coreBlock.dispose(false);
const removedCode = generateSketch(coreWorkspace, [extension]);
for (const absent of ['CoreSolo.h', 'recurso_core', 'iniciarCore()', 'funcionCore']) {
  if (removedCode.includes(absent)) throw new Error(`El código permaneció después de borrar el bloque: ${absent}`);
}

const unusedVariable = coreWorkspace.getVariableMap().createVariable('variable_sin_bloques');
if (generateSketch(coreWorkspace, [extension]).includes('variable_sin_bloques')) throw new Error('Una variable sin bloques generó una declaración.');
const variableBlock = coreWorkspace.newBlock('variables_get');
variableBlock.setFieldValue(unusedVariable.getId(), 'VAR');
if (!generateSketch(coreWorkspace, [extension]).includes('float variable_sin_bloques = 0;')) throw new Error('Una variable utilizada no generó su declaración.');
variableBlock.dispose(false);
if (generateSketch(coreWorkspace, [extension]).includes('variable_sin_bloques')) throw new Error('La declaración permaneció después de borrar el bloque de variable.');

const optionalWorkspace = new Blockly.Workspace();
optionalWorkspace.newBlock('resource_optional_block');
const optionalCode = generateSketch(optionalWorkspace, [extension]);
for (const expected of ['CoreSolo.h', 'Opcional.h', 'recurso_core', 'recurso_opcional', 'funcionCore', 'funcionOpcional']) {
  if (!optionalCode.includes(expected)) throw new Error(`No se resolvió la dependencia: ${expected}`);
}

console.log('Los recursos de código solo se generan cuando un bloque los necesita.');
