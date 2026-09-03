# Informe de revisión de AulaBlocks

Fecha de revisión: 2 de septiembre de 2026

Estado revisado: código fuente identificado como `0.9.4` en `package.json`. El instalador publicado en la carpeta "última versión" todavía corresponde a `0.9.3`, por lo que este archivo fuente debe considerarse una versión de desarrollo y no una entrega terminada.

## Resultado general

La aplicación puede construirse correctamente. La interfaz principal abre sin errores visibles, permite crear variables de texto y genera programas Arduino. También se regeneraron los ejemplos y se compilaron localmente para Arduino Uno ATmega328P y Nano ATmega328PB.

Esto no significa que todos los recorridos estén libres de errores. La revisión encontró riesgos que conviene corregir antes de distribuir el programa en más computadores.

## Problemas de prioridad alta

### 1. Abrir un proyecto defectuoso puede borrar el proyecto actual

En `src/main.js`, `openProject()` ejecuta `workspace.clear()` y `clearProjectExtensions()` antes de comprobar que todas las extensiones y todos los bloques del archivo se puedan cargar. Si el archivo está dañado, usa una versión futura o le falta un sensor, el bloque `catch` muestra un error, pero el proyecto que estaba abierto ya fue eliminado de la memoria.

Recomendación: validar y cargar primero en un espacio de trabajo temporal. Reemplazar el proyecto actual solamente cuando la carga completa haya terminado correctamente.

### 2. Actualizar un sensor puede dejar bloques y generadores antiguos

En `registerExtension()`, al actualizar un sensor se eliminan sus definiciones de `Blockly.Blocks`, pero no se eliminan en ese punto los generadores anteriores de `arduinoGenerator.forBlock`, ni las entradas antiguas del mapa de propietarios que ya no aparecen en la versión nueva. Si una versión elimina o cambia el nombre de un bloque, un proyecto abierto puede conservar un bloque fantasma y seguir generando código antiguo.

Recomendación: calcular los tipos de la versión anterior, retirar bloques obsoletos del espacio de trabajo o migrarlos explícitamente, y limpiar definición, generador y propietario como una sola operación atómica.

### 3. Las bibliotecas incluidas pueden quedar antiguas después de actualizar AulaBlocks

`ensureBundledLibraries()` usa siempre el marcador `.aulablocks-bundled-v1`. Después de la primera instalación, versiones posteriores de la aplicación no vuelven a copiar bibliotecas incorporadas aunque hayan sido corregidas o actualizadas.

Recomendación: relacionar el marcador con la versión real del conjunto de bibliotecas, por ejemplo `.aulablocks-bundled-v2`, o guardar un manifiesto con versión y hash por biblioteca.

### 4. Dos sensores pueden sobrescribir la misma biblioteca con versiones incompatibles

La instalación reemplaza completamente la carpeta indicada por `library.folder`. No existe resolución de dependencias ni comprobación de compatibilidad entre paquetes ya instalados. Si dos sensores incluyen versiones diferentes de una biblioteca con el mismo nombre de carpeta, el último paquete instalado gana y puede romper el primero.

Recomendación: mantener un registro de biblioteca, versión y hash; rechazar conflictos incompatibles o probar todos los sensores afectados antes de aceptar la sustitución.

### 5. Los nombres de variables pueden colisionar o ser palabras reservadas

`safeName()` sustituye símbolos por guiones bajos, pero no comprueba colisiones ni palabras reservadas de C++. Por ejemplo, `luz total` y `luz-total` se convierten ambos en `luz_total`. Un nombre como `while`, `float` o `setup` puede producir código inválido o interferir con el programa.

Recomendación: asignar a cada variable un identificador interno único y estable, y mantener el nombre amistoso solamente en la pantalla.

### 6. El monitor serial no espera realmente a que el puerto se cierre

`stopSerialMonitor()` llama a `child.kill()` y devuelve inmediatamente. La compilación/carga o una reapertura del monitor puede comenzar mientras el proceso anterior todavía conserva el puerto COM. Esto puede producir fallos intermitentes de "puerto ocupado".

Recomendación: esperar el evento `close`, con un tiempo máximo, antes de resolver la operación de cierre.

## Problemas de prioridad media

### 7. Al abrir un proyecto no se actualizan todos los controles de placa

`openProject()` cambia el valor de `board-select` y el texto de la etiqueta, pero no llama a `updateBoardControls()`. La ilustración, el estado y la disponibilidad de los botones pueden seguir representando la placa anterior.

### 8. No se detectan conflictos de pines

`findPinsOutsideBoard()` detecta algunos pines fuera de rango, pero no detecta dos componentes incompatibles usando el mismo pin, el uso de SDA/SCL por otra función, ni el uso de un pin sin PWM en una salida analógica definida por un paquete externo.

### 9. Los recursos de código de distintos sensores no tienen espacio de nombres

Los `includes`, globales y ayudantes se deduplican por coincidencia exacta de texto. Dos paquetes pueden declarar la misma función o variable con contenidos diferentes y generar una redefinición de C++.

Recomendación: exigir un prefijo derivado del identificador del sensor y validar símbolos repetidos al instalar el paquete.

### 10. La comprobación visual no es una compilación

El botón `Revisar` solamente comprueba estructura, bloques sueltos y ciertos rangos de pines. Aun así, el mensaje afirma que todo está listo. Para una comprobación real debe usarse el botón `Comprobar`, que ejecuta el compilador Arduino.

Recomendación: cambiar el texto de éxito a "La estructura de bloques está ordenada" y explicar que falta compilar.

### 11. Un archivo de proyecto demasiado grande puede congelar la interfaz

La apertura de `.aulablocks` no impone un límite de tamaño antes de leer y analizar JSON. Un archivo accidentalmente enorme puede consumir mucha memoria o dejar la aplicación sin responder.

### 12. El monitor oculta detalles útiles

Casi todos los mensajes de error no reconocidos del proceso serial se convierten en "El monitor recibió un aviso del puerto serial". Esto es amigable para niños, pero elimina información necesaria para que el profesor diagnostique el problema.

Recomendación: mantener el mensaje simple y ofrecer el detalle técnico en una sección desplegable.

## Estado de pruebas

- Construcción web con Vite: correcta.
- Interfaz local: abre correctamente; creación de variable de texto correcta; biblioteca abre correctamente; sin errores de consola durante esta prueba.
- Generación de ejemplos: correcta, con una advertencia en un ejemplo antiguo que intenta seleccionar el pin 31 en un bloque de botón que solamente ofrece pines 2 a 13.
- Compilación local de PN532 1.7.0: correcta para Uno y Nano ATmega328PB.
- Servicio Arduino y paquetes actuales: compilación correcta después de regenerar los ejemplos.
- Prueba `test-text-variable-pn532.mjs`: falla porque espera que una variable numérica sin ningún bloque asociado aparezca en el código. El comportamiento actual de no escribir variables sin uso coincide con el diseño acordado; la prueba está desactualizada.
- Prueba del monitor serial: requiere indicar un puerto COM y una placa conectada; no es una prueba automática.

## Inconsistencias de versión detectadas

- `package.json` declara AulaBlocks `0.9.4`.
- La carpeta de distribución de Windows conserva como última versión el instalador `0.9.3`.
- El generador del paquete PN532 declara `1.7.1`, pero el paquete disponible y sus pruebas todavía usan `1.7.0`.
- Las pruebas PN532 todavía esperan el comportamiento de `1.7.0`; el trabajo de `1.7.1` no está terminado ni debe publicarse todavía.

## Prioridad sugerida de corrección

1. Hacer segura y reversible la apertura de proyectos.
2. Corregir actualización y migración de sensores.
3. Corregir colisiones de variables y símbolos de extensiones.
4. Esperar el cierre real del monitor serial.
5. Versionar bibliotecas incorporadas y detectar conflictos.
6. Unificar las versiones publicadas y actualizar las pruebas.
7. Añadir detección de conflictos de pines y límites de archivos.

