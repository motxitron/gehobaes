import {
  ACTIVITY_DEFINITIONS,
  formatMinutes,
  getMonthSummary,
  type ScheduleData,
} from "./schedule";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMonthlyReportHtml(
  data: ScheduleData,
  year: number,
  month: number,
): string {
  const summary = getMonthSummary(data, year, month);
  const categoryRows = Object.entries(ACTIVITY_DEFINITIONS)
    .map(([code, definition]) => {
      const minutes = summary.activityMinutes[code as keyof typeof ACTIVITY_DEFINITIONS];
      return `<tr><th>${code} · ${escapeHtml(definition.label)}</th><td>${formatMinutes(minutes)}</td></tr>`;
    })
    .join("");
  const details = summary.days
    .map((day) => {
      const activities = day.activities
        .map(
          (activity) =>
            `${activity.code} ${formatMinutes(activity.minutes)}`,
        )
        .join(", ");
      const coverage = day.extraCoverages
        .map(
          (entry) =>
            `${entry.paid ? "CR remunerada" : "C · Cobertura a bolsa CD"} ${formatMinutes(entry.minutes)}`,
        )
        .join(", ");
      const note = data.holidays[day.date]
        ? `Festivo: ${escapeHtml(data.holidays[day.date])} · jornada ${formatMinutes(day.scheduledMinutes)}`
        : formatMinutes(day.scheduledMinutes);
      return `<tr>
        <td>${new Date(`${day.date}T12:00:00`).toLocaleDateString("es-ES")}</td>
        <td>${note}</td>
        <td>${escapeHtml(activities || "—")}</td>
        <td>${formatMinutes(day.workWithoutCategoryMinutes)}</td>
        <td>${escapeHtml(coverage || "—")}</td>
        <td>${day.spentMinutes ? `CD −${formatMinutes(day.spentMinutes)}` : "—"}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de horarios · ${MONTHS[month]} ${year}</title>
<style>
  :root{font-family:Segoe UI,system-ui,sans-serif;color:#17233b;background:#f5f7fb}
  body{max-width:1100px;margin:32px auto;padding:0 20px}
  header,.panel{background:#fff;border:1px solid #e4e9f1;border-radius:10px;padding:22px;margin-bottom:16px}
  h1{margin:0 0 6px;font-size:26px} h2{margin:0 0 14px;font-size:17px}
  p{margin:0;color:#6b7890;font-size:13px}
  .totals{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}
  .total{padding:12px;background:#f5f7fb;border-radius:7px}.total span,.total strong{display:block}
  .total span{font-size:11px;color:#77839a}.total strong{margin-top:5px;font-size:17px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:9px 8px;border-bottom:1px solid #e8edf4;text-align:left;vertical-align:top}
  td:last-child,th:last-child{text-align:right}
  .toolbar{display:flex;justify-content:flex-end;margin-bottom:12px}
  button{border:0;border-radius:6px;padding:9px 14px;background:#4667e8;color:white;font:inherit;cursor:pointer}
  @media(max-width:700px){body{margin:15px auto;padding:0 10px}.totals{grid-template-columns:repeat(2,1fr)}.panel{overflow:auto;padding:14px}table{min-width:620px}}
  @media print{body{max-width:none;margin:0;padding:0;background:#fff}.toolbar{display:none}.panel,header{break-inside:avoid;border-color:#ccc}}
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<header>
  <h1>Informe mensual de horarios</h1>
  <p>Usuario piloto user1 · ${MONTHS[month]} ${year} · Resumen horario, no válido para calcular nómina.</p>
  <div class="totals">
    <div class="total"><span>Jornada prevista</span><strong>${formatMinutes(summary.scheduledMinutes)}</strong></div>
    <div class="total"><span>Trabajo sin categoría</span><strong>${formatMinutes(summary.workWithoutCategoryMinutes)}</strong></div>
    <div class="total"><span>Bolsa inicial</span><strong>${formatMinutes(summary.bankStartMinutes)}</strong></div>
    <div class="total"><span>Bolsa final</span><strong>${formatMinutes(summary.bankEndMinutes)}</strong></div>
  </div>
</header>
<section class="panel">
  <h2>Totales por actividad</h2>
  <table><tbody>
    ${categoryRows}
    <tr><th>CR · Cobertura remunerada</th><td>${formatMinutes(summary.paidCoverageMinutes)}</td></tr>
    <tr><th>Cobertura extra añadida a la bolsa</th><td>${formatMinutes(summary.bankEarnedMinutes)}</td></tr>
    <tr><th>CD consumido de la bolsa</th><td>${formatMinutes(summary.bankSpentMinutes)}</td></tr>
  </tbody></table>
</section>
<section class="panel">
  <h2>Detalle diario</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Jornada prevista / festivo</th><th>Actividades</th><th>Trabajo sin categoría</th><th>Cobertura extra</th><th>Movimiento de bolsa</th></tr></thead>
    <tbody>${details}</tbody>
  </table>
</section>
</body>
</html>`;
}
