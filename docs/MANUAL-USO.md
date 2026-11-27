# Manual de uso

## Alcance del piloto

La aplicación es una demostración pública con el perfil ficticio `user1`. No solicita inicio de sesión ni aplica permisos reales. Los cambios se guardan en el almacenamiento local de este navegador y no se comparten con otras personas ni dispositivos.

No introduzcas nombres, códigos, horarios ni otra información real del personal.

## Abrir y navegar

Visita <https://motxitron.github.io/gehobaes/>. El calendario muestra el año y mes actuales. Usa el selector **Año** y las flechas para navegar; **Today** vuelve al día actual y enfoca su celda. Pulsa **Informe mensual** para abrir el resumen en otra pestaña.

Cada celda indica la jornada prevista y las actividades o coberturas del día. Los fines de semana y festivos empiezan con jornada cero. Selecciona una fecha para editarla.

## Configurar la jornada anual

Pulsa **Configuración de horario** para abrir los ajustes del año seleccionado. Define las horas de lunes a jueves, las horas de viernes/verano, las fechas inicial y final del verano y el cupo anual de vacaciones. Las fechas del verano son inclusivas. Los viernes usan la jornada de viernes/verano durante todo el año; de lunes a jueves solo se usa durante el periodo indicado. Fuera de ese periodo, esos días usan la jornada L-J.

La ventana también reúne festivos, importación de ficheros y excepciones de jornada. El contador de vacaciones muestra los días `X` usados frente al cupo anual. Guarda la configuración con **Guardar jornada**; no se permite reducir el cupo por debajo de las vacaciones ya registradas.

## Editar actividades y coberturas

1. Selecciona un día y añade una o más actividades con su duración.
2. Las actividades dentro de la jornada son `CO`, `F`, `E`, `M`, `O`, `X`, `LD`, `MT`, `LT`, `AR`, `NF` y `CD`.
3. Las horas de actividad se descuentan de la jornada prevista. El remanente se calcula como trabajo sin categoría.
4. `X` ocupa el día completo y no se combina con otras actividades. No se puede registrar en una fecha con jornada cero.
5. El código `C` se registra en **Cobertura extra**, fuera de la jornada: no resta horas del día y, sin remunerar, añade esas horas a la bolsa `CD`. Al marcar un bloque como remunerado, se registra como `CR`; `CR` solo se permite dentro del periodo de verano configurado. Pulsa **Guardar día** para aplicar los movimientos a la bolsa.
6. `CD` consume el saldo disponible y reduce el tiempo restante de trabajo del día. No se puede dejar la bolsa en negativo. El saldo solo se puede usar dentro del mismo año natural y caduca al acabar el año.
7. Elimina o ajusta cada actividad o bloque individualmente y pulsa **Guardar día**. Si la edición deja una jornada o saldo inválidos, se explica el motivo y no se guarda.
8. En el editor puedes marcar o desmarcar el día como festivo. Al marcarlo desaparecen las opciones de actividades y coberturas; los registros que ya existían deben eliminarse explícitamente antes de guardar. El festivo prevalece sobre una excepción de jornada y deja las horas previstas a cero.

`LD` y `AR` son actividades normales y no consumen la bolsa. El resumen no calcula importes de nómina.

## Festivos y excepciones de jornada

En **Configuración de horario → Festivos** introduce fecha, tipo y descripción, o marca directamente el festivo desde el editor del día. Los tipos disponibles son `DI` (día inhábil), `FL` (festivo local), `FA` (fiesta autonómica) y `FN` (fiesta nacional).

También se pueden importar ficheros CSV, XLS, XLSX o PDF desde el dispositivo:

- CSV: cada fila incluye fecha en formato `dd/mm/aaaa`, código `DI`, `FL`, `FA` o `FN` y, opcionalmente, descripción. Se elige explícitamente coma o punto y coma como separador; se admite una cabecera `Fecha,Código,Descripción`.
- Excel: se lee la primera hoja de libros `.xls` y `.xlsx`; se espera la misma estructura de columnas.
- Se muestra una vista previa para elegir qué filas guardar y corregir el tipo o descripción. Solo se importan las filas confirmadas.

- El PDF se procesa en el navegador; se limita a 20 MB y 50 páginas.
- La aplicación detecta fechas del año seleccionado en formatos numéricos, ISO o escritos en castellano, incluso cuando el documento no repite el año; muestra una vista previa editable.
- Si encuentra un «periodo de jornada intensiva» y dos fechas cercanas en el texto, propone ese periodo para revisión y confirmación; no interpreta los colores del PDF.
- Confirma solo los datos correctos. Se guardan los festivos confirmados y, si se acepta, el periodo intensivo; nunca los ficheros fuente.
- El resultado o el error de lectura aparece junto al selector del PDF. Los documentos escaneados sin texto seleccionable no se pueden reconocer automáticamente; usa la entrada manual.

Los festivos aplican jornada cero y no admiten actividades ni coberturas. Para trabajar ese día, quita primero la marca de festivo. Las **Excepciones de jornada** sirven para fines de semana y fechas no festivas; prevalecen sobre el patrón semanal.

## Informe mensual

El informe, abierto en otra pestaña, contiene jornada prevista, trabajo sin categoría, totales por actividad con horas positivas, horas extra de cobertura, movimientos y saldos de la bolsa, y detalle diario. Las actividades repetidas del mismo código se consolidan. Desde el botón de impresión del informe se puede imprimir o guardarlo como PDF.

**Todos los empleados** abre una cuadrícula del mes seleccionado con una columna por día y los datos de jornada, dominio y rol como columnas fijas. `user1` muestra los datos guardados en este navegador; las otras 17 filas son empleados ficticios de demostración. El piloto aún no tiene un censo real ni sincroniza perfiles de empleados.

## Guardado y recuperación

Los datos se guardan en el almacenamiento local del navegador. Se conservan al recargar la misma página en el mismo perfil del navegador, pero no se sincronizan ni constituyen una copia de seguridad. Borrar los datos del sitio o cambiar de navegador o dispositivo puede eliminarlos.

Si aparece un aviso de error de almacenamiento, el navegador no ha podido leer o conservar los cambios; no des por guardada la edición.

## Perfil y permisos

El dominio, rol e identificador del perfil son datos estáticos de demostración. En este piloto no se pueden editar y no limitan qué días puede cambiar la persona usuaria. La edición del perfil y los permisos por rol o dominio requieren una versión futura con autenticación y autorización en un backend.
