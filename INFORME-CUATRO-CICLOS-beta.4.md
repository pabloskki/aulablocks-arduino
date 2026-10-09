# AulaBlocks 0.10.0-beta.4 — cuatro ciclos de corrección

Entrega local para Windows. No publicada en GitHub. La carpeta de trabajo se copió íntegra desde beta.3 antes de modificarla. No se modificaron beta.3 ni el instalador 0.9.9 reservado para la escuela. Los informes beta.1/beta.2/beta.3 son antecedentes; este documento describe la nueva entrega.

## Resultado y alcance

Se realizaron cuatro ciclos, ejecutando las pruebas después de cada uno y revisando el siguiente riesgo. Resultado final: 45 pruebas automáticas correctas, compilación de la interfaz correcta y 26 compilaciones Arduino correctas. No se conectó ni programó hardware durante esta entrega. No se ha comprobado visualmente toda la aplicación instalada.

Los sensores siguen siendo externos. Sus archivos no cambian respecto a beta.3: Servo 1.0.2, PN532 1.7.11, HC-SR04 1.4.1 y el resto del catálogo en las versiones existentes. Las protecciones nuevas están en el programa principal.

## Ciclo 1 — cálculos y repeticiones

Problemas: operaciones entre constantes podían desbordar enteros AVR; una variable llamada repetir ocultaba el contador interno.

Correcciones:
- Suma, resta, multiplicación y división convierten a float antes de operar, manteniendo paréntesis.
- Cada repetición utiliza un contador propio. El límite se calcula al entrar en el bucle, no cambia mientras se ejecuta.
- Se evita que nombres internos de los bucles colisionen con variables del proyecto.
- Se protegen nombres Arduino habituales como millis, delay, Wire y digitalWrite.

Verificación: 34 pruebas correctas; comprobaciones del compilador AVR confirman 200×200=40000, 30000+30000=60000 y 1÷2=0.5. No se pretende precisión decimal ilimitada.

## Ciclo 2 — guardado y recuperación

Problemas: guardado directo sobre el archivo anterior y ausencia de respaldo periódico.

Correcciones:
- Se escribe primero un archivo temporal y se reemplaza el destino con recuperación ante fallo normal de la operación.
- Se conserva una copia anterior junto al archivo, con extensión adicional .bak.
- Las escrituras del mismo destino se ejecutan en orden.
- Mientras hay cambios, se intenta respaldar el proyecto cada cinco segundos; si no cambia, no se reescribe.
- El botón Recuperar permite guardar una copia recuperable como proyecto, sin sustituir el trabajo abierto. Al reiniciar se conserva en memoria la recuperación encontrada al inicio, aunque se empiece otro trabajo.
- Los errores de guardado se comunican sin cerrar los bloques.

Verificación: 37 pruebas correctas, con fallos de reemplazo simulados y recuperación desde .bak si la copia automática principal tiene JSON corrupto.

Límites: puede perderse lo realizado desde el último respaldo. Un corte eléctrico, disco lleno o fallo físico no queda garantizado por estas pruebas. Recuperar no es un historial de todos los alumnos: es el último trabajo recuperable del perfil de Windows. Para recuperar manualmente una copia .bak, copiarla con otro nombre terminado en .aulablocks y abrir esa copia.

## Ciclo 3 — actualizaciones de sensores compatibles

Problemas: una actualización podía eliminar tipos de bloque existentes; proyectos guardados podían abrirse contra estructuras incompatibles.

Correcciones:
- Se rechazan actualizaciones que borren bloques o cambien su estructura de entradas, campos, salidas o valores de listas.
- La comprobación ocurre antes de reemplazar bibliotecas o guardar el nuevo catálogo.
- Se comprueban también los sensores al abrir un proyecto y antes de reemplazar definiciones en pantalla.
- Se impide que dos sensores instalados se apropien del mismo tipo de bloque.
- Se rechazan bloques incompletos o repetidos en un paquete.
- Se admiten correcciones de código y bloques nuevos que mantengan las estructuras anteriores.

Verificación: 41 pruebas correctas. Una actualización incompatible deja el catálogo y la biblioteca anteriores intactos.

Comportamiento esperado: si hay incompatibilidad, se solicita un paquete compatible o con otro identificador. No se elimina el trabajo del alumno para forzar una actualización. Esta política es deliberadamente conservadora; no existe migración automática entre diseños de bloques distintos.

## Ciclo 4 — comprobaciones antes de cargar y convivencia de hardware

Problemas: Servo y PWM 9/10 podían aceptarse juntos; errores de generación se enviaban al compilador como comentarios; bloques desactivados sueltos impedían comprobar.

Correcciones:
- Se detecta el uso de Servo.h en los bloques activos y en los recursos que requieren. Para Uno y Nano se impide PWM en 9/10 cuando Servo está activo.
- Se permite PWM en otros pines compatibles, siempre que estén libres.
- Los fallos del generador se muestran antes de compilar, exportar o copiar; no se presenta un comentario de error como programa válido.
- Los bloques sueltos desactivados ya no impiden comprobar.
- Se exige un solo inicio y un solo repetir siempre.
- Se impide abrir el monitor durante una compilación/carga y realizar instalaciones durante la operación de compilación/carga del servicio.
- La revisión final corrigió el indicador de cambios cuando se modifica el proyecto mientras se está guardando, y al añadir o quitar sensores aunque todavía no tengan bloques colocados.

Verificación final: 45 pruebas correctas. El proyecto conjunto DHT22 (D2), HC-SR04 (TRIG D7/ECHO D8), Servo (D4) y espera de 2000 ms compila y pasa la comprobación de pines para Uno y Nano.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| Pruebas automáticas de código y servicios | 45/45 |
| Construcción de interfaz Windows | Correcta |
| 11 paquetes × Uno y Nano | 22 compilaciones correctas |
| DHT22 + HC-SR04 + Servo × Uno y Nano | 2 compilaciones correctas |
| Aserciones aritméticas × Uno y Nano | 2 compilaciones correctas |
| USB, alimentación y lecturas reales | Pendiente |
| Instalación completa en PC de escuela | Pendiente |
| Linux | No probado en esta entrega |

Las pruebas de sensores usan todos los bloques de cada paquete, pero no todas las combinaciones posibles de campos ni todos los proyectos posibles.

## Cómo se espera utilizar

1. Instalar en un PC de prueba; no sustituir sin pruebas el único equipo que ya funciona.
2. Añadir los paquetes de sensores desde archivos. Para actualizar dependencias compartidas, seleccionar juntos los paquetes compatibles con Ctrl.
3. Elegir los sensores del proyecto y sus pines, conectar los bloques bajo un inicio y un repetir siempre.
4. Guardar el proyecto .aulablocks. Este archivo no sustituye los paquetes de instalación de sensores: al cambiar de PC se necesitan ambos.
5. Comprobar. Los conflictos identificados deben resolverse antes de cargar.
6. Seleccionar placa y puerto, cargar y luego abrir el monitor.
7. Si se interrumpe el trabajo, abrir la aplicación y pulsar Recuperar; guardar una copia y abrirla.

## Lista de pruebas físicas antes de aprobar para el aula

Realizarlas en el mismo modelo de PC y placas que usarán los alumnos. Registrar versión del programa, versión del sensor, placa, puerto, cableado y resultado.

| Prueba | Resultado esperado |
|---|---|
| Instalar en Windows con cuenta de alumno | Arranca, se puede guardar en Documentos y se importan sensores sin permisos adicionales inesperados |
| Trabajar sin internet | Abre, compila y carga con paquetes y soporte de placas ya disponibles |
| Uno y Nano ATmega328PB, uno por vez | Puerto detectado, carga correcta, mensaje legible en monitor |
| Desconectar USB durante una lectura | Aviso o cierre del monitor; al reconectar se puede buscar el puerto y volver a iniciar |
| Programa básico mostrar texto cada segundo | Mensajes continuos, sin caracteres extraños |
| DHT22: temperatura y humedad cada 2 segundos | Valores plausibles; comprobar también sensor ausente y cable desconectado |
| HC-SR04: objeto cerca, lejos y fuera de alcance | Lecturas razonables; comprobar el valor de lectura inválida del paquete, sin usarlo como distancia positiva |
| Servo: movimientos moderados 60°/120° | Movimiento estable, sin reinicios; fuente adecuada y masa común |
| DHT22 + HC-SR04 + Servo | Mover servo no reinicia Arduino ni interrumpe permanentemente las lecturas |
| Servo + PWM 9/10 | AulaBlocks impide comprobar/cargar y explica cambiar el PWM |
| Guardar, cerrar y abrir proyecto | Mismos bloques, campos, variables y sensores |
| Recuperación, usando SOLO un proyecto desechable | Editar, esperar más de 5 s, forzar cierre de esa aplicación de prueba, reabrir, recuperar y abrir la copia |
| Actualización incompatible, en perfil de prueba | Rechazo, sin pérdida de bloques ni reemplazo parcial de bibliotecas |
| Otro PC sin sensores instalados | Informa cuáles faltan; al instalar paquetes compatibles el proyecto puede abrirse |
| Sesión real de 45–60 minutos | Monitor utilizable, guardado repetido correcto, sin congelaciones observadas |

No provocar cortes eléctricos reales ni desconectar un disco para comprobar recuperación. Las pruebas de cierre forzado deben realizarse únicamente con trabajo desechable.

## Problemas y límites que siguen pendientes

1. No hay garantía de tiempo máximo para todos los procesos externos de compilación/carga. Si una herramienta se queda bloqueada, aún puede ser necesario cerrar y reabrir la aplicación.
2. El monitor puede anunciar conexión al iniciar el proceso, antes de confirmar que el puerto realmente se abrió. Un puerto ocupado se comunica después; falta verificar todos los casos USB en hardware.
3. Los números siguen sujetos a precisión float, límites de memoria y operaciones no válidas como dividir entre cero. No hay diagnóstico completo en bloques para todos esos casos.
4. while y delay pueden detener otras tareas del programa Arduino. Los bloques no convierten automáticamente un proyecto en un programa multitarea.
5. La detección de pines y temporizadores depende del paquete y cubre las reglas implementadas. No detecta voltajes, consumo, cableado real, todas las bibliotecas alternativas ni todos los conflictos de temporizadores.
6. La compatibilidad de actualización protege la estructura de bloques, no garantiza que una nueva versión del código mantenga exactamente el mismo comportamiento. Probar actualizaciones antes de clase.
7. La recuperación es por perfil y conserva el último trabajo, no un historial por alumno. Los archivos compartidos en pendrive necesitan copias independientes. Una reinstalación no sustituye un respaldo de proyectos y paquetes.
8. No se ha demostrado funcionamiento físico de PN532, DHT22, HC-SR04, servos ni demás dispositivos en esta entrega. Compilar no demuestra comunicación real.
9. Los paquetes incluyen código Arduino aportado por su autor. Usar paquetes de confianza; no hay firma digital ni certificación de seguridad de cada paquete.
10. No se han probado todas las resoluciones de pantalla, cuentas restringidas, antivirus ni versiones de Windows de la escuela. El instalador requiere la prueba piloto.

## Recomendación

Esta versión es candidata a prueba piloto, no una certificación de ausencia de errores. Para la jornada inmediata conserva 0.9.9 en el equipo ya probado. Instala beta.4 primero en otro PC o perfil de ensayo y aprueba las pruebas anteriores antes de extenderla a toda la clase.
