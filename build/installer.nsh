!macro customInstall
  DetailPrint "Instalando el controlador USB CH340 (placas Arduino compatibles)..."
  nsExec::ExecToLog 'pnputil.exe /add-driver "$INSTDIR\resources\drivers\ch340-windows\CH341SER.INF" /install'
  Pop $0
  DetailPrint "Controlador CH340: resultado $0 (0 = instalado, 259 = ya estaba instalado; cualquier otro valor no detiene la instalación de AulaBlocks)"
!macroend
