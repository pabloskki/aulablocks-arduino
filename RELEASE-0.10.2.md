# AulaBlocks Arduino 0.10.2

Se retira el bloque de relé del menú Acciones para evitar confusiones con el control digital. Los proyectos antiguos que ya contienen ese bloque pueden abrirse y conservan su funcionamiento; no se borran sus bloques.

- Windows x64: instalador y metadatos de actualización desde el programa.
- Linux Mint Intel/AMD de 64 bits: instalador .deb y alternativa .tar.gz. Instala el .deb sobre la versión anterior; no hay instalación automática en Linux.
- Los 11 sensores no cambian de versión, bibliotecas, imágenes ni código. No necesitas reinstalarlos si ya tienes los de la entrega 0.10.1. Se incluye un ZIP de los mismos paquetes para nuevas instalaciones en ambos sistemas.
- Se conservan las ayudas infantiles de 0.10.1.

Validación: 65 pruebas automáticas, incluyendo ausencia del relé en el menú y apertura de proyectos anteriores sin pérdida de bloques. El proceso de publicación ejecuta las pruebas y compila los 11 sensores para Uno y Nano ATmega328PB en Windows y Linux. También verifica las herramientas incluidas en el .deb.

Pendiente: pruebas físicas con placas y sensores y validación en Linux Mint real. No se corrigen en esta entrega los avisos previos de dependencias documentados en AYUDAS-0.10.1.md.

Las versiones anteriores se conservan en GitHub Releases.
