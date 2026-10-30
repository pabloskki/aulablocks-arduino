# AulaBlocks Arduino 0.10.4 — actualizaciones desde Linux Mint

Las instalaciones de Linux Mint hechas con el paquete .deb ahora pueden descargar y aplicar las próximas actualizaciones directamente desde AulaBlocks, igual que en Windows. Ya no se abre GitHub para buscar el instalador.

1. AulaBlocks avisa cuando encuentra una versión nueva.
2. Al aceptar «Descargar», baja el .deb en segundo plano y muestra el progreso. La biblioteca de actualización verifica el archivo contra su huella SHA512 antes de habilitar la instalación.
3. «Instalar y reiniciar ahora» guarda los cambios pendientes del proyecto y solicita al sistema el permiso de administrador. Puede aparecer la contraseña del computador.
4. Si se cancela el guardado o quedan cambios sin guardar, no se instala. Si falla la descarga o se cancela el permiso de instalación, se informa el error y se puede reintentar.

**Primera instalación:** las versiones 0.10.3 y anteriores todavía abren GitHub. Instala manualmente el .deb 0.10.4 una vez para incorporar este mecanismo. A partir de esa instalación, las versiones posteriores se descargarán e instalarán desde AulaBlocks con tu confirmación y el permiso del sistema.

Las copias portátiles .tar.gz conservan la actualización manual; no se convierten por su cuenta en instalaciones .deb. Para usar el nuevo mecanismo en Linux Mint, instala el .deb.

Windows conserva su actualizador y recibe las mismas protecciones de guardado y avisos de error. Los once sensores mantienen sus versiones de 0.10.3; no necesitan reinstalarse. Se incluye el ZIP de sensores para equipos nuevos.

Verificación: pruebas de descarga, progreso, selección del .deb por DebUpdater, archivo inválido, reintento, permiso cancelado y protección de proyectos sin guardar. La comprobación automatizada no sustituye probar la ventana de autorización y el reinicio en un equipo Linux Mint real.
