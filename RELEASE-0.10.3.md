# AulaBlocks Arduino 0.10.3 — correcciones de sensores

- HC-SR04 1.4.5: tiempo máximo de espera de eco de 30 ms, caché independiente por par TRIG/ECHO durante 60 ms y eliminación de la pausa fija de 200 ms por consulta.
- Sin eco, el bloque numérico devuelve NaN (lectura inválida) en vez de 0 cm. El bloque «más cerca» devuelve falso. Nuevo bloque «lectura válida» para distinguir fallos y programar la detención de actuadores. Una lectura inválida tampoco significa que el camino esté libre.
- El bloque ultrasónico incorporado recibe la misma corrección.
- La revisión de conexiones bloquea zumbador junto con PWM 3/11 en Uno/Nano, incluidos los controladores TB6612FNG.
- Se completa la validación de pines de los tipos antiguos que aún admite el generador, incluidos DHT, sensores analógicos, LCD I2C y RFID SPI. Los bloques del mismo LCD/lector/teclado comparten correctamente sus conexiones.

Windows x64: cerrar AulaBlocks e instalar la versión 0.10.3. También se incluyen los metadatos para buscar actualizaciones desde el programa.

Linux Mint Intel/AMD de 64 bits: instalar el paquete .deb 0.10.3 sobre la versión anterior; se incluye también una alternativa .tar.gz. La instalación en Linux no es automática.

Después, actualizar HC-SR04 a 1.4.5 desde la biblioteca de sensores, o usar «Añadir sensor → Instalar paquete local» para importar HC-SR04-1.4.5.aulasensor. Al abrir un proyecto anterior, se usa la versión instalada compatible del sensor. Los otros diez paquetes no necesitan actualizarse. El ZIP de sensores incluye los once paquetes para nuevas instalaciones.

La actualización conserva los tipos, entradas y opciones de los bloques anteriores del HC-SR04. Es necesario revisar la lógica de los proyectos que interpretaban 0 cm como «sin eco»: usar el nuevo bloque de validez y definir explícitamente qué hacer con los actuadores cuando sea falso. No se cambian automáticamente las decisiones del proyecto del usuario.

Quedan pendientes las pruebas con placas y sensores conectados y la validación de la aplicación en Linux Mint real.

Validación: 74 pruebas automáticas correctas; 22 compilaciones de los once paquetes para Uno y Nano; proyecto combinado DHT22 + HC-SR04 + Servo y comprobación de aritmética compilados en ambas placas; interfaz de producción compilada y correcciones verificadas en la aplicación empaquetada.
