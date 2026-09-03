import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.join(projectRoot, 'release');
const sourceApp = path.join(releaseRoot, 'linux-unpacked');
const packageFiles = path.join(projectRoot, 'linux-package');
const stagingRoot = path.join(releaseRoot, '.deb-staging');
const controlRoot = path.join(stagingRoot, 'control');
const dataRoot = path.join(stagingRoot, 'data');
const projectManifest = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const appVersion = String(projectManifest.version);
const output = path.join(releaseRoot, `AulaBlocks-Arduino-${appVersion}-Linux-Mint-amd64.deb`);

const tarModuleRoot = (await fs.readdir(path.join(projectRoot, 'node_modules', '.pnpm')))
  .find((name) => name.startsWith('tar@7.5.22'));
if (!tarModuleRoot) throw new Error('No se encontró el módulo tar incluido con el proyecto.');
const tar = await import(pathToFileURL(path.join(projectRoot, 'node_modules', '.pnpm', tarModuleRoot, 'node_modules', 'tar', 'dist', 'esm', 'index.js')));

await fs.access(path.join(sourceApp, 'aulablocks-arduino'));
await fs.rm(stagingRoot, { recursive: true, force: true });
await fs.mkdir(controlRoot, { recursive: true });
await fs.mkdir(path.join(dataRoot, 'opt'), { recursive: true });
await fs.mkdir(path.join(dataRoot, 'usr', 'bin'), { recursive: true });
await fs.mkdir(path.join(dataRoot, 'usr', 'share', 'applications'), { recursive: true });

await fs.cp(sourceApp, path.join(dataRoot, 'opt', 'aulablocks-arduino'), { recursive: true });
await fs.copyFile(path.join(packageFiles, 'aulablocks-arduino'), path.join(dataRoot, 'usr', 'bin', 'aulablocks-arduino'));
await fs.copyFile(path.join(packageFiles, 'aulablocks-arduino.desktop'), path.join(dataRoot, 'usr', 'share', 'applications', 'aulablocks-arduino.desktop'));
await fs.copyFile(path.join(packageFiles, 'postinst'), path.join(controlRoot, 'postinst'));

const installedSize = Math.ceil((await directorySize(dataRoot)) / 1024);
const control = (await fs.readFile(path.join(packageFiles, 'control'), 'utf8'))
  .replace(/^Version:.*$/m, `Version: ${appVersion}`)
  .replace('__INSTALLED_SIZE__', String(installedSize));
await fs.writeFile(path.join(controlRoot, 'control'), control, 'utf8');

const controlTar = path.join(stagingRoot, 'control.tar');
const dataTar = path.join(stagingRoot, 'data.tar');
await createTar(tar, controlRoot, controlTar, (relative, stat) => {
  setPermissions(stat, relative === 'postinst' ? 0o755 : 0o644);
});
await createTar(tar, dataRoot, dataTar, (relative, stat) => {
  if (stat.isDirectory()) setPermissions(stat, 0o755);
  else if (isExecutable(relative)) setPermissions(stat, relative.endsWith('chrome-sandbox') ? 0o4755 : 0o755);
  else setPermissions(stat, 0o644);
});

const members = [
  ['debian-binary', Buffer.from('2.0\n')],
  ['control.tar.gz', gzipSync(await fs.readFile(controlTar), { level: 9 })],
  ['data.tar.gz', gzipSync(await fs.readFile(dataTar), { level: 9 })]
];
await fs.writeFile(output, createArArchive(members));
await fs.rm(stagingRoot, { recursive: true, force: true });
console.log(`Paquete Debian creado: ${output}`);

async function createTar(module, cwd, file, setMode) {
  const entries = await fs.readdir(cwd);
  if (!entries.length) throw new Error(`No hay archivos para empaquetar en ${cwd}.`);
  await module.c({
    cwd,
    file,
    portable: true,
    noMtime: true,
    filter(relative, stat) {
      setMode(relative.replace(/\\/g, '/').replace(/^\.\//, ''), stat);
      return true;
    }
  }, entries);
  if ((await fs.stat(file)).size <= 1024) throw new Error(`El archivo ${path.basename(file)} quedó incompleto.`);
}

function isExecutable(relative) {
  const normalized = relative.replace(/\\/g, '/');
  if (normalized === 'usr/bin/aulablocks-arduino') return true;
  if (normalized === 'opt/aulablocks-arduino/aulablocks-arduino') return true;
  if (normalized.endsWith('/chrome-sandbox')) return true;
  if (normalized.includes('/arduino-runtime/') && (!path.posix.extname(normalized) || normalized.endsWith('.sh'))) return true;
  return false;
}

function setPermissions(stat, permissions) {
  stat.mode = (stat.mode & 0o170000) | permissions;
}

async function directorySize(directory) {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    total += entry.isDirectory() ? await directorySize(item) : (await fs.stat(item)).size;
  }
  return total;
}

function createArArchive(members) {
  const chunks = [Buffer.from('!<arch>\n')];
  for (const [name, data] of members) {
    const header = [
      `${name}/`.padEnd(16, ' '),
      '0'.padEnd(12, ' '),
      '0'.padEnd(6, ' '),
      '0'.padEnd(6, ' '),
      '100644'.padEnd(8, ' '),
      String(data.length).padEnd(10, ' '),
      '`\n'
    ].join('');
    chunks.push(Buffer.from(header, 'ascii'), data);
    if (data.length % 2) chunks.push(Buffer.from('\n'));
  }
  return Buffer.concat(chunks);
}
