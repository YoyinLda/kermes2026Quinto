# Guía para la directiva

Los apoderados consultan, se inscriben y comprometen aportes desde la web. La directiva mantiene el Google Sheets privado y realiza las correcciones allí.

## Turnos

En `Turnos`, cada fila tiene un ID estable, nombre, horario, capacidad y tarea. Puedes ajustar el nombre, horario, tarea o capacidad. Usa horas como texto `17:00`; si Sheets cambia el formato, aplica **Formato → Número → Texto sin formato** en las columnas de inicio/fin.

- No cambies un ID que ya tenga inscripciones.
- No borres un turno con participantes confirmados: reasigna o cancela primero sus registros.
- No cambies encabezados ni el nombre de las pestañas.
- Aumentar la capacidad es una decisión de la directiva; la aplicación no lo hace automáticamente para resolver excesos.
- Si agregas un turno, usa un ID único, por ejemplo `apoyo`, y capacidad entera no negativa.

## Cambiar o cancelar una inscripción

En `Inscripciones`:

- Cada fila representa **un adulto**. Nunca agregues dos nombres en la misma celda.
- Corrige el campo `adulto` si la planilla original usaba el nombre del estudiante o una abreviatura.
- `familia` es solo una referencia y no ocupa cupo.
- Para cancelar, cambia `estado` a **Cancelado**. El registro se conserva como antecedente, desaparece de la web y libera el cupo.
- Para mover a alguien, comprueba el cupo del destino y cambia `turno_id` por el ID exacto de ese turno.
- No modifiques `id`, `fecha` ni `solicitud_id` de registros existentes. Permiten reconocer reintentos y mantener la carga inicial.
- Para añadir personas manualmente, usa preferentemente la web. No copies una fila entera con el mismo ID.

Una persona puede anotarse en varios turnos. No se detectan identidades reales ni se impide que dos personas usen un nombre similar. Si hay homónimos, agrega el segundo apellido.

## Donaciones, préstamos y cosas por entregar

En `Aportes`:

| Campo | Qué registrar |
|---|---|
| `articulo` | Nombre concreto, por ejemplo “Vasos plásticos” |
| `responsable` | Adulto o familia que lleva el aporte |
| `cantidad` | Número; los aportes originales están vacíos hasta confirmarlos |
| `unidad` | Unidades, paquetes, litros, etc. |
| `tipo` | Donación o Préstamo; los originales están “Por confirmar” |
| `estado` | Pendiente, Entregado, Devuelto o Cancelado |
| `observaciones` | Hora de entrega, lugar, aclaraciones |

Marca **Entregado** cuando lo recibas. Para préstamos, marca **Devuelto** cuando lo entregues a su dueño. Usa **Cancelado** cuando el compromiso ya no corresponda. No marques una donación como devuelta.

La aplicación no suma “paquetes” y “unidades” ni calcula un faltante de artículos porque el Excel original no definía cantidades objetivo. El contador de pendientes cuenta compromisos, no unidades pendientes.

## Revisiones iniciales

- Armado tiene 5 inscripciones para 4 cupos.
- Turno 1 tiene 8 inscripciones para 7 cupos.
- Confirma el adulto detrás de nombres de estudiantes y abreviaciones heredadas del archivo original.
- Confirma cantidad y tipo de los cinco aportes. El estado “Pendiente” significa que no había confirmación de entrega en el Excel, no que se verificó que siguen pendientes.

## Cerrar registros

En Apps Script → Configuración del proyecto → Propiedades del script:

```text
REGISTRATION_CLOSED = true
```

Impide nuevas inscripciones y aportes, manteniendo la consulta y las descargas. Para reabrir, elimina esa propiedad o pon `false`. Durante el cierre, los formularios siguen visibles y el servidor informa que los registros están cerrados al confirmar.

Antes de ajustes masivos, cierra registros y espera a que terminen las ejecuciones en curso. El bloqueo de Apps Script coordina registros de la web, pero no protege contra cambios manuales simultáneos en Sheets.

## Resumen y respaldo

- En la web: **Descargar Excel** devuelve una copia actualizada con turnos, participantes y aportes, sin registros cancelados ni IDs internos.
- **Imprimir / PDF** actualiza la información y prepara ambos apartados; selecciona “Guardar como PDF” en el diálogo del navegador.
- Para un respaldo completo, la directiva puede descargar directamente el libro de Google Sheets. Ese respaldo sí incluye las tablas internas.
- Mantén el libro restringido a la directiva; no uses “Publicar en la web”.
- Quien tenga el código del curso puede ver nombres y descargar el resumen. El código debe tener al menos 6 caracteres. Si se comparte fuera del grupo, reemplaza `ACCESS_CODE` en las propiedades del script y distribuye el nuevo solo al curso. No se guarda en el navegador.

Después del evento puedes cerrar registros y archivar la implementación en Apps Script si ya no debe ser accesible.
