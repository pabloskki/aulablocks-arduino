// Ayudas de lectura: no modifican conexiones, campos ni código Arduino.
export const blockHelp = {
  arduino_setup: 'Pon aquí lo que quieres hacer una sola vez al encender o reiniciar Arduino. Por ejemplo, mostrar «¡Hola!» en el monitor.',
  arduino_loop: 'Arduino repite lo que pongas aquí una y otra vez. ¡Así tu proyecto sigue atento!',
  digital_write: 'Enciende o apaga la salida del pin que elijas. Por ejemplo, puedes encender un LED conectado correctamente.',
  analog_write: 'Elige la fuerza de una salida PWM: 0 es apagada y 255 es el máximo. Por ejemplo, usa 128 para dar menos brillo a un LED.',
  digital_read: 'Entrega sí si el pin recibe una señal alta, y no si recibe una señal baja. No mide una cantidad.',
  analog_read: 'Entrega un número de 0 a 1023 según la señal del pin A. Puedes guardarlo en una variable o mostrarlo en el monitor.',
  wait_ms: 'Hace una pausa antes de seguir. 1000 milisegundos son 1 segundo. Durante la pausa no se ejecutan los siguientes bloques.',
  servo_write: 'Mueve un servo de posición al ángulo que elijas, entre 0 y 180 grados. Por ejemplo, 90 lo lleva al centro.',
  motor_drive: 'Elige hacia dónde gira el motor y su velocidad, de 0 a 255. Necesitas un controlador de motores; no lo conectes directamente a Arduino.',
  ultrasonic_read: 'Entrega la distancia en centímetros. Sin eco devuelve NaN (lectura inválida), nunca 0 cm. No interpretes una lectura inválida como un camino libre. El paquete HC-SR04 incluye un bloque para comprobar la validez.',
  dht_read: block => block.getFieldValue('KIND') === 'HUM'
    ? 'Entrega la humedad del aire en porcentaje. Por ejemplo, 60 significa 60 % de humedad.'
    : 'Entrega la temperatura en grados Celsius. Por ejemplo, 25 significa 25 °C.',
  buzzer_tone: 'Hace sonar un zumbador pasivo durante el tiempo que elijas. Una frecuencia más alta produce un sonido más agudo. 1000 ms son 1 segundo.',
  rgb_pixel: 'Mezcla rojo, verde y azul para dar color a un LED NeoPixel. Cada color va de 0 a 255. No es para un LED RGB común.',
  serial_print: 'Muestra un mensaje o un dato en el monitor. Por ejemplo, puedes mostrar «¡Hola!» o la distancia que midió tu sensor.',
  button_pressed: 'Responde sí cuando el botón está presionado y no cuando está suelto. Úsalo con «si» para decidir qué hacer. Pide ayuda para elegir la conexión correcta.',
  relay_set: 'Activa o desactiva un relé compatible de nivel bajo, como un interruptor. Pide ayuda a tu profesor para conectarlo; no manipules enchufes.',
  controls_if: 'Pregunta si algo se cumple. Si la respuesta es sí, hace los bloques de «hacer». Si agregas «sino», hace esos otros bloques cuando la respuesta es no.',
  controls_repeat_ext: 'Repite los bloques de adentro la cantidad de veces que elijas. Por ejemplo, 3 repite esas acciones tres veces.',
  controls_whileUntil: block => block.getFieldValue('MODE') === 'UNTIL'
    ? 'Repite lo de adentro hasta que la respuesta sea sí. Después continúa. Si nunca se cumple, no pasará a los bloques de abajo.'
    : 'Repite lo de adentro mientras la respuesta sea sí. Cuando sea no, continúa. Si siempre es sí, no pasará a los bloques de abajo.',
  logic_compare: 'Compara dos datos y responde sí o no. Por ejemplo: ¿la distancia es menor que 30? Elige el signo de la comparación que necesitas.',
  logic_operation: block => block.getFieldValue('OP') === 'OR'
    ? 'Responde sí si al menos una de las dos preguntas tiene respuesta sí. Por ejemplo, si presionas un botón o el otro.'
    : 'Responde sí solo si las dos preguntas tienen respuesta sí. Por ejemplo, si presionas los dos botones.',
  logic_negate: 'Cambia la respuesta al contrario: sí se vuelve no, y no se vuelve sí. Por ejemplo, «no está presionado».',
  logic_boolean: 'Entrega una respuesta fija: verdadero significa sí y falso significa no. No es un número ni un texto.',
  math_number: 'Escribe un número para tu proyecto. Por ejemplo, 30 para comparar una distancia o 1000 para una espera.',
  math_arithmetic: 'Hace la cuenta que elijas con dos números y entrega el resultado. Por ejemplo, 2 + 3 entrega 5.',
  math_random_int: 'Elige al azar un número entero entre los dos límites, incluidos los extremos. ¡Entre 1 y 6 funciona como un dado!',
  text: 'Escribe palabras o un mensaje, como «acceso permitido». Este bloque entrega texto; no lo muestra hasta que lo uses con otro bloque.',
  variables_get: 'Entrega el dato guardado en esta variable. Es como mirar dentro de una cajita con nombre, sin borrar lo que tiene.',
  variables_set: 'Guarda un dato en esta variable, como ponerlo en una cajita con nombre. El dato nuevo reemplaza al anterior.',
  math_change: 'Suma esta cantidad al número guardado en la variable. Si tenía 4 y sumas 1, ahora tendrá 5.'
};
blockHelp.variables_get_dynamic = blockHelp.variables_get;
blockHelp.variables_set_dynamic = blockHelp.variables_set;

const wrapped = new WeakSet();
export function installBlockHelp(Blockly) {
  // Let CSS wrap one paragraph instead of wrapping Blockly's pre-split lines twice.
  Blockly.Tooltip.setCustomTooltip((container, element) => {
    container.textContent = Blockly.Tooltip.getTooltipOfObject(element);
  });
  for (const [type, help] of Object.entries(blockHelp)) {
    const definition = Blockly.Blocks[type];
    if (!definition || wrapped.has(definition)) continue;
    const original = definition.init;
    definition.init = function (...args) {
      original.apply(this, args);
      this.setTooltip(typeof help === 'function' ? () => help(this) : help);
    };
    wrapped.add(definition);
  }
}

// Al actualizar un sensor también cambian las ayudas de bloques ya colocados.
export function refreshSensorHelp(workspace, definitions) {
  const help = new Map(definitions.map(block => [block.type, block.tooltip || '']));
  for (const block of workspace.getAllBlocks(false)) {
    if (help.has(block.type)) block.setTooltip(help.get(block.type));
  }
}
