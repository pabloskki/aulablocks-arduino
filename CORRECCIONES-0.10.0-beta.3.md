# AulaBlocks 0.10.0-beta.3 — Windows

## Cinco correcciones

1. El cierre espera la confirmación del usuario; no se cierra automáticamente a los cuatro segundos.
2. Al instalar bibliotecas en Windows, los nombres de carpeta se comparan sin distinguir mayúsculas y minúsculas.
3. Las actualizaciones conjuntas preparan todos los paquetes y bibliotecas antes de reemplazarlos. Un fallo impide instalar solo parte del lote. Las actualizaciones en línea utilizan esta operación conjunta.
4. Los bloques de salida digital y PWM pueden utilizar el mismo pin. Las colisiones con entradas u otros dispositivos siguen comprobándose.
5. El monitor muestra inmediatamente los fragmentos sin salto de línea y limita a 4000 caracteres el fragmento pendiente.

## Actualizar varios sensores sin internet

En “Añadir sensor”, mantén Ctrl y selecciona los archivos .aulasensor que deben actualizarse juntos. Si comparten una biblioteca, todos deben incluir versiones compatibles. Una actualización individual incompatible seguirá siendo rechazada para proteger los demás sensores.

## Verificación

32 pruebas automáticas correctas, incluidas regresiones de estos cinco problemas. Aplicación compilada para Windows y 22 compilaciones Arduino correctas (11 sensores para Uno y Nano). Las pruebas no sustituyen la comprobación física de USB y sensores.

No se publica esta entrega en GitHub. Los paquetes de sensores no han cambiado respecto a beta.2 y se mantienen externos al instalador. Los informes anteriores se conservan como antecedentes.
