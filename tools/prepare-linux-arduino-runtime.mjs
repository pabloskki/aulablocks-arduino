import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const windowsRuntime = path.join(projectRoot, 'tools', 'arduino-cli');
const linuxRuntime = path.join(projectRoot, 'tools', 'arduino-cli-linux');
const downloads = path.join(projectRoot, 'tools', '.linux-runtime-downloads');
const packageIndexPath = path.join(windowsRuntime, 'data', 'package_index.json');
const miniCoreIndexPath = path.join(windowsRuntime, 'data', 'package_MCUdude_MiniCore_index.json');

const requiredTools = [
  ['builtin', 'ctags', '5.8-arduino11'],
  ['builtin', 'dfu-discovery', '0.1.2'],
  ['builtin', 'mdns-discovery', '1.1.0'],
  ['builtin', 'serial-discovery', '1.5.2'],
  ['builtin', 'serial-monitor', '0.15.0'],
  ['arduino', 'arduinoOTA', '1.3.0'],
  ['arduino', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7'],
  ['arduino', 'avrdude', '8.0.0-arduino1'],
  ['MiniCore', 'avrdude', '8.0-arduino.1'],
  ['MiniCore', 'avrocd-tools', '1.5.8']
];

await fs.mkdir(downloads, { recursive: true });
await fs.rm(linuxRuntime, { recursive: true, force: true });
await fs.mkdir(path.join(linuxRuntime, 'bin'), { recursive: true });
await fs.mkdir(path.join(linuxRuntime, 'data', 'packages'), { recursive: true });

const packageIndex = JSON.parse(await fs.readFile(packageIndexPath, 'utf8'));
const miniCoreIndex = JSON.parse(await fs.readFile(miniCoreIndexPath, 'utf8'));

for (const file of ['package_index.json', 'package_index.json.sig', 'package_MCUdude_MiniCore_index.json']) {
  await copyIfPresent(path.join(windowsRuntime, 'data', file), path.join(linuxRuntime, 'data', file));
}

for (const packager of ['arduino', 'MiniCore']) {
  const source = path.join(windowsRuntime, 'data', 'packages', packager, 'hardware');
  const destination = path.join(linuxRuntime, 'data', 'packages', packager, 'hardware');
  await fs.cp(source, destination, { recursive: true });
}
await fs.cp(path.join(windowsRuntime, 'user'), path.join(linuxRuntime, 'user'), { recursive: true });

const cli = {
  url: 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz',
  filename: 'arduino-cli_latest_Linux_64bit.tar.gz'
};
const cliArchive = path.join(downloads, cli.filename);
await download(cli.url, cliArchive);
await extract(cliArchive, path.join(linuxRuntime, 'bin'));

for (const [packager, name, version] of requiredTools) {
  const descriptor = findTool(packager, name, version);
  const archive = path.join(downloads, archiveName(descriptor.url, `${packager}-${name}-${version}.archive`));
  await download(descriptor.url.replace(/^http:/, 'https:'), archive, descriptor.checksum);
  const destination = path.join(linuxRuntime, 'data', 'packages', packager, 'tools', name, version);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await extract(archive, destination);
  await flattenSingleDirectory(destination);
}

await fs.writeFile(path.join(linuxRuntime, 'RUNTIME-LINUX.txt'), [
  'AulaBlocks Arduino - herramientas sin conexion para Linux x64',
  'Incluye Arduino CLI, Arduino AVR Boards, MiniCore y herramientas de carga.',
  'Placas: Arduino Uno ATmega328P y Nano compatible ATmega328PB.',
  `Generado: ${new Date().toISOString()}`,
  ''
].join('\n'), 'utf8');

console.log(`Runtime Linux preparado en ${linuxRuntime}`);

function findTool(packager, name, version) {
  const index = packager === 'MiniCore' ? miniCoreIndex : packageIndex;
  const pkg = index.packages.find((item) => item.name === packager);
  const tool = pkg?.tools?.find((item) => item.name === name && item.version === version);
  const system = tool?.systems?.find((item) => /^x86_64.*linux/.test(item.host));
  if (!system) throw new Error(`No se encontró ${packager}:${name}@${version} para Linux x64.`);
  return system;
}

async function download(url, destination, expectedChecksum = '') {
  if (await checksumMatches(destination, expectedChecksum)) {
    console.log(`Ya descargado: ${path.basename(destination)}`);
    return;
  }
  await fs.rm(destination, { force: true });
  console.log(`Descargando ${url}`);
  await new Promise((resolve, reject) => {
    const request = (currentUrl, redirects = 0) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'AulaBlocks-runtime-builder' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 8) {
          response.resume();
          request(new URL(response.headers.location, currentUrl).toString(), redirects + 1);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Descarga fallida (${response.statusCode}): ${currentUrl}`));
          return;
        }
        const output = createWriteStream(destination);
        response.pipe(output);
        output.on('finish', () => output.close(resolve));
        output.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
  if (!(await checksumMatches(destination, expectedChecksum))) {
    await fs.rm(destination, { force: true });
    throw new Error(`La suma SHA-256 no coincide para ${path.basename(destination)}.`);
  }
}

async function checksumMatches(file, expected) {
  try {
    const bytes = await fs.readFile(file);
    if (!expected) return bytes.length > 0;
    const wanted = expected.replace(/^SHA-256:/i, '').toLowerCase();
    return createHash('sha256').update(bytes).digest('hex') === wanted;
  } catch {
    return false;
  }
}

async function extract(archive, destination) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xf', archive, '-C', destination], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stderr = '';
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
  const windowsSymlinkFailure = process.platform === 'win32' && result.code === 1 && /Invalid argument/i.test(result.stderr);
  if (result.code !== 0 && !windowsSymlinkFailure) throw new Error(`tar terminó con código ${result.code}.`);
  if (windowsSymlinkFailure) await materializeArchiveLinks(archive, destination);
}

async function materializeArchiveLinks(archive, destination) {
  const listing = await capture('tar', ['-tvf', archive]);
  for (const line of listing.split(/\r?\n/)) {
    if (!line.startsWith('l') || !line.includes(' -> ')) continue;
    const [left, targetText] = line.split(' -> ');
    const linkName = left.trim().split(/\s+/).at(-1);
    const linkPath = path.join(destination, ...linkName.split('/'));
    const targetPath = path.resolve(path.dirname(linkPath), ...targetText.trim().split('/'));
    await fs.rm(linkPath, { recursive: true, force: true });
    await fs.cp(targetPath, linkPath, { recursive: true });
  }
}

function capture(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `${executable} terminó con código ${code}.`)));
  });
}

async function flattenSingleDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory());
  const files = entries.filter((entry) => !entry.isDirectory());
  if (folders.length !== 1 || files.length !== 0) return;
  const nested = path.join(directory, folders[0].name);
  const temporary = `${directory}.flatten-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await fs.rename(nested, temporary);
  await fs.rm(directory, { recursive: true, force: true });
  await fs.rename(temporary, directory);
}

async function copyIfPresent(source, destination) {
  try {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function archiveName(url, fallback) {
  try {
    return path.basename(new URL(url).pathname) || fallback;
  } catch {
    return fallback;
  }
}
