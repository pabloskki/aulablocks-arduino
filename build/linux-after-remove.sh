#!/bin/bash

# Delete the link to the binary
if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove 'aulablocks-arduino' '/opt/AulaBlocks Arduino/aulablocks-arduino'
else
    rm -f '/usr/bin/aulablocks-arduino'
fi

APPARMOR_PROFILE_DEST='/etc/apparmor.d/aulablocks-arduino'

if [ -f "$APPARMOR_PROFILE_DEST" ]; then
  if apparmor_status --enabled > /dev/null 2>&1; then
    if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
      apparmor_parser --remove "$APPARMOR_PROFILE_DEST" || true
    fi
  fi
  rm -f "$APPARMOR_PROFILE_DEST"
fi

RULE_FILE="/etc/udev/rules.d/99-aulablocks-ch340-ignore-modemmanager.rules"
if [ -f "$RULE_FILE" ]; then
  rm -f "$RULE_FILE"
  if command -v udevadm >/dev/null 2>&1; then
    udevadm control --reload-rules || true
  fi
fi

exit 0
