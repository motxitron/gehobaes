import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseHolidayCsv, parseHolidaySpreadsheet } from "./holiday-import";

describe("importación CSV de festivos", () => {
  it("admite coma o punto y coma, cabeceras y descripciones entrecomilladas", () => {
    expect(
      parseHolidayCsv(
        'Fecha,Código,Descripción\r\n01/01/2026,FN,"Año nuevo, nacional"\r\n',
        2026,
        ",",
      ),
    ).toEqual([
      {
        date: "2026-01-01",
        code: "FN",
        description: "Año nuevo, nacional",
      },
    ]);
    expect(
      parseHolidayCsv("02/01/2026;FL;Fiesta local\n", 2026, ";"),
    ).toEqual([
      {
        date: "2026-01-02",
        code: "FL",
        description: "Fiesta local",
      },
    ]);
  });

  it("rechaza fechas inválidas, años distintos y códigos desconocidos", () => {
    expect(() => parseHolidayCsv("31/02/2026,DI", 2026, ",")).toThrow("fila 1");
    expect(() => parseHolidayCsv("01/01/2025,DI", 2026, ",")).toThrow("fila 1");
    expect(() => parseHolidayCsv("01/01/2026,ZZ", 2026, ",")).toThrow("fila 1");
  });

  it.each(["xls", "xlsx"] as const)("lee hojas de cálculo .%s", async (bookType) => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Fecha", "Código", "Descripción"],
      ["01/01/2026", "FN", "Año nuevo"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Festivos");
    const contents = XLSX.write(workbook, { type: "array", bookType }) as ArrayBuffer;
    const file = new File([contents], `festivos.${bookType}`);

    await expect(parseHolidaySpreadsheet(file, 2026)).resolves.toEqual([
      {
        date: "2026-01-01",
        code: "FN",
        description: "Año nuevo",
      },
    ]);
  });
});
