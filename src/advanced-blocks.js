const DIGITAL_PINS = Array.from({ length: 12 }, (_, index) => [`${index + 2}`, `${index + 2}`]);

// Solo permanecen componentes genéricos que no dependen de un modelo concreto.
// Sensores, motores, pantallas y lectores se distribuyen como .aulasensor.
export const advancedBlockDefinitions = [
  {
    type: 'button_pressed',
    message0: 'botón en pin %1 está presionado conexión %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: DIGITAL_PINS },
      { type: 'field_dropdown', name: 'WIRING', options: [['interna PULLUP', 'PULLUP'], ['resistencia externa', 'EXTERNAL']] }
    ],
    output: 'Boolean', colour: '#20a99a',
    tooltip: 'Detecta un pulsador. Con PULLUP se conecta entre el pin y GND.'
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
  }
];
