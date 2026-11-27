import { describe, expect, it } from "vitest";
import {
  createEmptySchedule,
  getBankBalance,
  getMonthSummary,
  getScheduledMinutes,
  validateBankBalance,
  validateDayRecord,
  validateYearSettings,
} from "./schedule";

describe("reglas de jornada", () => {
  it("aplica L-J, viernes y los extremos inclusivos del verano", () => {
    const data = createEmptySchedule(2026);
    data.yearly["2026"].summerStart = "2026-07-06";
    data.yearly["2026"].summerEnd = "2026-08-31";

    expect(getScheduledMinutes("2026-07-06", data)).toBe(420);
    expect(getScheduledMinutes("2026-08-31", data)).toBe(420);
    expect(getScheduledMinutes("2026-09-03", data)).toBe(540);
    expect(getScheduledMinutes("2026-09-04", data)).toBe(420);
  });

  it("deja en cero fines de semana y festivos salvo excepción explícita", () => {
    const data = createEmptySchedule(2026);
    data.holidays["2026-06-01"] = "Festivo";
    expect(getScheduledMinutes("2026-06-01", data)).toBe(0);
    expect(getScheduledMinutes("2026-06-06", data)).toBe(0);
    data.exceptions["2026-06-01"] = 180;
    expect(getScheduledMinutes("2026-06-01", data)).toBe(180);
  });

  it("exige que X ocupe toda la jornada sin combinarse", () => {
    const data = createEmptySchedule(2026);
    const vacation = {
      activities: [{ id: "x", code: "X" as const, minutes: 540 }],
      coverages: [],
    };
    expect(validateDayRecord("2026-06-01", vacation, data)).toBeNull();
    expect(
      validateDayRecord(
        "2026-06-01",
        {
          ...vacation,
          activities: [
            ...vacation.activities,
            { id: "f", code: "F" as const, minutes: 60 },
          ],
        },
        data,
      ),
    ).toContain("ocupan toda la jornada");
  });

  it("impide exceder la jornada y remunerar fuera del verano", () => {
    const data = createEmptySchedule(2026);
    const overbooked = {
      activities: [{ id: "f", code: "F" as const, minutes: 541 }],
      coverages: [],
    };
    expect(validateDayRecord("2026-06-01", overbooked, data)).toContain(
      "por encima",
    );
    const paidCoverage = {
      activities: [],
      coverages: [{ id: "cr", minutes: 60, paid: true }],
    };
    expect(validateDayRecord("2026-06-01", paidCoverage, data)).toContain(
      "periodo de verano",
    );
    data.yearly["2026"].summerStart = "2026-06-01";
    data.yearly["2026"].summerEnd = "2026-08-31";
    expect(validateDayRecord("2026-06-01", paidCoverage, data)).toBeNull();
  });

  it("calcula el tiempo restante tras distribuir varias actividades", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-01"] = {
      activities: [
        { id: "f", code: "F", minutes: 120 },
        { id: "m", code: "M", minutes: 90 },
      ],
      coverages: [],
    };

    expect(getMonthSummary(data, 2026, 5).days[0].workWithoutCategoryMinutes).toBe(
      330,
    );
  });
});

describe("bolsa anual de cobertura", () => {
  it("permite disfrutar horas ya acreditadas y calcula saldo mensual", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-05"] = {
      activities: [],
      coverages: [{ id: "extra", minutes: 180, paid: false }],
    };
    data.days["2026-06-08"] = {
      activities: [{ id: "cd", code: "CD", minutes: 180 }],
      coverages: [],
    };

    expect(validateBankBalance(data, 2026)).toBeNull();
    expect(getBankBalance(data, 2026)).toBe(0);
    const summary = getMonthSummary(data, 2026, 5);
    expect(summary.bankEarnedMinutes).toBe(180);
    expect(summary.bankSpentMinutes).toBe(180);
    expect(summary.bankEndMinutes).toBe(0);
  });

  it("rechaza borrar crédito que ya financia consumos y separa años", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-05"] = {
      activities: [],
      coverages: [{ id: "extra", minutes: 120, paid: false }],
    };
    data.days["2026-06-08"] = {
      activities: [{ id: "cd", code: "CD", minutes: 121 }],
      coverages: [],
    };

    expect(validateBankBalance(data, 2026)).toContain("saldo negativo");
    expect(getBankBalance(data, 2026)).toBe(-1);
    expect(getBankBalance(data, 2027)).toBe(0);
  });

  it("valida la configuración anual antes de guardarla", () => {
    const invalid = {
      mondayToThursdayMinutes: 540,
      fridaySummerMinutes: 420,
      summerStart: "2026-08-31",
      summerEnd: "2026-07-01",
    };
    expect(validateYearSettings(2026, invalid)).toContain("periodo de verano");
  });
});
