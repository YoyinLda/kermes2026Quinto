/** Kermés · 5° básico. El libro y el código de acceso se configuran en propiedades. */
const HEADERS_ = {
  Turnos: ['id', 'nombre', 'inicio', 'fin', 'capacidad', 'tarea'],
  Inscripciones: ['id', 'turno_id', 'adulto', 'familia', 'estado', 'fecha', 'solicitud_id'],
  Aportes: ['id', 'articulo', 'responsable', 'cantidad', 'unidad', 'tipo', 'estado', 'observaciones', 'fecha', 'solicitud_id']
};
const TURNOS_ = [
  ['armado', 'Armado', '11:30', '13:00', 4, 'Armado de stand y decoración'],
  ['turno-1', 'Turno 1', '17:00', '18:30', 7, 'Venta'],
  ['turno-2', 'Turno 2', '18:30', '20:00', 7, 'Venta'],
  ['turno-3', 'Turno 3', '20:00', '21:30', 9, 'Venta'],
  ['turno-4', 'Turno 4', '21:30', '23:00', 9, 'Venta y desarmado de stand']
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Kermés 2026 · 5° básico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Ejecutar desde el editor, una sola vez. Nunca borra registros existentes. */
function configurar_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID')) throw new Error('Configura SPREADSHEET_ID en las propiedades del script.');
  if ((props.getProperty('ACCESS_CODE') || '').length < 12) throw new Error('Configura ACCESS_CODE con al menos 12 caracteres.');
  locked_(function () {
    const book = book_();
    Object.keys(HEADERS_).forEach(function (name) {
      let sheet = book.getSheetByName(name);
      if (!sheet) sheet = book.insertSheet(name);
      if (!sheet.getLastRow()) {
        sheet.getRange(1, 1, 1, HEADERS_[name].length).setValues([HEADERS_[name]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, HEADERS_[name].length).setFontWeight('bold').setBackground('#dce9ff');
        if (name === 'Turnos') append_(sheet, TURNOS_);
      } else {
        const header = sheet.getRange(1, 1, 1, HEADERS_[name].length).getValues()[0];
        if (JSON.stringify(header) !== JSON.stringify(HEADERS_[name])) throw new Error('Encabezados inesperados en ' + name + '. Usa un libro vacío.');
      }
    });
    const statuses = { Inscripciones: [5, ['Confirmado', 'Cancelado']], Aportes: [7, ['Pendiente', 'Entregado', 'Devuelto', 'Cancelado']] };
    Object.keys(statuses).forEach(function (name) {
      const sheet = book.getSheetByName(name), info = statuses[name];
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(info[1], true).setAllowInvalid(false).build();
      sheet.getRange(2, info[0], Math.max(1, sheet.getMaxRows() - 1), 1).setDataValidation(rule);
    });
    SpreadsheetApp.flush();
  });
}

function book_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('La organización todavía no ha configurado la aplicación.');
  return SpreadsheetApp.openById(id);
}
function auth_(code) {
  const expected = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
  if (!expected || expected.length < 12 || typeof code !== 'string' || code !== expected) throw new Error('Código de acceso incorrecto. Solicítalo a la directiva.');
}
function locked_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Hay otra inscripción en curso. Espera unos segundos y vuelve a intentar.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function rows_(name) {
  const sheet = book_().getSheetByName(name);
  if (!sheet) throw new Error('La organización debe ejecutar configurar en Apps Script.');
  return sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS_[name].length).getDisplayValues().filter(function (r) { return r[0]; });
}
function text_(v, label, max) {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new Error('Revisa ' + label + '.');
  return v.trim();
}
function optional_(v, label, max) { return v === undefined || v === '' ? '' : text_(v, label, max); }
function key_(v) {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(v)) throw new Error('Identificador de envío inválido. Recarga la página.');
  return v;
}
function normalized_(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function safeCell_(v) { return typeof v === 'string' && /^[\s]*[=+@-]/.test(v) ? "'" + v : v; }
function append_(sheet, values) {
  if (!values.length) return;
  const next = sheet.getLastRow() + 1;
  if (next + values.length - 1 > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), values.length);
  sheet.getRange(next, 1, values.length, values[0].length).setValues(values.map(function (r) { return r.map(safeCell_); }));
}
function state_() {
  const people = rows_('Inscripciones').filter(function (r) { return r[4] === 'Confirmado'; });
  return {
    updatedAt: new Date().toISOString(),
    shifts: rows_('Turnos').map(function (r) {
      const cap = Number(r[4]);
      if (!Number.isInteger(cap) || cap < 0) throw new Error('La directiva debe revisar la capacidad de ' + r[1] + '.');
      const participants = people.filter(function (p) { return p[1] === r[0]; }).map(function (p) { return { name: p[2], family: p[3] }; });
      return { id: r[0], name: r[1], start: r[2], end: r[3], capacity: cap, task: r[5], participants: participants, available: Math.max(0, cap - participants.length), excess: Math.max(0, participants.length - cap) };
    }),
    donations: rows_('Aportes').filter(function (r) { return r[6] !== 'Cancelado'; }).map(function (r) {
      return { item: r[1], owner: r[2], quantity: r[3], unit: r[4], type: r[5], status: r[6], notes: r[7] };
    })
  };
}
function getState(code) { auth_(code); return locked_(state_); }

/** Todos los nombres del envío se guardan juntos o ninguno. */
function registerPeople(code, payload) {
  auth_(code);
  if (PropertiesService.getScriptProperties().getProperty('REGISTRATION_CLOSED') === 'true') throw new Error('Las inscripciones están cerradas. Contacta a la directiva.');
  if (!payload || !Array.isArray(payload.names) || !payload.names.length || payload.names.length > 9) throw new Error('Ingresa entre 1 y 9 adultos.');
  const id = key_(payload.requestId), shiftId = text_(payload.shiftId, 'el turno', 40);
  const names = payload.names.map(function (n) { return text_(n, 'el nombre de cada adulto', 100); });
  const family = optional_(payload.family, 'la referencia familiar', 100);
  const normalized = names.map(normalized_);
  if (new Set(normalized).size !== names.length) throw new Error('Hay nombres repetidos en este envío.');
  return locked_(function () {
    const all = rows_('Inscripciones');
    const previous = all.filter(function (r) { return r[6] === id; });
    if (previous.length) {
      if (previous.length !== names.length || previous.some(function (r, i) { return r[1] !== shiftId || r[2] !== names[i] || r[3] !== family; })) throw new Error('El envío anterior ya fue procesado. Recarga para realizar otro.');
      return { message: 'Este envío ya estaba registrado.', state: state_() };
    }
    const shift = state_().shifts.find(function (s) { return s.id === shiftId; });
    if (!shift) throw new Error('El turno ya no existe. Actualiza la página.');
    if (shift.available < names.length) throw new Error('Quedan ' + shift.available + ' cupos. No se registró a ninguna persona. Actualiza y elige otro turno.');
    if (shift.participants.some(function (p) { return normalized.indexOf(normalized_(p.name)) !== -1; })) throw new Error('Uno de esos nombres ya está inscrito en este turno. Si son personas distintas con el mismo nombre, agrega el segundo apellido.');
    const now = new Date().toISOString();
    append_(book_().getSheetByName('Inscripciones'), names.map(function (n) { return [Utilities.getUuid(), shiftId, n, family, 'Confirmado', now, id]; }));
    SpreadsheetApp.flush();
    return { message: names.length === 1 ? '¡Tu turno quedó confirmado!' : '¡Las ' + names.length + ' personas quedaron inscritas!', state: state_() };
  });
}
function registerDonation(code, payload) {
  auth_(code);
  if (PropertiesService.getScriptProperties().getProperty('REGISTRATION_CLOSED') === 'true') throw new Error('Los registros están cerrados. Contacta a la directiva.');
  if (!payload) throw new Error('Completa el aporte.');
  const id = key_(payload.requestId), item = text_(payload.item, 'el artículo', 120), owner = text_(payload.owner, 'el responsable', 100);
  const quantity = Number(payload.quantity), unit = text_(payload.unit, 'la unidad', 30);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw new Error('La cantidad debe ser mayor que cero y no superar 100.000.');
  if (['Donación', 'Préstamo'].indexOf(payload.type) === -1) throw new Error('Selecciona donación o préstamo.');
  const notes = optional_(payload.notes, 'las observaciones', 300);
  return locked_(function () {
    const previous = rows_('Aportes').find(function (r) { return r[9] === id; });
    if (previous) {
      if (previous[1] !== item || previous[2] !== owner || Number(previous[3].replace(',', '.')) !== quantity || previous[4] !== unit || previous[5] !== payload.type || previous[7] !== notes) throw new Error('El envío anterior ya fue procesado. Recarga para realizar otro.');
      return { message: 'Este aporte ya estaba registrado.', state: state_() };
    }
    append_(book_().getSheetByName('Aportes'), [[Utilities.getUuid(), item, owner, quantity, unit, payload.type, 'Pendiente', notes, new Date().toISOString(), id]]);
    SpreadsheetApp.flush();
    return { message: '¡Gracias! Tu aporte quedó anotado.', state: state_() };
  });
}

/** Exporta una copia, sin identificadores técnicos ni registros cancelados. */
function downloadSummary(code) {
  auth_(code);
  const state = locked_(state_);
  const temp = SpreadsheetApp.create('Resumen Kermes 2026');
  try {
    const shifts = temp.getSheets()[0].setName('Turnos');
    append_(shifts, [['Turno', 'Inicio', 'Fin', 'Tarea', 'Cupos', 'Inscritos', 'Disponibles', 'Exceso']].concat(state.shifts.map(function (s) { return [s.name, s.start, s.end, s.task, s.capacity, s.participants.length, s.available, s.excess]; })));
    const people = temp.insertSheet('Participantes');
    const pRows = [['Turno', 'Horario', 'Adulto', 'Referencia familiar']];
    state.shifts.forEach(function (s) { s.participants.forEach(function (p) { pRows.push([s.name, s.start + '–' + s.end, p.name, p.family]); }); });
    append_(people, pRows);
    const donations = temp.insertSheet('Aportes');
    append_(donations, [['Artículo', 'Responsable', 'Cantidad', 'Unidad', 'Tipo', 'Estado', 'Observaciones']].concat(state.donations.map(function (d) { return [d.item, d.owner, d.quantity, d.unit, d.type, d.status, d.notes]; })));
    temp.getSheets().forEach(function (s) { s.setFrozenRows(1); s.getRange(1, 1, 1, s.getLastColumn()).setFontWeight('bold').setBackground('#dce9ff'); s.autoResizeColumns(1, s.getLastColumn()); });
    SpreadsheetApp.flush();
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + temp.getId() + '/export?mimeType=' + encodeURIComponent(mime), { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (response.getResponseCode() === 200) break;
      if (attempt < 2) Utilities.sleep(500 * (attempt + 1));
    }
    if (response.getResponseCode() !== 200) throw new Error('No se pudo generar el Excel. Vuelve a intentar o pide la descarga a la directiva.');
    return { filename: 'Resumen_Kermes_2026_' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd_HH-mm') + '.xlsx', mime: mime, base64: Utilities.base64Encode(response.getContent()) };
  } finally { DriveApp.getFileById(temp.getId()).setTrashed(true); }
}

/** Solo editor: carga el archivo privado una vez, sin exponerlo por RPC. */
function cargarDatosIniciales_() {
  if (typeof datosIniciales_ !== 'function') throw new Error('Agrega primero el archivo privado DatosIniciales.gs.');
  locked_(function () {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('SEED_LOADED') === 'true') throw new Error('Los datos iniciales ya fueron cargados.');
    const data = datosIniciales_(), book = book_();
    const existingPeople = new Set(rows_('Inscripciones').map(function (r) { return r[0]; }));
    const existingDonations = new Set(rows_('Aportes').map(function (r) { return r[0]; }));
    append_(book.getSheetByName('Inscripciones'), data.people.filter(function (r) { return !existingPeople.has(r[0]); }));
    append_(book.getSheetByName('Aportes'), data.donations.filter(function (r) { return !existingDonations.has(r[0]); }));
    SpreadsheetApp.flush();
    props.setProperty('SEED_LOADED', 'true');
  });
}
