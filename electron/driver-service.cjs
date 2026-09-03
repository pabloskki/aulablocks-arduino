const { spawn } = require('node:child_process');
const fs = require('node:fs');

function runPowerShell(script) {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ ok: false, stdout, stderr: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
  });
}

async function installCh340Driver(infPath) {
  if (!fs.existsSync(infPath)) {
    return { ok: false, message: 'No encontramos los archivos del controlador dentro de AulaBlocks.' };
  }
  const escaped = infPath.replace(/'/g, "''");
  const script = `try { $p = Start-Process -FilePath 'pnputil.exe' -ArgumentList @('/add-driver', '${escaped}', '/install') -Verb RunAs -Wait -PassThru; exit $p.ExitCode } catch { exit 1223 }`;
  const result = await runPowerShell(script);
  if (result.ok) {
    return { ok: true, message: 'Controlador USB CH340 instalado. Desconecta y vuelve a conectar el cable, luego pulsa "Buscar".' };
  }
  return { ok: false, message: 'No pudimos instalar el controlador. Puede que ya estuviera instalado, que se haya cancelado el permiso de administrador, o que falte ayuda técnica del colegio para completarlo.' };
}

module.exports = { installCh340Driver };
