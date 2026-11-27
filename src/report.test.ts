import { describe, expect, it } from "vitest";
import { buildMonthlyReportHtml } from "./report";
import { createEmptySchedule } from "./schedule";

describe("informe mensual", () => {
  it("incluye movimientos horarios y escapa descripciones de festivos", () => {
    const data = createEmptySchedule(2026);
    data.holidays["2026-06-01"] = "<img src=x onerror=alert(1)>";
    data.days["2026-06-05"] = {
      activities: [],
      coverages: [{ id: "c1", minutes: 90, paid: false }],
    };

    const html = buildMonthlyReportHtml(data, 2026, 5);

    expect(html).toContain("Cobertura extra añadida a la bolsa");
    expect(html).toContain("C · Cobertura");
    expect(html).toContain("C · Cobertura a bolsa CD 1:30");
    expect(html).toContain("1:30");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
  });

  it("omite categorías sin horas y consolida actividades repetidas en el detalle", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-01"] = {
      activities: [
        { id: "f1", code: "F", minutes: 60 },
        { id: "f2", code: "F", minutes: 90 },
      ],
      coverages: [],
    };

    const html = buildMonthlyReportHtml(data, 2026, 5);

    expect(html).toContain("F · Formación</th><td>2:30");
    expect(html).not.toContain("CO · Curso online</th>");
    expect(html).not.toContain("CR · Cobertura remunerada");
    expect(html).not.toContain("CD consumido de la bolsa");
    expect(html.match(/F 2:30/g)).toHaveLength(1);
    expect(html).not.toContain("F 1:00");
  });
});
