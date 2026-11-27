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
    expect(html).toContain("1:30");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
  });
});
