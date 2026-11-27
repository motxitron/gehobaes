import { describe, expect, it } from "vitest";
import {
  matchesEmployeeFilters,
  type EmployeeFilterKey,
} from "./employee-filters";

describe("filtros de la cuadrícula de empleados", () => {
  it("filtra los campos de perfil en texto parcial, sin mayúsculas ni tildes", () => {
    expect(
      matchesEmployeeFilters(
        {
          name: "Empleado anónimo 02",
          code: "DEMO-02",
          role: "Rol de demostración",
          domain: "Área ficticia A",
          hspDomain: "Dominio HSP de ejemplo",
        },
        {
          name: "anonimo",
          code: "demo",
          role: "DEMOSTRACION",
          domain: "area",
          hspDomain: "ejemplo",
        },
      ),
    ).toBe(true);
  });

  it("combina los filtros activos y no limita los vacíos", () => {
    const values = {
      name: "Usuario piloto",
      code: "user1",
      role: "Perfil piloto",
      domain: "Dominio de ejemplo",
      hspDomain: "—",
    };
    const filters: Partial<Record<EmployeeFilterKey, string>> = {
      name: "usuario",
      domain: "operaciones",
    };

    expect(matchesEmployeeFilters(values, filters)).toBe(false);
    expect(
      matchesEmployeeFilters(values, { name: "piloto", hspDomain: " " }),
    ).toBe(true);
  });
});
