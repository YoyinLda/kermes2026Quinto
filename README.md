# Kermés 2026 · 5° básico

Aplicación pequeña para inscribir adultos en turnos, registrar donaciones y préstamos, consultar entregas y descargar un resumen actualizado en Excel o imprimirlo como PDF.

**Un adulto = un cupo.** Se pueden inscribir varios adultos en un envío. La familia o estudiante de referencia no ocupa cupo.

## Cómo funciona

- **GitHub:** mantiene el código. Opcionalmente, GitHub Pages publica una página de acceso que muestra la aplicación en un iframe.
- **Google Apps Script:** sirve la interfaz completa y procesa los registros.
- **Google Sheets privado:** guarda turnos, participantes y aportes. La directiva administra los datos desde allí.
- **Código del curso:** se pide antes de mostrar nombres o permitir registros. Solo se configura en el servidor.

La aplicación funcional se abre en Apps Script, **no permanece dentro de GitHub Pages**. Esta separación evita una integración HTTP entre dominios y utiliza `google.script.run`. También puedes compartir directamente la URL de Apps Script y prescindir de Pages.

No se necesitan npm, un backend Node, base de datos adicional, tokens de GitHub ni cuentas individuales para los apoderados si la cuenta de Google permite publicar con acceso “Cualquier usuario”.

## Contenido

```text
repo/                         ← subir únicamente el contenido de esta carpeta
  apps-script/
    Code.gs                   ← lógica de servidor, carga inicial y setup/seed
    Index.html                ← aplicación para apoderados
    appsscript.json            ← permisos y zona horaria
  docs/
    index.html                ← página opcional de GitHub Pages (iframe)
    config.js                 ← URL de Apps Script; nunca el código del curso
  tests/backend.test.cjs       ← pruebas locales con servicios Google simulados
  README.md
  INSTALACION.md
  ADMINISTRACION.md
```

**Comienza por [INSTALACION.md](INSTALACION.md).** La carga inicial (`datosIniciales_`) está en `Code.gs`; se ejecuta una vez con `seed` desde el editor.

## Funciones incluidas

- Cupos, participantes y excesos visibles por turno.
- Registro de uno o varios adultos; validación del cupo en servidor con bloqueo de concurrencia.
- Prevención de reenvíos idénticos y de nombres duplicados en el mismo turno.
- Aportes con cantidad, unidad, responsable, tipo y observaciones.
- Estados de entrega y devolución administrados desde Sheets.
- Excel real `.xlsx` con tres hojas de resumen, generado bajo demanda.
- Impresión con ambos apartados y participantes desplegados; el navegador puede guardar como PDF.
- Código compartido (mínimo 6 caracteres), sin persistirlo en el almacenamiento del navegador.
- Cierre administrativo de inscripciones mediante propiedad de configuración.

## Carga inicial y aspectos por revisar

La carga preparada desde el Excel contiene **24 inscripciones de personas** y **5 aportes**. Se separaron únicamente las dos entradas que expresamente nombraban dos personas:

| Turno | Capacidad | Inscripciones | Libres | Exceso |
|---|---:|---:|---:|---:|
| Armado | 4 | 5 | 0 | 1 |
| Turno 1 | 7 | 8 | 0 | 1 |
| Turno 2 | 7 | 7 | 0 | 0 |
| Turno 3 | 9 | 1 | 8 | 0 |
| Turno 4 | 9 | 3 | 6 | 0 |

No se borraron inscripciones ni se aumentaron capacidades. Los turnos excedidos bloquean nuevas inscripciones. Los nombres entre paréntesis pasan a la referencia familiar.

La planilla mezcla referencias familiares, nombres abreviados y posiblemente nombres de estudiantes. Se preservan como referencia original: **la directiva debe confirmar el nombre del adulto detrás de cada inscripción**, incluida la entrada abreviada “B.”. No se infirieron identidades.

Los cinco aportes no tenían cantidad ni confirmación de entrega. Se cargan con cantidad vacía, tipo “Por confirmar” y estado “Pendiente” para revisión. No hay metas de cantidades porque el Excel no las define. Se mantiene el texto de guantes que pide confirmar si también se requieren de cabritilla.

No se agregó fecha exacta del evento porque no aparece en el archivo.

## Pruebas

Con Node.js 18 o superior:

```bash
node --test tests/backend.test.cjs
```

Las pruebas simulan Google Sheets, los bloqueos y la respuesta del servicio de exportación. Cubren cupos, envíos grupales, duplicados, reintentos, autorización, cancelaciones, cierre, protección de fórmulas y limpieza de exportaciones temporales. **No sustituyen la prueba real posterior a la implementación en Google**, indicada en INSTALACION.md.

## Alcance y mantenimiento

- El código compartido permite ver nombres y descargar el resumen. Está pensado para el grupo del curso; no verifica la identidad de cada persona. Quien lo conoce puede registrar un nombre. Las correcciones las hace la directiva.
- Las inscripciones nuevas no se guardan en GitHub ni en el navegador. La carga inicial sí viaja en `Code.gs`. Cada persona no debe volver a subir un Excel.
- La pantalla consulta al entrar, al actualizar y después de un registro. No hay sincronización continua; el servidor siempre revalida el cupo al confirmar.
- Una persona puede participar en más de un turno. El contador muestra inscripciones, no personas únicas del curso.
- El bloqueo coordina los registros de la web, no las ediciones manuales simultáneas de Sheets. Cierra inscripciones al realizar ajustes masivos.
- Apps Script tiene cuotas. El Excel crea una planilla temporal privada, la exporta y la mueve a la papelera. Para este uso ocasional es una solución sencilla; no se promete disponibilidad ni capacidad ilimitada.
- GitHub no despliega automáticamente los cambios en Apps Script. Debes actualizar los archivos en el editor y publicar una nueva versión de la implementación existente.

## Referencias oficiales

- [Aplicaciones web en Apps Script](https://developers.google.com/apps-script/guides/web)
- [Comunicación del navegador con Apps Script](https://developers.google.com/apps-script/guides/html/communication)
- [Bloqueo de operaciones concurrentes](https://developers.google.com/apps-script/reference/lock)
- [Exportación de archivos de Google Drive](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export)
- [Crear un sitio de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
