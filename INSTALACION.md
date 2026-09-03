# Instalación paso a paso

Necesitas una cuenta Google que pueda publicar aplicaciones web para “Cualquier usuario”. GitHub es opcional para operar la aplicación, pero sirve para guardar el código y tener una página de acceso.

## 1. Crear el libro privado

1. Crea un Google Sheets **vacío** llamado `Organización Kermés 2026`.
2. Mantén el acceso general como **Restringido**. Comparte como editores solo con quienes administrarán turnos y entregas.
3. Copia el ID del libro: en `https://docs.google.com/spreadsheets/d/ID_DEL_LIBRO/edit`, es el texto entre `/d/` y `/edit`.
4. Desde el libro, abre **Extensiones → Apps Script**. Usa este proyecto nuevo y vinculado al libro.

## 2. Copiar los archivos de la aplicación

1. Reemplaza el contenido de `Código.gs` (o `Code.gs`) por `repo/apps-script/Code.gs`.
2. Con **+ → HTML**, crea un archivo llamado **Index**. Pega el contenido de `repo/apps-script/Index.html`.
3. En **Configuración del proyecto**, activa **Mostrar el archivo de manifiesto appsscript.json en el editor**.
4. Vuelve al editor y reemplaza `appsscript.json` por el archivo incluido.
5. Guarda los cambios.

El manifiesto solicita acceso a Sheets, Drive y solicitudes externas. Se usan para mantener los registros y crear/exportar/eliminar las copias temporales del resumen. El token de Google permanece en el servidor; nunca se envía al frontend.

## 3. Configurar el libro y el acceso

En **Configuración del proyecto → Propiedades del script**, agrega:

| Propiedad | Valor |
|---|---|
| `SPREADSHEET_ID` | ID del Google Sheets del paso 1 |
| `ACCESS_CODE` | Código que compartirás solo con el curso; mínimo 6 caracteres (pueden ser 6 dígitos) |

No escribas el código en `config.js`, en el HTML, en GitHub ni en la URL.

En el editor, selecciona la función **`setup`** (envuelve a `configurar_`) y pulsa **Ejecutar**. Las funciones que terminan en `_` no aparecen en el desplegable. Autoriza los permisos solicitados por tu propio proyecto. Se crearán `Turnos`, `Inscripciones` y `Aportes`, sin borrar otras hojas. Puedes borrar después la pestaña vacía original `Hoja 1`.

La configuración se puede volver a ejecutar: no borra registros ni vuelve a insertar turnos si ya existen. No cambies los encabezados de las tablas.

## 4. Cargar lo que ya estaba inscrito

Los nombres y aportes de la planilla original ya están en `Code.gs` (`datosIniciales_`). No hace falta un archivo aparte.

1. En el desplegable elige **`seed`** (envuelve a `cargarDatosIniciales_`).
2. Pulsa **Ejecutar**.
3. Comprueba en Sheets que hay 24 filas de personas y 5 aportes, además de los encabezados.

Los IDs de la carga inicial son estables y la propiedad `SEED_LOADED` evita repetirla. Si la primera ejecución falla a mitad, un nuevo intento completa las filas faltantes sin duplicar las ya insertadas. No borres `SEED_LOADED` para volver a cargar una planilla que ya estás usando.

**Antes de abrir al curso:** revisa los excesos de Armado y Turno 1, confirma los nombres de adultos y completa cantidades/tipos de aportes si tienes esa información. Puedes conservar los excesos mientras los resuelves: la aplicación no aceptará más personas allí.

## 5. Publicar la aplicación de Google

1. En Apps Script: **Implementar → Nueva implementación**.
2. Selecciona tipo **Aplicación web**.
3. Ejecutar como: **Yo** (la cuenta organizadora).
4. Quién tiene acceso: **Cualquier usuario** si aparece disponible.
5. Pulsa **Implementar** y copia la URL que termina en **`/exec`**.
6. Abre esa URL en una ventana de incógnito. Debe aparecer la pantalla que pide el código del curso, sin mostrar participantes antes de introducirlo.

Si la cuenta institucional no permite “Cualquier usuario”, su administrador puede restringir esta opción. Puedes usar una cuenta organizadora que sí permita ese tipo de implementación, o aceptar acceso con cuenta Google y comprobar qué opción permite tu organización. No publiques la planilla para intentar resolverlo.

La URL `/dev` es de prueba para editores; **no la compartas como enlace final**. Un archivo HTML abierto directamente desde el disco tampoco puede ejecutar `google.script.run`.

## 6. Subir el código a GitHub

Sube **solo el contenido de `repo/`**. Nunca subas el ZIP completo, una carpeta `privado/` suelta ni el Excel original.

Opción terminal: crea primero un repositorio vacío llamado, por ejemplo, `kermesse-2026` y ejecuta desde la carpeta `repo`:

```bash
git init -b main
git add .
git status
git commit -m "Aplicación de turnos y aportes de la kermés"
git remote add origin https://github.com/TU_USUARIO/kermesse-2026.git
git push -u origin main
```

Reemplaza `TU_USUARIO` por tu usuario u organización. Revisa `git status` antes del commit: no debe haber nombres de familias, planillas ni claves. El `.gitignore` incluido excluye los archivos privados más comunes, pero subir manualmente archivos desde la web de GitHub puede omitir esa protección.

También puedes usar **Add file → Upload files** y cargar el contenido de `repo/` manteniendo las carpetas. Asegúrate de incluir `.gitignore` y `docs/.nojekyll` si tu explorador oculta archivos con punto.

## 7. Habilitar la página de GitHub Pages (opcional)

1. Edita `docs/config.js` y pega **solo** la URL `/exec`:

```js
window.KERMES_APP_URL = 'https://script.google.com/macros/s/ID_DE_TU_IMPLEMENTACION/exec';
```

2. Guarda y sube el cambio a GitHub.
3. Abre **Settings → Pages → Build and deployment**.
4. En **Source**, selecciona **Deploy from a branch**.
5. Selecciona rama **main**, carpeta **/docs**, y guarda.
6. Usa la URL publicada que GitHub muestre, normalmente `https://TU_USUARIO.github.io/kermesse-2026/`.

La disponibilidad de Pages para repositorios privados depende del plan. Puedes mantener el repositorio privado y compartir directamente la URL de Apps Script, o publicar únicamente el código sin datos personales en un repositorio público.

GitHub Pages muestra la aplicación en un iframe a pantalla completa, para que la barra del navegador conserve el dominio propio. El formulario del código y los registros siguen ejecutándose en el dominio de Google. En `doGet` debe estar `XFrameOptionsMode.ALLOWALL` y hay que publicar una nueva versión de la implementación. Si no has configurado la URL, la página indica que la organización está preparando las inscripciones; no simula registros.

## 8. Prueba real antes de compartir

Estas pruebas requieren tu implementación de Google. No vienen ejecutadas en tu cuenta.

- Código incorrecto: debe rechazar el acceso y no mostrar datos.
- Código correcto: deben aparecer los cinco turnos y cinco aportes importados.
- Armado y Turno 1: debe mostrar un exceso de una persona y bloquear nuevas inscripciones.
- En un turno con espacio, inscribe dos nombres de prueba: deben aparecer dos filas y bajar dos cupos.
- Vuelve a intentar uno de esos nombres en el mismo turno: debe rechazar el duplicado.
- Para comprobar el último cupo, crea temporalmente un turno de prueba de capacidad 1 y envía desde dos ventanas: solo una persona debe quedar inscrita. Cancela los registros de prueba antes de eliminar ese turno.
- Registra un aporte de prueba, márcalo `Entregado` en Sheets y pulsa **Actualizar** en la web.
- Descarga el Excel: debe abrir con `Turnos`, `Participantes` y `Aportes`, sin IDs internos.
- Prueba **Imprimir / PDF**: debe incluir ambos apartados y los nombres, aunque estuvieras viendo solo uno.
- En Sheets, cambia las inscripciones y aportes de prueba a `Cancelado`; actualiza y confirma que ya no se muestran y se liberaron los cupos.
- Prueba el enlace compartido desde un teléfono.

Si la descarga de Excel indica un error, revisa **Ejecuciones** en Apps Script y confirma que autorizaste el manifiesto actualizado. Si Google informa que Drive API está deshabilitada en el proyecto Cloud asociado, habilita esa API en ese proyecto y vuelve a probar. Mientras tanto, la directiva puede descargar desde Sheets: **Archivo → Descargar → Microsoft Excel**.

## 9. Actualizaciones posteriores

1. Modifica el código local y guárdalo en GitHub.
2. Copia los archivos modificados al editor de Apps Script.
3. En **Implementar → Administrar implementaciones**, edita la implementación existente.
4. Elige **Nueva versión** y pulsa **Implementar**. Al actualizar la misma implementación se conserva la URL.
5. Los cambios en las filas de Sheets se ven al actualizar; no requieren nueva versión. Los cambios en propiedades del script tampoco requieren modificar el frontend.

No vuelvas a ejecutar la carga inicial como parte de una actualización normal.
