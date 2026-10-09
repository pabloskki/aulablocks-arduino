# AulaBlocks Arduino para Linux Mint

## Instalación fija recomendada

1. Copia el archivo `AulaBlocks-Arduino-0.10.0-beta.5-Linux-Mint-x64.deb` al computador (Linux Mint de 64 bits, Intel/AMD).
2. Ábrelo con doble clic.
3. Pulsa **Instalar paquete** e ingresa la contraseña del computador.
4. Busca **AulaBlocks Arduino** en el menú de aplicaciones de Linux Mint.

También se puede instalar desde la terminal:

```bash
sudo apt install ./AulaBlocks-Arduino-0.10.0-beta.5-Linux-Mint-x64.deb
```

Para desinstalarlo:

```bash
sudo apt remove aulablocks-arduino
```

## Versión portátil alternativa

1. Copia el archivo `AulaBlocks-Arduino-<version>-Linux-Mint-x64.tar.gz` al computador.
2. Haz clic derecho sobre el archivo y elige **Extraer aquí**.
3. Abre la carpeta extraída.
4. Haz clic derecho sobre `aulablocks-arduino`, abre **Propiedades > Permisos** y activa **Permitir ejecutar el archivo como un programa**.
5. Abre `aulablocks-arduino` con doble clic.

Si Linux Mint no lo abre con doble clic, dentro de la carpeta extraída ejecuta:

```bash
chmod +x aulablocks-arduino
sudo chown root:root chrome-sandbox
sudo chmod 4755 chrome-sandbox
./aulablocks-arduino
```

## Permiso para programar la placa

Este ajuste se realiza una sola vez por usuario:

```bash
sudo usermod -aG dialout "$USER"
```

Después hay que cerrar la sesión de Linux Mint y volver a entrar. AulaBlocks podrá detectar puertos como `/dev/ttyUSB0` o `/dev/ttyACM0`.

## Funcionamiento sin internet

El archivo incluye las herramientas para compilar, cargar y usar el monitor serial con:

- Arduino Uno con ATmega328P.
- Nano compatible con ATmega328PB y MiniCore.
- Conversores USB habituales, incluidos CH340/CH341, cuando Linux Mint reconoce el dispositivo.

Los paquetes de sensores `.aulasensor` se instalan desde **Añadir sensor**. Si un paquete necesita una biblioteca Arduino, esa biblioteca viaja dentro del mismo archivo y queda guardada localmente.

## Actualizar una instalación anterior

Instala el nuevo `.deb` sobre la versión anterior, sin desinstalarla primero. No borres la carpeta de datos de AulaBlocks; conserva también una copia de tus proyectos.

En Linux la actualización del programa se instala mediante el paquete `.deb`; no se instala automáticamente como en Windows. El catálogo de sensores sí usa los mismos paquetes y actualizaciones que Windows. El ZIP `Sensores-actualizados-AulaBlocks-beta.5.zip` sirve para ambos sistemas.

La compilación automatizada no sustituye la prueba en un equipo Linux Mint real: comprobar apertura, guardar/abrir proyectos, conexión USB, carga a Uno/Nano y monitor serial. Las dependencias del sistema que falten pueden requerir internet durante la primera instalación del `.deb`.
