import * as Blockly from 'blockly/core';

const BlocklyApi = Blockly.CodeGenerator ? Blockly : Reflect.get(Blockly, 'default');

const ORDER = {
  ATOMIC: 0,
  UNARY: 3,
  MULTIPLICATIVE: 5,
  ADDITIVE: 6,
  RELATIONAL: 8,
  EQUALITY: 9,
  LOGICAL_AND: 13,
  LOGICAL_OR: 14,
  NONE: 99
};

export const arduinoGenerator = new BlocklyApi.CodeGenerator('Arduino');
arduinoGenerator.INDENT = '  ';
arduinoGenerator.ORDER_ATOMIC = ORDER.ATOMIC;
arduinoGenerator.ORDER_NONE = ORDER.NONE;

arduinoGenerator.scrub_ = function (block, code, thisOnly) {
  if (thisOnly) return code;
  const next = block.nextConnection?.targetBlock();
  return code + (next ? this.blockToCode(next) : '');
};

const value = (block, name, fallback = '0') => arduinoGenerator.valueToCode(block, name, ORDER.NONE) || fallback;

let variableIdentifiers = new Map();

const RESERVED_IDENTIFIERS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit', 'atomic_noexcept',
  'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
  'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue',
  'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast',
  'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if',
  'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr',
  'operator', 'or', 'or_eq', 'private', 'protected', 'public', 'register', 'reinterpret_cast',
  'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct',
  'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename',
  'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq',
  'setup', 'loop', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'String', 'Serial'
]);

arduinoGenerator.forBlock.math_number = (block) => [`${Number(block.getFieldValue('NUM')) || 0}`, ORDER.ATOMIC];
arduinoGenerator.forBlock.text = (block) => [`"${escapeText(block.getFieldValue('TEXT') || '')}"`, ORDER.ATOMIC];
arduinoGenerator.forBlock.logic_boolean = (block) => [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ORDER.ATOMIC];
arduinoGenerator.forBlock.logic_negate = (block) => [`!(${value(block, 'BOOL', 'false')})`, ORDER.UNARY];
arduinoGenerator.forBlock.logic_compare = (block) => {
  const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  return [`${value(block, 'A')} ${ops[block.getFieldValue('OP')]} ${value(block, 'B')}`, ORDER.RELATIONAL];
};
arduinoGenerator.forBlock.logic_operation = (block) => {
  const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||';
  return [`(${value(block, 'A', 'false')}) ${op} (${value(block, 'B', 'false')})`, op === '&&' ? ORDER.LOGICAL_AND : ORDER.LOGICAL_OR];
};
arduinoGenerator.forBlock.math_arithmetic = (block) => {
  const ops = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: null };
  const op = ops[block.getFieldValue('OP')];
  const a = value(block, 'A');
  const b = value(block, 'B');
  if (!op) return [`pow(${a}, ${b})`, ORDER.ATOMIC];
  return [`${a} ${op} ${b}`, op === '*' || op === '/' ? ORDER.MULTIPLICATIVE : ORDER.ADDITIVE];
};
arduinoGenerator.forBlock.math_random_int = (block) => [`random(${value(block, 'FROM')}, (${value(block, 'TO')}) + 1)`, ORDER.ATOMIC];

arduinoGenerator.forBlock.controls_if = (block) => {
  let code = '';
  let index = 0;
  while (block.getInput(`IF${index}`)) {
    const condition = value(block, `IF${index}`, 'false');
    const branch = arduinoGenerator.statementToCode(block, `DO${index}`);
    code += `${index === 0 ? 'if' : 'else if'} (${condition}) {\n${branch}}`;
    index += 1;
  }
  if (block.getInput('ELSE')) code += ` else {\n${arduinoGenerator.statementToCode(block, 'ELSE')}}`;
  return `${code}\n`;
};
arduinoGenerator.forBlock.controls_repeat_ext = (block) => {
  const times = value(block, 'TIMES', '0');
  const branch = arduinoGenerator.statementToCode(block, 'DO');
  return `for (int repetir = 0; repetir < ${times}; repetir++) {\n${branch}}\n`;
};
arduinoGenerator.forBlock.controls_whileUntil = (block) => {
  const condition = value(block, 'BOOL', 'false');
  const test = block.getFieldValue('MODE') === 'UNTIL' ? `!(${condition})` : condition;
  return `while (${test}) {\n${arduinoGenerator.statementToCode(block, 'DO')}}\n`;
};
arduinoGenerator.forBlock.variables_get = (block) => [variableName(block), ORDER.ATOMIC];
arduinoGenerator.forBlock.variables_set = (block) => `${variableName(block)} = ${value(block, 'VALUE')};\n`;
arduinoGenerator.forBlock.math_change = (block) => `${variableName(block)} += ${value(block, 'DELTA')};\n`;
arduinoGenerator.forBlock.variables_get_dynamic = arduinoGenerator.forBlock.variables_get;
arduinoGenerator.forBlock.variables_set_dynamic = arduinoGenerator.forBlock.variables_set;

arduinoGenerator.forBlock.digital_write = (block) => `digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('STATE')});\n`;
arduinoGenerator.forBlock.analog_write = (block) => `analogWrite(${block.getFieldValue('PIN')}, constrain(${value(block, 'VALUE')}, 0, 255));\n`;
arduinoGenerator.forBlock.digital_read = (block) => [`digitalRead(${block.getFieldValue('PIN')}) == HIGH`, ORDER.EQUALITY];
arduinoGenerator.forBlock.analog_read = (block) => [`analogRead(${block.getFieldValue('PIN')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.wait_ms = (block) => `delay(${value(block, 'TIME', '1000')});\n`;
arduinoGenerator.forBlock.servo_write = (block) => `servo_${block.getFieldValue('PIN')}.write(constrain(${value(block, 'ANGLE', '90')}, 0, 180));\n`;
arduinoGenerator.forBlock.motor_drive = (block) => {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const pwm = block.getFieldValue('PWM');
  const speed = `constrain(${value(block, 'SPEED', '180')}, 0, 255)`;
  const dir = block.getFieldValue('DIR');
  if (dir === 'STOP') return `digitalWrite(${in1}, LOW);\ndigitalWrite(${in2}, LOW);\nanalogWrite(${pwm}, 0);\n`;
  const first = dir === 'FORWARD' ? 'HIGH' : 'LOW';
  const second = dir === 'FORWARD' ? 'LOW' : 'HIGH';
  return `digitalWrite(${in1}, ${first});\ndigitalWrite(${in2}, ${second});\nanalogWrite(${pwm}, ${speed});\n`;
};
arduinoGenerator.forBlock.ultrasonic_read = (block) => [`medirDistancia(${block.getFieldValue('TRIG')}, ${block.getFieldValue('ECHO')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.dht_read = (block) => {
  const method = block.getFieldValue('KIND') === 'TEMP' ? 'readTemperature' : 'readHumidity';
  return [`dht_${block.getFieldValue('PIN')}.${method}()`, ORDER.ATOMIC];
};
arduinoGenerator.forBlock.buzzer_tone = (block) => `tone(${block.getFieldValue('PIN')}, ${value(block, 'FREQ', '440')}, ${value(block, 'TIME', '500')});\n`;
arduinoGenerator.forBlock.rgb_pixel = (block) => {
  const pin = block.getFieldValue('PIN');
  return `pixel_${pin}.setPixelColor(0, pixel_${pin}.Color(constrain(${value(block, 'R')}, 0, 255), constrain(${value(block, 'G')}, 0, 255), constrain(${value(block, 'B')}, 0, 255)));\npixel_${pin}.show();\n`;
};
arduinoGenerator.forBlock.serial_print = (block) => `Serial.println(${value(block, 'VALUE', '""')});\n`;
arduinoGenerator.forBlock.button_pressed = (block) => {
  const active = block.getFieldValue('WIRING') === 'PULLUP' ? 'LOW' : 'HIGH';
  return [`digitalRead(${block.getFieldValue('PIN')}) == ${active}`, ORDER.EQUALITY];
};
arduinoGenerator.forBlock.pir_motion = (block) => [`digitalRead(${block.getFieldValue('PIN')}) == HIGH`, ORDER.EQUALITY];
arduinoGenerator.forBlock.line_sensor = (block) => {
  const active = block.getFieldValue('SURFACE') === 'BLACK' ? 'LOW' : 'HIGH';
  return [`digitalRead(${block.getFieldValue('PIN')}) == ${active}`, ORDER.EQUALITY];
};
arduinoGenerator.forBlock.obstacle_sensor = (block) => [`digitalRead(${block.getFieldValue('PIN')}) == LOW`, ORDER.EQUALITY];
arduinoGenerator.forBlock.tilt_sensor = (block) => [`digitalRead(${block.getFieldValue('PIN')}) == HIGH`, ORDER.EQUALITY];
arduinoGenerator.forBlock.analog_sensor = (block) => [`analogRead(${block.getFieldValue('PIN')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.thermistor_celsius = (block) => [`temperaturaNTC(${block.getFieldValue('PIN')}, ${block.getFieldValue('RESISTOR')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.joystick_axis = (block) => [`analogRead(${block.getFieldValue('PIN')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.keypad_key = (block) => [`leerTecla(${keypadName(block)})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.keypad_password_ok = (block) => [`claveIngresada(${keypadName(block)}, ${value(block, 'PASSWORD', '"1234"')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.lcd_print = (block) => {
  const lcd = `lcd_${block.getFieldValue('ADDRESS')}`;
  return `${lcd}.setCursor(${block.getFieldValue('COL')}, ${block.getFieldValue('ROW')});\n${lcd}.print(${value(block, 'VALUE', '""')});\n`;
};
arduinoGenerator.forBlock.lcd_clear = (block) => `lcd_${block.getFieldValue('ADDRESS')}.clear();\n`;
arduinoGenerator.forBlock.rfid_card_present = (block) => [`tarjetaDisponible(${rfidName(block)})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.rfid_uid_matches = (block) => [`tarjetaCoincide(${rfidName(block)}, ${value(block, 'UID', '""')})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.rfid_uid_text = (block) => [`uidTarjeta(${rfidName(block)})`, ORDER.ATOMIC];
arduinoGenerator.forBlock.relay_set = (block) => `digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('STATE') === 'ON' ? 'LOW' : 'HIGH'});\n`;
arduinoGenerator.forBlock.robot_drive = (block) => robotDriveCode(block, value(block, 'SPEED', '170'));
arduinoGenerator.forBlock.stepper_move = (block) => `${stepperName(block)}.setSpeed(${block.getFieldValue('RPM')});\n${stepperName(block)}.step(${value(block, 'STEPS', '512')});\n`;

export function generateSketch(workspace, extensions = []) {
  const allBlocks = workspace.getAllBlocks(false);
  const types = new Set(allBlocks.map((block) => block.type));
  const includes = new Set();
  const globals = new Set();
  const setup = new Set(['Serial.begin(9600);']);
  const loopPrelude = new Set();
  const extensionHelpers = new Set();

  const usedVariableIds = new Set(allBlocks
    .filter((block) => ['variables_get', 'variables_set', 'variables_get_dynamic', 'variables_set_dynamic', 'math_change'].includes(block.type))
    .map((block) => block.getFieldValue('VAR'))
    .filter(Boolean));
  const usedVariables = workspace.getVariableMap().getAllVariables().filter((item) => usedVariableIds.has(item.getId()));
  variableIdentifiers = buildVariableIdentifiers(usedVariables);
  for (const variable of usedVariables) {
    const identifier = variableIdentifiers.get(variable.getId());
    const declaration = variable.type === 'String'
      ? `String ${identifier} = "";`
      : `float ${identifier} = 0;`;
    globals.add(declaration);
  }

  for (const block of allBlocks) {
    if (['digital_write', 'buzzer_tone'].includes(block.type)) setup.add(`pinMode(${block.getFieldValue('PIN')}, OUTPUT);`);
    if (block.type === 'digital_read') setup.add(`pinMode(${block.getFieldValue('PIN')}, INPUT);`);
    if (block.type === 'servo_write') {
      const pin = block.getFieldValue('PIN');
      includes.add('#include <Servo.h>');
      globals.add(`Servo servo_${pin};`);
      setup.add(`servo_${pin}.attach(${pin});`);
    }
    if (block.type === 'motor_drive') {
      for (const field of ['IN1', 'IN2', 'PWM']) setup.add(`pinMode(${block.getFieldValue(field)}, OUTPUT);`);
    }
    if (block.type === 'ultrasonic_read') {
      setup.add(`pinMode(${block.getFieldValue('TRIG')}, OUTPUT);`);
      setup.add(`pinMode(${block.getFieldValue('ECHO')}, INPUT);`);
    }
    if (block.type === 'dht_read') {
      const pin = block.getFieldValue('PIN');
      includes.add('#include <DHT.h>');
      globals.add(`DHT dht_${pin}(${pin}, DHT11);`);
      setup.add(`dht_${pin}.begin();`);
    }
    if (block.type === 'rgb_pixel') {
      const pin = block.getFieldValue('PIN');
      includes.add('#include <Adafruit_NeoPixel.h>');
      globals.add(`Adafruit_NeoPixel pixel_${pin}(1, ${pin}, NEO_GRB + NEO_KHZ800);`);
      setup.add(`pixel_${pin}.begin();`);
    }
    if (block.type === 'button_pressed') setup.add(`pinMode(${block.getFieldValue('PIN')}, ${block.getFieldValue('WIRING') === 'PULLUP' ? 'INPUT_PULLUP' : 'INPUT'});`);
    if (['pir_motion', 'line_sensor', 'obstacle_sensor', 'tilt_sensor'].includes(block.type)) setup.add(`pinMode(${block.getFieldValue('PIN')}, INPUT);`);
    if (['keypad_key', 'keypad_password_ok'].includes(block.type)) {
      includes.add('#include <Keypad.h>');
      const id = keypadId(block);
      const pins = keypadPins(block);
      globals.add(`char teclas_${id}[4][4] = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};`);
      globals.add(`byte filas_${id}[4] = {${pins.slice(0, 4).join(', ')}};`);
      globals.add(`byte columnas_${id}[4] = {${pins.slice(4).join(', ')}};`);
      globals.add(`Keypad ${keypadName(block)} = Keypad(makeKeymap(teclas_${id}), filas_${id}, columnas_${id}, 4, 4);`);
    }
    if (['lcd_print', 'lcd_clear'].includes(block.type)) {
      const address = block.getFieldValue('ADDRESS');
      includes.add('#include <Wire.h>');
      includes.add('#include <LiquidCrystal_I2C.h>');
      globals.add(`LiquidCrystal_I2C lcd_${address}(0x${address}, 16, 2);`);
      setup.add(`lcd_${address}.init();`);
      setup.add(`lcd_${address}.backlight();`);
    }
    if (['rfid_card_present', 'rfid_uid_matches', 'rfid_uid_text'].includes(block.type)) {
      includes.add('#include <SPI.h>');
      includes.add('#include <MFRC522.h>');
      globals.add(`MFRC522 ${rfidName(block)}(${block.getFieldValue('SS')}, ${block.getFieldValue('RST')});`);
      setup.add('SPI.begin();');
      setup.add(`${rfidName(block)}.PCD_Init();`);
    }
    if (block.type === 'relay_set') {
      setup.add(`pinMode(${block.getFieldValue('PIN')}, OUTPUT);`);
      setup.add(`digitalWrite(${block.getFieldValue('PIN')}, HIGH);`);
    }
    if (block.type === 'robot_drive') {
      for (const field of ['ENA', 'IN1', 'IN2', 'ENB', 'IN3', 'IN4']) setup.add(`pinMode(${block.getFieldValue(field)}, OUTPUT);`);
    }
    if (block.type === 'stepper_move') {
      includes.add('#include <Stepper.h>');
      globals.add(`Stepper ${stepperName(block)}(2048, ${block.getFieldValue('IN1')}, ${block.getFieldValue('IN3')}, ${block.getFieldValue('IN2')}, ${block.getFieldValue('IN4')});`);
    }
  }

  const declaredIdentifiers = new Map();
  for (const extension of extensions) {
    const resources = extension.codeResources || {};
    const addMetadata = (metadata, block, definition) => {
      (metadata.includes || []).forEach((item) => includes.add(renderExtensionTemplate(item, block, definition)));
      (metadata.globals || []).forEach((item) => {
        const rendered = renderExtensionTemplate(item, block, definition);
        checkNamespaceConflict(declaredIdentifiers, 'global', rendered, extension);
        globals.add(rendered);
      });
      (metadata.setup || []).forEach((item) => setup.add(renderExtensionTemplate(item, block, definition)));
      (metadata.loop || []).forEach((item) => loopPrelude.add(renderExtensionTemplate(item, block, definition)));
      (metadata.helpers || []).forEach((item) => {
        const rendered = renderExtensionTemplate(item, block, definition);
        checkNamespaceConflict(declaredIdentifiers, 'helper', rendered, extension);
        extensionHelpers.add(rendered);
      });
    };
    const addResource = (name, block, definition, added, visiting) => {
      if (added.has(name)) return;
      if (visiting.has(name)) throw new Error(`Dependencia circular de código en ${extension.name}: ${name}.`);
      const resource = resources[name];
      if (!resource) throw new Error(`El bloque ${definition.type} necesita el recurso de código inexistente “${name}”.`);
      visiting.add(name);
      for (const dependency of resource.requires || []) addResource(dependency, block, definition, added, visiting);
      visiting.delete(name);
      addMetadata(resource, block, definition);
      added.add(name);
    };
    for (const definition of extension.blocks || []) {
      const instances = allBlocks.filter((block) => block.type === definition.type);
      for (const block of instances) {
        const added = new Set();
        for (const resource of definition.requires || []) addResource(resource, block, definition, added, new Set());
        addMetadata(definition, block, definition);
      }
    }
  }

  const setupEvents = workspace.getTopBlocks(true).filter((block) => block.type === 'arduino_setup');
  const loopEvents = workspace.getTopBlocks(true).filter((block) => block.type === 'arduino_loop');
  const setupBody = setupEvents.map((block) => arduinoGenerator.statementToCode(block, 'DO')).join('');
  const loopBody = loopEvents.map((block) => arduinoGenerator.statementToCode(block, 'DO')).join('');
  let helpers = types.has('ultrasonic_read') ? `\nfloat medirDistancia(int trig, int echo) {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  long duracion = pulseIn(echo, HIGH, 30000);\n  return duracion * 0.0343 / 2.0;\n}\n` : '';
  if (types.has('thermistor_celsius')) helpers += `\nfloat temperaturaNTC(int pin, float resistenciaSerie) {\n  int lectura = analogRead(pin);\n  if (lectura <= 0) return -273.15;\n  float resistencia = resistenciaSerie * (1023.0 / lectura - 1.0);\n  float kelvin = 1.0 / (log(resistencia / 10000.0) / 3950.0 + 1.0 / 298.15);\n  return kelvin - 273.15;\n}\n`;
  if (types.has('keypad_key') || types.has('keypad_password_ok')) helpers += `\nString leerTecla(Keypad &teclado) {\n  char tecla = teclado.getKey();\n  return tecla ? String(tecla) : String("");\n}\n\nbool claveIngresada(Keypad &teclado, const String &correcta) {\n  static String entrada = "";\n  char tecla = teclado.getKey();\n  if (!tecla) return false;\n  if (tecla == '*') { entrada = ""; return false; }\n  if (tecla == '#') {\n    bool coincide = entrada == correcta;\n    entrada = "";\n    return coincide;\n  }\n  if (entrada.length() < 16) entrada += tecla;\n  return false;\n}\n`;
  if (types.has('rfid_card_present') || types.has('rfid_uid_matches') || types.has('rfid_uid_text')) helpers += `\nbool tarjetaDisponible(MFRC522 &lector) {\n  return lector.PICC_IsNewCardPresent() && lector.PICC_ReadCardSerial();\n}\n\nString uidTarjeta(MFRC522 &lector) {\n  String uid = "";\n  for (byte i = 0; i < lector.uid.size; i++) {\n    if (i) uid += " ";\n    if (lector.uid.uidByte[i] < 0x10) uid += "0";\n    uid += String(lector.uid.uidByte[i], HEX);\n  }\n  uid.toUpperCase();\n  return uid;\n}\n\nbool tarjetaCoincide(MFRC522 &lector, String esperado) {\n  if (!tarjetaDisponible(lector)) return false;\n  esperado.toUpperCase();\n  bool coincide = uidTarjeta(lector) == esperado;\n  lector.PICC_HaltA();\n  lector.PCD_StopCrypto1();\n  return coincide;\n}\n`;
  for (const helper of extensionHelpers) helpers += `\n${helper}\n`;

  const automaticLoop = indent([...loopPrelude].join('\n'));
  return `${[...includes].join('\n')}${includes.size ? '\n\n' : ''}${[...globals].join('\n')}${globals.size ? '\n' : ''}${helpers}\nvoid setup() {\n${indent([...setup].join('\n'))}${setupBody}}\n\nvoid loop() {\n${automaticLoop}${loopBody || (automaticLoop ? '' : '  // Agrega bloques dentro de "repetir siempre".\n')}}\n`;
}

export function registerExtensionGenerators(extension) {
  for (const definition of extension.blocks || []) {
    arduinoGenerator.forBlock[definition.type] = (block) => {
      let code = definition.code || '';
      for (const arg of [...(definition.args0 || []), ...(definition.args1 || []), ...(definition.args2 || [])]) {
        if (!arg.name) continue;
        const replacement = arg.type === 'input_value' ? value(block, arg.name) : block.getFieldValue(arg.name);
        code = code.replaceAll(`{{${arg.name}}}`, replacement);
      }
      if (definition.output != null || definition.codeKind === 'expression') return [code, ORDER.ATOMIC];
      return `${code}${code.endsWith('\n') ? '' : '\n'}`;
    };
  }
}

const DECLARATION_NAME_PATTERN = /^[^;{}]*?([A-Za-z_]\w*)\s*(?:\(|;|=)/;

function checkNamespaceConflict(declaredIdentifiers, scope, code, extension) {
  const match = code.match(DECLARATION_NAME_PATTERN);
  if (!match) return;
  const key = `${scope}:${match[1]}`;
  const previous = declaredIdentifiers.get(key);
  if (previous && previous.extensionId !== extension.id && previous.code !== code) {
    throw new Error(`Los sensores “${previous.extensionName}” y “${extension.name}” declaran de forma distinta algo llamado “${match[1]}”. No pueden usarse juntos en este proyecto: quita uno de los dos o pide una versión corregida del paquete.`);
  }
  if (!previous) declaredIdentifiers.set(key, { extensionId: extension.id, extensionName: extension.name, code });
}

function renderExtensionTemplate(template, block, definition) {
  let rendered = template;
  for (const arg of [...(definition.args0 || []), ...(definition.args1 || []), ...(definition.args2 || [])]) {
    if (!arg.name || arg.type === 'input_value') continue;
    rendered = rendered.replaceAll(`{{${arg.name}}}`, block.getFieldValue(arg.name));
  }
  return rendered;
}

function buildVariableIdentifiers(variables) {
  const used = new Set();
  const map = new Map();
  for (const variable of variables) {
    let base = safeName(variable.name);
    if (RESERVED_IDENTIFIERS.has(base)) base = `var_${base}`;
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    map.set(variable.getId(), candidate);
  }
  return map;
}

function variableName(block) {
  const model = block.workspace.getVariableMap().getVariableById(block.getFieldValue('VAR'));
  if (!model) return 'variable_indefinida';
  return variableIdentifiers.get(model.getId()) || safeName(model.name);
}

function safeName(name) {
  const clean = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(clean) ? `v_${clean}` : clean || 'variable';
}

function escapeText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function indent(code) {
  if (!code) return '';
  return code.split('\n').filter(Boolean).map((line) => `  ${line}\n`).join('');
}

function keypadPins(block) {
  return ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'].map((field) => block.getFieldValue(field));
}

function keypadId(block) {
  return keypadPins(block).join('_');
}

function keypadName(block) {
  return `teclado_${keypadId(block)}`;
}

function rfidName(block) {
  return `rfid_${block.getFieldValue('SS')}_${block.getFieldValue('RST')}`;
}

function stepperName(block) {
  return `pasos_${['IN1', 'IN2', 'IN3', 'IN4'].map((field) => block.getFieldValue(field)).join('_')}`;
}

function robotDriveCode(block, speed) {
  const pins = Object.fromEntries(['ENA', 'IN1', 'IN2', 'ENB', 'IN3', 'IN4'].map((field) => [field, block.getFieldValue(field)]));
  const states = {
    FORWARD: ['HIGH', 'LOW', 'HIGH', 'LOW'],
    BACKWARD: ['LOW', 'HIGH', 'LOW', 'HIGH'],
    LEFT: ['LOW', 'HIGH', 'HIGH', 'LOW'],
    RIGHT: ['HIGH', 'LOW', 'LOW', 'HIGH'],
    STOP: ['LOW', 'LOW', 'LOW', 'LOW']
  }[block.getFieldValue('ACTION')];
  const pwm = block.getFieldValue('ACTION') === 'STOP' ? '0' : `constrain(${speed}, 0, 255)`;
  return `digitalWrite(${pins.IN1}, ${states[0]});\ndigitalWrite(${pins.IN2}, ${states[1]});\ndigitalWrite(${pins.IN3}, ${states[2]});\ndigitalWrite(${pins.IN4}, ${states[3]});\nanalogWrite(${pins.ENA}, ${pwm});\nanalogWrite(${pins.ENB}, ${pwm});\n`;
}
