const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createArduinoService } = require('../electron/arduino-service.cjs');

async function main() {
  const port = process.argv[2];
  if (!port) throw new Error('Indica un puerto para la prueba manual, por ejemplo COM3.');
  const projectRoot = path.resolve(__dirname, '..');
  const runtimeRoot = process.argv[3] ? path.resolve(process.argv[3]) : path.join(projectRoot, 'tools', 'arduino-cli');
  const writableRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aulablocks-monitor-test-'));
  const statuses = [];
  const service = createArduinoService({
    runtimeRoot,
    writableRoot,
    platform: 'win32'
  });
  try {
    const started = await service.startSerialMonitor({ port, baudrate: 9600 }, () => {}, (status) => statuses.push(status.state));
    assert.equal(started.ok, true);
    await wait(800);
    await service.stopSerialMonitor();
    await wait(400);
    assert.ok(statuses.includes('connected'));
    assert.ok(statuses.includes('stopped'));
    console.log(`Monitor serial correcto en ${port}: inicio y detención comprobados.`);
  } finally {
    await service.stopSerialMonitor();
    await fs.rm(writableRoot, { recursive: true, force: true });
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
