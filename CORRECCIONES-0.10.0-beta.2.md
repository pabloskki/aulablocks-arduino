# AulaBlocks 0.10.0-beta.2 — pruebas locales Windows

Fecha: 1 de octubre de 2026. No publicado en GitHub.

## Correcciones

- La división genera una operación decimal: 1 / 2 produce 0.5.
- La validación distingue funciones y dispositivos al comprobar conflictos de pines; rechaza números inexistentes y capacidades incorrectas (PWM, entrada analógica e interrupción).
- Los sensores antiguos sin descripción de pines muestran una advertencia, sin impedir compilar. No se pueden verificar automáticamente sus conexiones.
- La instalación prepara y verifica todas las bibliotecas antes de reemplazarlas. Ante errores de reemplazo restaura bibliotecas, registro y catálogo anteriores. No garantiza recuperación automática ante corte de energía o cierre forzado.
- Las bibliotecas compartidas conservan sus consumidores; una actualización incompatible con otro sensor se rechaza.
- Los bloques desactivados y sus bloques interiores no aportan inicialización ni recursos de código.
- El registro de extensiones valida nombres de bloque duplicados y colisiones antes de modificar definiciones.
- La preparación del entorno Arduino para Windows conserva el anterior hasta completar el nuevo y recupera el anterior si falla el reemplazo.
- Se rechazan carpetas inválidas de bibliotecas, incluidas rutas que intentan salir del destino.
- Servo SG90/MG90S 1.0.2 permite un pin digital sin exigir PWM.

## Verificación realizada

- 24 pruebas automáticas correctas (generación, pines, extensiones y recuperación de instalación).
- Compilación de la aplicación correcta.
- 22 compilaciones Arduino correctas: los 11 paquetes del catálogo, cada uno para Uno y Nano.
- Los fallos de reemplazo y recuperación se probaron con errores simulados; no se descargó de nuevo el entorno completo.

## Pendiente antes de publicar

Instalar en un PC de prueba y comprobar carga USB, monitor serie y funcionamiento físico de cada sensor. Estas pruebas de compilación no verifican cableado, alimentación ni comunicación real con PN532 u otros sensores. Linux no se ha empaquetado ni probado en esta entrega.

Los sensores se entregan aparte para importarlos; no se instalan automáticamente. El informe beta.1 se conserva como antecedente, no como descripción de esta versión.
