// Permite ejecutar electron-builder con el Node.js incluido en Electron.
// Es útil en el equipo de desarrollo, donde Node no está instalado globalmente.
const path = require('node:path');
if (process.versions.electron && path.resolve(process.argv[1]) === path.resolve(__filename)) process.argv.splice(1, 1);
require('../node_modules/electron-builder/out/cli/cli.js');
