import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Es from 'blockly/msg/es';
import { registerArduinoBlocks, toolbox, CATEGORY_COLOURS } from './blocks.js';
import { arduinoGenerator, generateSketch, registerExtensionGenerators } from './generator.js';
import { exclusiveExtensionTypes, extensionBlockTypes, extensionCategoryName, extensionToolboxCategories } from './extension-categories.js';
import { findPinIssues } from './pin-validation.js';
import { isExecutableBlock } from './executable-blocks.js';
import { validateExtensionRegistration } from './extension-validation.js';
import { assertCompatibleSensor } from '../electron/sensor-compatibility.mjs';
import { AulaConnectionChecker, assertConnectionTypes } from './connection-types.js';
import { protectModalBackground } from './modal-layer.js';
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
        <div class="brand-title"><strong>AulaBlocks</strong><small>Arduino</small></div>
        <button class="app-version-badge" id="check-app-updates" title="Buscar actualizaciones del programa">🔄 <span id="app-version-text">v…</span></button>
      </div>
      <label class="project-name-wrap">
        <span>Proyecto</span>
        <input id="project-name" value="Mi primer proyecto" maxlength="60" aria-label="Nombre del proyecto" />
      </label>
      <div class="top-actions">
        <button class="button ghost" id="new-project"><span>＋</span> Nuevo</button>
        <button class="button ghost" id="open-project"><span>⌂</span> Abrir</button>
        <button class="button primary" id="save-project"><span>▣</span> Guardar</button>
        <button class="button ghost" id="recover-project" title="Guardar una copia del último trabajo recuperable">Recuperar</button>
      </div>
    </header>

    <main class="workspace-layout">
      <aside class="lesson-panel">
        <div class="panel-heading">
          <span class="eyebrow">MI PLACA</span>
          <select id="board-select" aria-label="Seleccionar placa Arduino">
            <option value="uno">Arduino Uno</option>
            <option value="nano">Nano compatible · ATmega328PB</option>
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
        <div class="library-dialog-heading"><span>📚</span><div><span class="eyebrow">SENSORES</span><h2 id="sensor-library-title">Biblioteca de sensores</h2></div></div>
        <div class="sensor-source-tabs" role="tablist">
          <button class="sensor-source-tab active" id="sensor-source-local" role="tab" aria-selected="true">💻 Instalados en este PC</button>
          <button class="sensor-source-tab" id="sensor-source-online" role="tab" aria-selected="false">🌐 Disponibles en línea</button>
        </div>
        <div id="sensor-local-panel">
          <p>Elige solamente los sensores que utilizarás en el proyecto actual.</p>
          <div class="sensor-updates-row">
            <button class="button ghost" id="check-sensor-updates">🔄 Buscar actualizaciones de sensores</button>
            <small id="sensor-updates-status"></small>
          </div>
          <div id="sensor-catalog-list" class="sensor-catalog-list"></div>
        </div>
        <div id="sensor-online-panel" class="hidden">
          <p>Selecciona uno o varios sensores para instalarlos directamente desde GitHub.</p>
          <div class="sensor-updates-row">
            <button class="button ghost" id="online-select-all">Seleccionar todos</button>
            <button class="button primary" id="online-install-selected">⬇ Instalar seleccionados</button>
            <small id="sensor-online-status"></small>
          </div>
          <div id="sensor-online-list" class="sensor-catalog-list"></div>
        </div>
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
  plugins: { connectionChecker: AulaConnectionChecker },
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
protectModalBackground(document, () => {
  Blockly.WidgetDiv.hide();
  Blockly.DropDownDiv.hideWithoutAnimation();
});

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
let recoveryAtStart = null;
let recoveryReady = false;
let recoveryBusy = false;
let recoveryWarned = false;
let lastRecoveryContent = '';
let generationError = '';

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
document.querySelector('#recover-project').addEventListener('click', recoverProject);
document.querySelector('#open-project').addEventListener('click', openProject);
document.querySelector('#export-ino').addEventListener('click', exportIno);
document.querySelector('#import-extension').addEventListener('click', importExtension);
document.querySelector('#copy-code').addEventListener('click', copyCode);
document.querySelector('#check-project').addEventListener('click', checkProject);
document.querySelector('#open-sensor-library').addEventListener('click', openSensorLibrary);
document.querySelector('#sensor-library-close').addEventListener('click', closeSensorLibrary);
document.querySelector('#sensor-library-modal').addEventListener('click', (event) => { if (event.target.id === 'sensor-library-modal') closeSensorLibrary(); });
document.querySelector('#check-sensor-updates').addEventListener('click', checkSensorUpdates);
document.querySelector('#sensor-source-local').addEventListener('click', () => switchSensorSource('local'));
document.querySelector('#sensor-source-online').addEventListener('click', () => switchSensorSource('online'));
document.querySelector('#online-select-all').addEventListener('click', toggleSelectAllOnlineSensors);
document.querySelector('#online-install-selected').addEventListener('click', installSelectedOnlineSensors);
document.querySelector('#sensor-online-list').addEventListener('change', (event) => {
  if (event.target.matches('input[type="checkbox"][data-online-sensor-id]')) updateOnlineInstallButtonState();
});
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
if (window.aulaBlocks?.onUpdateStatus) window.aulaBlocks.onUpdateStatus(handleUpdateStatus);
if (window.aulaBlocks?.appVersion) document.querySelector('#app-version-text').textContent = `v${window.aulaBlocks.appVersion}`;
else document.querySelector('#check-app-updates').hidden = true;
document.querySelector('#check-app-updates').addEventListener('click', checkAppUpdatesManually);
updateBoardControls();
loadSensorCatalog();
initializeRecovery();
setInterval(async () => {
  if (!recoveryReady || recoveryBusy || !hasUnsavedChanges || !window.aulaBlocks?.saveRecovery) return;
  recoveryBusy = true;
  try {
    const content = JSON.stringify(projectData());
    if (content !== lastRecoveryContent) {
      await window.aulaBlocks.saveRecovery(content);
      lastRecoveryContent = content;
    }
  }
  catch (error) {
    if (!recoveryWarned) { showToast('No se pudo crear el respaldo automático. Guarda tu proyecto manualmente.'); recoveryWarned = true; }
  } finally { recoveryBusy = false; }
}, 5000);

async function initializeRecovery() {
  if (!window.aulaBlocks?.readRecovery) return;
  try {
    recoveryAtStart = await window.aulaBlocks.readRecovery();
    if (recoveryAtStart) showToast('Hay un trabajo recuperable. Pulsa Recuperar para guardar una copia.');
  } catch { showToast('No se pudo leer el respaldo de recuperación.'); }
  recoveryReady = true;
}

async function recoverProject() {
  try {
    const recovery = recoveryAtStart || await window.aulaBlocks?.readRecovery?.();
    if (!recovery) return openModal('Sin respaldo', 'Aún no hay un proyecto recuperable. En la aplicación instalada se respalda cada cinco segundos mientras trabajas.', '!');
    const result = await saveText({ title: 'Guardar proyecto recuperado', defaultPath: 'Proyecto-recuperado.aulablocks', content: recovery.content, filters: [{ name: 'Proyecto AulaBlocks', extensions: ['aulablocks'] }] });
    if (!result.canceled) openModal('Copia recuperada', 'La copia quedó guardada. Usa Abrir para revisarla; tu proyecto actual no se ha reemplazado.', '✓');
  } catch (error) { openModal('No se pudo recuperar', error.message, '!'); }
}

let updateDownloadAsked = false;
let manualUpdateCheckPending = false;

async function checkAppUpdatesManually() {
  if (!window.aulaBlocks?.checkForUpdates) return;
  const button = document.querySelector('#check-app-updates');
  button.disabled = true;
  manualUpdateCheckPending = true;
  updateDownloadAsked = false;
  const versionText = document.querySelector('#app-version-text').textContent;
  document.querySelector('#app-version-text').textContent = 'Buscando…';
  try {
    await window.aulaBlocks.checkForUpdates();
  } finally {
    setTimeout(() => {
      button.disabled = false;
      if (manualUpdateCheckPending) {
        manualUpdateCheckPending = false;
        document.querySelector('#app-version-text').textContent = versionText;
        showToast('No pudimos confirmar el resultado. Intenta más tarde.');
      }
    }, 8000);
  }
}

async function handleUpdateStatus(status) {
  if (status.state === 'downloading') {
    manualUpdateCheckPending = false;
    document.querySelector('#check-app-updates').disabled = true;
    document.querySelector('#app-version-text').textContent = `Descargando… ${status.percent || 0}%`;
  } else {
    const wasManual = manualUpdateCheckPending;
    manualUpdateCheckPending = false;
    document.querySelector('#check-app-updates').disabled = false;
    const versionLabel = window.aulaBlocks?.appVersion ? `v${window.aulaBlocks.appVersion}` : 'v…';
    document.querySelector('#app-version-text').textContent = versionLabel;
    if (wasManual) {
      if (status.state === 'not-available') showToast('Ya tienes la última versión de AulaBlocks.');
      if (status.state === 'error') showToast(status.message || 'No pudimos revisar actualizaciones. Revisa tu conexión a internet.');
    }
  }
  if (status.state === 'available' && !updateDownloadAsked) {
    updateDownloadAsked = true;
    if (status.canAutoInstall) {
      const proceed = await askConfirmation(
        'Hay una actualización disponible',
        `AulaBlocks ${status.version} está disponible (tienes ${window.aulaBlocks.appVersion || 'esta versión'}). Se descarga en segundo plano y se instala la próxima vez que abras el programa. ¿Descargarla ahora?`,
        'Descargar'
      );
      if (proceed) window.aulaBlocks.confirmUpdateDownload();
    } else {
      const proceed = await askConfirmation(
        'Hay una actualización disponible',
        `AulaBlocks ${status.version} está disponible. En Linux, la actualización no se instala sola: hay que descargarla desde la página del proyecto. ¿Abrir esa página ahora?`,
        'Abrir página'
      );
      if (proceed) window.aulaBlocks.openUpdateReleasesPage();
    }
  } else if (status.state === 'ready') {
    const proceed = await askConfirmation(
      'Actualización lista',
      'Se descargó la nueva versión de AulaBlocks. Para instalarla, el programa se va a cerrar y puede pedir permiso de administrador (acepta esa ventana para que la instalación termine bien). Guarda tu proyecto antes de continuar.',
      'Instalar y reiniciar ahora'
    );
    if (proceed) window.aulaBlocks.installUpdateNow();
    else showToast('Instalación pendiente. Vuelve a buscar actualizaciones cuando quieras instalarla.');
  } else if (status.state === 'error') {
    console.warn('AulaBlocks: no se pudo revisar actualizaciones —', status.message);
  }
}

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

function updateBoardControls() {
  const board = document.querySelector('#board-select').value;
  document.querySelector('.board-illustration b').textContent = board === 'nano' ? 'NANO' : 'UNO';
  document.querySelector('#board-status').textContent = 'Carga directa disponible';
  document.querySelector('#compile-direct').disabled = isBuilding;
  document.querySelector('#upload-direct').disabled = isBuilding;
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
  if (isBuilding) return openModal('Espera a que termine', 'No abras el monitor mientras se comprueba o carga el programa.', '!');
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
  serialPending = serialPending.slice(-4000);
  for (const line of pieces) {
    const clean = line.trim();
    if (!clean) continue;
    serialLines.push(clean);
    if (serialLines.length > 300) serialLines.shift();
    const numeric = clean.match(/-?\d+(?:[.,]\d+)?/);
    document.querySelector('#monitor-latest').textContent = numeric ? numeric[0] : clean.slice(0, 24);
  }
  const visibleLines = [...serialLines, ...(serialPending ? [serialPending] : [])];
  document.querySelector('#serial-monitor-log').textContent = visibleLines.length ? visibleLines.join('\n') : 'Esperando datos de Arduino…';
  if (serialPending) {
    const numeric = serialPending.match(/-?\d+(?:[.,]\d+)?/);
    document.querySelector('#monitor-latest').textContent = numeric ? numeric[0] : serialPending.slice(0, 24);
  }
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
  if (isBuilding) return;
  const issue = projectIssue();
  if (issue) return openModal(issue.title, issue.message, '!');
  if (!window.aulaBlocks?.buildArduino) return openModal('Abre AulaBlocks instalado', 'La compilación y carga USB se realizan desde la aplicación de escritorio.', '!');
  const board = document.querySelector('#board-select').value;
  const port = document.querySelector('#port-select').value;
  if (upload && !port) return openModal('Conecta tu Arduino', 'Conecta la placa por USB, pulsa buscar y selecciona el puerto antes de cargar.', '🔌');

  if (!updateCode()) return openModal('Revisa el programa', generationError, '!');
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
    const warning = legacyPinWarning();
    document.querySelector('#upload-log').textContent = [warning, result.details || 'Sin detalles adicionales.'].filter(Boolean).join('\n');
    document.querySelector('#upload-details').open = !result.ok || Boolean(warning);
    openModal(result.title, [result.message, warning].filter(Boolean).join(' '), result.ok ? '✓' : '!');
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
    generationError = '';
    return true;
  } catch (error) {
    generationError = error.message;
    document.querySelector('#code-output').textContent = `// Revisa los bloques sin conectar.\n// ${error.message}`;
    return false;
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
  document.querySelector('#library-note p').textContent = [names.length ? names.join(', ') : 'Ninguna librería externa en este proyecto.', legacyPinWarning()].filter(Boolean).join(' ');
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
    version: 2,
    name: document.querySelector('#project-name').value.trim() || 'Mi proyecto',
    board: document.querySelector('#board-select').value,
    requiredSensors: extensions.map((extension) => ({ id: extension.id, name: extension.name, version: extension.version || '1.0.0' })),
    // Se conserva una copia para que proyectos antiguos sigan siendo legibles,
    // pero al abrir en escritorio se usa siempre el paquete realmente instalado.
    extensions,
    workspace: Blockly.serialization.workspaces.save(workspace)
  };
}

async function saveProject() {
  try {
  const data = JSON.stringify(projectData(), null, 2);
  const defaultName = `${fileSafeName(document.querySelector('#project-name').value)}.aulablocks`;
  const result = await saveText({
    title: 'Guardar proyecto AulaBlocks', defaultPath: currentPath || defaultName, content: data,
    filters: [{ name: 'Proyecto AulaBlocks', extensions: ['aulablocks'] }]
  });
  if (!result.canceled) {
    currentPath = result.path || currentPath;
    hasUnsavedChanges = JSON.stringify(projectData(), null, 2) !== data;
    showToast(hasUnsavedChanges ? 'Copia guardada. Hay cambios posteriores pendientes de guardar.' : 'Proyecto guardado');
  }
  } catch (error) { openModal('No se pudo guardar', 'Tus bloques siguen abiertos. Elige otra carpeta y vuelve a guardar. ' + error.message, '!'); }
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

  await loadSensorCatalog();
  const requirements = data.requiredSensors || (data.extensions || []).map((extension) => ({ id: extension.id, name: extension.name, version: extension.version || '1.0.0' }));
  const installedById = new Map(sensorCatalog.map((sensor) => [sensor.id, sensor]));
  const missing = requirements.filter((requirement) => !installedById.has(requirement.id));
  const outdated = requirements.filter((requirement) => {
    const installed = installedById.get(requirement.id);
    return installed && compareVersions(installed.version, requirement.version) < 0;
  });
  if (window.aulaBlocks && (missing.length || outdated.length)) {
    const details = [
      ...missing.map((item) => `${item.name || item.id} (no instalado)`),
      ...outdated.map((item) => `${item.name || item.id} (necesita v${item.version} o superior)`)
    ];
    openModal('Faltan sensores del proyecto', `Instala o actualiza estos paquetes desde “Biblioteca de sensores” antes de abrir el proyecto: ${details.join(', ')}. Así también quedarán instaladas sus bibliotecas.`, '!');
    return;
  }
  try {
    for (const old of data.extensions || []) {
      const installed = installedById.get(old.id);
      if (installed) assertCompatibleSensor(old, installed);
    }
  } catch (error) { openModal('Sensor incompatible con el proyecto', error.message, '!'); return; }

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
    for (const requirement of requirements) {
      const installed = installedById.get(requirement.id);
      const embedded = (data.extensions || []).find((extension) => extension.id === requirement.id);
      registerExtension(installed || embedded, false);
    }
    rebuildToolbox();
    Blockly.serialization.workspaces.load(data.workspace, workspace);
    document.querySelector('#project-name').value = data.name || 'Mi proyecto';
    document.querySelector('#board-select').value = ['uno', 'nano'].includes(data.board) ? data.board : 'uno';
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

function compareVersions(left, right) {
  const a = String(left || '0').split('.').map((part) => Number(part) || 0);
  const b = String(right || '0').split('.').map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0) ? 1 : -1;
  }
  return 0;
}

async function exportIno() {
  const issue = projectIssue();
  if (issue) return openModal(issue.title, issue.message, '!');
  if (!updateCode()) return openModal('No se puede exportar', generationError, '!');
  const result = await saveText({
    title: 'Guardar programa para Arduino',
    defaultPath: `${fileSafeName(document.querySelector('#project-name').value)}.ino`,
    content: document.querySelector('#code-output').textContent,
    filters: [{ name: 'Programa Arduino', extensions: ['ino'] }]
  });
  if (!result.canceled) openModal('¡Programa preparado!', 'El archivo .ino contiene todo el código creado con tus bloques. Puedes abrirlo y cargarlo a la placa desde Arduino IDE.', '↓');
}

async function importExtension() {
  const result = await openText({ title: 'Añadir sensores (puedes seleccionar varios con Ctrl)', multiple: true, accept: '.aulasensor,.ardublock.json,application/json', filters: [{ name: 'Sensor AulaBlocks', extensions: ['aulasensor', 'json'] }], maxBytes: 40 * 1024 * 1024 });
  if (result.canceled) return;
  try {
    if (result.files?.length > 1) {
      const packages = result.files.map((file) => JSON.parse(file.content));
      const owners = new Map(extensionTypeOwners);
      const definitions = { ...Blockly.Blocks };
      for (const item of packages) {
        validateExtensionRegistration(item, definitions, owners);
        for (const block of item.blocks || []) {
          definitions[block.type] = block;
          owners.set(block.type, item.id);
        }
      }
      const installed = await window.aulaBlocks.installSensorPackages(packages);
      for (const item of installed) registerExtension(item.extension, true);
      await loadSensorCatalog();
      rebuildToolbox();
      updateCode();
      openModal('Sensores instalados', 'Se instalaron juntos los paquetes y sus bibliotecas: ' + installed.map((item) => item.extension.name).join(', ') + '.', '🧩');
      return;
    }
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

async function checkSensorUpdates() {
  const button = document.querySelector('#check-sensor-updates');
  const status = document.querySelector('#sensor-updates-status');
  if (!window.aulaBlocks?.checkSensorUpdates) {
    status.textContent = 'Esta función solo está disponible en la aplicación de escritorio.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Buscando actualizaciones…';
  try {
    const result = await window.aulaBlocks.checkSensorUpdates();
    if (!result.ok) {
      status.textContent = result.message || 'No pudimos revisar actualizaciones. Revisa tu conexión a internet.';
      return;
    }
    if (!result.updates.length) {
      status.textContent = 'Todos los sensores están al día.';
      return;
    }
    const lista = result.updates.map((item) => `${item.name}: ${item.localVersion} → ${item.remoteVersion}`).join('\n');
    const proceed = await askConfirmation(
      `${result.updates.length} sensor${result.updates.length === 1 ? '' : 'es'} con actualización`,
      `Se instalarán estas versiones:\n\n${lista}`,
      'Actualizar ahora'
    );
    if (!proceed) {
      status.textContent = 'Actualización cancelada.';
      return;
    }
    status.textContent = 'Instalando…';
    const installResults = await window.aulaBlocks.installSensorUpdates(result.updates);
    const failed = installResults.filter((item) => !item.ok);
    let refreshedInProject = 0;
    installResults.forEach((item) => {
      if (item.ok && item.extension && extensions.some((existing) => existing.id === item.extension.id)) {
        registerExtension(item.extension, false);
        refreshedInProject += 1;
      }
    });
    if (refreshedInProject) { rebuildToolbox(); updateCode(); }
    await loadSensorCatalog();
    const refreshNote = refreshedInProject ? ` Se refrescaron ${refreshedInProject} en el proyecto actual.` : '';
    status.textContent = failed.length
      ? `Se instalaron ${installResults.length - failed.length} de ${installResults.length}. Fallaron: ${failed.map((f) => f.name).join(', ')}.`
      : `Listo: se actualizaron ${installResults.length} sensor${installResults.length === 1 ? '' : 'es'}.${refreshNote}`;
  } catch (error) {
    status.textContent = error.message || 'No pudimos revisar actualizaciones.';
  } finally {
    button.disabled = false;
  }
}

let onlineSensorCatalog = [];

function switchSensorSource(source) {
  const isOnline = source === 'online';
  document.querySelector('#sensor-source-local').classList.toggle('active', !isOnline);
  document.querySelector('#sensor-source-local').setAttribute('aria-selected', String(!isOnline));
  document.querySelector('#sensor-source-online').classList.toggle('active', isOnline);
  document.querySelector('#sensor-source-online').setAttribute('aria-selected', String(isOnline));
  document.querySelector('#sensor-local-panel').classList.toggle('hidden', isOnline);
  document.querySelector('#sensor-online-panel').classList.toggle('hidden', !isOnline);
  if (isOnline) loadOnlineSensorCatalog();
}

async function loadOnlineSensorCatalog() {
  const list = document.querySelector('#sensor-online-list');
  const status = document.querySelector('#sensor-online-status');
  if (!window.aulaBlocks?.listOnlineSensorCatalog) {
    status.textContent = 'Esta función solo está disponible en la aplicación de escritorio.';
    list.innerHTML = '';
    return;
  }
  status.textContent = 'Cargando catálogo desde GitHub…';
  list.innerHTML = '';
  try {
    const result = await window.aulaBlocks.listOnlineSensorCatalog();
    if (!result.ok) {
      status.textContent = result.message || 'No pudimos leer el catálogo en línea. Revisa tu conexión a internet.';
      return;
    }
    onlineSensorCatalog = result.catalog;
    status.textContent = '';
    renderOnlineSensorCatalog();
  } catch (error) {
    status.textContent = error.message || 'No pudimos leer el catálogo en línea.';
  }
}

function renderOnlineSensorCatalog() {
  const target = document.querySelector('#sensor-online-list');
  if (!onlineSensorCatalog.length) {
    target.innerHTML = '<div class="catalog-empty"><span>🌐</span><strong>No hay sensores en el catálogo</strong></div>';
    updateOnlineInstallButtonState();
    return;
  }
  target.innerHTML = onlineSensorCatalog.map((sensor) => {
    let badge = '<b>✔ Al día</b>';
    if (sensor.isNew) badge = '<b class="badge-new">Nuevo</b>';
    else if (sensor.hasUpdate) badge = `<b class="badge-update">Actualización: ${escapeHtml(sensor.localVersion)} → ${escapeHtml(sensor.remoteVersion)}</b>`;
    return `<article class="sensor-catalog-item online-item"><label><input type="checkbox" data-online-sensor-id="${escapeHtml(sensor.id)}"><div><strong>${escapeHtml(sensor.name)}</strong><small>v${escapeHtml(sensor.remoteVersion)}${sensor.localVersion ? ` · instalado: v${escapeHtml(sensor.localVersion)}` : ''}</small>${badge}</div></label></article>`;
  }).join('');
  updateOnlineInstallButtonState();
}

function toggleSelectAllOnlineSensors() {
  const boxes = [...document.querySelectorAll('#sensor-online-list input[data-online-sensor-id]')];
  const allChecked = boxes.every((box) => box.checked);
  boxes.forEach((box) => { box.checked = !allChecked; });
  updateOnlineInstallButtonState();
}

function updateOnlineInstallButtonState() {
  const checked = document.querySelectorAll('#sensor-online-list input[data-online-sensor-id]:checked').length;
  const button = document.querySelector('#online-install-selected');
  button.disabled = checked === 0;
  button.textContent = checked ? `⬇ Instalar seleccionados (${checked})` : '⬇ Instalar seleccionados';
}

async function installSelectedOnlineSensors() {
  const status = document.querySelector('#sensor-online-status');
  const checkedIds = [...document.querySelectorAll('#sensor-online-list input[data-online-sensor-id]:checked')].map((box) => box.dataset.onlineSensorId);
  const selected = onlineSensorCatalog.filter((sensor) => checkedIds.includes(sensor.id));
  if (!selected.length) return;
  document.querySelector('#online-install-selected').disabled = true;
  document.querySelector('#online-select-all').disabled = true;
  const outcomes = [];
  for (let index = 0; index < selected.length; index += 1) {
    const sensor = selected[index];
    status.textContent = `Instalando ${index + 1} de ${selected.length}: ${sensor.name}…`;
    try {
      const installResults = await window.aulaBlocks.installSensorUpdates([sensor]);
      const outcome = installResults[0];
      if (outcome?.ok && outcome.extension) {
        registerExtension(outcome.extension, true);
        outcomes.push({ name: sensor.name, ok: true });
      } else {
        outcomes.push({ name: sensor.name, ok: false, message: outcome?.message });
      }
    } catch (error) {
      outcomes.push({ name: sensor.name, ok: false, message: error.message });
    }
  }
  rebuildToolbox();
  updateCode();
  await loadSensorCatalog();
  await loadOnlineSensorCatalog();
  document.querySelector('#online-select-all').disabled = false;
  const failed = outcomes.filter((item) => !item.ok);
  status.textContent = failed.length
    ? `Se instalaron ${outcomes.length - failed.length} de ${outcomes.length}. Fallaron: ${failed.map((f) => f.name).join(', ')}.`
    : `Listo: se instalaron ${outcomes.length} sensor${outcomes.length === 1 ? '' : 'es'} y ya están disponibles en este proyecto.`;
}

function openSensorLibrary() {
  renderSensorCatalog();
  switchSensorSource('local');
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
  hasUnsavedChanges = true;
  rebuildToolbox();
  updateCode();
  renderSensorCatalog();
  document.querySelector('#remove-sensor-modal').classList.add('hidden');
  pendingSensorRemovalId = null;
  showToast(`${extensionCategoryName(extension)} quitado del proyecto`);
}

function validateExtension(extension) {
  validateExtensionRegistration(extension, Blockly.Blocks, extensionTypeOwners);
}

function registerExtension(extension, addToList) {
  validateExtension(extension);
  const existingIndex = extensions.findIndex((item) => item.id === extension.id);
  if (existingIndex >= 0) assertCompatibleSensor(extensions[existingIndex], extension);
  hasUnsavedChanges = true;
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
  if (!updateCode()) return openModal('No se puede copiar', generationError, '!');
  await navigator.clipboard.writeText(document.querySelector('#code-output').textContent);
  showToast('Código copiado');
}

function checkProject() {
  const issue = projectIssue();
  if (issue) return openModal(issue.title, issue.message, '!');
  const blocks = workspace.getAllBlocks(false);
  openModal('Estructura de bloques ordenada', `Tu proyecto tiene ${blocks.length} bloques bien conectados y sin errores de armado. Esto no significa que el programa compile: pulsa “✓ Comprobar” para probarlo con el compilador de Arduino antes de cargarlo a la placa. ${legacyPinWarning()}`, '✓');
}

function legacyPinWarning() {
  const result = findPinIssues(workspace.getAllBlocks(false).filter(isExecutableBlock), extensions, document.querySelector('#board-select').value);
  return result.unknown.length ? 'Hay sensores antiguos sin información de pines. Revisa sus conexiones manualmente; puedes seguir compilando y cargando.' : '';
}

function projectIssue() {
  try { assertConnectionTypes(workspace); }
  catch (error) { return { title: 'Bloques incompatibles', message: error.message }; }
  const blocks = workspace.getAllBlocks(false).filter(isExecutableBlock);
  const setupCount = blocks.filter((block) => block.type === 'arduino_setup').length;
  const loopCount = blocks.filter((block) => block.type === 'arduino_loop').length;
  const loose = workspace.getTopBlocks(false).filter((block) => isExecutableBlock(block) && !['arduino_setup', 'arduino_loop'].includes(block.type));
  const board = document.querySelector('#board-select').value;
  const pinIssues = findPinIssues(blocks, extensions, board);
  if (!setupCount || !loopCount) return { title: 'Falta un bloque de inicio', message: 'Todo proyecto necesita “al encender Arduino” y “repetir siempre”. Puedes encontrarlos en la categoría Inicio.' };
  if (setupCount > 1 || loopCount > 1) return { title: 'Hay inicios repetidos', message: 'Usa un solo bloque “al encender Arduino” y un solo “repetir siempre”.' };
  if (pinIssues.timerConflicts.length) return { title: 'Servo y PWM usan el mismo temporizador', message: 'Al usar Servo, no regules motores o brillo con PWM en los pines 9 o 10. Cambia esa salida PWM a 3, 5, 6 u 11 y revisa que el pin esté libre.' };
  if (loose.length) return { title: 'Hay bloques sueltos', message: `Encontramos ${loose.length} bloque${loose.length > 1 ? 's' : ''} sin conectar. Únelos a un bloque de Inicio para que Arduino los ejecute.` };
  if (pinIssues.invalid.length) return { title: 'Revisa los pines', message: `Estos pines no existen o no admiten la función elegida en ${document.querySelector('#board-select').selectedOptions[0].text}: ${[...new Set(pinIssues.invalid.map((item) => item.pin))].join(', ')}. Revisa las conexiones y la placa.` };
  if (pinIssues.conflicts.length) {
    const conflict = pinIssues.conflicts[0];
    return { title: 'Dos conexiones usan el mismo pin', message: `El pin ${conflict.pin} está asignado a ${conflict.claims.map((claim) => claim.label).join(' y ')}. Cambia una conexión. Los sensores I2C sí pueden compartir SDA y SCL.` };
  }
  return null;
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
