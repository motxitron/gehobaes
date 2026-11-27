# Hito 2: gestión de jornada por horas

**Estado:** especificación funcional definida; implementación pendiente.
**Alcance:** perfiles del piloto `user1`, jornadas anuales, distribución horaria, festivos, coberturas, bolsa, vacaciones e informe mensual. La autenticación y los permisos reales quedan para H3.

## 1. Configuración de jornada por empleado y año

Cada perfil dispone de una configuración para cada año:

- **L-J:** horas diarias de lunes a jueves fuera del periodo de verano.
- **V/Verano:** horas diarias de todos los viernes del año y de lunes a jueves dentro del periodo anual de verano. Si un viernes cae dentro del verano, se aplica una sola vez este valor.
- **Periodo de verano:** fecha de inicio y de fin, definidas por empleado y año. Ambos extremos se consideran parte del periodo.

Los valores se introducen con precisión de horas y minutos y se guardan como minutos enteros. Los sábados, domingos y festivos tienen jornada prevista de cero horas. Se pueden definir excepciones por fecha con las horas previstas para ese día.

Los festivos son fechas no laborables del calendario individual, distintas de las vacaciones `X`. Se asocian al empleado y a una fecha, con una descripción. Una excepción permite configurar horas previstas si se trabaja ese día.

## 2. Actividades y horas diarias

Cada actividad tiene un código, una descripción y un color identificable. En un mismo día se pueden registrar varias actividades y ajustar o borrar cada registro por separado.

| Código | Descripción |
| --- | --- |
| C | Cobertura |
| CO | Curso online |
| F | Formación |
| E | Enfermedad |
| M | Médico |
| O | Operación familiar |
| X | Vacaciones |
| LD | Horas de libre disposición |
| MT | Permiso de matrimonio |
| LT | Libre por convenio |
| AR | Ausencia remunerada |
| NF | No facturables |
| CD | Cobertura disfrutada |
| CR | Cobertura remunerada |

Para un día ordinario, la suma de las actividades que ocupan jornada no puede superar las horas previstas. El resto se calcula como **horas de trabajo sin categoría**:

`trabajo = jornada prevista - suma de actividades del día`

La formación, el médico y las demás actividades descuentan tiempo disponible; el remanente no se asigna a un código ficticio. `LD` y `AR` conservan su significado normal y no consumen la bolsa de cobertura.

`X` ocupa toda la jornada prevista y no se combina con otras actividades. En días con jornada cero no se puede cargar una jornada de vacaciones.

### Ejemplo de distribución diaria

Para una jornada prevista de 9 horas, 2 horas de formación y 1 hora y 30 minutos de médico dejan **5 horas y 30 minutos de trabajo sin categoría**. La aplicación debe impedir una distribución superior a 9 horas.

## 3. Coberturas y bolsa anual

Las horas extra de cobertura se registran aparte de la jornada prevista. Pueden hacer que las horas trabajadas en una fecha superen la jornada de ese día.

Al registrar cada bloque de horas extra de cobertura se indica si es remunerado:

- **Sin remunerar:** las horas se añaden al saldo de cobertura disponible para `CD`.
- **Remunerado (`CR`):** se informa como pago en el informe del mismo mes en que se hizo la cobertura; no se añade al saldo `CD`. Solo se permite si la cobertura ocurrió dentro del periodo anual de verano. Los viernes fuera de ese periodo no habilitan `CR`, aunque utilicen la jornada `V/Verano`.
- Fuera del periodo de verano, el control de remuneración no se puede activar y las horas extra se destinan al saldo `CD`.

`CD` se registra en la fecha en que se disfruta la compensación. Consume horas de la bolsa minuto por minuto y reduce las horas trabajadas de ese día. No se puede registrar más `CD` del saldo disponible ni dejarlo negativo. El saldo puede gastarse en otro mes, pero solo dentro del mismo año natural; lo que quede sin usar caduca al terminar el año.

`CR` identifica cobertura pagada, no una ausencia que reduzca la jornada del día en que se hizo la cobertura. La decisión de remunerar se toma al registrar las horas extra de cobertura.

### Ejemplo de bolsa

Con 7 horas previstas el viernes, registrar 3 horas extra de cobertura suma 10 horas trabajadas ese día. Si no se remuneran, se añaden 3 horas a la bolsa `CD`. Si el lunes siguiente tiene 9 horas previstas y se registran 3 horas `CD`, quedan 6 horas de trabajo ese lunes y la bolsa se reduce a cero. Si la cobertura se hizo dentro del periodo de verano y se marca como remunerada, las 3 horas se muestran como `CR` en el informe de ese mes y no entran en la bolsa `CD`.

## 4. Fines de semana y festivos

Sábados, domingos y festivos empiezan con cero horas previstas. Si se trabaja en una fecha de este tipo, se define primero la excepción de horas previstas para esa fecha; luego se aplican las mismas reglas de actividades y cobertura. Una excepción no cambia el patrón semanal del empleado.

Los festivos se pueden añadir manualmente o importar desde un PDF:

- En la entrada manual se indica la fecha y la descripción; el empleado queda determinado por el perfil activo.
- El PDF se selecciona desde el dispositivo y se procesa íntegramente en el navegador. Se muestra una vista previa de las fechas detectadas para que la persona las revise y confirme.
- El PDF original nunca se sube a GitHub, a un servidor ni al almacenamiento del navegador. Se descarta al terminar la lectura.
- Solo las fechas confirmadas se guardan con los datos del perfil en el almacenamiento local. Si el PDF no se puede interpretar, se usa la entrada manual.

## 5. Informe mensual

El botón de informe abre una ventana o pestaña separada para el empleado, año y mes seleccionados. Debe mostrar:

- Total de jornada prevista y total de trabajo sin categoría.
- Horas de cada código de actividad, incluido `CD` y `CR`.
- Horas extra de cobertura, separando las destinadas a `CD` de las remuneradas como `CR`.
- Saldo de cobertura al inicio y al final del mes, horas añadidas y horas consumidas.
- Detalle diario con jornada prevista, actividades y minutos, trabajo restante, cobertura extra y movimiento de bolsa.

El informe es un resumen horario; la aplicación no calcula importes de nómina. Las horas `CR` se reportan en el mes de la cobertura.

## 6. Edición, borrado y consistencia

- Cada actividad diaria se puede editar o borrar. Tras el cambio, se recalculan trabajo restante, informe y saldo.
- Borrar o reducir una cobertura que ya financia horas `CD` no puede dejar la bolsa negativa: se debe rechazar el cambio y explicar qué consumos hay que ajustar.
- No se permite guardar una actividad que exceda la jornada prevista, salvo las horas extra registradas explícitamente como cobertura.
- No se permite registrar `CD` sin saldo suficiente ni `CR` fuera del periodo anual de verano.
- Los datos del piloto permanecen en el navegador; no se incorpora todavía autenticación, base de datos compartida ni permisos por rol.

## 7. Criterios de aceptación

- El cálculo selecciona correctamente L-J o V/Verano según empleado, año, viernes y periodo de verano.
- Una actividad parcial deja el resto como trabajo sin categoría; la suma diaria no sobrepasa la jornada prevista.
- `X` ocupa la jornada completa y es incompatible con otras actividades ese día.
- La cobertura extra no remunerada aumenta la bolsa `CD`; `CD` la consume en otra fecha del mismo año y reduce las horas de trabajo de esa fecha.
- Una cobertura marcada `CR` solo se admite dentro del periodo de verano y aparece en el informe del mes de cobertura sin sumar a la bolsa `CD`.
- El saldo `CD` nunca es negativo y caduca al finalizar el año.
- Festivos manuales y los importados confirmados aplican jornada cero, salvo excepción explícita.
- Se puede editar y borrar cualquier actividad sin dejar cálculos o saldos incoherentes.
- El informe mensual abre en otra ventana/pestaña y presenta totales por categoría y detalle diario.
- El archivo PDF no sale del navegador ni se guarda; únicamente se conservan las fechas confirmadas.
