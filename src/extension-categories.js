export function extensionBlockTypes(extension) {
  return [
    ...(extension.blocks || []).map((block) => block.type),
    ...(extension.blockTypes || [])
  ];
}

export function extensionCategoryName(extension) {
  const explicit = String(extension.categoryName || extension.model || '').trim();
  if (explicit) return explicit.slice(0, 24);
  const chosen = String(extension.name || 'Sensor').replace(/\s*[·|].*$/, '').trim();
  const tokens = chosen.replace(/[()[\],:]/g, ' ').split(/\s+/).filter(Boolean);
  const model = tokens.find((token) => /\d/.test(token)) || tokens.find((token) => ['LDR', 'RFID', 'NFC'].includes(token.toUpperCase()));
  return (model || chosen.replace(/^(sensor|lector|módulo|modulo|fotoresistencia)\s+/i, '')).slice(0, 24) || 'Sensor';
}

export function extensionToolboxCategories(extensions, fallbackColour) {
  return extensions.map((extension) => ({
    kind: 'category',
    name: extensionCategoryName(extension),
    colour: extension.colour || fallbackColour,
    contents: extensionBlockTypes(extension).map((type) => ({ kind: 'block', type }))
  }));
}

export function exclusiveExtensionTypes(extension, remainingExtensions) {
  const remainingTypes = new Set(remainingExtensions.flatMap(extensionBlockTypes));
  return extensionBlockTypes(extension).filter((type) => !remainingTypes.has(type));
}
