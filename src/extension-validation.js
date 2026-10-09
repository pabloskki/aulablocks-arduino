import { validateSensorTypes } from '../electron/sensor-types.mjs';
export function validateExtensionRegistration(extension, definitions, owners) {
  validateSensorTypes(extension || {});
  const hasDefinitions = Array.isArray(extension?.blocks) && extension.blocks.length > 0;
  const hasKnownTypes = Array.isArray(extension?.blockTypes) && extension.blockTypes.length > 0;
  if (!extension?.id || !extension.name || (!hasDefinitions && !hasKnownTypes)) throw new Error('La extensión debe tener id, nombre y al menos un bloque.');
  const seen = new Set();
  for (const block of extension.blocks || []) {
    if (!block.type || !block.message0 || typeof block.code !== 'string') throw new Error('Cada bloque necesita type, message0 y code.');
    if (seen.has(block.type)) throw new Error(`El paquete repite el bloque ${block.type}.`);
    seen.add(block.type);
    if (definitions[block.type] && owners.get(block.type) !== extension.id) throw new Error(`El bloque ${block.type} ya existe.`);
  }
  for (const type of extension.blockTypes || []) if (!definitions[type]) throw new Error(`El bloque conocido ${type} no está disponible en esta versión.`);
}
