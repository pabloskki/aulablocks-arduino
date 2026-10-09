export function protectModalBackground(document, hideBlocklyPopups = () => {}) {
  const layers = [...document.querySelectorAll('.modal-backdrop')];
  const backgrounds = [...document.querySelectorAll('.topbar, .workspace-layout')];
  const initialInert = new Map(backgrounds.map(element => [element, element.inert]));
  let previous = null;
  let savedFocus = null;
  const sync = () => {
    const visible = layers.filter(layer => !layer.classList.contains('hidden'));
    const active = visible.at(-1);
    const old = previous;
    previous = active;
    document.body.classList.toggle('app-modal-open', Boolean(active));
    for (const element of backgrounds) element.inert = active ? true : initialInert.get(element);
    for (const layer of layers) layer.inert = Boolean(active && layer !== active);
    if (active && active !== old) {
      if (!old) savedFocus = document.activeElement;
      hideBlocklyPopups();
      const dialog = active.querySelector('[role="dialog"]') || active;
      dialog.tabIndex = -1;
      (active.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled])') || dialog).focus();
    }
    if (!active && old && savedFocus?.isConnected) savedFocus.focus();
  };
  const observer = new document.defaultView.MutationObserver(sync);
  for (const layer of layers) observer.observe(layer, { attributes: true, attributeFilter: ['class'] });
  const focusGuard = event => {
    if (previous && !previous.contains(event.target)) {
      (previous.querySelector('button:not([disabled]), input:not([disabled])') || previous.querySelector('[role="dialog"]') || previous).focus();
    }
  };
  document.addEventListener('focusin', focusGuard);
  sync();
  return () => { observer.disconnect(); document.removeEventListener('focusin', focusGuard); };
}
