# Pruebas de AulaBlocks 0.10.0-beta.1

Antes de publicar una versión deben completarse estas pruebas en Windows.

## Automáticas

```powershell
npm ci
npm test
npm run build
npm run test:sensors
npm audit
```

`test:sensors` genera un programa con todos los bloques de cada paquete y lo
compila para Arduino Uno ATmega328P y Nano ATmega328PB. Debe terminar con 22
compilaciones correctas.

## Aplicación instalada

1. Abrir, crear, guardar y volver a abrir un proyecto.
2. Comprobar que solamente aparecen Uno y Nano.
3. Instalar un sensor `.aulasensor` nuevo y comprobar que aparece su categoría.
4. Abrir un proyecto cuyo sensor no esté instalado: debe indicar cuál falta y
   no debe abrirlo parcialmente.
5. Usar dos componentes en el mismo pin: debe advertir el conflicto.
6. Usar dos sensores I2C en A4/A5: no debe mostrar un conflicto falso.
7. Generar `(1 + 2) * 3`: el código debe conservar los paréntesis.
8. Crear un proyecto sin monitor: no debe aparecer `Serial.begin(9600)`.
9. Agregar “mostrar en monitor”: debe aparecer `Serial.begin(9600)`.
10. Probar comprobar, cargar y monitor serial con una placa real.

## Hardware real

- Arduino Uno ATmega328P y cable USB de datos.
- Nano ATmega328PB y su controlador USB correspondiente.
- Un sensor sin biblioteca, uno con biblioteca y PN532 por I2C.

La publicación queda detenida si alguna prueba falla.
