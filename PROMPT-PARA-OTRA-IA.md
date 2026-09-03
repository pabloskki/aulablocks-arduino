# Solicitud de revisión independiente de AulaBlocks

Quiero que actúes como revisor técnico independiente de AulaBlocks, una aplicación educativa de escritorio basada en Electron, Vite y Blockly que genera, compila y carga programas Arduino sin requerir Internet.

## Objetivo del producto

- Usuarios principales: profesores y niños con conocimiento computacional bajo o nulo.
- Plataformas actuales de prueba: Windows.
- Placas con carga directa: Arduino Uno ATmega328P y Nano compatible ATmega328PB.
- Los sensores se distribuyen como archivos `.aulasensor`.
- Un paquete de sensor puede incluir imagen, bloques, generación de C++ y bibliotecas Arduino completas para uso sin conexión.
- Instalar un sensor debe conservarlo en la Biblioteca de sensores.
- Añadirlo al proyecto debe crear su categoría de bloques.
- Quitar el sensor del proyecto debe quitar sus bloques, pero no desinstalar sus bibliotecas.
- El generador solo debe escribir el código correspondiente a los bloques que realmente están presentes.

## Qué debes revisar

1. Seguridad al guardar y abrir proyectos `.aulablocks`.
2. Instalación, actualización y eliminación lógica de sensores.
3. Resolución de bibliotecas compartidas y versiones incompatibles.
4. Registro y eliminación de bloques Blockly y sus generadores.
5. Generación de C++ válido: nombres, tipos, precedencia, declaraciones duplicadas y dependencias.
6. Conflictos y validación de pines para Uno y Nano ATmega328PB.
7. Compilación, carga por USB, detección de puertos y monitor serial.
8. Funcionamiento completamente sin Internet en un PC nuevo.
9. Seguridad de Electron, IPC, archivos importados, imágenes y rutas de biblioteca.
10. Accesibilidad, claridad de mensajes y riesgos de pérdida de trabajo para niños.
11. Calidad de las pruebas: confirma que generen código nuevo y no compilen archivos antiguos por accidente.
12. Coherencia entre versión fuente, instalador, paquetes de sensores y catálogo.

## Forma de respuesta solicitada

Entrega los hallazgos ordenados por severidad. Para cada uno indica:

- archivo y línea aproximada;
- situación que lo provoca;
- resultado visible para el usuario;
- cómo reproducirlo;
- corrección concreta;
- prueba automática que evitaría una regresión.

No asumas que una compilación correcta demuestra que el hardware funciona. Separa claramente:

- comprobado por prueba automática;
- comprobado solamente en interfaz;
- pendiente de prueba física con Arduino y sensores.

Antes de proponer una gran reescritura, prioriza correcciones pequeñas y verificables que conserven la interfaz educativa actual.

## Observaciones iniciales que debes confirmar o refutar

- Abrir un proyecto defectuoso parece limpiar el proyecto actual antes de terminar la validación.
- Actualizar un sensor puede dejar generadores de bloques antiguos.
- El marcador fijo de bibliotecas puede impedir que una actualización copie bibliotecas corregidas.
- Dos variables diferentes pueden convertirse en el mismo identificador C++.
- El monitor serial puede liberar el puerto de forma asíncrona y competir con la carga.
- La fuente declara una versión más nueva que el instalador publicado.

