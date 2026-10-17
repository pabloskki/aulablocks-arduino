export const sensorHelp = {
  servo_sg90_angle: 'Mueve el brazo de tu servo de posición al ángulo que elijas, entre 0 y 180 grados. Por ejemplo, 90 lo lleva al centro. ¡Puedes abrir una pequeña barrera!',
  tt_encoder_pulses: 'Entrega la cuenta de pulsos del motor: son pequeñas señales que aparecen al girar. La cuenta sube en un sentido y baja en el otro. No son centímetros.',
  tt_encoder_revolutions: 'Entrega las vueltas calculadas con los pulsos contados. Pide a tu profesor ajustar los pulsos por vuelta: las vueltas del eje del motor pueden ser distintas de las de la rueda.',
  tt_encoder_reset: 'Pone la cuenta de pulsos en cero para empezar a contar de nuevo. No detiene el motor.',
  tb6612_motor_a: 'Controla el motor A del TB6612FNG. Elige el sentido y una velocidad de 0 a 255. 0 lo detiene. Pide ayuda para conectar el motor al controlador, no directamente a Arduino.',
  tb6612_motor_b: 'Controla el motor B del TB6612FNG. Elige el sentido y una velocidad de 0 a 255. 0 lo detiene. Pide ayuda para conectar el motor al controlador, no directamente a Arduino.',
  tcrt5000_line_digital: 'Responde sí o no según la señal de tu sensor de línea. Elige con tu profesor qué señal corresponde a la línea. ¡Puedes usarlo para que tu auto siga un camino!',
  tcrt5000_reflection_analog: 'Entrega un número de 0 a 1023 según la luz infrarroja que vuelve del suelo. Prueba sobre blanco y negro para ver la diferencia. No entrega el nombre del color.',
  ldr_light_raw: 'Entrega un número de 0 a 1023 según la luz y la conexión de tu LDR. Tápala y destápala para descubrir cómo cambia. No es el valor de su resistencia.',
  ldr_light_percent: 'Convierte la lectura de tu LDR en un número de 0 a 100. Es una escala para comparar, no una medida exacta de luz. Prueba si sube o baja al taparla.',
  ldr_is_dark: 'Responde sí cuando la lectura de la LDR es menor que el límite que elegiste. Prueba con tu profesor qué número corresponde a la oscuridad en tu conexión.',
  ldr_control_output: 'Enciende la salida si la lectura de luz cumple la comparación que elegiste; si no, la apaga. ¡Puedes crear una luz automática! Ajusta el límite probando tu LDR.',
  hcsr501_motion: 'Responde sí cuando el sensor avisa que detectó movimiento. Por ejemplo, una persona que pasa. El aviso puede durar unos segundos aunque la persona ya se haya detenido.',
pn532_adafruit_reader_active: 'Responde sí si el lector NFC respondió al iniciar o reiniciar. No significa que haya una tarjeta encima ni comprueba continuamente los cables.',
  pn532_adafruit_card_present: 'Busca una tarjeta o sticker NFC y responde sí si lo detecta. Acércalo al lector y usa esta respuesta con «si» para decidir qué hacer.',
  pn532_adafruit_tag_type: 'Entrega un texto con el tipo de tarjeta que reconoce, como NTAG215. No es el mensaje guardado en ella. Algunas tarjetas solo se reconocen por su familia.',
  pn532_adafruit_uid_any: 'Entrega como texto el identificador UID de la tarjeta, parecido a una etiqueta con letras y números. No es el mensaje que escribiste. Si no puede leerlo, entrega texto vacío.',
pn532_adafruit_text_any: 'Entrega el mensaje guardado, como «permitido», si está en formato NDEF compatible. Lee NTAG, Ultralight y algunas MIFARE Classic con clave conocida. Puedes mostrarlo o compararlo. Si falla, puede entregar texto vacío o un aviso de memoria.',
  pn532_adafruit_reset_pin: 'Reinicia el lector usando el pin que elijas. Pide a tu profesor conectar RSTPDN, no RSTO. Úsalo solo cuando necesites reiniciar el lector, no para leer cada tarjeta.',
  fc51_obstacle_detected: 'Responde sí cuando el sensor detecta un objeto delante. ¡Úsalo para que tu robot reaccione! No mide la distancia en centímetros.',
  fc51_digital_value: 'Entrega la señal del sensor: normalmente 0 cuando detecta un objeto y 1 cuando no. No es una distancia. Prueba acercando y alejando tu mano.',
  hcsr04_distance_cm: 'Entrega la distancia hasta un objeto, en centímetros. Por ejemplo, 20 significa unos 20 cm. Si devuelve 0, no recibió eco: revisa la posición y la conexión con tu profesor.',
  hcsr04_object_closer_than: 'Responde sí si detecta un objeto más cerca que los centímetros que elegiste. Por ejemplo, menos de 30 cm. Si no recibe eco, responde no.'
};
for (const model of ['dht11', 'dht22']) {
  sensorHelp[`${model}_temperature`] = 'Entrega la temperatura del aire en grados Celsius. Por ejemplo, 25 significa 25 °C. Puedes mostrarla o guardarla en una variable. Si la lectura falla, no entrega un número válido.';
  sensorHelp[`${model}_humidity`] = 'Entrega la humedad del aire en porcentaje. Por ejemplo, 60 significa 60 %. No mide agua en el suelo. Si la lectura falla, no entrega un número válido.';
  sensorHelp[`${model}_responding`] = 'Responde sí si pudo leer la temperatura del sensor. Si responde no, pide ayuda para revisar la conexión antes de usar la medida.';
}
