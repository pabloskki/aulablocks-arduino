#!/bin/bash

if type update-alternatives >/dev/null 2>&1; then
    # Remove previous link if it doesn't use update-alternatives
    if [ -L '/usr/bin/aulablocks-arduino' -a -e '/usr/bin/aulablocks-arduino' -a "`readlink '/usr/bin/aulablocks-arduino'`" != '/etc/alternatives/aulablocks-arduino' ]; then
        rm -f '/usr/bin/aulablocks-arduino'
    fi
    update-alternatives --install '/usr/bin/aulablocks-arduino' 'aulablocks-arduino' '/opt/AulaBlocks Arduino/aulablocks-arduino' 100 || ln -sf '/opt/AulaBlocks Arduino/aulablocks-arduino' '/usr/bin/aulablocks-arduino'
else
    ln -sf '/opt/AulaBlocks Arduino/aulablocks-arduino' '/usr/bin/aulablocks-arduino'
fi

# Check if user namespaces are supported by the kernel and working with a quick test:
if ! { [[ -L /proc/self/ns/user ]] && unshare --user true; }; then
    # Use SUID chrome-sandbox only on systems without user namespaces:
    chmod 4755 '/opt/AulaBlocks Arduino/chrome-sandbox' || true
else
    chmod 0755 '/opt/AulaBlocks Arduino/chrome-sandbox' || true
fi

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# Install apparmor profile. (Ubuntu 24+)
if apparmor_status --enabled > /dev/null 2>&1; then
  APPARMOR_PROFILE_SOURCE='/opt/AulaBlocks Arduino/resources/apparmor-profile'
  APPARMOR_PROFILE_TARGET='/etc/apparmor.d/aulablocks-arduino'
  if apparmor_parser --skip-kernel-load --debug "$APPARMOR_PROFILE_SOURCE" > /dev/null 2>&1; then
    cp -f "$APPARMOR_PROFILE_SOURCE" "$APPARMOR_PROFILE_TARGET"
    if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
      apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE_TARGET"
    fi
  else
    echo "Skipping the installation of the AppArmor profile as this version of AppArmor does not seem to support the bundled profile"
  fi
fi

# AulaBlocks: evita que ModemManager bloquee los adaptadores USB-serial CH340/CH341
# (marca WCH, vendor id 1a86) usados por placas Arduino compatibles, para que
# AulaBlocks pueda leer el puerto sin que otro servicio lo tenga ocupado.
RULE_FILE="/etc/udev/rules.d/99-aulablocks-ch340-ignore-modemmanager.rules"
cat > "$RULE_FILE" <<'EOF'
ATTRS{idVendor}=="1a86", ENV{ID_MM_DEVICE_IGNORE}="1"
EOF
chmod 644 "$RULE_FILE" || true

if command -v udevadm >/dev/null 2>&1; then
  udevadm control --reload-rules || true
  udevadm trigger || true
fi

# AulaBlocks: agrega automaticamente a quien instala el programa al grupo
# "dialout", necesario en Linux para abrir el puerto serie de Arduino sin
# permisos de administrador. Sin esto, el usuario tendria que hacerlo a mano
# y cerrar sesion para que el cambio tome efecto.
INSTALLING_USER=""
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
  INSTALLING_USER="$SUDO_USER"
elif [ -n "$PKEXEC_UID" ]; then
  INSTALLING_USER="$(getent passwd "$PKEXEC_UID" 2>/dev/null | cut -d: -f1)"
fi
if [ -n "$INSTALLING_USER" ] && command -v usermod >/dev/null 2>&1; then
  usermod -aG dialout "$INSTALLING_USER" || true
  echo "AulaBlocks: se agrego a \"$INSTALLING_USER\" al grupo dialout. Hay que cerrar sesion y volver a entrar para que la placa Arduino sea accesible por USB."
fi

exit 0
