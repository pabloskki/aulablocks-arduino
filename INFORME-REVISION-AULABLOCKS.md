# Informe de preparación de AulaBlocks 0.10.0-beta.1

Fecha: 1 de octubre de 2026.

Esta es una versión local de prueba. No debe publicarse hasta completar las
pruebas físicas indicadas en `PRUEBAS-ARDUINO.md`.

## Cambios incorporados

- Se corrigió la precedencia matemática y se agregaron pruebas para expresiones
  anidadas.
- `Serial.begin(9600)` se genera solamente al usar un bloque del monitor.
- Se retiró Arduino Mega de la interfaz; quedan Uno ATmega328P y Nano
  ATmega328PB.
- Los proyectos guardan los sensores requeridos y, al abrirlos, comprueban que
  el paquete y la versión estén instalados antes de modificar el proyecto.
- Los paquetes pueden declarar pines exclusivos, pines fijos y buses
  compartidos. I2C permite compartir A4/SDA y A5/SCL.
- Los 11 paquetes oficiales incluyen metadata de conexiones y nuevas versiones.
- Una biblioteca incompatible impide instalar el sensor completo; ya no queda
  un sensor visible con una dependencia incorrecta.
- Electron se actualizó a 44.5.1 y `npm audit` informa cero vulnerabilidades.
- `package-lock.json` y `pnpm-lock.yaml` quedaron sincronizados.
- Se agregaron pruebas automáticas y un flujo de verificación para GitHub.
- Los runtimes Arduino pueden reconstruirse con versiones fijadas y firmas
  SHA-256.
- Se agregó una licencia MIT para facilitar el uso educativo y la colaboración.

## Resultados automáticos

- 13 pruebas de JavaScript: correctas.
- Construcción de la interfaz Vite: correcta.
- Revisión estructural de 11 paquetes: cero errores y cero advertencias.
- Compilación de cada paquete para Uno y Nano: 22 de 22 correctas.
- Inicio del ejecutable empaquetado y Arduino CLI 1.5.1 incluido: correcto.
- Auditoría de dependencias: cero vulnerabilidades conocidas.

## Pendiente antes de publicar

- Instalar el ejecutable de prueba en este PC.
- Cargar un programa real en Arduino Uno.
- Repetir la carga con Nano ATmega328PB.
- Probar físicamente al menos HC-SR04, DHT y PN532 I2C.
- Confirmar que se desea publicar AulaBlocks bajo licencia MIT.
- Probar Linux Mint solamente después de aprobar Windows, según la decisión del
  proyecto.
