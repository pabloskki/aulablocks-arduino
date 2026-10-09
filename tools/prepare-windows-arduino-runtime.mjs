import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import transaction from '../electron/file-transaction.cjs';

const CLI_VERSION = '1.5.1';
const CLI_SHA256 = 'fabe42e0eb04d00e776a66178299ff95a46c623dbc260f997e58fd514853dd40';
const ARDUINO_AVR_VERSION = '1.8.8';
const MINICORE_VERSION = '3.1.3';
const MINICORE_INDEX = 'https://mcudude.github.io/MiniCore/package_MCUdude_MiniCore_index.json';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeTarget = path.join(root, 'tools', 'arduino-cli');
const runtime = await fs.mkdtemp(path.join(root, 'tools', '.arduino-cli-build-'));
const downloads = path.join(root, 'tools', '.runtime-downloads');
const archive = path.join(downloads, `arduino-cli_${CLI_VERSION}_Windows_64bit.zip`);
const url = `https://github.com/arduino/arduino-cli/releases/download/v${CLI_VERSION}/arduino-cli_${CLI_VERSION}_Windows_64bit.zip`;

await fs.mkdir(downloads, { recursive: true });
try {
await fs.mkdir(path.join(runtime, 'bin'), { recursive: true });
await fs.mkdir(path.join(runtime, 'data'), { recursive: true });
await fs.mkdir(path.join(runtime, 'user', 'libraries'), { recursive: true });
await download(url, archive, CLI_SHA256);
await run('tar.exe', ['-xf', archive, '-C', path.join(runtime, 'bin')]);

const configPath = path.join(runtime, 'arduino-cli.yaml');
await fs.writeFile(configPath, [
  'board_manager:',
  '  additional_urls:',
  `    - ${MINICORE_INDEX}`,
  'directories:',
  `  data: "${yamlPath(path.join(runtime, 'data'))}"`,
  `  downloads: "${yamlPath(downloads)}"`,
  `  user: "${yamlPath(path.join(runtime, 'user'))}"`,
  ''
].join('\n'), 'utf8');

const cli = path.join(runtime, 'bin', 'arduino-cli.exe');
await run(cli, ['core', 'update-index', '--config-file', configPath]);
await run(cli, ['core', 'install', `arduino:avr@${ARDUINO_AVR_VERSION}`, '--config-file', configPath]);
await run(cli, ['core', 'install', `MiniCore:avr@${MINICORE_VERSION}`, '--config-file', configPath]);
await fs.writeFile(path.join(runtime, 'RUNTIME-WINDOWS.txt'), [
  `Arduino CLI ${CLI_VERSION}`,
  `Arduino AVR Boards ${ARDUINO_AVR_VERSION}`,
  `MiniCore ${MINICORE_VERSION}`,
  'Placas: Arduino Uno ATmega328P y Nano compatible ATmega328PB.',
  ''
].join('\n'), 'utf8');
// The build config points at the temporary tree; do not ship stale paths.
await fs.rm(configPath);
await transaction.commitReplacements([{ source: runtime, target: runtimeTarget }]);
console.log(`Runtime Windows reproducible preparado en ${runtimeTarget}`);
} finally {
  await fs.rm(runtime, { recursive: true, force: true });
}

function download(source, destination, expectedHash) {
  return new Promise((resolve, reject) => {
    const request = https.get(source, { headers: { 'User-Agent': 'AulaBlocks-build' } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        download(new URL(response.headers.location, source).toString(), destination, expectedHash).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) return reject(new Error(`Descarga fallida (${response.statusCode}): ${source}`));
      const hash = createHash('sha256');
      const output = createWriteStream(destination);
      response.on('data', (chunk) => hash.update(chunk));
      response.pipe(output);
      output.on('finish', async () => {
        output.close();
        const digest = hash.digest('hex');
        if (digest !== expectedHash) {
          await fs.rm(destination, { force: true });
          reject(new Error(`La firma SHA-256 de ${path.basename(destination)} no coincide.`));
        } else resolve();
      });
      output.on('error', reject);
    });
    request.on('error', reject);
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, windowsHide: true });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} terminó con código ${code}.`)));
  });
}

function yamlPath(value) { return value.replace(/\\/g, '/').replace(/"/g, '\\"'); }
