import * as Blockly from 'blockly/core';
import { advancedBlockDefinitions } from './advanced-blocks.js';

const BlocklyApi = Blockly.defineBlocksWithJsonArray ? Blockly : Reflect.get(Blockly, 'default');

export const CATEGORY_COLOURS = {
  events: '#f4a62a',
  actions: '#4f78e8',
  buttons: '#18a889',
  sensors: '#20a99a',
  motors: '#9a56d7',
  control: '#ef6677',
  variables: '#e76f51',
  extensions: '#596780'
};

export function registerArduinoBlocks() {
  BlocklyApi.defineBlocksWithJsonArray([
    {
      type: 'arduino_setup',
      message0: 'al encender Arduino %1 hacer %2',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' }
      ],
      colour: CATEGORY_COLOURS.events,
      tooltip: 'Acciones que se ejecutan una sola vez al encender la placa.'
    },
    {
      type: 'arduino_loop',
      message0: 'repetir siempre %1 %2',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' }
      ],
      colour: CATEGORY_COLOURS.events,
      tooltip: 'Acciones que Arduino repetira continuamente.'
    },
    {
      type: 'digital_write',
      message0: 'poner pin digital %1 en %2',
      args0: [
        { type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) },
        { type: 'field_dropdown', name: 'STATE', options: [['ENCENDIDO', 'HIGH'], ['APAGADO', 'LOW']] }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.actions,
      tooltip: 'Enciende o apaga una salida digital.'
    },
    {
      type: 'analog_write',
      message0: 'brillo del pin %1 a %2',
      args0: [
        { type: 'field_dropdown', name: 'PIN', options: [['3', '3'], ['5', '5'], ['6', '6'], ['9', '9'], ['10', '10'], ['11', '11']] },
        { type: 'input_value', name: 'VALUE', check: 'Number' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.actions,
      tooltip: 'Controla brillo o potencia entre 0 y 255.'
    },
    {
      type: 'digital_read',
      message0: 'pin digital %1 esta activo',
      args0: [{ type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) }],
      output: 'Boolean',
      colour: CATEGORY_COLOURS.sensors,
      tooltip: 'Lee un boton u otro sensor digital.'
    },
    {
      type: 'analog_read',
      message0: 'valor del sensor analogico %1',
      args0: [{ type: 'field_dropdown', name: 'PIN', options: pinOptions(0, 5, 'A') }],
      output: 'Number',
      colour: CATEGORY_COLOURS.sensors,
      tooltip: 'Lee un valor de 0 a 1023.'
    },
    {
      type: 'wait_ms',
      message0: 'esperar %1 milisegundos',
      args0: [{ type: 'input_value', name: 'TIME', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.control,
      tooltip: 'Pausa el programa durante el tiempo indicado.'
    },
    {
      type: 'servo_write',
      message0: 'mover servo del pin %1 a %2 grados',
      args0: [
        { type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) },
        { type: 'input_value', name: 'ANGLE', check: 'Number' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.motors,
      tooltip: 'Mueve un servomotor entre 0 y 180 grados.'
    },
    {
      type: 'motor_drive',
      message0: 'motor DC IN1 %1 IN2 %2 PWM %3 direccion %4 velocidad %5',
      args0: [
        { type: 'field_dropdown', name: 'IN1', options: pinOptions(2, 13) },
        { type: 'field_dropdown', name: 'IN2', options: pinOptions(2, 13) },
        { type: 'field_dropdown', name: 'PWM', options: [['3', '3'], ['5', '5'], ['6', '6'], ['9', '9'], ['10', '10'], ['11', '11']] },
        { type: 'field_dropdown', name: 'DIR', options: [['ADELANTE', 'FORWARD'], ['ATRAS', 'BACKWARD'], ['DETENER', 'STOP']] },
        { type: 'input_value', name: 'SPEED', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.motors,
      tooltip: 'Controla un motor DC mediante un puente H.'
    },
    {
      type: 'ultrasonic_read',
      message0: 'distancia ultrasonido TRIG %1 ECHO %2 en cm',
      args0: [
        { type: 'field_dropdown', name: 'TRIG', options: pinOptions(2, 13) },
        { type: 'field_dropdown', name: 'ECHO', options: pinOptions(2, 13) }
      ],
      output: 'Number',
      colour: CATEGORY_COLOURS.sensors,
      tooltip: 'Mide distancia con un sensor HC-SR04.'
    },
    {
      type: 'dht_read',
      message0: '%1 del DHT11 en pin %2',
      args0: [
        { type: 'field_dropdown', name: 'KIND', options: [['temperatura', 'TEMP'], ['humedad', 'HUM']] },
        { type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) }
      ],
      output: 'Number',
      colour: CATEGORY_COLOURS.sensors,
      tooltip: 'Lee temperatura o humedad de un DHT11.'
    },
    {
      type: 'buzzer_tone',
      message0: 'tocar zumbador pin %1 frecuencia %2 durante %3 ms',
      args0: [
        { type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) },
        { type: 'input_value', name: 'FREQ', check: 'Number' },
        { type: 'input_value', name: 'TIME', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.actions,
      tooltip: 'Reproduce un tono con un zumbador pasivo.'
    },
    {
      type: 'rgb_pixel',
      message0: 'LED RGB pin %1 rojo %2 verde %3 azul %4',
      args0: [
        { type: 'field_dropdown', name: 'PIN', options: pinOptions(2, 13) },
        { type: 'input_value', name: 'R', check: 'Number' },
        { type: 'input_value', name: 'G', check: 'Number' },
        { type: 'input_value', name: 'B', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.actions,
      tooltip: 'Controla un LED NeoPixel compatible.'
    },
    {
      type: 'serial_print',
      message0: 'mostrar en monitor %1',
      args0: [{ type: 'input_value', name: 'VALUE' }],
      previousStatement: null,
      nextStatement: null,
      colour: CATEGORY_COLOURS.actions,
      tooltip: 'Envia un valor al monitor serial.'
    }
  ]);
  BlocklyApi.defineBlocksWithJsonArray(advancedBlockDefinitions);
}

function pinOptions(start, end, prefix = '') {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = `${prefix}${start + index}`;
    return [value, value];
  });
}

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: 'Inicio', colour: CATEGORY_COLOURS.events,
      contents: [{ kind: 'block', type: 'arduino_setup' }, { kind: 'block', type: 'arduino_loop' }]
    },
    {
      kind: 'category', name: 'Acciones', colour: CATEGORY_COLOURS.actions,
      contents: [
        { kind: 'block', type: 'digital_write' },
        { kind: 'block', type: 'analog_write', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 128 } } } } },
        { kind: 'block', type: 'buzzer_tone', inputs: { FREQ: { shadow: { type: 'math_number', fields: { NUM: 440 } } }, TIME: { shadow: { type: 'math_number', fields: { NUM: 500 } } } } },
        { kind: 'block', type: 'rgb_pixel', inputs: { R: { shadow: { type: 'math_number', fields: { NUM: 255 } } }, G: { shadow: { type: 'math_number', fields: { NUM: 80 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 30 } } } } },
        { kind: 'block', type: 'relay_set' },
        { kind: 'block', type: 'serial_print', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'Hola, Arduino!' } } } } }
      ]
    },
    {
      kind: 'category', name: 'Botones', colour: CATEGORY_COLOURS.buttons,
      contents: [{ kind: 'block', type: 'button_pressed' }]
    },
    {
      kind: 'category', name: 'Control', colour: CATEGORY_COLOURS.control,
      contents: [
        { kind: 'block', type: 'wait_ms', inputs: { TIME: { shadow: { type: 'math_number', fields: { NUM: 1000 } } } } },
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'controls_whileUntil' }
      ]
    },
    {
      kind: 'category', name: 'Logica', colour: '#47a6d8',
      contents: [{ kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_negate' }, { kind: 'block', type: 'logic_boolean' }]
    },
    {
      kind: 'category', name: 'Numeros', colour: '#59a95a',
      contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }, { kind: 'block', type: 'math_random_int' }]
    },
    {
      kind: 'category', name: 'Texto', colour: '#b56eaa',
      contents: [{ kind: 'block', type: 'text' }]
    },
    { kind: 'category', name: 'Variables', custom: 'AULABLOCKS_VARIABLES', colour: CATEGORY_COLOURS.variables }
  ]
};
