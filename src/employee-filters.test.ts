import { describe, expect, it } from "vitest";
import { matchesEmployeeFilters } from "./employee-filters";

describe("filtros de la cuadrícula de empleados", () => {
  it("filtra en texto parcial sin distinguir mayúsculas ni tildes", () => {
    expect(
      matchesEmployeeFilters(
        {
          name: "Empleado anónimo 02",
          code: "DEMO-02",
          "2026-06-02": "X",
        },
        { name: "anonimo", code: "demo", "2026-06-02": "x" },
      ),
    ).toBe(true);
  });

  it("combina los filtros activos y no limita los vacíos", () => {
    const values = { name: "Usuario piloto", domain: "Dominio de ejemplo" };

    expect(
      matchesEmployeeFilters(values, { name: "usuario", domain: "operaciones" }),
    ).toBe(false);
    expect(matchesEmployeeFilters(values, { name: "piloto", domain: " " })).toBe(
      true,
    );
  });
});
