# Pruebas Arduino de AulaBlocks 0.6.0

Los programas fueron generados desde espacios de bloques y compilados con
Arduino CLI 1.5.1, Arduino AVR Boards 1.8.8 y MiniCore 3.1.3.

| Programa | Placa | Flash | RAM | Resultado |
|---|---:|---:|---:|---|
| Alarma: teclado, LCD, PIR, botón y RC522 | Mega 2560 | 12.358 B (4%) | 734 B (8%) | Correcto |
| Auto seguidor de línea con L298N | Uno | 2.340 B (7%) | 184 B (8%) | Correcto |
| Auto seguidor de línea con L298N | Nano ATmega328PB | 2.590 B (7%) | 184 B (8%) | Correcto |
| DHT11, NeoPixel, servo y paso a paso | Uno | 7.932 B (24%) | 318 B (15%) | Correcto |
| Sensores generales, ultrasonido y relé | Uno | 4.664 B (14%) | 200 B (9%) | Correcto |
| Extensión actualizable DS18B20 | Uno | 5.740 B (17%) | 243 B (11%) | Correcto |
| Paquete autónomo PN532 I2C | Uno | Pendiente de medición | Pendiente de medición | Correcto |
| Paquete HC-SR04 | Uno | 3.594 B (11%) | 200 B (9%) | Correcto |
| Paquete fotoresistencia LDR | Uno | 2.174 B (6%) | 188 B (9%) | Correcto |

Bibliotecas comprobadas:

- Keypad 3.1.1
- LiquidCrystal I2C 1.1.2
- MFRC522 1.4.12
- DHT sensor library 1.4.7
- Adafruit Unified Sensor 1.1.15
- Adafruit NeoPixel 1.15.5
- Servo 1.3.0
- Stepper 1.1.3
- OneWire 2.3.8
- DallasTemperature 4.0.6
- Adafruit PN532 1.3.4
- Adafruit BusIO 1.17.4

También se comprobó el servicio incluido en el instalador: detección de puertos,
instalación aislada del paquete PN532 con verificación SHA-256, persistencia del
catálogo, clasificación de puertos Arduino USB/CH340 frente a puertos internos,
instalación de paquetes que no requieren bibliotecas externas, compilación para
Uno, compilación para Nano ATmega328PB y validación de puertos y velocidades del
Monitor serial. Los archivos usados
por la matriz se encuentran en `tests/generated`. La prueba
se puede repetir con `tests/compile-arduino.ps1` después de regenerar los
programas con `tests/generate-sketches.mjs`.

El RC522 es apropiado para proyectos educativos de identificación, pero el UID
de una tarjeta puede clonarse. No debe considerarse un sistema de seguridad
real sin mecanismos adicionales.
