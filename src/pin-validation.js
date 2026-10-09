const BOARD_PINS = {
  uno: new Set([...range('D', 0, 13), ...range('A', 0, 5)]),
  nano: new Set([...range('D', 0, 13), ...range('A', 0, 7)])
};

const CORE_HARDWARE = {
  digital_write: hardware(['PIN', 'digital-output']),
  analog_write: hardware(['PIN', 'pwm-output']),
  digital_read: hardware(['PIN', 'digital-input']),
  analog_read: hardware(['PIN', 'analog-input']),
  button_pressed: hardware(['PIN', 'digital-input']),
  buzzer_tone: hardware(['PIN', 'digital-output']),
  relay_set: hardware(['PIN', 'digital-output']),
  rgb_pixel: hardware(['PIN', 'digital-output']),
  servo_write: hardware(['PIN', 'digital-output']),
  ultrasonic_read: hardware(['TRIG', 'digital-output'], ['ECHO', 'digital-input']),
  motor_drive: hardware(['IN1', 'digital-output'], ['IN2', 'digital-output'], ['PWM', 'pwm-output']),
  keypad_key: hardware(['R1', 'digital-io'], ['R2', 'digital-io'], ['R3', 'digital-io'], ['R4', 'digital-io'], ['C1', 'digital-io'], ['C2', 'digital-io'], ['C3', 'digital-io'], ['C4', 'digital-io']),
  keypad_password_ok: hardware(['R1', 'digital-io'], ['R2', 'digital-io'], ['R3', 'digital-io'], ['R4', 'digital-io'], ['C1', 'digital-io'], ['C2', 'digital-io'], ['C3', 'digital-io'], ['C4', 'digital-io'])
};

export function findPinIssues(blocks, extensions, board) {
  const metadata = new Map(Object.entries(CORE_HARDWARE));
  for (const extension of extensions || []) {
    for (const definition of extension.blocks || []) {
      if (definition.hardware) metadata.set(definition.type, { ...definition.hardware, owner: extension.id, ownerName: extension.name });
    }
  }

  const claims = [];
  const unknown = new Set();
  const invalid = [];
  for (const block of blocks || []) {
    const definition = metadata.get(block.type);
    if (!definition) {
      if ((extensions || []).some((extension) => (extension.blocks || []).some((item) => item.type === block.type))) unknown.add(block.type);
      continue;
    }
    const owner = definition.owner || `aulablocks:${block.type}`;
    const keyFields = definition.deviceKey || (definition.pins || []).map((pin) => pin.field).filter(Boolean);
    const deviceKey = keyFields.length
      ? keyFields.map((field) => `${field}=${block.getFieldValue(field) || ''}`).join('|')
      : 'singleton';
    for (const pinDefinition of definition.pins || []) {
      const raw = pinDefinition.pin || block.getFieldValue(pinDefinition.field);
      if (!raw && pinDefinition.optional) continue;
      const pin = normalizePin(raw);
      if (!pin || !BOARD_PINS[board]?.has(pin)) {
        invalid.push({ pin: String(raw ?? '(sin pin)'), blockType: block.type });
        continue;
      }
      const mode = pinDefinition.mode;
      if ((mode === 'pwm-output' && !['D3', 'D5', 'D6', 'D9', 'D10', 'D11'].includes(pin)) ||
          (mode === 'analog-input' && !pin.startsWith('A')) ||
          (mode === 'interrupt-input' && !['D2', 'D3'].includes(pin)) ||
          (mode === 'i2c' && !['A4', 'A5'].includes(pin)) ||
          (['A6', 'A7'].includes(pin) && mode !== 'analog-input')) {
        invalid.push({ pin: String(raw), blockType: block.type, reason: mode });
      }
      claims.push({
        pin,
        genericOutput: !definition.owner && ['digital_write', 'analog_write'].includes(block.type),
        field: pinDefinition.field || pinDefinition.name || pin,
        mode: pinDefinition.mode || 'digital-io',
        sharedBus: pinDefinition.sharedBus || null,
        device: `${owner}:${deviceKey}`,
        label: definition.ownerName || block.type
      });
    }
  }

  const conflicts = [];
  const byPin = groupBy(claims, (claim) => claim.pin);
  for (const [pin, pinClaims] of byPin) {
    const unique = deduplicate(pinClaims, (claim) => `${claim.device}:${claim.field}:${claim.mode}`);
    for (let left = 0; left < unique.length; left += 1) {
      for (let right = left + 1; right < unique.length; right += 1) {
        const a = unique[left];
        const b = unique[right];
        if (a.genericOutput && b.genericOutput) continue;
        if (a.sharedBus && a.sharedBus === b.sharedBus && a.mode === b.mode && a.field === b.field) continue;
        conflicts.push({ pin, claims: [a, b] });
      }
    }
  }
  const activeTypes = new Set((blocks || []).map(block => block.type));
  const servoActive = activeTypes.has('servo_write') || (extensions || []).some(extension => {
    const visited = new Set();
    const usesServo = metadata => {
      if ((metadata.includes || []).some(line => /[<"]Servo\.h[>"]/.test(line))) return true;
      return (metadata.requires || []).some(name => {
        if (visited.has(name)) return false;
        visited.add(name);
        return usesServo(extension.codeResources?.[name] || {});
      });
    };
    return (extension.blocks || []).some(block => activeTypes.has(block.type) && usesServo(block));
  });
  const timerConflicts = servoActive && ['uno', 'nano'].includes(board)
    ? [...new Set(claims.filter(claim => claim.mode === 'pwm-output' && ['D9', 'D10'].includes(claim.pin)).map(claim => claim.pin))]
    : [];
  return { invalid, conflicts, unknown: [...unknown], timerConflicts };
}

export function normalizePin(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  if (/^A[0-7]$/.test(raw)) return raw;
  if (/^D(?:[0-9]|1[0-3])$/.test(raw)) return raw;
  if (/^(?:[0-9]|1[0-3])$/.test(raw)) return `D${Number(raw)}`;
  if (/^1[4-9]$/.test(raw)) return `A${Number(raw) - 14}`;
  return null;
}

function hardware(...entries) {
  const deviceKey = entries.map((entry) => entry[0]);
  return { deviceKey, pins: entries.map(([field, mode]) => ({ field, mode })) };
}

function range(prefix, start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => `${prefix}${start + index}`);
}

function groupBy(values, selector) {
  const grouped = new Map();
  for (const value of values) {
    const key = selector(value);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(value);
  }
  return grouped;
}

function deduplicate(values, selector) {
  return [...new Map(values.map((value) => [selector(value), value])).values()];
}
