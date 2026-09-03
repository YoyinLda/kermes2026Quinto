const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function harness() {
  const tables = {
    Turnos: [['id','nombre','inicio','fin','capacidad','tarea'], ['t1','Turno 1','17:00','18:30',2,'Venta'], ['t2','Turno 2','18:30','20:00',2,'Venta']],
    Inscripciones: [['id','turno_id','adulto','familia','estado','fecha','solicitud_id']],
    Aportes: [['id','articulo','responsable','cantidad','unidad','tipo','estado','observaciones','fecha','solicitud_id']]
  };
  const props = { SPREADSHEET_ID:'test-book', ACCESS_CODE:'codigo-prueba-123' };
  let held=false, releases=0, canLock=true, id=0, trashed=false, responseCode=200;
  function sheet(name, tableMap=tables) {
    return {
      getLastRow:()=>tableMap[name].length, getMaxRows:()=>1000,
      getLastColumn:()=>tableMap[name][0]?.length||0,
      setName(newName){tableMap[newName]=tableMap[name];delete tableMap[name];name=newName;return this;},
      setFrozenRows(){return this;},autoResizeColumns(){return this;},insertRowsAfter(){},
      getRange(row,col,n,m){return {
        getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>tableMap[name][row-1+i]?.[col-1+j]??'')),
        getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>String(tableMap[name][row-1+i]?.[col-1+j]??'').replace(/^'/,''))),
        setValues(values){values.forEach((r,i)=>{tableMap[name][row-1+i]??=[];r.forEach((v,j)=>tableMap[name][row-1+i][col-1+j]=v);});return this;},
        setFontWeight(){return this;},setBackground(){return this;},setDataValidation(){return this;}
      };}
    };
  }
  const book={getSheetByName:name=>tables[name]?sheet(name):null};
  const tempData={Sheet1:[]};
  const temp={getId:()=> 'temp-id',getSheets:()=>Object.keys(tempData).map(n=>sheet(n,tempData)),insertSheet(name){tempData[name]=[];return sheet(name,tempData);}};
  const ctx={console,Set,Date,JSON,Math,Number,String,Error,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},
    SpreadsheetApp:{openById:()=>book,flush(){},create:()=>temp},
    Utilities:{getUuid:()=>String(++id),sleep(){},formatDate:()=> '2026-09-03',base64Encode:bytes=>Buffer.from(bytes).toString('base64')},
    LockService:{getScriptLock:()=>({tryLock(){if(!canLock)return false;assert.equal(held,false);held=true;return true;},releaseLock(){assert.equal(held,true);held=false;releases++;}})},
    DriveApp:{getFileById:()=>({setTrashed(value){trashed=value;}})},
    ScriptApp:{getOAuthToken:()=> 'not-a-real-token'},
    UrlFetchApp:{fetch:()=>({getResponseCode:()=>responseCode,getContent:()=>[80,75,3,4]})}
  };
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8'),ctx);
  return {ctx,tables,props,tempData,code:props.ACCESS_CODE,lockOff(){canLock=false;},isLocked:()=>held,releases:()=>releases,isTrashed:()=>trashed,failExport(){responseCode=503;}};
}
const req=(extra={})=>({shiftId:'t1',names:['Ana Pérez'],family:'Familia Pérez',requestId:'request-0000000001',...extra});
const donation=(extra={})=>({item:'Vasos',owner:'Ana Pérez',quantity:'2',unit:'paquetes',type:'Donación',notes:'',requestId:'donation-000000001',...extra});

test('todas las operaciones de datos requieren el código; falla cerrado si falta',()=>{
  const h=harness();for(const method of ['getState','registerPeople','registerDonation','downloadSummary'])assert.throws(()=>h.ctx[method]('incorrecto',{}),/Código/);
  delete h.props.ACCESS_CODE;assert.throws(()=>h.ctx.getState(h.code),/Código/);assert.equal(h.tables.Inscripciones.length,1);
});
test('acepta ACCESS_CODE de 6 caracteres y rechaza uno más corto',()=>{
  const h=harness();
  h.props.ACCESS_CODE='123456';
  assert.equal(h.ctx.getState('123456').shifts.length,2);
  h.props.ACCESS_CODE='12345';
  assert.throws(()=>h.ctx.getState('12345'),/Código/);
});
test('dos adultos consumen dos cupos; referencia familiar no cuenta',()=>{
  const h=harness();const result=h.ctx.registerPeople(h.code,req({names:['Ana Pérez','José Pérez']}));
  assert.equal(result.state.shifts[0].participants.length,2);assert.equal(result.state.shifts[0].available,0);assert.equal(h.tables.Inscripciones.length,3);
});
test('el último cupo se revalida; un envío grupal rechazado no guarda personas',()=>{
  const h=harness();h.ctx.registerPeople(h.code,req());
  assert.throws(()=>h.ctx.registerPeople(h.code,req({names:['Luis','María'],requestId:'request-0000000002'})),/Quedan 1/);
  assert.equal(h.tables.Inscripciones.length,2);
  h.ctx.registerPeople(h.code,req({names:['Luis'],requestId:'request-0000000003'}));
  assert.throws(()=>h.ctx.registerPeople(h.code,req({names:['María'],requestId:'request-0000000004'})),/Quedan 0/);
  assert.equal(h.tables.Inscripciones.length,3);assert.equal(h.isLocked(),false);
});
test('reintento idéntico es idempotente incluso cuando el turno está lleno',()=>{
  const h=harness(),p=req({names:['Ana','José']});h.ctx.registerPeople(h.code,p);h.ctx.registerPeople(h.code,p);assert.equal(h.tables.Inscripciones.length,3);
  assert.throws(()=>h.ctx.registerPeople(h.code,req({names:['Otra persona']})),/ya fue procesado/);
});
test('duplicados por mayúsculas, tildes y espacios son rechazados',()=>{
  const h=harness();assert.throws(()=>h.ctx.registerPeople(h.code,req({names:['Ana Pérez','ANA PEREZ']})),/repetidos/);
  h.ctx.registerPeople(h.code,req());assert.throws(()=>h.ctx.registerPeople(h.code,req({names:['ANA  PEREZ'],requestId:'request-0000000002'})),/ya está inscrito/);
});
test('exceso inicial bloquea nuevos registros sin borrar los anteriores',()=>{
  const h=harness();for(let i=0;i<3;i++)h.tables.Inscripciones.push([String(i),'t1','Persona '+i,'','Confirmado','','seed-'+i]);
  const s=h.ctx.getState(h.code).shifts[0];assert.equal(s.excess,1);assert.equal(s.available,0);
  assert.throws(()=>h.ctx.registerPeople(h.code,req()),/Quedan 0/);assert.equal(h.tables.Inscripciones.length,4);
});
test('cancelar libera cupo; la lectura no expone identificadores de envío',()=>{
  const h=harness();h.ctx.registerPeople(h.code,req());h.tables.Inscripciones[1][4]='Cancelado';
  const state=h.ctx.getState(h.code);assert.equal(state.shifts[0].available,2);assert.equal(JSON.stringify(state).includes('request-000'),false);
});
test('bloqueo ocupado rechaza sin escribir y errores liberan el bloqueo',()=>{
  const h=harness();h.lockOff();assert.throws(()=>h.ctx.registerPeople(h.code,req()),/otra inscripción/);assert.equal(h.tables.Inscripciones.length,1);
  const j=harness();assert.throws(()=>j.ctx.registerPeople(j.code,req({shiftId:'missing'})),/no existe/);assert.equal(j.isLocked(),false);assert.equal(j.releases(),1);
});
test('aportes validan cantidad, tipo, idempotencia y estado pendiente',()=>{
  const h=harness();for(const q of ['0','-1','NaN','100001'])assert.throws(()=>h.ctx.registerDonation(h.code,donation({quantity:q})),/cantidad/);
  assert.throws(()=>h.ctx.registerDonation(h.code,donation({type:'Otro'})),/Selecciona/);
  h.ctx.registerDonation(h.code,donation());h.ctx.registerDonation(h.code,donation());assert.equal(h.tables.Aportes.length,2);assert.equal(h.ctx.getState(h.code).donations[0].status,'Pendiente');
  assert.throws(()=>h.ctx.registerDonation(h.code,donation({quantity:3})),/ya fue procesado/);
});
test('texto potencialmente ejecutable se guarda como texto de planilla',()=>{
  const h=harness();h.ctx.registerPeople(h.code,req({names:['=IMPORTXML("url")']}));assert.equal(h.tables.Inscripciones[1][2][0],"'");
  h.ctx.registerDonation(h.code,donation({notes:' +1+1'}));assert.equal(h.tables.Aportes[1][7][0],"'");
});
test('cierre administrativo impide nuevos turnos y aportes, pero permite consultar',()=>{
  const h=harness();h.props.REGISTRATION_CLOSED='true';assert.throws(()=>h.ctx.registerPeople(h.code,req()),/cerradas/);assert.throws(()=>h.ctx.registerDonation(h.code,donation()),/cerrados/);assert.ok(h.ctx.getState(h.code));
});
test('exportación construye tres hojas sin identificadores y elimina copia temporal',()=>{
  const h=harness();h.ctx.registerPeople(h.code,req());h.ctx.registerDonation(h.code,donation());
  const out=h.ctx.downloadSummary(h.code);assert.equal(out.mime,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');assert.ok(out.filename.endsWith('.xlsx'));
  assert.deepEqual(Object.keys(h.tempData),['Turnos','Participantes','Aportes']);assert.equal(JSON.stringify(h.tempData).includes('request-000'),false);assert.equal(h.isTrashed(),true);
});
test('un fallo del servicio de exportación también elimina la copia temporal',()=>{
  const h=harness();h.failExport();assert.throws(()=>h.ctx.downloadSummary(h.code),/No se pudo generar/);assert.equal(h.isTrashed(),true);
});
