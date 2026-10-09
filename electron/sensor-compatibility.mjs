function shape(block) {
  return JSON.stringify({
    output: block.output ?? null,
    codeKind: block.codeKind || 'statement',
    args: [0, 1, 2].flatMap(index => (block['args' + index] || []).map(arg => ({
      name: arg.name, type: arg.type, check: arg.check ?? null,
      options: arg.type === 'field_dropdown' ? (arg.options || []).map(option => option[1]) : undefined
    })))
  });
}

export function assertCompatibleSensor(previous, next) {
  if (!previous || previous.id !== next.id) return;
  const definitions = new Map((next.blocks || []).map(block => [block.type, block]));
  for (const block of previous.blocks || []) {
    const replacement = definitions.get(block.type);
    if (!replacement || shape(block) !== shape(replacement)) {
      throw new Error('Actualización incompatible de ' + next.name + ': cambia o elimina el bloque ' + block.type +
        '. Se conserva la versión anterior para proteger tus proyectos. Pide al autor un paquete compatible o con otro identificador.');
    }
  }
}

export function assertCatalogBlockOwnership(catalog, packages) {
  const updating = new Set(packages.map(item => item.id));
  const owners = new Map();
  for (const item of [...catalog.filter(item => !updating.has(item.id)), ...packages]) {
    for (const block of item.blocks || []) {
      const owner = owners.get(block.type);
      if (owner && owner !== item.id) throw new Error('Dos sensores declaran el mismo bloque: ' + block.type);
      owners.set(block.type, item.id);
    }
  }
}
