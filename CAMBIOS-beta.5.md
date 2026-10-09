# AulaBlocks 0.10.0-beta.5 — Windows

- Los diálogos de la aplicación quedan por encima del menú y ventanas emergentes de Blockly. El editor y la barra superior quedan inactivos y atenuados por el fondo del diálogo.
- El foco se mueve al diálogo y se restaura al cerrarlo; se impide acceder al editor con el teclado mientras el diálogo está abierto.
- Las variables antiguas sin tipo se tratan como números en las conexiones. No admiten texto ni condiciones. Si un proyecto ya contiene conexiones incompatibles, se informa antes de generar código.
- Los paquetes deben declarar Number, String o Boolean para cada salida de valor y los tipos admitidos por cada entrada de valor. Se comprueba tanto en la interfaz como en la instalación del paquete.
- Los once paquetes actuales cumplen estos requisitos; no necesitan una actualización de archivo.

Pruebas: 52 pruebas automáticas correctas, incluyendo conexiones de variables, rechazo de paquetes sin tipos tanto en interfaz como en instalación y apertura/cierre de diálogos en un DOM de prueba. Construcción de interfaz correcta y 22 compilaciones correctas de los 11 sensores para Uno y Nano. La prueba DOM no sustituye la inspección visual de la aplicación instalada.

Prueba manual recomendada: abrir un proyecto con cambios, intentar cerrar, comprobar que Inicio/Acciones/Botones quedan desenfocados y no se pueden seleccionar; usar Tab y después Cancelar. Repetir con Biblioteca de sensores y Crear variable. Verificar que al cerrar el diálogo el editor vuelve a responder.

No se publicó en GitHub ni se modificó 0.9.9 o beta.4. Fuente e instalador de esta entrega están en la nueva carpeta ChatGPT/aulablocks. Los límites de hardware y pruebas físicas descritos en el informe beta.4 siguen vigentes.
