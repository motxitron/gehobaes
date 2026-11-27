import { describe, expect, it } from "vitest";
import {
  extractDatesFromText,
  extractSummerPeriodFromText,
} from "./pdf-holidays";

describe("detección local de festivos", () => {
  it("reconoce fechas numéricas, ISO y escritas con o sin año", () => {
    expect(
      extractDatesFromText(
        "0 1 / 0 1 / 2 0 2 6; 6-1; 2026-02-02; 15 de agosto de 2026; 1 ene; 2 enero 2026; 01/01/2025",
        2026,
      ),
    ).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-06",
      "2026-02-02",
      "2026-08-15",
    ]);
  });

  it("descarta fechas imposibles y repetidas", () => {
    expect(
      extractDatesFromText("31/02/2026, 01/01/2026 y 01/01/2026", 2026),
    ).toEqual(["2026-01-01"]);
  });

  it("detecta el periodo intensivo si el texto incluye sus dos fechas", () => {
    expect(
      extractSummerPeriodFromText(
        "Periodo de jornada intensiva: del 01/06/2026 al 30/09/2026",
        2026,
      ),
    ).toEqual({ start: "2026-06-01", end: "2026-09-30" });
    expect(
      extractSummerPeriodFromText("Jornada intensiva durante el verano", 2026),
    ).toBeNull();
  });
});
