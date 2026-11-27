import { describe, expect, it } from "vitest";
import { extractDatesFromText } from "./pdf-holidays";

describe("detección local de festivos", () => {
  it("reconoce fechas numéricas y escritas del año seleccionado", () => {
    expect(
      extractDatesFromText(
        "01 / 01 / 2026; 6-1-2026; 15 de agosto de 2026; 01/01/2025",
        2026,
      ),
    ).toEqual(["2026-01-01", "2026-01-06", "2026-08-15"]);
  });

  it("descarta fechas imposibles y repetidas", () => {
    expect(
      extractDatesFromText("31/02/2026, 01/01/2026 y 01/01/2026", 2026),
    ).toEqual(["2026-01-01"]);
  });
});
