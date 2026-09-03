const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const BOARDS = {
  uno: {
    name: 'Arduino Uno · ATmega328P',
    fqbn: 'arduino:avr:uno'
  },
  nano: {
    name: 'Nano compatible · ATmega328PB',
    fqbn: 'MiniCore:avr:328:clock=16MHz_external,BOD=2v7,eeprom=keep,LTO=Os_flto,variant=modelPB,bootloader=uart0,baudrate=default'
  }
};

function createArduinoService({ runtimeRoot, writableRoot, platform = process.platform, bundleVersion = '1' }) {
  const executableName = platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
  const bundledCli = runtimeRoot ? path.join(runtimeRoot, 'bin', executableName) : null;
  const cliPath = bundledCli || executableName;
  let monitorChild = null;
  const stoppedMonitors = new WeakSet();

  async function prepareConfig() {
    if (!runtimeRoot) return null;
    await ensureBundledLibraries();
    const configPath = path.join(writableRoot, 'arduino-cli.yaml');
    const downloadsPath = path.join(writableRoot, 'downloads');
    await fs.mkdir(downloadsPath, { recursive: true });
    const yaml = [
      'board_manager:',
      '  additional_urls:',
      '    - https://mcudude.github.io/MiniCore/package_MCUdude_MiniCore_index.json',
      'directories:',
      `  data: "${yamlPath(path.join(runtimeRoot, 'data'))}"`,
      `  downloads: "${yamlPath(downloadsPath)}"`,
      `  user: "${yamlPath(path.join(writableRoot, 'user'))}"`,
      'library:',
      '  enable_unsafe_install: false',
      'logging:',
      '  level: info',
      ''
    ].join('\n');
    await fs.writeFile(configPath, yaml, 'utf8');
    return configPath;
  }

  async function ensureBundledLibraries() {
    const source = path.join(runtimeRoot, 'user', 'libraries');
    const target = path.join(writableRoot, 'user', 'libraries');
    const marker = path.join(writableRoot, 'user', `.aulablocks-bundled-${sanitizeVersionTag(bundleVersion)}`);
    try {
      await fs.access(marker);
      return;
    } catch {}
    await fs.mkdir(target, { recursive: true });
    let entries;
    try {
      entries = await fs.readdir(source, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries = [];
    }
    const registry = await readLibraryRegistry();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folder = entry.name;
      const sourceDir = path.join(source, folder);
      const properties = await readLibraryProperties(sourceDir);
      const version = properties?.version || bundleVersion;
      const name = properties?.name || folder;
      const resolution = resolveLibraryInstall(registry, folder, version, 'bundled');
      if (resolution.action !== 'install') continue;
      const targetDir = path.join(target, folder);
      await fs.rm(targetDir, { recursive: true, force: true });
      await fs.cp(sourceDir, targetDir, { recursive: true });
      registry[folder] = { name, version, origin: 'bundled' };
    }
    await writeLibraryRegistry(registry);
    await fs.writeFile(marker, new Date().toISOString(), 'utf8');
  }

  async function installSensorPackage(sensorPackage) {
    validateSensorManifest(sensorPackage);
    await ensureBundledLibraries();
    const libraries = sensorPackage.bundledLibraries || [];
    const registry = await readLibraryRegistry();
    const warnings = [];
    let totalBytes = 0;
    for (const library of libraries) {
      validateLibrary(library);
      const resolution = resolveLibraryInstall(registry, library.folder, library.version, sensorPackage.id);
      if (resolution.action === 'skip') continue;
      if (resolution.action === 'conflict') {
        warnings.push(`La biblioteca “${library.name}” no se instaló: la carpeta “${library.folder}” ya la usa otro sensor con la versión ${resolution.existing.version}. Ambos sensores podrían no funcionar bien juntos.`);
        continue;
      }
      const libraryRoot = path.join(writableRoot, 'user', 'libraries');
      const target = path.join(libraryRoot, library.folder);
      const temporary = path.join(libraryRoot, `.${library.folder}-${crypto.randomUUID()}`);
      await fs.mkdir(temporary, { recursive: true });
      try {
        for (const file of library.files) {
          const relative = safeRelativePath(file.path);
          const data = file.encoding === 'base64' ? Buffer.from(file.content, 'base64') : Buffer.from(file.content, 'utf8');
          totalBytes += data.length;
          if (totalBytes > 25 * 1024 * 1024) throw new Error('El paquete de sensor supera el límite de 25 MB de bibliotecas.');
          const digest = crypto.createHash('sha256').update(data).digest('hex');
          if (file.sha256 && digest !== String(file.sha256).toLowerCase()) throw new Error(`El archivo ${file.path} no superó la verificación de seguridad.`);
          const destination = path.join(temporary, relative);
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.writeFile(destination, data);
        }
        await replaceDirectory(temporary, target);
        registry[library.folder] = { name: library.name, version: library.version, origin: sensorPackage.id };
      } catch (error) {
        await fs.rm(temporary, { recursive: true, force: true });
        throw error;
      }
    }
    await writeLibraryRegistry(registry);

    const extension = sanitizeSensorPackage(sensorPackage);
    const catalog = await listSensorCatalog();
    const existing = catalog.findIndex((item) => item.id === extension.id);
    if (existing >= 0) catalog[existing] = extension;
    else catalog.push(extension);
    await writeJsonAtomic(path.join(writableRoot, 'sensor-catalog.json'), catalog);
    return { extension, installedLibraries: libraries.map((library) => ({ name: library.name, version: library.version })), warnings };
  }

  async function readLibraryRegistry() {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(writableRoot, 'user', 'library-registry.json'), 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  async function writeLibraryRegistry(registry) {
    await writeJsonAtomic(path.join(writableRoot, 'user', 'library-registry.json'), registry);
  }

  async function listSensorCatalog() {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(writableRoot, 'sensor-catalog.json'), 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error('No pudimos leer la Biblioteca de sensores.');
    }
  }

  async function listPorts() {
    const configPath = await prepareConfig();
    const result = await runCli(cliPath, withConfig(['board', 'list', '--format', 'json'], configPath));
    if (!result.ok) throw friendlyFailure(result.output, 'ports');
    let parsed;
    try {
      parsed = JSON.parse(result.stdout.trim() || '{}');
    } catch {
      throw new Error('AulaBlocks no pudo interpretar la lista de puertos USB.');
    }
    return (parsed.detected_ports || [])
      .filter((item) => item.port?.protocol === 'serial')
      .map(classifyPort);
  }

  async function buildAndMaybeUpload(payload, onProgress = () => {}) {
    validatePayload(payload);
    if (payload.upload) await stopSerialMonitor();
    const board = BOARDS[payload.board];
    const configPath = await prepareConfig();
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-'));
    const sketchName = safeSketchName(payload.projectName);
    const sketchDir = path.join(temporaryRoot, sketchName);
    const buildDir = path.join(temporaryRoot, 'build');
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.mkdir(buildDir, { recursive: true });
    await fs.writeFile(path.join(sketchDir, `${sketchName}.ino`), payload.code, 'utf8');

    try {
      onProgress({ stage: 'compile', message: `Comprobando el programa para ${board.name}…` });
      const compileArgs = withConfig([
        'compile', '--fqbn', board.fqbn, '--output-dir', buildDir, sketchDir
      ], configPath);
      const compile = await runCli(cliPath, compileArgs, (line) => onProgress({ stage: 'compile', message: simplifyProgress(line) }));
      if (!compile.ok) throw friendlyFailure(compile.output, 'compile');

      if (!payload.upload) {
        return {
          ok: true,
          title: '¡Programa comprobado!',
          message: memorySummary(compile.output) || `El programa está listo para ${board.name}.`,
          details: tail(compile.output)
        };
      }

      onProgress({ stage: 'upload', message: `Cargando el programa en ${board.name}…` });
      const uploadArgs = withConfig([
        'upload', '--fqbn', board.fqbn, '--port', payload.port, '--input-dir', buildDir
      ], configPath);
      const upload = await runCli(cliPath, uploadArgs, (line) => onProgress({ stage: 'upload', message: simplifyProgress(line) }));
      if (!upload.ok) throw friendlyFailure(upload.output, 'upload');
      return {
        ok: true,
        title: '¡Programa cargado!',
        message: `${board.name} quedó programado correctamente en ${payload.port}.`,
        details: tail(`${compile.output}\n${upload.output}`)
      };
    } finally {
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  async function startSerialMonitor(payload, onData = () => {}, onStatus = () => {}) {
    const port = payload?.port;
    const baudrate = Number(payload?.baudrate || 9600);
    if (!validPort(port)) throw new Error('Selecciona el puerto USB de tu Arduino.');
    if (!validBaudrate(baudrate)) throw new Error('La velocidad del monitor serial no es válida.');
    await stopSerialMonitor();
    const configPath = await prepareConfig();
    const args = withConfig(['monitor', '--port', port, '--config', `baudrate=${baudrate},dtr=off,rts=off`, '--quiet'], configPath);
    const child = spawn(cliPath, args, { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    monitorChild = child;

    const forward = (source) => (chunk) => {
      const value = chunk.toString();
      if (source === 'stdout') onData(value);
      else if (value.trim()) onStatus({ state: 'warning', message: simplifyMonitorError(value), detail: value.trim().slice(0, 2000) });
    };
    child.stdout.on('data', forward('stdout'));
    child.stderr.on('data', forward('stderr'));
    child.on('error', (error) => {
      if (monitorChild === child) monitorChild = null;
      onStatus({ state: 'error', message: error.code === 'ENOENT' ? 'No encontramos el monitor serial incluido.' : error.message });
    });
    child.on('close', (code) => {
      if (monitorChild === child) monitorChild = null;
      const wasStopped = stoppedMonitors.has(child);
      stoppedMonitors.delete(child);
      onStatus(wasStopped || code === 0
        ? { state: 'stopped', message: 'Monitor detenido.' }
        : { state: 'error', message: 'El monitor se cerró. Revisa que el puerto no esté ocupado.' });
    });
    onStatus({ state: 'connected', message: `Escuchando ${port} a ${baudrate} baudios.` });
    return { ok: true, port, baudrate };
  }

  async function stopSerialMonitor() {
    const child = monitorChild;
    if (!child) return { ok: true };
    stoppedMonitors.add(child);
    monitorChild = null;
    if (child.killed) return { ok: true };
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      child.once('close', finish);
      setTimeout(finish, 3000);
      child.kill();
    });
    return { ok: true };
  }

  async function sendSerialMonitor(value) {
    if (!monitorChild || monitorChild.killed || !monitorChild.stdin.writable) throw new Error('Primero inicia el monitor serial.');
    const text = String(value ?? '');
    if (text.length > 2000) throw new Error('El mensaje es demasiado largo.');
    monitorChild.stdin.write(`${text}\n`);
    return { ok: true };
  }

  return { listPorts, buildAndMaybeUpload, installSensorPackage, listSensorCatalog, startSerialMonitor, stopSerialMonitor, sendSerialMonitor, boards: BOARDS };
}

function validateSensorManifest(sensorPackage) {
  if (!sensorPackage || sensorPackage.packageFormat !== 'aulablocks-sensor' || sensorPackage.packageVersion !== 1) throw new Error('El archivo no es un paquete AulaBlocks Sensor compatible.');
  if (!sensorPackage.id || !sensorPackage.name || !Array.isArray(sensorPackage.blocks) || !sensorPackage.blocks.length) throw new Error('El paquete debe incluir un identificador, nombre y al menos un bloque.');
  if (sensorPackage.bundledLibraries != null && !Array.isArray(sensorPackage.bundledLibraries)) throw new Error('La lista de bibliotecas del paquete no es válida.');
  if (sensorPackage.image != null) sanitizeSensorImage(sensorPackage.image);
}

function validateLibrary(library) {
  if (!library?.name || !library?.version || !/^[A-Za-z0-9_.-]+$/.test(library.folder || '') || !Array.isArray(library.files) || !library.files.length) throw new Error('Una biblioteca incluida en el paquete no es válida.');
  for (const file of library.files) {
    if (!file?.path || !['base64', 'utf8'].includes(file.encoding) || typeof file.content !== 'string') throw new Error(`La biblioteca ${library.name} contiene un archivo no válido.`);
  }
}

function safeRelativePath(value) {
  const normalized = String(value).replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..') || /^[A-Za-z]:/.test(normalized)) throw new Error(`Ruta de biblioteca no permitida: ${value}`);
  return normalized.split('/').join(path.sep);
}

function sanitizeSensorPackage(sensorPackage) {
  const { bundledLibraries, packageFormat, packageVersion, image, ...extension } = sensorPackage;
  const safeImage = image == null ? undefined : sanitizeSensorImage(image);
  return { ...extension, packageFormat, packageVersion, ...(safeImage ? { image: safeImage } : {}), librariesBundled: true };
}

function sanitizeSensorImage(image) {
  if (!image || typeof image !== 'object' || typeof image.data !== 'string') throw new Error('La imagen del sensor no es válida.');
  const mimeType = String(image.mimeType || '');
  const encoding = String(image.encoding || '');
  const alt = String(image.alt || 'Imagen del sensor').trim().slice(0, 120);
  if (mimeType === 'image/svg+xml' && encoding === 'utf8') {
    const data = image.data.trim();
    if (!data.startsWith('<svg') || Buffer.byteLength(data, 'utf8') > 100 * 1024) throw new Error('La ilustración SVG del sensor no es válida o es demasiado grande.');
    const inspected = data
      .replace(/xmlns=(['"])http:\/\/www\.w3\.org\/2000\/svg\1/i, '')
      .replace(/xmlns=(['"])https:\/\/www\.w3\.org\/2000\/svg\1/i, '');
    if (/<(?:script|foreignObject|iframe|object|embed|image)\b|\bon\w+\s*=|(?:javascript|https?|data):/i.test(inspected)) throw new Error('La ilustración SVG contiene elementos no permitidos.');
    return { mimeType, encoding, data, alt };
  }
  if (['image/png', 'image/jpeg', 'image/webp'].includes(mimeType) && encoding === 'base64') {
    if (!/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(image.data)) throw new Error('Los datos de la imagen del sensor no son válidos.');
    const bytes = Buffer.from(image.data, 'base64');
    if (!bytes.length || bytes.length > 700 * 1024) throw new Error('La imagen del sensor está vacía o supera 700 KB.');
    return { mimeType, encoding, data: bytes.toString('base64'), alt };
  }
  throw new Error('La imagen debe ser PNG, JPG, WebP o una ilustración SVG segura.');
}

function sanitizeVersionTag(value) {
  return String(value || '1').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function readLibraryProperties(directory) {
  try {
    const content = await fs.readFile(path.join(directory, 'library.properties'), 'utf8');
    return {
      name: content.match(/^name=(.+)$/m)?.[1]?.trim(),
      version: content.match(/^version=(.+)$/m)?.[1]?.trim()
    };
  } catch {
    return null;
  }
}

function resolveLibraryInstall(registry, folder, version, origin) {
  const existing = registry[folder];
  if (!existing) return { action: 'install' };
  if (existing.origin === origin) return compareVersions(version, existing.version) > 0 ? { action: 'install' } : { action: 'skip' };
  return compareVersions(version, existing.version) === 0 ? { action: 'skip' } : { action: 'conflict', existing };
}

function compareVersions(a, b) {
  const partsA = String(a || '0').split(/[.+-]/);
  const partsB = String(b || '0').split(/[.+-]/);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const numberA = Number(partsA[index]);
    const numberB = Number(partsB[index]);
    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
      if (numberA !== numberB) return numberA > numberB ? 1 : -1;
      continue;
    }
    const textA = partsA[index] || '';
    const textB = partsB[index] || '';
    if (textA !== textB) return textA > textB ? 1 : -1;
  }
  return 0;
}

async function replaceDirectory(source, target) {
  const backup = `${target}.backup-${crypto.randomUUID()}`;
  let hadTarget = false;
  try {
    await fs.rename(target, backup);
    hadTarget = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    await fs.rename(source, target);
    if (hadTarget) await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (hadTarget) await fs.rename(backup, target).catch(() => {});
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporary, filePath).catch(async () => {
    await fs.copyFile(temporary, filePath);
    await fs.rm(temporary, { force: true });
  });
}

function withConfig(args, configPath) {
  return configPath ? [...args, '--config-file', configPath] : args;
}

function runCli(executable, args, onLine = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, shell: false });
    let stdout = '';
    let stderr = '';
    const consume = (target) => (chunk) => {
      const text = chunk.toString();
      if (target === 'stdout') stdout += text;
      else stderr += text;
      for (const line of text.split(/\r?\n/).filter(Boolean)) onLine(line);
    };
    child.stdout.on('data', consume('stdout'));
    child.stderr.on('data', consume('stderr'));
    child.on('error', (error) => {
      if (error.code === 'ENOENT') reject(new Error('No encontramos las herramientas Arduino incluidas con AulaBlocks.'));
      else reject(error);
    });
    child.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr, output: `${stdout}\n${stderr}`.trim() }));
  });
}

function validatePayload(payload) {
  if (!payload || !BOARDS[payload.board]) throw new Error('Esta placa todavía no admite carga directa. Usa Arduino Uno o Nano ATmega328PB.');
  if (typeof payload.code !== 'string' || !payload.code.trim() || payload.code.length > 2_000_000) throw new Error('El programa generado no es válido.');
  if (payload.upload && !validPort(payload.port)) throw new Error('Selecciona el puerto USB donde está conectada la placa.');
}

function validPort(port) {
  return typeof port === 'string' && (/^COM\d{1,3}$/i.test(port) || /^\/dev\/(tty|cu\.)[a-zA-Z0-9._-]+$/.test(port));
}

function validBaudrate(value) {
  return [300, 600, 750, 1200, 2400, 4800, 9600, 19200, 31250, 38400, 57600, 74880, 115200, 230400, 250000, 460800, 500000, 921600, 1000000, 2000000].includes(Number(value));
}

function friendlyFailure(output, phase) {
  const text = String(output || '');
  let message = phase === 'compile'
    ? 'El programa no pudo compilarse. Revisa los bloques y vuelve a intentarlo.'
    : phase === 'ports'
      ? 'No pudimos buscar placas conectadas. Comprueba las herramientas Arduino de AulaBlocks.'
      : 'No pudimos cargar el programa en la placa.';

  const missingHeader = text.match(/fatal error:\s*([^:\r\n]+\.h):\s*No such file or directory/i);
  if (missingHeader) message = `Falta la biblioteca que contiene ${missingHeader[1]}. Añade el paquete correcto del sensor y vuelve a comprobar.`;
  else if (/ser_open|can't open device|access is denied|permission denied|resource busy/i.test(text)) message = 'El puerto USB está ocupado o no tiene permiso. Cierra Arduino IDE, revisa el cable y vuelve a intentarlo.';
  else if (/not in sync|programmer is not responding|resp=0x00|stk500_recv/i.test(text)) message = 'La placa no respondió. Comprueba que elegiste Uno o Nano ATmega328PB, revisa el cable USB y pulsa nuevamente.';
  else if (/device signature|expected signature/i.test(text)) message = 'El chip conectado no coincide con la placa seleccionada. Revisa si es ATmega328P o ATmega328PB.';
  else if (/platform .* not found|platform not installed/i.test(text)) message = 'Falta el soporte de compilación de esta placa en AulaBlocks.';
  else if (/no device found|no upload port provided/i.test(text)) message = 'No encontramos una placa en el puerto seleccionado. Desconecta, conecta nuevamente y pulsa “Buscar”.';

  const error = new Error(message);
  error.details = tail(text);
  return error;
}

function portLabel(item) {
  const address = item.port.address;
  const board = item.matching_boards?.[0]?.name;
  const usb = usbChipName(item.port.properties?.vid, item.port.properties?.pid) || (item.port.properties?.vid ? 'Dispositivo USB' : item.port.label);
  return `${address} · ${board || usb || 'Puerto serie'}`;
}

function classifyPort(item) {
  const properties = item.port.properties || {};
  const board = item.matching_boards?.[0]?.name || '';
  return {
    address: item.port.address,
    label: portLabel(item),
    board,
    vid: properties.vid || '',
    pid: properties.pid || '',
    isUsb: Boolean(properties.vid || properties.pid || board),
    usbChip: usbChipName(properties.vid, properties.pid)
  };
}

function usbChipName(vid, pid) {
  const vendor = String(vid || '').replace(/^0x/i, '').toUpperCase();
  const product = String(pid || '').replace(/^0x/i, '').toUpperCase();
  if (vendor === '1A86') return ['7523', '5523'].includes(product) ? 'USB CH340/CH341' : 'USB WCH';
  if (['2341', '2A03'].includes(vendor)) return 'Arduino USB';
  if (vendor === '0403') return 'USB FTDI';
  if (vendor === '10C4') return 'USB CP210x';
  if (vendor === '067B') return 'USB Prolific';
  return '';
}

function memorySummary(output) {
  const flash = output.match(/Sketch uses (\d+) bytes.*Maximum is (\d+) bytes/i);
  const ram = output.match(/Global variables use (\d+) bytes.*Maximum is (\d+) bytes/i);
  if (!flash) return '';
  const flashPercent = Math.round(Number(flash[1]) * 100 / Number(flash[2]));
  const ramText = ram ? ` y ${Math.round(Number(ram[1]) * 100 / Number(ram[2]))}% de la memoria de trabajo` : '';
  return `Compilación correcta: utiliza ${flashPercent}% del espacio${ramText}.`;
}

function simplifyProgress(line) {
  if (/Sketch uses|Global variables/i.test(line)) return line.trim();
  if (/avrdude.*writing flash|Writing/i.test(line)) return 'Transfiriendo el programa a la placa…';
  if (/avrdude.*verifying|Reading/i.test(line)) return 'Verificando la carga…';
  return 'Trabajando…';
}

function simplifyMonitorError(value) {
  const text = String(value || '');
  if (/access is denied|permission denied|resource busy|can't open/i.test(text)) return 'El puerto está ocupado. Cierra Arduino IDE u otro monitor serial.';
  if (/no device|not found|disconnected/i.test(text)) return 'La placa se desconectó. Revisa el cable USB.';
  return 'El monitor recibió un aviso del puerto serial.';
}

function safeSketchName(name) {
  const clean = String(name || 'proyecto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^\d/, '_$&');
  return clean.slice(0, 50) || 'proyecto';
}

function yamlPath(value) {
  return String(value).replace(/\\/g, '/').replace(/"/g, '\\"');
}

function tail(value, limit = 6000) {
  const text = String(value || '').trim();
  return text.length > limit ? text.slice(-limit) : text;
}

module.exports = { createArduinoService, BOARDS, classifyPort, friendlyFailure, validBaudrate, validPort };
