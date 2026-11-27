# Manual de uso

## Alcance del piloto

La aplicación es una demostración pública con el perfil ficticio `user1`. No solicita inicio de sesión ni aplica permisos reales. Los cambios se guardan en el almacenamiento local de este navegador y no se comparten con otras personas ni dispositivos.

No introduzcas nombres, códigos, horarios ni otra información real del personal.

## Abrir y navegar

Visita <https://motxitron.github.io/gehobaes/>. El calendario muestra el año y mes actuales. Usa el selector **Año** y las flechas para navegar; **Today** vuelve al día actual y enfoca su celda. Pulsa **Informe mensual** para abrir el resumen en otra pestaña.

Cada celda indica la jornada prevista y las actividades o coberturas del día. Los fines de semana y festivos empiezan con jornada cero. Selecciona una fecha para editarla.

## Configurar la jornada anual

En **Configuración anual**, define las horas de lunes a jueves, las horas de viernes/verano y las fechas inicial y final del verano. Las fechas del verano son inclusivas. Los viernes usan la jornada de viernes/verano durante todo el año; de lunes a jueves solo se usa durante el periodo indicado. Fuera de ese periodo, esos días usan la jornada L-J.

Guarda los cambios con **Guardar jornada**. La aplicación no permite guardar una configuración que deje actividades existentes por encima de la jornada prevista, convierta un día con CR en uno no elegible o invalide otra regla.

## Editar actividades y coberturas

1. Selecciona un día y añade una o más actividades con su duración.
2. Las actividades dentro de la jornada son `CO`, `F`, `E`, `M`, `O`, `X`, `LD`, `MT`, `LT`, `AR`, `NF` y `CD`.
3. Las horas de actividad se descuentan de la jornada prevista. El remanente se calcula como trabajo sin categoría.
4. `X` ocupa el día completo y no se combina con otras actividades. No se puede registrar en una fecha con jornada cero.
5. El código `C` se registra en **Cobertura extra**, fuera de la jornada: no resta horas del día y, sin remunerar, añade esas horas a la bolsa `CD`. Al marcar un bloque como remunerado, se registra como `CR`; `CR` solo se permite dentro del periodo de verano configurado. Pulsa **Guardar día** para aplicar los movimientos a la bolsa.
6. `CD` consume el saldo disponible y reduce el tiempo restante de trabajo del día. No se puede dejar la bolsa en negativo. El saldo solo se puede usar dentro del mismo año natural y caduca al acabar el año.
7. Elimina o ajusta cada actividad o bloque individualmente y pulsa **Guardar día**. Si la edición deja una jornada o saldo inválidos, se explica el motivo y no se guarda.

`LD` y `AR` son actividades normales y no consumen la bolsa. El resumen no calcula importes de nómina.

## Festivos y excepciones de jornada

En **Festivos** introduce fecha y descripción manualmente. También puedes importar un PDF desde el dispositivo:

- El PDF se procesa en el navegador; se limita a 20 MB y 50 páginas.
- La aplicación detecta fechas del año seleccionado en formatos numéricos, ISO o escritos en castellano, incluso cuando el documento no repite el año; muestra una vista previa editable.
- Confirma solo las fechas correctas. Se guardan las fechas y descripciones confirmadas, nunca el archivo PDF.
- El resultado o el error de lectura aparece junto al selector del PDF. Los documentos escaneados sin texto seleccionable no se pueden reconocer automáticamente; usa la entrada manual.

Los festivos aplican jornada cero. Si se trabaja un fin de semana o festivo, registra primero una **Excepción de jornada** con la fecha y las horas previstas. La excepción prevalece sobre el patrón semanal y permite luego añadir actividades al día.

## Informe mensual

El informe, abierto en otra pestaña, contiene jornada prevista, trabajo sin categoría, totales por actividad, horas extra de cobertura, movimientos y saldos de la bolsa, y detalle diario. Desde el botón de impresión del informe se puede imprimir o guardarlo como PDF.

## Guardado y recuperación

Los datos se guardan en el almacenamiento local del navegador. Se conservan al recargar la misma página en el mismo perfil del navegador, pero no se sincronizan ni constituyen una copia de seguridad. Borrar los datos del sitio o cambiar de navegador o dispositivo puede eliminarlos.

Si aparece un aviso de error de almacenamiento, el navegador no ha podido leer o conservar los cambios; no des por guardada la edición.

## Perfil y permisos

El dominio, rol e identificador del perfil son datos estáticos de demostración. En este piloto no se pueden editar y no limitan qué días puede cambiar la persona usuaria. La edición del perfil y los permisos por rol o dominio requieren una versión futura con autenticación y autorización en un backend.
