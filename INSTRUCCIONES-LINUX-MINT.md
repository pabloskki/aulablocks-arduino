# AulaBlocks Arduino para Linux Mint

## Instalación fija recomendada

1. Copia `AulaBlocks-Arduino-0.9.0-Linux-Mint-amd64.deb` al computador.
2. Ábrelo con doble clic.
3. Pulsa **Instalar paquete** e ingresa la contraseña del computador.
4. Busca **AulaBlocks Arduino** en el menú de aplicaciones de Linux Mint.

También se puede instalar desde la terminal:

```bash
sudo apt install ./AulaBlocks-Arduino-0.9.0-Linux-Mint-amd64.deb
```

Para desinstalarlo:

```bash
sudo apt remove aulablocks-arduino
```

## Versión portátil alternativa

1. Copia `AulaBlocks-Arduino-0.9.0-Linux-Mint-x64.tar.gz` al computador.
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

Los paquetes de sensores `.aulablock-sensor` siguen siendo instalables desde **Añadir sensor**. Si un paquete necesita una biblioteca Arduino, esa biblioteca viaja dentro del mismo archivo y queda guardada localmente.
