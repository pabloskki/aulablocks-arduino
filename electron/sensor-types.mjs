const TYPES = new Set(['Number', 'String', 'Boolean']);
export function validateSensorTypes(extension) {
  for (const block of extension.blocks || []) {
    if ((block.codeKind === 'expression' || Object.hasOwn(block, 'output')) && !TYPES.has(block.output)) {
      throw new Error('El bloque ' + block.type + ' debe declarar su salida como Number, String o Boolean.');
    }
    for (const key of ['args0', 'args1', 'args2']) {
      for (const arg of block[key] || []) {
        if (arg.type !== 'input_value') continue;
        const types = Array.isArray(arg.check) ? arg.check : [arg.check];
        if (!types.length || !types.every(type => TYPES.has(type))) {
          throw new Error('La entrada ' + arg.name + ' de ' + block.type + ' debe declarar los tipos que acepta.');
        }
      }
    }
  }
}
