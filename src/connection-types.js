import * as BM from 'blockly/core';
import { isExecutableBlock } from './executable-blocks.js';
const B = BM.ConnectionChecker ? BM : BM.default;
function effectiveTypes(connection) {
  const block = connection.getSourceBlock();
  const getter = ['variables_get', 'variables_get_dynamic'].includes(block.type);
  const setter = ['variables_set', 'variables_set_dynamic'].includes(block.type);
  if ((getter && connection === block.outputConnection) ||
      (setter && connection === block.getInput('VALUE')?.connection)) {
    const variable = block.workspace.getVariableMap().getVariableById(block.getFieldValue('VAR'));
    return [variable?.type === 'String' ? 'String' : 'Number'];
  }
  return connection.getCheck();
}
export class AulaConnectionChecker extends B.ConnectionChecker {
  doTypeChecks(a, b) {
    const left = effectiveTypes(a), right = effectiveTypes(b);
    return !left || !right || left.some(type => right.includes(type));
  }
}
export function assertConnectionTypes(workspace) {
  const checker = new AulaConnectionChecker();
  for (const block of workspace.getAllBlocks(false)) {
    if (!isExecutableBlock(block)) continue;
    for (const input of block.inputList) {
      const target = input.connection?.targetConnection;
      if (target && !checker.doTypeChecks(input.connection, target)) {
        throw new Error('Conexión incompatible en ' + block.type + ': no mezcles texto, números y condiciones. Revisa la variable o el bloque conectado.');
      }
    }
  }
}
