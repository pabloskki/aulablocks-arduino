# AulaBlocks 0.10.1 · ayudas para niños

Preparada localmente el 17 de octubre de 2026. El estado de publicación e instaladores se consulta en GitHub Releases; véase RELEASE-0.10.1.md.

## Cambios

- Ayudas al pasar el mouse sin seleccionar el bloque, usando el mecanismo nativo de Blockly (aproximadamente 0,75 segundos).
- Explicaciones de acciones, datos entregados, unidades y ejemplos. Variables como cajitas con nombre; condiciones como respuestas sí/no.
- Ayudas que distinguen mientras/hasta, y/o y temperatura/humedad según la opción elegida.
- Texto legible en un solo párrafo, fondo claro y ocultación durante diálogos.
- Los 11 paquetes externos incluyen ayudas para sus 29 bloques. No se modificaron imágenes, bibliotecas, pines, conexiones ni código Arduino.
- Al actualizar un sensor en el proyecto se refresca también la ayuda de los bloques ya colocados.
- Las versiones anteriores se conservan. Los sensores siguen instalándose por separado.

## Comprobaciones realizadas

- 63 pruebas automáticas correctas, incluyendo igualdad del código generado antes/después y actualizaciones offline de paquetes con plataformas Windows/Linux simuladas en Windows. Las ayudas se muestran como texto plano, no como HTML ejecutable de los paquetes.
- Compilación de interfaz correcta.
- 22 compilaciones Arduino correctas: los 11 sensores en Uno y Nano ATmega328PB.
- Prueba en navegador con eventos de mouse simulados: aparece la ayuda del HC-SR04 con cero clics, sin selección ni modificación del proyecto. Se revisó visualmente la legibilidad.
- No se realizó una prueba física de sensores ni instalación real en Linux.

## Cómo probar

1. Guarda una copia de tus proyectos antes de actualizar.
2. Instala la nueva versión de Windows cuando quieras probarla.
3. Descomprime los sensores y usa «Añadir sensor» para instalar los paquetes .aulasensor nuevos.
4. Añade el sensor al proyecto desde la biblioteca. Si un proyecto conserva una versión antigua, actualiza el sensor en ese proyecto; no basta con conservar el paquete antiguo.
5. Deja quieto el mouse sobre un bloque sin hacer clic. Comprueba tanto el menú como los bloques colocados.
6. Prueba distancia, temperatura, servo, variables y condiciones; abre también un diálogo para comprobar que la ayuda no aparece encima.

## Límites y avisos

Las ayudas describen el comportamiento existente, no corrigen limitaciones físicas de los sensores. Por ejemplo, 0 en HC-SR04 indica ausencia de eco, y la señal de una LDR depende del cableado. El estado del PN532 refleja su detección al iniciar/reiniciar, no una comprobación continua de cables.

La instalación de dependencias informó 10 avisos de seguridad (8 moderados y 2 altos). No se actualizaron dependencias automáticamente en esta entrega para no mezclar cambios funcionales; queda pendiente analizar su alcance y corregirlos en una revisión aparte. Vite conserva una advertencia previa sobre el fallback `default` de Blockly en `connection-types.js`, sin impedir la compilación.
