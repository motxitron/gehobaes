import { describe, expect, it } from "vitest";
import {
  createEmptySchedule,
  getBankBalance,
  getMonthSummary,
  getScheduledMinutes,
  normalizeScheduleData,
  type ScheduleDataInput,
  validateAllDays,
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

  it("deja en cero fines de semana y festivos, que prevalecen sobre excepciones", () => {
    const data = createEmptySchedule(2026);
    data.holidays["2026-06-01"] = "Festivo";
    expect(getScheduledMinutes("2026-06-01", data)).toBe(0);
    expect(getScheduledMinutes("2026-06-06", data)).toBe(0);
    data.exceptions["2026-06-01"] = 180;
    expect(getScheduledMinutes("2026-06-01", data)).toBe(0);
    data.holidays["2026-06-02"] = "Día especial";
    data.exceptions["2026-06-02"] = 180;
    expect(getScheduledMinutes("2026-06-02", data)).toBe(0);
    expect(getScheduledMinutes("2026-06-03", { ...data, holidays: {} })).toBe(540);
  });

  it("rechaza actividades y coberturas en un día festivo", () => {
    const data = createEmptySchedule(2026);
    data.holidays["2026-06-01"] = "Festivo";
    const record = {
      activities: [{ id: "f", code: "F" as const, minutes: 60 }],
      coverages: [{ id: "c", minutes: 60, paid: false }],
    };

    expect(validateDayRecord("2026-06-01", record, data)).toContain(
      "no admite actividades ni coberturas",
    );
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

  it("mueve coberturas C antiguas fuera de la jornada y las añade a la bolsa", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-01"] = {
      activities: [
        { id: "c", code: "C", minutes: 90 },
        { id: "f", code: "F", minutes: 120 },
      ],
      coverages: [],
    };

    const normalized = normalizeScheduleData(data);
    const record = normalized.days["2026-06-01"];
    const summary = getMonthSummary(normalized, 2026, 5);

    expect(record.activities.map((activity) => activity.code)).toEqual(["F"]);
    expect(record.coverages).toEqual([{ id: "c", minutes: 90, paid: false }]);
    expect(summary.days[0].workWithoutCategoryMinutes).toBe(420);
    expect(summary.activityMinutes.C).toBe(90);
    expect(getScheduledMinutes("2026-06-01", normalized)).toBe(540);
    expect(validateDayRecord("2026-06-01", record, normalized)).toBeNull();
    expect(getBankBalance(normalized, 2026)).toBe(90);
  });

  it("agrupa actividades repetidas y migra festivos y vacaciones existentes", () => {
    const data = createEmptySchedule(2026);
    data.days["2026-06-01"] = {
      activities: [
        { id: "f1", code: "F", minutes: 60 },
        { id: "f2", code: "F", minutes: 90 },
      ],
      coverages: [],
    };
    data.days["2026-06-02"] = {
      activities: [{ id: "x", code: "X", minutes: 540 }],
      coverages: [],
    };
    data.holidays["2026-06-03"] = "Fiesta local";
    const legacy: ScheduleDataInput = {
      ...data,
      yearly: {
        "2026": {
          mondayToThursdayMinutes: 540,
          fridaySummerMinutes: 420,
          summerStart: "",
          summerEnd: "",
        },
      },
    };

    const normalized = normalizeScheduleData(legacy);
    expect(normalized.days["2026-06-01"].activities).toHaveLength(1);
    expect(normalized.days["2026-06-01"].activities[0].minutes).toBe(150);
    expect(normalized.holidayCodes["2026-06-03"]).toBe("DI");
    expect(normalized.yearly["2026"].vacationQuotaDays).toBe(1);
  });

  it("limita las vacaciones al cupo anual configurado", () => {
    const data = createEmptySchedule(2026);
    data.yearly["2026"].vacationQuotaDays = 1;
    data.days["2026-06-01"] = {
      activities: [{ id: "x1", code: "X", minutes: 540 }],
      coverages: [],
    };
    data.days["2026-06-02"] = {
      activities: [{ id: "x2", code: "X", minutes: 540 }],
      coverages: [],
    };

    expect(validateAllDays(data, 2026)).toContain("cupo anual");
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
      vacationQuotaDays: 0,
    };
    expect(validateYearSettings(2026, invalid)).toContain("periodo de verano");
  });
});
