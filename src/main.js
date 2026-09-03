import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Es from 'blockly/msg/es';
import { registerArduinoBlocks, toolbox, CATEGORY_COLOURS } from './blocks.js';
import { arduinoGenerator, generateSketch, registerExtensionGenerators } from './generator.js';
import { exclusiveExtensionTypes, extensionBlockTypes, extensionCategoryName, extensionToolboxCategories } from './extension-categories.js';
import robotLogo from './assets/aulablocks-robot-logo.png';
import './styles.css';

Blockly.setLocale(Es);
registerArduinoBlocks();

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand" aria-label="AulaBlocks Arduino">
        <img class="brand-mark" src="${robotLogo}" alt="" />
        <div><strong>AulaBlocks</strong><small>Arduino</small></div>
      </div>
      <label class="project-name-wrap">
        <span>Proyecto</span>
        <input id="project-name" value="Mi primer proyecto" maxlength="60" aria-label="Nombre del proyecto" />
      </label>
      <div class="top-actions">
        <button class="button ghost" id="new-project"><span>＋</span> Nuevo</button>
        <button class="button ghost" id="open-project"><span>⌂</span> Abrir</button>
        <button class="button primary" id="save-project"><span>▣</span> Guardar</button>
      </div>
    </header>

    <main class="workspace-layout">
      <aside class="lesson-panel">
        <div class="panel-heading">
          <span class="eyebrow">MI PLACA</span>
          <select id="board-select" aria-label="Seleccionar placa Arduino">
            <option value="uno">Arduino Uno</option>
            <option value="nano">Nano compatible · ATmega328PB</option>
            <option value="mega">Arduino Mega</option>
          </select>
        </div>
        <div class="board-card">
          <div class="board-illustration" aria-hidden="true">
            <div class="usb"></div><div class="chip"></div><div class="pin-row top"></div><div class="pin-row bottom"></div><b>UNO</b>
          </div>
          <div><strong id="board-label">Arduino Uno</strong><small id="board-status">Lista para crear</small></div>
          <span class="status-dot" title="Modo de diseño"></span>
        </div>
        <div class="connection-card">
          <label for="port-select">Puerto USB</label>
          <div class="port-row">
            <select id="port-select" aria-label="Puerto USB de Arduino"><option value="">Sin buscar</option></select>
            <button id="refresh-ports" title="Buscar placas conectadas" aria-label="Buscar placas conectadas">↻</button>
          </div>
          <small id="port-help">Conecta la placa y pulsa buscar.</small>
          <button id="install-usb-driver" class="driver-install-button" hidden>Instalar controlador USB (CH340)</button>
        </div>

        <section class="tip-card">
          <span>✦</span>
          <div><strong>Consejo</strong><p>Los bloques que encajan pueden trabajar juntos.</p></div>
        </section>

        <button class="sensor-library-button" id="open-sensor-library"><span>📚</span><div><strong>Biblioteca de sensores</strong><small>Elegir un sensor instalado</small></div><b>›</b></button>
        <button class="extension-button" id="import-extension"><span>🧩</span><div><strong>Añadir sensor</strong><small>Instalar paquete local</small></div><b>＋</b></button>
        <div id="extension-list" class="extension-list" aria-live="polite"></div>
      </aside>

      <section class="editor-panel" data-view="blocks">
        <div class="editor-toolbar">
          <div class="mode-tabs" role="tablist" aria-label="Vista de trabajo">
            <button class="active" id="show-blocks" role="tab" aria-selected="true"><span>🧩</span> Bloques</button>
            <button id="show-monitor" role="tab" aria-selected="false"><span>📟</span> Monitor</button>
          </div>
          <div class="editor-tools">
            <button class="icon-button" id="zoom-fit" title="Ver todos los bloques">◎</button>
            <button class="icon-button" id="undo" title="Deshacer">↶</button>
            <button class="icon-button" id="redo" title="Rehacer">↷</button>
            <button class="check-button" id="check-project"><span>✓</span> Revisar</button>
          </div>
        </div>
        <div id="blockly-area" aria-label="Area de programacion por bloques"></div>
        <div class="workspace-help"><span>?</span> Arrastra bloques desde las categorías y únelos como piezas de rompecabezas.</div>
        <section class="serial-monitor-view" id="serial-monitor-view" aria-labelledby="serial-monitor-title">
          <div class="monitor-heading">
            <div class="monitor-symbol">📟</div>
            <div><span class="eyebrow">DATOS EN TIEMPO REAL</span><h2 id="serial-monitor-title">Monitor de tu Arduino</h2><p>Observa distancias, temperatura, luz y mensajes.</p></div>
            <div class="monitor-state" id="monitor-state" data-state="stopped"><span></span><strong>Detenido</strong></div>
          </div>
          <div class="monitor-controls">
            <div class="monitor-port"><small>PLACA CONECTADA</small><strong id="monitor-port-label">Ninguna placa seleccionada</strong></div>
            <label><span>Velocidad</span><select id="monitor-baudrate"><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label>
            <button class="monitor-start" id="monitor-start">▶ Iniciar lectura</button>
            <button class="monitor-stop" id="monitor-stop" disabled>■ Detener</button>
          </div>
          <div class="monitor-result">
            <div class="latest-reading"><span>ÚLTIMO DATO</span><strong id="monitor-latest">—</strong><small id="monitor-message">Pulsa “Iniciar lectura” para comenzar.</small><details id="monitor-detail" class="hidden"><summary>Detalle técnico</summary><pre id="monitor-detail-text"></pre></details></div>
            <div class="serial-history">
              <div><strong>Historial</strong><button id="monitor-clear">Limpiar</button></div>
              <pre id="serial-monitor-log" aria-live="polite">Esperando datos de Arduino…</pre>
            </div>
          </div>
          <form class="monitor-send" id="monitor-send-form"><input id="monitor-send-input" maxlength="2000" placeholder="Escribir un mensaje para Arduino" aria-label="Mensaje para Arduino"><button>Enviar</button></form>
        </section>
      </section>

      <aside class="code-panel">
        <div class="code-heading">
          <div><span class="eyebrow">VISTA AUTOMÁTICA</span><h2>Programa Arduino</h2></div>
          <button class="icon-button light" id="copy-code" title="Copiar programa">▤</button>
        </div>
        <div class="code-info"><span>✨</span> Este código se crea solo con tus bloques.</div>
        <pre id="code-output" tabindex="0" aria-label="Codigo Arduino generado"></pre>
        <div class="library-note" id="library-note"><span>📚</span><div><strong>Librerías utilizadas</strong><p>Ninguna librería externa en este ejemplo.</p></div></div>
        <section class="upload-card" aria-labelledby="upload-title">
          <div class="upload-heading"><span>🔌</span><div><strong id="upload-title">Programar la placa</strong><small id="upload-status">Primero comprueba el programa.</small></div></div>
          <div class="upload-progress"><span id="upload-progress-fill"></span></div>
          <div class="upload-actions">
            <button id="compile-direct">✓ Comprobar</button>
            <button id="upload-direct">⚡ Cargar</button>
          </div>
          <details id="upload-details"><summary>Detalles para el profesor</summary><pre id="upload-log"></pre></details>
        </section>
        <button class="export-button secondary" id="export-ino"><span>↓</span><div><strong>Guardar archivo .ino</strong><small>Para abrirlo también en Arduino IDE</small></div></button>
        <p class="offline-note"><span>●</span> Todo funciona sin conexión a internet.</p>
      </aside>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="modal-backdrop hidden" id="modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" id="modal-close" aria-label="Cerrar">×</button>
        <div class="modal-symbol" id="modal-symbol">✓</div>
        <h2 id="modal-title">¡Todo está listo!</h2>
        <p id="modal-message"></p>
        <button class="button primary wide" id="modal-ok">Continuar creando</button>
      </div>
    </div>
    <div class="modal-backdrop hidden" id="sensor-library-modal">
      <div class="modal sensor-library-modal" role="dialog" aria-modal="true" aria-labelledby="sensor-library-title">
        <button class="modal-close" id="sensor-library-close" aria-label="Cerrar">×</button>
        <div class="library-dialog-heading"><span>📚</span><div><span class="eyebrow">INSTALADOS EN ESTE PC</span><h2 id="sensor-library-title">Biblioteca de sensores</h2></div></div>
        <p>Elige solamente los sensores que utilizarás en el proyecto actual.</p>
        <div id="sensor-catalog-list" class="sensor-catalog-list"></div>
      </div>
    </div>
    <div class="modal-backdrop hidden" id="variable-modal">
      <form class="modal variable-modal" id="variable-form" role="dialog" aria-modal="true" aria-labelledby="variable-title">
        <button class="modal-close" id="variable-close" type="button" aria-label="Cerrar">×</button>
        <div class="variable-symbol">123/ABC</div>
        <span class="eyebrow">GUARDAR UN VALOR</span>
        <h2 id="variable-title">Crear una variable</h2>
        <p>Elige si guardarás un número o un texto, como el contenido de una tarjeta NFC.</p>
        <label for="variable-name">Nombre de la variable</label>
        <input id="variable-name" maxlength="32" autocomplete="off" placeholder="Ejemplo: distancia" required>
        <label for="variable-type">¿Qué guardará?</label>
        <select id="variable-type">
          <option value="Number">🔢 Un número</option>
          <option value="String">🔤 Un texto</option>
        </select>
        <small id="variable-error" role="alert"></small>
        <button class="button primary wide" type="submit">Crear variable</button>
      </form>
    </div>
    <div class="modal-backdrop hidden" id="remove-sensor-modal">
      <div class="modal remove-sensor-modal" role="dialog" aria-modal="true" aria-labelledby="remove-sensor-title">
        <button class="modal-close" id="remove-sensor-close" type="button" aria-label="Cerrar">×</button>
        <div class="remove-sensor-symbol">−</div>
        <h2 id="remove-sensor-title">Quitar sensor del proyecto</h2>
        <p id="remove-sensor-message"></p>
        <div class="remove-sensor-actions">
          <button class="button ghost" id="remove-sensor-cancel" type="button">Cancelar</button>
          <button class="button danger" id="remove-sensor-confirm" type="button">Quitar sensor</button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop hidden" id="confirm-modal">
      <div class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="remove-sensor-symbol confirm-symbol">!</div>
        <h2 id="confirm-title">¿Continuar?</h2>
        <p id="confirm-message"></p>
        <div class="remove-sensor-actions">
          <button class="button ghost" id="confirm-cancel" type="button">Cancelar</button>
          <button class="button danger" id="confirm-accept" type="button">Continuar</button>
        </div>
      </div>
    </div>
  </div>`;

const theme = Blockly.Theme.defineTheme('aulaBlocksTheme', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#fbfaff',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#314058',
    flyoutBackgroundColour: '#f0edfa',
    flyoutForegroundColour: '#26334a',
    flyoutOpacity: 1,
    scrollbarColour: '#c9c3dc',
    insertionMarkerColour: '#6846db',
    insertionMarkerOpacity: 0.35,
    cursorColour: '#6846db'
  },
  categoryStyles: {
    extensions_category: { colour: CATEGORY_COLOURS.extensions }
  },
  fontStyle: { family: 'Nunito, Segoe UI, sans-serif', weight: '600', size: 12 }
});

const workspace = Blockly.inject('blockly-area', {
  toolbox,
  theme,
  renderer: 'zelos',
  trashcan: true,
  sounds: false,
  move: { scrollbars: true, drag: true, wheel: true },
  zoom: { controls: true, wheel: true, startScale: 0.88, maxScale: 1.45, minScale: 0.45, scaleSpeed: 1.15 }
});
workspace.registerButtonCallback('CREATE_AULABLOCKS_VARIABLE', openVariableModal);
workspace.registerToolboxCategoryCallback('AULABLOCKS_VARIABLES', variableToolboxContents);
sharpenBlocklyControls();

let extensions = [];
const extensionTypeOwners = new Map();
let currentPath = null;
let updateTimer;
let isBuilding = false;
let sensorCatalog = [];
let pendingSensorRemovalId = null;
let serialLines = [];
let serialPending = '';
let monitorConnected = false;
let hasUnsavedChanges = false;
let confirmResolver = null;

createStarterProgram();
updateCode();

workspace.addChangeListener((event) => {
  if (event.isUiEvent) return;
  hasUnsavedChanges = true;
  clearTimeout(updateTimer);
  updateTimer = setTimeout(updateCode, 120);
});

document.querySelector('#zoom-fit').addEventListener('click', () => workspace.zoomToFit());
document.querySelector('#show-blocks').addEventListener('click', () => showWorkspaceView('blocks'));
document.querySelector('#show-monitor').addEventListener('click', () => showWorkspaceView('monitor'));
document.querySelector('#monitor-start').addEventListener('click', startSerialMonitor);
document.querySelector('#monitor-stop').addEventListener('click', stopSerialMonitor);
document.querySelector('#monitor-clear').addEventListener('click', clearSerialMonitor);
document.querySelector('#monitor-send-form').addEventListener('submit', sendSerialMessage);
document.querySelector('#undo').addEventListener('click', () => workspace.undo(false));
document.querySelector('#redo').addEventListener('click', () => workspace.undo(true));
document.querySelector('#new-project').addEventListener('click', newProject);
document.querySelector('#save-project').addEventListener('click', saveProject);
document.querySelector('#open-project').addEventListener('click', openProject);
document.querySelector('#export-ino').addEventListener('click', exportIno);
document.querySelector('#import-extension').addEventListener('click', importExtension);
document.querySelector('#copy-code').addEventListener('click', copyCode);
document.querySelector('#check-project').addEventListener('click', checkProject);
document.querySelector('#open-sensor-library').addEventListener('click', openSensorLibrary);
document.querySelector('#sensor-library-close').addEventListener('click', closeSensorLibrary);
document.querySelector('#sensor-library-modal').addEventListener('click', (event) => { if (event.target.id === 'sensor-library-modal') closeSensorLibrary(); });
document.querySelector('#variable-form').addEventListener('submit', createVariable);
document.querySelector('#variable-close').addEventListener('click', closeVariableModal);
document.querySelector('#variable-modal').addEventListener('click', (event) => { if (event.target.id === 'variable-modal') closeVariableModal(); });
document.querySelector('#sensor-catalog-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-sensor-id]');
  if (!button) return;
  if (button.dataset.action === 'remove') requestSensorRemoval(button.dataset.sensorId);
  else useCatalogSensor(button.dataset.sensorId);
});
document.querySelector('#extension-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-extension-id]');
  if (button) requestSensorRemoval(button.dataset.removeExtensionId);
});
document.querySelector('#remove-sensor-close').addEventListener('click', closeSensorRemoval);
document.querySelector('#remove-sensor-cancel').addEventListener('click', closeSensorRemoval);
document.querySelector('#remove-sensor-confirm').addEventListener('click', confirmSensorRemoval);
document.querySelector('#remove-sensor-modal').addEventListener('click', (event) => { if (event.target.id === 'remove-sensor-modal') closeSensorRemoval(); });
document.querySelector('#board-select').addEventListener('change', (event) => {
  document.querySelector('#board-label').textContent = event.target.selectedOptions[0].text;
  hasUnsavedChanges = true;
  updateBoardControls();
  showToast(`${event.target.selectedOptions[0].text} seleccionada`);
});
document.querySelector('#project-name').addEventListener('input', () => { hasUnsavedChanges = true; });
document.querySelector('#confirm-cancel').addEventListener('click', () => resolveConfirm(false));
document.querySelector('#confirm-accept').addEventListener('click', () => resolveConfirm(true));
document.querySelector('#confirm-modal').addEventListener('click', (event) => { if (event.target.id === 'confirm-modal') resolveConfirm(false); });
document.querySelector('#refresh-ports').addEventListener('click', refreshArduinoPorts);
document.querySelector('#install-usb-driver').addEventListener('click', installUsbDriver);
document.querySelector('#compile-direct').addEventListener('click', () => runArduino(false));
document.querySelector('#upload-direct').addEventListener('click', () => runArduino(true));
document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#modal-ok').addEventListener('click', closeModal);
document.querySelector('#modal').addEventListener('click', (event) => { if (event.target.id === 'modal') closeModal(); });
window.addEventListener('resize', () => Blockly.svgResize(workspace));

if (window.aulaBlocks?.onArduinoProgress) {
  window.aulaBlocks.onArduinoProgress((progress) => {
    setUploadStatus(progress.message || 'Trabajando…', progress.stage === 'upload' ? 'upload' : 'compile');
  });
  refreshArduinoPorts();
}
if (window.aulaBlocks?.onSerialMonitorData) window.aulaBlocks.onSerialMonitorData(appendSerialData);
if (window.aulaBlocks?.onSerialMonitorStatus) window.aulaBlocks.onSerialMonitorStatus(updateSerialMonitorStatus);
if (window.aulaBlocks?.onRequestClose) {
  window.aulaBlocks.onRequestClose(async () => {
    if (!hasUnsavedChanges) return window.aulaBlocks.respondToCloseRequest(true);
    const proceed = await askConfirmation('¿Cerrar AulaBlocks?', `Tienes cambios sin guardar en “${document.querySelector('#project-name').value}”. Si cierras ahora, se perderán.`, 'Cerrar sin guardar');
    window.aulaBlocks.respondToCloseRequest(proceed);
  });
}
if (window.aulaBlocks?.installCh340Driver && window.aulaBlocks?.platform === 'win32') {
  document.querySelector('#install-usb-driver').hidden = false;
}
updateBoardControls();
loadSensorCatalog();

async function installUsbDriver() {
  const button = document.querySelector('#install-usb-driver');
  button.disabled = true;
  const previousText = button.textContent;
  button.textContent = 'Instalando… acepta el permiso de administrador';
  try {
    const result = await window.aulaBlocks.installCh340Driver();
    openModal(result.ok ? 'Controlador instalado' : 'No pudimos instalarlo', result.message, result.ok ? '✓' : '!');
    if (result.ok) refreshArduinoPorts();
  } catch (error) {
    openModal('No pudimos instalarlo', error.message || 'Ocurrió un error inesperado.', '!');
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}

function askConfirmation(title, message, acceptLabel = 'Continuar') {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    document.querySelector('#confirm-title').textContent = title;
    document.querySelector('#confirm-message').textContent = message;
    document.querySelector('#confirm-accept').textContent = acceptLabel;
    document.querySelector('#confirm-modal').classList.remove('hidden');
  });
}

function resolveConfirm(value) {
  document.querySelector('#confirm-modal').classList.add('hidden');
  const resolve = confirmResolver;
  confirmResolver = null;
  if (resolve) resolve(value);
}

function createStarterProgram() {
  workspace.clear();
  const setup = createBlock('arduino_setup', 36, 35);
  const loop = createBlock('arduino_loop', 36, 235);
  const on = createBlock('digital_write');
  on.setFieldValue('13', 'PIN');
  on.setFieldValue('HIGH', 'STATE');
  const waitOn = createBlock('wait_ms');
  connectNumber(waitOn, 'TIME', 500);
  const off = createBlock('digital_write');
  off.setFieldValue('13', 'PIN');
  off.setFieldValue('LOW', 'STATE');
  const waitOff = createBlock('wait_ms');
  connectNumber(waitOff, 'TIME', 500);
  loop.getInput('DO').connection.connect(on.previousConnection);
  on.nextConnection.connect(waitOn.previousConnection);
  waitOn.nextConnection.connect(off.previousConnection);
  off.nextConnection.connect(waitOff.previousConnection);
  setup.render();
  loop.render();
}

function loadAlarmTemplate() {
  workspace.clear();
  clearProjectExtensions();
  registerExtension({
    id: 'pack-alarma',
    name: 'Componentes de alarma',
    version: '1.0.0',
    icon: '🛡️',
    blockTypes: ['lcd_print', 'keypad_password_ok', 'rfid_uid_matches', 'pir_motion', 'button_pressed'],
    libraries: [
      { name: 'Keypad', version: '3.1.1' },
      { name: 'LiquidCrystal I2C', version: '1.1.2' },
      { name: 'MFRC522', version: '1.4.12' }
    ]
  }, true);
  rebuildToolbox();
  document.querySelector('#project-name').value = 'Sistema de alarma inteligente';
  selectBoard('mega');
  const setup = createBlock('arduino_setup', 30, 30);
  const ready = createBlock('lcd_print');
  connectText(ready, 'VALUE', 'Sistema listo');
  ready.setFieldValue('0', 'COL');
  ready.setFieldValue('0', 'ROW');
  setup.getInput('DO').connection.connect(ready.previousConnection);

  const loop = createBlock('arduino_loop', 30, 235);
  const decision = createBlock('controls_if');
  decision.loadExtraState({ elseIfCount: 2, hasElse: false });
  decision.render();
  loop.getInput('DO').connection.connect(decision.previousConnection);

  const password = createBlock('keypad_password_ok');
  connectText(password, 'PASSWORD', '1234');
  decision.getInput('IF0').connection.connect(password.outputConnection);
  const passwordLcd = createBlock('lcd_print');
  connectText(passwordLcd, 'VALUE', 'Clave correcta');
  decision.getInput('DO0').connection.connect(passwordLcd.previousConnection);

  const card = createBlock('rfid_uid_matches');
  card.setFieldValue('53', 'SS');
  card.setFieldValue('49', 'RST');
  connectText(card, 'UID', 'DE AD BE EF');
  decision.getInput('IF1').connection.connect(card.outputConnection);
  const cardLcd = createBlock('lcd_print');
  cardLcd.setFieldValue('1', 'ROW');
  connectText(cardLcd, 'VALUE', 'Tarjeta valida');
  decision.getInput('DO1').connection.connect(cardLcd.previousConnection);

  const trigger = createBlock('logic_operation');
  trigger.setFieldValue('OR', 'OP');
  const pir = createBlock('pir_motion');
  pir.setFieldValue('30', 'PIN');
  const panic = createBlock('button_pressed');
  panic.setFieldValue('31', 'PIN');
  panic.setFieldValue('PULLUP', 'WIRING');
  trigger.getInput('A').connection.connect(pir.outputConnection);
  trigger.getInput('B').connection.connect(panic.outputConnection);
  decision.getInput('IF2').connection.connect(trigger.outputConnection);
  const alarmLcd = createBlock('lcd_print');
  connectText(alarmLcd, 'VALUE', 'ALARMA!');
  const buzzer = createBlock('buzzer_tone');
  buzzer.setFieldValue('6', 'PIN');
  connectNumber(buzzer, 'FREQ', 880);
  connectNumber(buzzer, 'TIME', 400);
  const relay = createBlock('relay_set');
  relay.setFieldValue('7', 'PIN');
  relay.setFieldValue('ON', 'STATE');
  decision.getInput('DO2').connection.connect(alarmLcd.previousConnection);
  alarmLcd.nextConnection.connect(buzzer.previousConnection);
  buzzer.nextConnection.connect(relay.previousConnection);
  workspace.zoomToFit();
  updateCode();
  showToast('Proyecto de alarma cargado · recomendado para Arduino Mega');
}

function loadLineTemplate() {
  workspace.clear();
  clearProjectExtensions();
  registerExtension({
    id: 'pack-seguidor-linea',
    name: 'Sensor seguidor de línea',
    version: '1.0.0',
    icon: '🏎️',
    blockTypes: ['line_sensor']
  }, true);
  rebuildToolbox();
  document.querySelector('#project-name').value = 'Auto seguidor de línea';
  selectBoard('uno');
  createBlock('arduino_setup', 30, 30);
  const loop = createBlock('arduino_loop', 30, 210);
  const decision = createBlock('controls_if');
  decision.loadExtraState({ elseIfCount: 2, hasElse: true });
  decision.render();
  loop.getInput('DO').connection.connect(decision.previousConnection);

  const both = createBlock('logic_operation');
  both.setFieldValue('AND', 'OP');
  both.getInput('A').connection.connect(createLineSensor('2').outputConnection);
  both.getInput('B').connection.connect(createLineSensor('4').outputConnection);
  decision.getInput('IF0').connection.connect(both.outputConnection);
  decision.getInput('DO0').connection.connect(createRobotMove('FORWARD', 165).previousConnection);

  decision.getInput('IF1').connection.connect(createLineSensor('2').outputConnection);
  decision.getInput('DO1').connection.connect(createRobotMove('LEFT', 150).previousConnection);
  decision.getInput('IF2').connection.connect(createLineSensor('4').outputConnection);
  decision.getInput('DO2').connection.connect(createRobotMove('RIGHT', 150).previousConnection);
  decision.getInput('ELSE').connection.connect(createRobotMove('STOP', 0).previousConnection);
  workspace.zoomToFit();
  updateCode();
  showToast('Proyecto de auto seguidor cargado');
}

function createLineSensor(pin) {
  const sensor = createBlock('line_sensor');
  sensor.setFieldValue(pin, 'PIN');
  sensor.setFieldValue('BLACK', 'SURFACE');
  return sensor;
}

function createRobotMove(action, speed) {
  const motor = createBlock('robot_drive');
  motor.setFieldValue(action, 'ACTION');
  connectNumber(motor, 'SPEED', speed);
  return motor;
}

function createBlock(type, x, y) {
  const block = workspace.newBlock(type);
  block.initSvg();
  block.render();
  if (x != null) block.moveBy(x, y);
  return block;
}

function connectNumber(parent, inputName, number) {
  const numberBlock = createBlock('math_number');
  numberBlock.setFieldValue(String(number), 'NUM');
  parent.getInput(inputName).connection.connect(numberBlock.outputConnection);
}

function connectText(parent, inputName, text) {
  const textBlock = createBlock('text');
  textBlock.setFieldValue(text, 'TEXT');
  parent.getInput(inputName).connection.connect(textBlock.outputConnection);
}

function selectBoard(value) {
  const select = document.querySelector('#board-select');
  select.value = value;
  document.querySelector('#board-label').textContent = select.selectedOptions[0].text;
  updateBoardControls();
}

function updateBoardControls() {
  const board = document.querySelector('#board-select').value;
  const directSupported = board === 'uno' || board === 'nano';
  document.querySelector('.board-illustration b').textContent = board === 'nano' ? 'NANO' : board.toUpperCase();
  document.querySelector('#board-status').textContent = directSupported ? 'Carga directa disponible' : 'Solo exportación .ino';
  document.querySelector('#compile-direct').disabled = isBuilding || !directSupported;
  document.querySelector('#upload-direct').disabled = isBuilding || !directSupported;
  if (!directSupported) setUploadStatus('La carga directa está disponible para Uno y Nano ATmega328PB.', 'idle');
}

async function refreshArduinoPorts() {
  const select = document.querySelector('#port-select');
  const help = document.querySelector('#port-help');
  const button = document.querySelector('#refresh-ports');
  if (!window.aulaBlocks?.listArduinoPorts) {
    help.textContent = 'La carga USB está disponible en la aplicación instalada.';
    return;
  }
  button.disabled = true;
  help.dataset.state = '';
  help.textContent = 'Buscando placas conectadas…';
  try {
    const previous = select.value;
    const ports = await window.aulaBlocks.listArduinoPorts();
    const usbPorts = ports.filter((port) => port.isUsb || port.board);
    select.innerHTML = '';
    if (!usbPorts.length) {
      select.add(new Option('Arduino USB no detectado', ''));
      help.dataset.state = 'warning';
      help.textContent = ports.length
        ? 'Windows sólo muestra un puerto interno. Prueba otro cable de datos; si tu placa usa CH340/CH341, instala su controlador.'
        : 'Windows no creó un puerto USB. Prueba otro cable de datos y revisa el controlador CH340/CH341.';
      return;
    }
    for (const port of usbPorts) select.add(new Option(port.label, port.address));
    const preferred = usbPorts.find((port) => port.address === previous) || usbPorts.find((port) => port.board) || usbPorts[0];
    select.value = preferred.address;
    help.dataset.state = 'success';
    help.textContent = `${usbPorts.length} placa o adaptador USB disponible${usbPorts.length > 1 ? 's' : ''}.`;
  } catch (error) {
    select.innerHTML = '<option value="">No disponible</option>';
    help.textContent = error.message || 'No pudimos buscar placas.';
  } finally {
    button.disabled = false;
    updateMonitorPortLabel();
  }
}

function showWorkspaceView(view) {
  const panel = document.querySelector('.editor-panel');
  panel.dataset.view = view;
  const blocksTab = document.querySelector('#show-blocks');
  const monitorTab = document.querySelector('#show-monitor');
  blocksTab.classList.toggle('active', view === 'blocks');
  monitorTab.classList.toggle('active', view === 'monitor');
  blocksTab.setAttribute('aria-selected', String(view === 'blocks'));
  monitorTab.setAttribute('aria-selected', String(view === 'monitor'));
  if (view === 'blocks') setTimeout(() => Blockly.svgResize(workspace), 0);
  else updateMonitorPortLabel();
}

function updateMonitorPortLabel() {
  const select = document.querySelector('#port-select');
  document.querySelector('#monitor-port-label').textContent = select.value
    ? select.selectedOptions[0]?.textContent || select.value
    : 'Ninguna placa USB seleccionada';
}

async function startSerialMonitor() {
  if (!window.aulaBlocks?.startSerialMonitor) return openModal('Abre AulaBlocks instalado', 'El Monitor serial funciona desde la aplicación de escritorio.', '📟');
  const port = document.querySelector('#port-select').value;
  if (!port) return openModal('Conecta tu Arduino', 'Pulsa buscar y selecciona el puerto USB antes de iniciar el monitor.', '🔌');
  try {
    updateSerialMonitorStatus({ state: 'connecting', message: 'Abriendo el puerto…' });
    await window.aulaBlocks.startSerialMonitor({ port, baudrate: Number(document.querySelector('#monitor-baudrate').value) });
  } catch (error) {
    updateSerialMonitorStatus({ state: 'error', message: error.message || 'No pudimos abrir el monitor.' });
  }
}

async function stopSerialMonitor() {
  if (!window.aulaBlocks?.stopSerialMonitor) return;
  await window.aulaBlocks.stopSerialMonitor();
  updateSerialMonitorStatus({ state: 'stopped', message: 'Monitor detenido.' });
}

function updateSerialMonitorStatus(status) {
  const state = status?.state || 'stopped';
  monitorConnected = state === 'connected';
  const target = document.querySelector('#monitor-state');
  target.dataset.state = state;
  target.querySelector('strong').textContent = monitorConnected ? 'Recibiendo' : state === 'connecting' ? 'Conectando' : state === 'error' ? 'Revisar conexión' : 'Detenido';
  document.querySelector('#monitor-message').textContent = status?.message || 'Monitor detenido.';
  const detail = document.querySelector('#monitor-detail');
  if (status?.detail) {
    document.querySelector('#monitor-detail-text').textContent = status.detail;
    detail.classList.remove('hidden');
  } else {
    detail.classList.add('hidden');
    detail.open = false;
  }
  document.querySelector('#monitor-start').disabled = monitorConnected || state === 'connecting';
  document.querySelector('#monitor-stop').disabled = !monitorConnected && state !== 'connecting';
  document.querySelector('#monitor-baudrate').disabled = monitorConnected || state === 'connecting';
}

function appendSerialData(chunk) {
  serialPending += String(chunk || '').replace(/\r/g, '');
  const pieces = serialPending.split('\n');
  serialPending = pieces.pop() || '';
  for (const line of pieces) {
    const clean = line.trim();
    if (!clean) continue;
    serialLines.push(clean);
    if (serialLines.length > 300) serialLines.shift();
    const numeric = clean.match(/-?\d+(?:[.,]\d+)?/);
    document.querySelector('#monitor-latest').textContent = numeric ? numeric[0] : clean.slice(0, 24);
  }
  document.querySelector('#serial-monitor-log').textContent = serialLines.length ? serialLines.join('\n') : 'Esperando datos de Arduino…';
  const log = document.querySelector('#serial-monitor-log');
  log.scrollTop = log.scrollHeight;
}

function clearSerialMonitor() {
  serialLines = [];
  serialPending = '';
  document.querySelector('#serial-monitor-log').textContent = 'Esperando datos de Arduino…';
  document.querySelector('#monitor-latest').textContent = '—';
}

async function sendSerialMessage(event) {
  event.preventDefault();
  const input = document.querySelector('#monitor-send-input');
  if (!input.value.trim()) return;
  try {
    await window.aulaBlocks?.sendSerialMonitor(input.value);
    input.value = '';
  } catch (error) {
    document.querySelector('#monitor-message').textContent = error.message || 'No pudimos enviar el mensaje.';
  }
}

function sharpenBlocklyControls() {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const controls = [
    ['.blocklyZoomIn', '<path d="M16 9v14M9 16h14"/>'],
    ['.blocklyZoomOut', '<path d="M9 16h14"/>'],
    ['.blocklyZoomReset', '<circle cx="16" cy="16" r="6"/><path d="M16 6v4M16 22v4M6 16h4M22 16h4"/>']
  ];
  for (const [selector, drawing] of controls) {
    const group = document.querySelector(selector);
    if (!group) continue;
    group.querySelectorAll('image').forEach((image) => image.setAttribute('display', 'none'));
    const visual = document.createElementNS(svgNamespace, 'g');
    visual.setAttribute('class', 'aulablocks-vector-control');
    visual.innerHTML = `<rect x="1" y="1" width="30" height="30" rx="8"/>${drawing}`;
    group.appendChild(visual);
  }

  const trash = document.querySelector('.blocklyTrash');
  if (trash) {
    trash.querySelectorAll('image').forEach((image) => image.setAttribute('display', 'none'));
    const visual = document.createElementNS(svgNamespace, 'g');
    visual.setAttribute('class', 'aulablocks-vector-trash');
    visual.innerHTML = '<path d="M12 18h24l-2 31H14l-2-31Z"/><path d="M9 14h30M19 14v-4h10v4M20 24v18M28 24v18"/>';
    trash.appendChild(visual);
  }
}

async function runArduino(upload) {
  const issue = projectIssue();
  if (issue) return openModal(issue.title, issue.message, '!');
  if (!window.aulaBlocks?.buildArduino) return openModal('Abre AulaBlocks instalado', 'La compilación y carga USB se realizan desde la aplicación de escritorio.', '!');
  const board = document.querySelector('#board-select').value;
  if (!['uno', 'nano'].includes(board)) return openModal('Placa sin carga directa', 'Por ahora puedes cargar directamente Arduino Uno y Nano ATmega328PB. Para Mega, guarda el archivo .ino.', '!');
  const port = document.querySelector('#port-select').value;
  if (upload && !port) return openModal('Conecta tu Arduino', 'Conecta la placa por USB, pulsa buscar y selecciona el puerto antes de cargar.', '🔌');

  updateCode();
  isBuilding = true;
  updateBoardControls();
  document.querySelector('#refresh-ports').disabled = true;
  document.querySelector('#upload-details').open = false;
  document.querySelector('#upload-log').textContent = '';
  setUploadStatus(upload ? 'Preparando la carga…' : 'Preparando la comprobación…', 'compile');
  try {
    const result = await window.aulaBlocks.buildArduino({
      upload,
      board,
      port,
      projectName: document.querySelector('#project-name').value,
      code: document.querySelector('#code-output').textContent
    });
    setUploadStatus(result.message, result.ok ? 'success' : 'error');
    document.querySelector('#upload-log').textContent = result.details || 'Sin detalles adicionales.';
    document.querySelector('#upload-details').open = !result.ok;
    openModal(result.title, result.message, result.ok ? '✓' : '!');
  } catch (error) {
    setUploadStatus(error.message || 'No pudimos completar la operación.', 'error');
    openModal('No pudimos completarlo', error.message || 'Ocurrió un error inesperado.', '!');
  } finally {
    isBuilding = false;
    document.querySelector('#refresh-ports').disabled = false;
    updateBoardControls();
  }
}

function setUploadStatus(message, state) {
  document.querySelector('#upload-status').textContent = message;
  const card = document.querySelector('.upload-card');
  card.dataset.state = state;
  const widths = { idle: '0%', compile: '45%', upload: '78%', success: '100%', error: '100%' };
  document.querySelector('#upload-progress-fill').style.width = widths[state] || '0%';
}

function updateCode() {
  try {
    const code = generateSketch(workspace, extensions);
    document.querySelector('#code-output').textContent = code;
    updateLibraryNote(code);
  } catch (error) {
    document.querySelector('#code-output').textContent = `// Revisa los bloques sin conectar.\n// ${error.message}`;
  }
}

function updateLibraryNote(code) {
  const names = [];
  if (code.includes('<Servo.h>')) names.push('Servo');
  if (code.includes('<DHT.h>')) names.push('DHT');
  if (code.includes('<Adafruit_NeoPixel.h>')) names.push('Adafruit NeoPixel');
  if (code.includes('<Keypad.h>')) names.push('Keypad');
  if (code.includes('<LiquidCrystal_I2C.h>')) names.push('LiquidCrystal I2C');
  if (code.includes('<MFRC522.h>')) names.push('MFRC522');
  if (code.includes('<Stepper.h>')) names.push('Stepper');
  const usedTypes = new Set(workspace.getAllBlocks(false).map((block) => block.type));
  for (const extension of extensions) {
    const extensionTypes = [
      ...(extension.blocks || []).map((block) => block.type),
      ...(extension.blockTypes || [])
    ];
    if (!extensionTypes.some((type) => usedTypes.has(type))) continue;
    if (extension.libraries?.length) names.push(...extension.libraries.map((library) => library.name || library));
    else names.push(extension.name);
  }
  document.querySelector('#library-note p').textContent = names.length ? names.join(', ') : 'Ninguna librería externa en este proyecto.';
}

async function newProject() {
  if (hasUnsavedChanges) {
    const proceed = await askConfirmation('¿Crear un proyecto nuevo?', `Perderás los cambios sin guardar de “${document.querySelector('#project-name').value}”. Guarda primero si quieres conservarlos.`, 'Crear de todas formas');
    if (!proceed) return;
  }
  workspace.clear();
  clearProjectExtensions();
  currentPath = null;
  document.querySelector('#project-name').value = 'Proyecto nuevo';
  const setup = createBlock('arduino_setup', 40, 40);
  const loop = createBlock('arduino_loop', 40, 230);
  setup.render();
  loop.render();
  hasUnsavedChanges = false;
  updateCode();
  showToast('Proyecto nuevo creado');
}

function projectData() {
  return {
    format: 'aulablocks-project',
    version: 1,
    name: document.querySelector('#project-name').value.trim() || 'Mi proyecto',
    board: document.querySelector('#board-select').value,
    extensions,
    workspace: Blockly.serialization.workspaces.save(workspace)
  };
}

async function saveProject() {
  const data = JSON.stringify(projectData(), null, 2);
  const defaultName = `${fileSafeName(document.querySelector('#project-name').value)}.aulablocks`;
  const result = await saveText({
    title: 'Guardar proyecto AulaBlocks', defaultPath: currentPath || defaultName, content: data,
    filters: [{ name: 'Proyecto AulaBlocks', extensions: ['aulablocks'] }]
  });
  if (!result.canceled) {
    currentPath = result.path || currentPath;
    hasUnsavedChanges = false;
    showToast('Proyecto guardado');
  }
}

async function openProject() {
  const result = await openText({ title: 'Abrir proyecto AulaBlocks', accept: '.aulablocks,application/json', filters: [{ name: 'Proyecto AulaBlocks', extensions: ['aulablocks', 'json'] }], maxBytes: 15 * 1024 * 1024 });
  if (result.canceled) return;
  let data;
  try {
    data = JSON.parse(result.content);
    if (data.format !== 'aulablocks-project' || !data.workspace) throw new Error('Formato no reconocido');
  } catch (error) {
    openModal('No pudimos abrirlo', `El archivo no parece ser un proyecto AulaBlocks válido. ${error.message}`, '!');
    return;
  }

  if (hasUnsavedChanges) {
    const proceed = await askConfirmation('¿Abrir este proyecto?', `Perderás los cambios sin guardar de “${document.querySelector('#project-name').value}”.`, 'Abrir de todas formas');
    if (!proceed) return;
  }

  const previousState = {
    extensions,
    workspaceState: Blockly.serialization.workspaces.save(workspace),
    name: document.querySelector('#project-name').value,
    board: document.querySelector('#board-select').value,
    path: currentPath
  };

  try {
    workspace.clear();
    clearProjectExtensions();
    for (const extension of data.extensions || []) registerExtension(extension, false);
    rebuildToolbox();
    Blockly.serialization.workspaces.load(data.workspace, workspace);
    document.querySelector('#project-name').value = data.name || 'Mi proyecto';
    document.querySelector('#board-select').value = data.board || 'uno';
    document.querySelector('#board-label').textContent = document.querySelector('#board-select').selectedOptions[0].text;
    updateBoardControls();
    currentPath = result.path || null;
    hasUnsavedChanges = false;
    updateCode();
    showToast('Proyecto abierto');
  } catch (error) {
    workspace.clear();
    clearProjectExtensions();
    for (const extension of previousState.extensions) registerExtension(extension, false);
    rebuildToolbox();
    Blockly.serialization.workspaces.load(previousState.workspaceState, workspace);
    document.querySelector('#project-name').value = previousState.name;
    document.querySelector('#board-select').value = previousState.board;
    document.querySelector('#board-label').textContent = document.querySelector('#board-select').selectedOptions[0].text;
    updateBoardControls();
    currentPath = previousState.path;
    updateCode();
    openModal('No pudimos abrirlo', `El archivo tiene un problema y no pudimos cargarlo por completo. Restauramos tu proyecto anterior sin perder nada. ${error.message}`, '!');
  }
}

async function exportIno() {
  updateCode();
  const result = await saveText({
    title: 'Guardar programa para Arduino',
    defaultPath: `${fileSafeName(document.querySelector('#project-name').value)}.ino`,
    content: document.querySelector('#code-output').textContent,
    filters: [{ name: 'Programa Arduino', extensions: ['ino'] }]
  });
  if (!result.canceled) openModal('¡Programa preparado!', 'El archivo .ino contiene todo el código creado con tus bloques. Puedes abrirlo y cargarlo a la placa desde Arduino IDE.', '↓');
}

async function importExtension() {
  const result = await openText({ title: 'Añadir un paquete de sensor', accept: '.aulasensor,.ardublock.json,application/json', filters: [{ name: 'Sensor AulaBlocks', extensions: ['aulasensor', 'json'] }], maxBytes: 40 * 1024 * 1024 });
  if (result.canceled) return;
  try {
    let extension = JSON.parse(result.content);
    validateExtension(extension);
    let installedLibraries = [];
    let installWarnings = [];
    if (extension.packageFormat === 'aulablocks-sensor') {
      if (!window.aulaBlocks?.installSensorPackage) throw new Error('Los paquetes con bibliotecas deben instalarse desde la aplicación de escritorio.');
      const installed = await window.aulaBlocks.installSensorPackage(extension);
      extension = installed.extension;
      installedLibraries = installed.installedLibraries || [];
      installWarnings = installed.warnings || [];
      validateExtension(extension);
      await loadSensorCatalog();
    }
    const updating = extensions.some((item) => item.id === extension.id);
    const { removedBlockCount } = registerExtension(extension, true);
    rebuildToolbox();
    updateCode();
    const libraries = (extension.libraries || []).map((library) => typeof library === 'string' ? library : `${library.name}${library.version ? ` ${library.version}` : ''}`);
    const notes = [];
    if (installedLibraries.length) notes.push(`Se instalaron también: ${installedLibraries.map((library) => `${library.name} ${library.version}`).join(', ')}.`);
    else if (libraries.length) notes.push(`Bibliotecas declaradas: ${libraries.join(', ')}.`);
    else notes.push('No necesita bibliotecas externas.');
    if (removedBlockCount) notes.push(`Se quitaron ${removedBlockCount} bloque${removedBlockCount === 1 ? '' : 's'} de una versión anterior de este sensor que ya no existe en la nueva versión.`);
    if (installWarnings.length) notes.push(...installWarnings);
    openModal(
      updating ? 'Sensor actualizado' : 'Sensor añadido',
      `${extension.name} ya tiene su propia categoría “${extensionCategoryName(extension)}” en este proyecto. ${notes.join(' ')}`,
      '🧩'
    );
  } catch (error) {
    openModal('Extensión no válida', error.message, '!');
  }
}

async function loadSensorCatalog() {
  if (!window.aulaBlocks?.listSensorCatalog) {
    sensorCatalog = [];
    renderSensorCatalog();
    return;
  }
  try {
    sensorCatalog = await window.aulaBlocks.listSensorCatalog();
  } catch (error) {
    sensorCatalog = [];
    console.warn(error);
  }
  renderSensorCatalog();
}

function openSensorLibrary() {
  renderSensorCatalog();
  document.querySelector('#sensor-library-modal').classList.remove('hidden');
}

function closeSensorLibrary() {
  document.querySelector('#sensor-library-modal').classList.add('hidden');
}

function openVariableModal() {
  const modal = document.querySelector('#variable-modal');
  const input = document.querySelector('#variable-name');
  document.querySelector('#variable-error').textContent = '';
  input.value = '';
  document.querySelector('#variable-type').value = 'Number';
  modal.classList.remove('hidden');
  requestAnimationFrame(() => input.focus());
}

function closeVariableModal() {
  document.querySelector('#variable-modal').classList.add('hidden');
}

function createVariable(event) {
  event.preventDefault();
  const input = document.querySelector('#variable-name');
  const error = document.querySelector('#variable-error');
  const name = input.value.trim();
  const type = document.querySelector('#variable-type').value === 'String' ? 'String' : 'Number';
  if (!name) {
    error.textContent = 'Escribe un nombre para continuar.';
    input.focus();
    return;
  }
  if (Blockly.Variables.nameUsedWithAnyType(name, workspace)) {
    error.textContent = 'Ya existe una variable con ese nombre.';
    input.select();
    return;
  }
  workspace.getVariableMap().createVariable(name, type);
  closeVariableModal();
  const toolboxControl = workspace.getToolbox();
  const variableCategory = toolboxControl?.getToolboxItems().find((item) => item.getName?.() === 'Variables');
  if (variableCategory) {
    setTimeout(() => {
      variableCategory.updateFlyoutContents(variableToolboxContents(workspace));
      toolboxControl.setSelectedItem(null);
      toolboxControl.setSelectedItem(variableCategory);
    }, 50);
  }
  updateCode();
  showToast(`Variable de ${type === 'String' ? 'texto' : 'número'} “${name}” creada`);
}

function variableToolboxContents(targetWorkspace) {
  const variableMap = targetWorkspace.getVariableMap();
  const numberVariables = variableMap.getVariablesOfType('Number');
  const textVariables = variableMap.getVariablesOfType('String');
  const legacyVariables = variableMap.getVariablesOfType('');
  return [
    { kind: 'button', text: '＋ Crear variable', callbackkey: 'CREATE_AULABLOCKS_VARIABLE' },
    ...(numberVariables.length ? [
      { kind: 'label', text: '🔢 Variables numéricas' },
      ...Blockly.Variables.jsonFlyoutCategoryBlocks(targetWorkspace, numberVariables, false, 'variables_get_dynamic', 'variables_set_dynamic')
    ] : []),
    ...(textVariables.length ? [
      { kind: 'label', text: '🔤 Variables de texto' },
      ...Blockly.Variables.jsonFlyoutCategoryBlocks(targetWorkspace, textVariables, false, 'variables_get_dynamic', 'variables_set_dynamic')
    ] : []),
    ...(legacyVariables.length ? [
      { kind: 'label', text: 'Variables anteriores (numéricas)' },
      ...Blockly.Variables.jsonFlyoutCategoryBlocks(targetWorkspace, legacyVariables, true)
    ] : [])
  ];
}

function renderSensorCatalog() {
  const target = document.querySelector('#sensor-catalog-list');
  if (!target) return;
  if (!sensorCatalog.length) {
    target.innerHTML = '<div class="catalog-empty"><span>🧩</span><strong>Aún no hay sensores instalados</strong><small>Usa “Añadir sensor” para instalar tu primer paquete.</small></div>';
    return;
  }
  target.innerHTML = sensorCatalog.map((sensor) => {
    const active = extensions.some((extension) => extension.id === sensor.id);
    const libraries = (sensor.libraries || []).map((library) => escapeHtml(library.name || library)).join(', ') || 'Sin biblioteca externa';
    const image = sensorImageSource(sensor);
    return `<article class="sensor-catalog-item${active ? ' active' : ''}"><figure><img src="${escapeHtml(image)}" alt="Imagen de ${escapeHtml(sensor.name)}"></figure><div><strong>${escapeHtml(sensor.icon || '🧩')} ${escapeHtml(sensor.name)}</strong><small>v${escapeHtml(sensor.version || '1.0.0')} · ${libraries}</small>${active ? '<b>● Añadido a este proyecto</b>' : ''}</div><button class="${active ? 'remove' : ''}" data-sensor-id="${escapeHtml(sensor.id)}" data-action="${active ? 'remove' : 'add'}">${active ? 'Quitar del proyecto' : 'Añadir bloques'}</button></article>`;
  }).join('');
}

function sensorImageSource(sensor) {
  const image = sensor?.image;
  if (image?.mimeType === 'image/svg+xml' && image.encoding === 'utf8' && typeof image.data === 'string') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.data)}`;
  }
  if (['image/png', 'image/jpeg', 'image/webp'].includes(image?.mimeType) && image.encoding === 'base64' && typeof image.data === 'string') {
    return `data:${image.mimeType};base64,${image.data}`;
  }
  return fallbackSensorImage(sensor);
}

function fallbackSensorImage(sensor) {
  const identity = `${sensor?.id || ''} ${sensor?.name || ''}`.toLowerCase();
  let drawing = `<rect x='35' y='25' width='150' height='90' rx='12' fill='#2563a6'/><rect x='58' y='46' width='104' height='48' rx='7' fill='#162b46'/><g fill='#d5aa45'>${[48, 68, 88, 108, 128, 148, 168].map((x) => `<circle cx='${x}' cy='110' r='3'/>`).join('')}</g>`;
  if (identity.includes('hc-sr04') || identity.includes('ultras')) drawing = `<rect x='25' y='25' width='170' height='90' rx='10' fill='#1767a0'/><circle cx='72' cy='69' r='31' fill='#d8dde2'/><circle cx='148' cy='69' r='31' fill='#d8dde2'/><circle cx='72' cy='69' r='21' fill='#26323a'/><circle cx='148' cy='69' r='21' fill='#26323a'/><g fill='#d5aa45'>${[78, 99, 120, 141].map((x) => `<rect x='${x}' y='113' width='7' height='18' rx='2'/>`).join('')}</g>`;
  else if (identity.includes('ldr') || identity.includes('fotoresistencia')) drawing = `<rect x='55' y='25' width='110' height='94' rx='12' fill='#49328c'/><circle cx='110' cy='65' r='31' fill='#d99645'/><path d='M86 67c10-20 16 20 27 0s17 19 24-1' fill='none' stroke='#874313' stroke-width='5'/><path d='M100 96v31M121 96v31' stroke='#d5aa45' stroke-width='7'/>`;
  else if (identity.includes('pn532') || identity.includes('nfc')) drawing = `<rect x='38' y='17' width='144' height='108' rx='10' fill='#c43c35'/><rect x='55' y='31' width='110' height='80' rx='8' fill='none' stroke='#f1c457' stroke-width='5'/><rect x='66' y='42' width='88' height='58' rx='6' fill='none' stroke='#f1c457' stroke-width='4'/><rect x='78' y='53' width='64' height='36' rx='4' fill='none' stroke='#f1c457' stroke-width='3'/><rect x='91' y='61' width='38' height='21' rx='3' fill='#25324b'/>`;
  const label = escapeSvgText((sensor?.name || 'Sensor').replace(/·.*/, '').slice(0, 26));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='150' viewBox='0 0 220 150'><rect width='220' height='150' rx='18' fill='#f4f1ff'/>${drawing}<rect x='15' y='128' width='190' height='18' rx='9' fill='#fff'/><text x='110' y='141' text-anchor='middle' font-family='Segoe UI,Arial' font-size='10' font-weight='700' fill='#463a70'>${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function useCatalogSensor(id) {
  const extension = sensorCatalog.find((sensor) => sensor.id === id);
  if (!extension) return;
  try {
    validateExtension(extension);
    registerExtension(structuredClone(extension), true);
    rebuildToolbox();
    updateCode();
    renderSensorCatalog();
    closeSensorLibrary();
    showToast(`${extension.name} añadido a este proyecto`);
  } catch (error) {
    openModal('No pudimos añadirlo', error.message, '!');
  }
}

function requestSensorRemoval(id) {
  const extension = extensions.find((item) => item.id === id);
  if (!extension) return;
  const types = extensionBlockTypes(extension);
  const blockCount = workspace.getAllBlocks(false).filter((block) => types.includes(block.type)).length;
  pendingSensorRemovalId = id;
  document.querySelector('#remove-sensor-title').textContent = `Quitar ${extensionCategoryName(extension)}`;
  document.querySelector('#remove-sensor-message').textContent = blockCount
    ? `Este sensor tiene ${blockCount} bloque${blockCount === 1 ? '' : 's'} en el proyecto. Al quitarlo, esos bloques también se retirarán. El sensor seguirá instalado en la Biblioteca.`
    : 'La categoría desaparecerá del proyecto, pero el sensor seguirá instalado en la Biblioteca y podrás añadirlo nuevamente.';
  document.querySelector('#remove-sensor-modal').classList.remove('hidden');
}

function closeSensorRemoval() {
  pendingSensorRemovalId = null;
  document.querySelector('#remove-sensor-modal').classList.add('hidden');
}

function confirmSensorRemoval() {
  const id = pendingSensorRemovalId;
  const extension = extensions.find((item) => item.id === id);
  if (!extension) return closeSensorRemoval();
  const removedTypes = exclusiveExtensionTypes(extension, extensions.filter((item) => item.id !== id));
  for (const block of workspace.getAllBlocks(false).filter((item) => removedTypes.includes(item.type))) block.dispose(true);
  for (const definition of extension.blocks || []) {
    if (extensionTypeOwners.get(definition.type) !== id) continue;
    delete Blockly.Blocks[definition.type];
    delete arduinoGenerator.forBlock[definition.type];
    extensionTypeOwners.delete(definition.type);
  }
  extensions = extensions.filter((item) => item.id !== id);
  rebuildToolbox();
  updateCode();
  renderSensorCatalog();
  document.querySelector('#remove-sensor-modal').classList.add('hidden');
  pendingSensorRemovalId = null;
  showToast(`${extensionCategoryName(extension)} quitado del proyecto`);
}

function validateExtension(extension) {
  const hasDefinitions = Array.isArray(extension.blocks) && extension.blocks.length > 0;
  const hasKnownTypes = Array.isArray(extension.blockTypes) && extension.blockTypes.length > 0;
  if (!extension.id || !extension.name || (!hasDefinitions && !hasKnownTypes)) throw new Error('La extensión debe tener id, nombre y al menos un bloque.');
  for (const block of extension.blocks || []) {
    if (!block.type || !block.message0 || typeof block.code !== 'string') throw new Error('Cada bloque necesita type, message0 y code.');
    if (Blockly.Blocks[block.type] && extensionTypeOwners.get(block.type) !== extension.id) throw new Error(`El bloque ${block.type} ya existe.`);
  }
  for (const type of extension.blockTypes || []) {
    if (!Blockly.Blocks[type]) throw new Error(`El bloque conocido ${type} no está disponible en esta versión.`);
  }
}

function registerExtension(extension, addToList) {
  const existingIndex = extensions.findIndex((item) => item.id === extension.id);
  const previousOwnedTypes = new Set([...extensionTypeOwners].filter(([, owner]) => owner === extension.id).map(([type]) => type));
  for (const type of previousOwnedTypes) delete Blockly.Blocks[type];
  const definitions = (extension.blocks || []).map((block) => ({
    ...block,
    colour: block.colour || extension.colour || CATEGORY_COLOURS.extensions,
    previousStatement: block.codeKind === 'expression' || block.output != null ? undefined : null,
    nextStatement: block.codeKind === 'expression' || block.output != null ? undefined : null,
    output: block.codeKind === 'expression' && block.output == null ? null : block.output
  }));
  if (definitions.length) Blockly.defineBlocksWithJsonArray(definitions);
  for (const definition of definitions) extensionTypeOwners.set(definition.type, extension.id);
  if (definitions.length) registerExtensionGenerators(extension);

  const newTypes = new Set(definitions.map((definition) => definition.type));
  const obsoleteTypes = [...previousOwnedTypes].filter((type) => !newTypes.has(type));
  for (const type of obsoleteTypes) {
    delete arduinoGenerator.forBlock[type];
    extensionTypeOwners.delete(type);
  }
  let removedBlockCount = 0;
  if (obsoleteTypes.length) {
    const orphaned = workspace.getAllBlocks(false).filter((block) => obsoleteTypes.includes(block.type));
    removedBlockCount = orphaned.length;
    for (const block of orphaned) block.dispose(true);
  }

  if (existingIndex >= 0) extensions[existingIndex] = extension;
  else if (addToList || !extensions.some((item) => item.id === extension.id)) extensions.push(extension);
  renderExtensions();
  return { removedBlockCount, obsoleteTypes };
}

function rebuildToolbox() {
  const updated = structuredClone(toolbox);
  if (extensions.length) updated.contents.push(
    { kind: 'sep' },
    ...extensionToolboxCategories(extensions, CATEGORY_COLOURS.extensions)
  );
  workspace.updateToolbox(updated);
  renderExtensions();
}

function clearProjectExtensions() {
  for (const [type] of extensionTypeOwners) {
    delete Blockly.Blocks[type];
    delete arduinoGenerator.forBlock[type];
  }
  extensionTypeOwners.clear();
  extensions = [];
  rebuildToolbox();
}

function renderExtensions() {
  const target = document.querySelector('#extension-list');
  target.innerHTML = extensions.map((extension) => `<span class="extension-chip">${escapeHtml(extension.icon || '🧩')} ${escapeHtml(extensionCategoryName(extension))}<button type="button" data-remove-extension-id="${escapeHtml(extension.id)}" title="Quitar ${escapeHtml(extensionCategoryName(extension))} del proyecto" aria-label="Quitar ${escapeHtml(extensionCategoryName(extension))} del proyecto">×</button></span>`).join('');
}

async function copyCode() {
  await navigator.clipboard.writeText(document.querySelector('#code-output').textContent);
  showToast('Código copiado');
}

function checkProject() {
  const issue = projectIssue();
  if (issue) return openModal(issue.title, issue.message, '!');
  const blocks = workspace.getAllBlocks(false);
  openModal('Estructura de bloques ordenada', `Tu proyecto tiene ${blocks.length} bloques bien conectados y sin errores de armado. Esto no significa que el programa compile: pulsa “✓ Comprobar” para probarlo con el compilador de Arduino antes de cargarlo a la placa.`, '✓');
}

function projectIssue() {
  const blocks = workspace.getAllBlocks(false);
  const setupCount = blocks.filter((block) => block.type === 'arduino_setup').length;
  const loopCount = blocks.filter((block) => block.type === 'arduino_loop').length;
  const loose = workspace.getTopBlocks(false).filter((block) => !['arduino_setup', 'arduino_loop'].includes(block.type));
  const board = document.querySelector('#board-select').value;
  const invalidPins = findPinsOutsideBoard(board);
  const pinConflicts = findPinConflicts();
  if (!setupCount || !loopCount) return { title: 'Falta un bloque de inicio', message: 'Todo proyecto necesita “al encender Arduino” y “repetir siempre”. Puedes encontrarlos en la categoría Inicio.' };
  if (loose.length) return { title: 'Hay bloques sueltos', message: `Encontramos ${loose.length} bloque${loose.length > 1 ? 's' : ''} sin conectar. Únelos a un bloque de Inicio para que Arduino los ejecute.` };
  if (invalidPins.length) return { title: 'Revisa la placa seleccionada', message: `Estos pines no existen en ${document.querySelector('#board-select').selectedOptions[0].text}: ${[...new Set(invalidPins)].join(', ')}. Cambia los pines o selecciona una placa con más conexiones.` };
  if (pinConflicts.length) return { title: 'Dos componentes usan el mismo pin', message: `El pin ${pinConflicts[0].pin} está conectado a más de un tipo de componente a la vez (${pinConflicts[0].types.join(', ')}). Dos componentes no pueden compartir el mismo pin: cambia uno de ellos.` };
  return null;
}

function findPinsOutsideBoard(board) {
  if (board === 'mega') return [];
  const pinFields = ['PIN', 'TRIG', 'ECHO', 'IN1', 'IN2', 'IN3', 'IN4', 'PWM', 'ENA', 'ENB', 'SS', 'RST', 'R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'];
  const invalid = [];
  for (const block of workspace.getAllBlocks(false)) {
    for (const field of pinFields) {
      const raw = block.getFieldValue(field);
      if (raw && /^\d+$/.test(raw) && Number(raw) > 19) invalid.push(raw);
    }
  }
  return invalid;
}

const PIN_FIELDS_BY_BLOCK_TYPE = {
  digital_write: ['PIN'], analog_write: ['PIN'], digital_read: ['PIN'], analog_read: ['PIN'],
  servo_write: ['PIN'], motor_drive: ['IN1', 'IN2', 'PWM'], ultrasonic_read: ['TRIG', 'ECHO'],
  dht_read: ['PIN'], buzzer_tone: ['PIN'], rgb_pixel: ['PIN'], button_pressed: ['PIN'],
  pir_motion: ['PIN'], line_sensor: ['PIN'], obstacle_sensor: ['PIN'], tilt_sensor: ['PIN'],
  analog_sensor: ['PIN'], thermistor_celsius: ['PIN'], joystick_axis: ['PIN'], relay_set: ['PIN'],
  robot_drive: ['ENA', 'IN1', 'IN2', 'ENB', 'IN3', 'IN4'], stepper_move: ['IN1', 'IN2', 'IN3', 'IN4'],
  rfid_card_present: ['SS', 'RST'], rfid_uid_matches: ['SS', 'RST'], rfid_uid_text: ['SS', 'RST'],
  keypad_key: ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'], keypad_password_ok: ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4']
};

function findPinConflicts() {
  const claims = new Map();
  for (const block of workspace.getAllBlocks(false)) {
    const fields = PIN_FIELDS_BY_BLOCK_TYPE[block.type];
    if (!fields) continue;
    for (const field of fields) {
      const raw = block.getFieldValue(field);
      if (!raw || !/^\d+$/.test(raw)) continue;
      if (!claims.has(raw)) claims.set(raw, new Set());
      claims.get(raw).add(block.type);
    }
  }
  const conflicts = [];
  for (const [pin, types] of claims) if (types.size > 1) conflicts.push({ pin, types: [...types] });
  return conflicts;
}

function openModal(title, message, symbol) {
  document.querySelector('#modal-title').textContent = title;
  document.querySelector('#modal-message').textContent = message;
  document.querySelector('#modal-symbol').textContent = symbol;
  document.querySelector('#modal').classList.remove('hidden');
}

function closeModal() { document.querySelector('#modal').classList.add('hidden'); }

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function saveText(options) {
  if (window.aulaBlocks) return window.aulaBlocks.saveFile(options);
  const blob = new Blob([options.content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = options.defaultPath;
  link.click();
  URL.revokeObjectURL(link.href);
  return { canceled: false };
}

async function openText(options) {
  if (window.aulaBlocks) return window.aulaBlocks.openFile(options);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    input.addEventListener('change', async () => {
      if (!input.files[0]) return resolve({ canceled: true });
      resolve({ canceled: false, content: await input.files[0].text(), path: input.files[0].name });
    });
    input.click();
  });
}

function fileSafeName(name) {
  return (name || 'proyecto').trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').toLowerCase();
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
