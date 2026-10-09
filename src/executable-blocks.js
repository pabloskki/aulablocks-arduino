// Surround parents exclude preceding sibling statements.
export function isExecutableBlock(block) {
  let current = block;
  while (current) {
    if (current.isEnabled && !current.isEnabled()) return false;
    current = current.getSurroundParent?.();
  }
  return true;
}
