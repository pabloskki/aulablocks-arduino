const DIGITAL_PINS = Array.from({ length: 52 }, (_, index) => [`${index + 2}`, `${index + 2}`]);
const BASIC_DIGITAL_PINS = Array.from({ length: 12 }, (_, index) => [`${index + 2}`, `${index + 2}`]);
const ANALOG_PINS = Array.from({ length: 6 }, (_, index) => [`A${index}`, `A${index}`]);
const PWM_PINS = [['3', '3'], ['5', '5'], ['6', '6'], ['9', '9'], ['10', '10'], ['11', '11']];

export const advancedBlockDefinitions = [
  {
    type: 'button_pressed',
    message0: 'botón en pin %1 está presionado conexión %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: BASIC_DIGITAL_PINS },
      { type: 'field_dropdown', name: 'WIRING', options: [['interna PULLUP', 'PULLUP'], ['resistencia externa', 'EXTERNAL']] }
    ],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Detecta un pulsador. Con PULLUP se conecta entre el pin y GND.'
  },
  {
    type: 'pir_motion',
    message0: 'sensor PIR en pin %1 detecta movimiento',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Detecta movimiento con un sensor HC-SR501.'
  },
  {
    type: 'line_sensor',
    message0: 'seguidor de línea pin %1 detecta %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'SURFACE', options: [['línea negra', 'BLACK'], ['superficie clara', 'WHITE']] }
    ],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Lee un módulo seguidor de línea digital TCRT5000.'
  },
  {
    type: 'obstacle_sensor',
    message0: 'sensor infrarrojo pin %1 detecta obstáculo',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Detecta obstáculos con el módulo infrarrojo habitual de los kits.'
  },
  {
    type: 'tilt_sensor',
    message0: 'sensor de inclinación pin %1 está inclinado',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS }],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Lee un interruptor de inclinación o vibración.'
  },
  {
    type: 'analog_sensor',
    message0: 'nivel de %1 en %2',
    args0: [
      { type: 'field_dropdown', name: 'SENSOR', options: [['luz', 'LIGHT'], ['sonido', 'SOUND'], ['agua', 'WATER'], ['humedad de suelo', 'SOIL'], ['gas/humo', 'GAS'], ['llama', 'FLAME'], ['potenciómetro', 'POT']] },
      { type: 'field_dropdown', name: 'PIN', options: ANALOG_PINS }
    ],
    output: 'Number', colour: '#20a99a',
    tooltip: 'Lee de 0 a 1023 los sensores analógicos habituales.'
  },
  {
    type: 'thermistor_celsius',
    message0: 'temperatura del termistor en %1 °C con resistencia %2 Ω',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: ANALOG_PINS },
      { type: 'field_number', name: 'RESISTOR', value: 10000, min: 100, max: 100000 }
    ],
    output: 'Number', colour: '#20a99a',
    tooltip: 'Calcula temperatura aproximada para un termistor NTC 10K.'
  },
  {
    type: 'joystick_axis',
    message0: 'joystick eje %1 en %2',
    args0: [
      { type: 'field_dropdown', name: 'AXIS', options: [['X', 'X'], ['Y', 'Y']] },
      { type: 'field_dropdown', name: 'PIN', options: ANALOG_PINS }
    ],
    output: 'Number', colour: '#20a99a',
    tooltip: 'Lee uno de los ejes del joystick.'
  },
  {
    type: 'keypad_key',
    message0: 'tecla leída del teclado 4x4',
    message1: 'filas %1 %2 %3 %4 columnas %5 %6 %7 %8',
    args1: keypadPinArgs(),
    output: 'String', colour: '#248fb5',
    tooltip: 'Devuelve la tecla pulsada o un texto vacío.'
  },
  {
    type: 'keypad_password_ok',
    message0: 'clave ingresada en teclado 4x4 es %1',
    args0: [{ type: 'input_value', name: 'PASSWORD', check: 'String' }],
    message1: 'filas %1 %2 %3 %4 columnas %5 %6 %7 %8',
    args1: keypadPinArgs(),
    output: 'Boolean', colour: '#248fb5',
    tooltip: 'Acumula las teclas; confirma con # y borra con *.'
  },
  {
    type: 'lcd_print',
    message0: 'LCD I2C %1 escribir %2 columna %3 fila %4',
    args0: [
      { type: 'field_dropdown', name: 'ADDRESS', options: [['0x27', '27'], ['0x3F', '3F']] },
      { type: 'input_value', name: 'VALUE' },
      { type: 'field_number', name: 'COL', value: 0, min: 0, max: 15 },
      { type: 'field_number', name: 'ROW', value: 0, min: 0, max: 1 }
    ],
    previousStatement: null, nextStatement: null, colour: '#4f78e8',
    tooltip: 'Escribe texto o números en una pantalla LCD 16x2 con adaptador I2C.'
  },
  {
    type: 'lcd_clear',
    message0: 'limpiar LCD I2C %1',
    args0: [{ type: 'field_dropdown', name: 'ADDRESS', options: [['0x27', '27'], ['0x3F', '3F']] }],
    previousStatement: null, nextStatement: null, colour: '#4f78e8',
    tooltip: 'Borra todo el contenido de la pantalla.'
  },
  {
    type: 'rfid_card_present',
    message0: 'RFID/NFC RC522 detecta tarjeta SS %1 RST %2',
    args0: [
      { type: 'field_dropdown', name: 'SS', options: pinsStartingWith('10') },
      { type: 'field_dropdown', name: 'RST', options: pinsStartingWith('9') }
    ],
    output: 'Boolean', colour: '#248fb5',
    tooltip: 'Detecta y lee una tarjeta compatible con el módulo RC522.'
  },
  {
    type: 'rfid_uid_matches',
    message0: 'tarjeta RFID/NFC tiene UID %1 SS %2 RST %3',
    args0: [
      { type: 'input_value', name: 'UID', check: 'String' },
      { type: 'field_dropdown', name: 'SS', options: pinsStartingWith('10') },
      { type: 'field_dropdown', name: 'RST', options: pinsStartingWith('9') }
    ],
    output: 'Boolean', colour: '#248fb5',
    tooltip: 'Compara el UID leído, por ejemplo: DE AD BE EF.'
  },
  {
    type: 'rfid_uid_text',
    message0: 'UID de tarjeta RFID/NFC SS %1 RST %2',
    args0: [
      { type: 'field_dropdown', name: 'SS', options: pinsStartingWith('10') },
      { type: 'field_dropdown', name: 'RST', options: pinsStartingWith('9') }
    ],
    output: 'String', colour: '#248fb5',
    tooltip: 'Devuelve el UID de la última tarjeta leída.'
  },
  {
    type: 'relay_set',
    message0: 'relé en pin %1 %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'STATE', options: [['activar', 'ON'], ['desactivar', 'OFF']] }
    ],
    previousStatement: null, nextStatement: null, colour: '#4f78e8',
    tooltip: 'Activa o desactiva un módulo relé de nivel bajo.'
  },
  {
    type: 'robot_drive',
    message0: 'auto %1 velocidad %2',
    args0: [
      { type: 'field_dropdown', name: 'ACTION', options: [['avanzar', 'FORWARD'], ['retroceder', 'BACKWARD'], ['girar izquierda', 'LEFT'], ['girar derecha', 'RIGHT'], ['detener', 'STOP']] },
      { type: 'input_value', name: 'SPEED', check: 'Number' }
    ],
    message1: 'L298N ENA %1 IN1 %2 IN2 %3 ENB %4 IN3 %5 IN4 %6',
    args1: [
      { type: 'field_dropdown', name: 'ENA', options: pwmStartingWith('5') },
      { type: 'field_dropdown', name: 'IN1', options: pinsStartingWith('7') },
      { type: 'field_dropdown', name: 'IN2', options: pinsStartingWith('8') },
      { type: 'field_dropdown', name: 'ENB', options: pwmStartingWith('6') },
      { type: 'field_dropdown', name: 'IN3', options: pinsStartingWith('9') },
      { type: 'field_dropdown', name: 'IN4', options: pinsStartingWith('10') }
    ],
    previousStatement: null, nextStatement: null, colour: '#9a56d7',
    tooltip: 'Controla dos motores DC mediante un puente H L298N.'
  },
  {
    type: 'stepper_move',
    message0: 'motor paso a paso mover %1 pasos velocidad %2 rpm',
    args0: [
      { type: 'input_value', name: 'STEPS', check: 'Number' },
      { type: 'field_number', name: 'RPM', value: 12, min: 1, max: 20 }
    ],
    message1: 'pines IN1 %1 IN2 %2 IN3 %3 IN4 %4',
    args1: [
      { type: 'field_dropdown', name: 'IN1', options: pinsStartingWith('8') },
      { type: 'field_dropdown', name: 'IN2', options: pinsStartingWith('10') },
      { type: 'field_dropdown', name: 'IN3', options: pinsStartingWith('9') },
      { type: 'field_dropdown', name: 'IN4', options: pinsStartingWith('11') }
    ],
    previousStatement: null, nextStatement: null, colour: '#9a56d7',
    tooltip: 'Controla un motor 28BYJ-48 con ULN2003.'
  }
];

function keypadPinArgs() {
  return [
    { type: 'field_dropdown', name: 'R1', options: pinsStartingWith('22') },
    { type: 'field_dropdown', name: 'R2', options: pinsStartingWith('23') },
    { type: 'field_dropdown', name: 'R3', options: pinsStartingWith('24') },
    { type: 'field_dropdown', name: 'R4', options: pinsStartingWith('25') },
    { type: 'field_dropdown', name: 'C1', options: pinsStartingWith('26') },
    { type: 'field_dropdown', name: 'C2', options: pinsStartingWith('27') },
    { type: 'field_dropdown', name: 'C3', options: pinsStartingWith('28') },
    { type: 'field_dropdown', name: 'C4', options: pinsStartingWith('29') }
  ];
}

function pinsStartingWith(value) {
  return [[value, value], ...DIGITAL_PINS.filter((option) => option[1] !== value)];
}

function pwmStartingWith(value) {
  return [[value, value], ...PWM_PINS.filter((option) => option[1] !== value)];
}
