export const ACTIVITY_DEFINITIONS = {
  C: { label: "Cobertura", color: "coverage" },
  CO: { label: "Curso online", color: "course" },
  F: { label: "Formación", color: "training" },
  E: { label: "Enfermedad", color: "illness" },
  M: { label: "Médico", color: "medical" },
  O: { label: "Operación familiar", color: "family" },
  X: { label: "Vacaciones", color: "vacation" },
  LD: { label: "Libre disposición", color: "leave-disposition" },
  MT: { label: "Permiso matrimonio", color: "marriage" },
  LT: { label: "Libre por convenio", color: "agreement" },
  AR: { label: "Ausencia remunerada", color: "paid-absence" },
  NF: { label: "No facturables", color: "nonbillable" },
  CD: { label: "Cobertura disfrutada", color: "coverage-enjoyed" },
} as const;

export type ActivityCode = keyof typeof ACTIVITY_DEFINITIONS;
export type ReportCode = ActivityCode | "CR";
export type DateKey = string;

export interface DayActivity {
  id: string;
  code: ActivityCode;
  minutes: number;
}

export interface ExtraCoverage {
  id: string;
  minutes: number;
  paid: boolean;
}

export interface DayRecord {
  activities: DayActivity[];
  coverages: ExtraCoverage[];
}

export interface YearSettings {
  mondayToThursdayMinutes: number;
  fridaySummerMinutes: number;
  summerStart: DateKey;
  summerEnd: DateKey;
}

export interface ScheduleData {
  yearly: Record<string, YearSettings>;
  holidays: Record<DateKey, string>;
  exceptions: Record<DateKey, number>;
  days: Record<DateKey, DayRecord>;
}

export interface MonthDaySummary {
  date: DateKey;
  scheduledMinutes: number;
  activities: DayActivity[];
  extraCoverages: ExtraCoverage[];
  workWithoutCategoryMinutes: number;
  earnedMinutes: number;
  spentMinutes: number;
}

export interface MonthSummary {
  days: MonthDaySummary[];
  scheduledMinutes: number;
  workWithoutCategoryMinutes: number;
  activityMinutes: Record<ReportCode, number>;
  unpaidCoverageMinutes: number;
  paidCoverageMinutes: number;
  bankStartMinutes: number;
  bankEarnedMinutes: number;
  bankSpentMinutes: number;
  bankEndMinutes: number;
}

export const DEFAULT_YEAR_SETTINGS: YearSettings = {
  mondayToThursdayMinutes: 9 * 60,
  fridaySummerMinutes: 7 * 60,
  summerStart: "",
  summerEnd: "",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const hasOwn = (record: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

export function createEmptySchedule(year: number): ScheduleData {
  return {
    yearly: { [year]: { ...DEFAULT_YEAR_SETTINGS } },
    holidays: {},
    exceptions: {},
    days: {},
  };
}

export function isDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function getDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseTimeInput(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${String(remainder).padStart(2, "0")}`;
}

export function minutesToTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

export function isSummerDate(date: DateKey, settings: YearSettings): boolean {
  return (
    isDateKey(date) &&
    isDateKey(settings.summerStart) &&
    isDateKey(settings.summerEnd) &&
    settings.summerStart <= settings.summerEnd &&
    date >= settings.summerStart &&
    date <= settings.summerEnd
  );
}

export function getYearSettings(
  data: ScheduleData,
  year: number,
): YearSettings {
  return data.yearly[String(year)] ?? DEFAULT_YEAR_SETTINGS;
}

export function getScheduledMinutes(
  date: DateKey,
  data: ScheduleData,
): number {
  if (hasOwn(data.exceptions, date)) return data.exceptions[date];
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || weekday === 6 || hasOwn(data.holidays, date)) {
    return 0;
  }
  const settings = getYearSettings(data, year);
  if (weekday === 5 || isSummerDate(date, settings)) {
    return settings.fridaySummerMinutes;
  }
  return settings.mondayToThursdayMinutes;
}

export function getBankBalance(
  data: ScheduleData,
  year: number,
  beforeDate?: DateKey,
): number {
  let balance = 0;
  const prefix = `${year}-`;
  for (const date of Object.keys(data.days).filter((key) => key.startsWith(prefix)).sort()) {
    if (beforeDate && date >= beforeDate) break;
    const record = data.days[date];
    balance += record.coverages
      .filter((coverage) => !coverage.paid)
      .reduce((total, coverage) => total + coverage.minutes, 0);
    balance -= record.activities
      .filter((activity) => activity.code === "CD")
      .reduce((total, activity) => total + activity.minutes, 0);
  }
  return balance;
}

export function validateBankBalance(data: ScheduleData, year: number): string | null {
  let balance = 0;
  const prefix = `${year}-`;
  const dates = Object.keys(data.days)
    .filter((key) => key.startsWith(prefix))
    .sort();
  for (const date of dates) {
    const record = data.days[date];
    balance += record.coverages
      .filter((coverage) => !coverage.paid)
      .reduce((total, coverage) => total + coverage.minutes, 0);
    balance -= record.activities
      .filter((activity) => activity.code === "CD")
      .reduce((total, activity) => total + activity.minutes, 0);
    if (balance < 0) {
      return `La bolsa de cobertura queda con saldo negativo el ${date}. Ajusta los consumos CD antes de guardar.`;
    }
  }
  return null;
}

export function validateDayRecord(
  date: DateKey,
  record: DayRecord,
  data: ScheduleData,
): string | null {
  if (!isDateKey(date)) return "La fecha indicada no es válida.";
  if (
    record.activities.some(
      (activity) =>
        !hasOwn(ACTIVITY_DEFINITIONS, activity.code) ||
        !Number.isInteger(activity.minutes) ||
        activity.minutes <= 0,
    )
  ) {
    return "Cada actividad debe tener un código válido y una duración positiva en minutos.";
  }
  if (
    record.coverages.some(
      (coverage) =>
        !Number.isInteger(coverage.minutes) ||
        coverage.minutes <= 0 ||
        typeof coverage.paid !== "boolean",
    )
  ) {
    return "Cada cobertura extra debe tener una duración positiva en minutos.";
  }
  if (
    record.coverages.some(
      (coverage) => coverage.paid && !isSummerDate(date, getYearSettings(data, Number(date.slice(0, 4)))),
    )
  ) {
    return "La cobertura remunerada (CR) solo se permite dentro del periodo de verano configurado.";
  }

  const vacationActivities = record.activities.filter(
    (activity) => activity.code === "X",
  );
  const scheduledMinutes = getScheduledMinutes(date, data);
  const activityMinutes = record.activities.reduce(
    (total, activity) => total + activity.minutes,
    0,
  );
  if (vacationActivities.length > 0) {
    if (
      vacationActivities.length !== 1 ||
      record.activities.length !== 1 ||
      vacationActivities[0].minutes !== scheduledMinutes
    ) {
      return "Las vacaciones X ocupan toda la jornada y no se combinan con otras actividades.";
    }
  }
  if (activityMinutes > scheduledMinutes) {
    return `Las actividades suman ${formatMinutes(activityMinutes)}, por encima de la jornada prevista de ${formatMinutes(scheduledMinutes)}.`;
  }
  return null;
}

export function validateYearSettings(
  year: number,
  settings: YearSettings,
): string | null {
  for (const [label, minutes] of [
    ["L-J", settings.mondayToThursdayMinutes],
    ["V/Verano", settings.fridaySummerMinutes],
  ] as const) {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) {
      return `La jornada ${label} debe estar entre 00:00 y 24:00.`;
    }
  }
  if (Boolean(settings.summerStart) !== Boolean(settings.summerEnd)) {
    return "Indica las dos fechas del periodo de verano.";
  }
  if (settings.summerStart || settings.summerEnd) {
    if (
      !isDateKey(settings.summerStart) ||
      !isDateKey(settings.summerEnd) ||
      Number(settings.summerStart.slice(0, 4)) !== year ||
      Number(settings.summerEnd.slice(0, 4)) !== year ||
      settings.summerStart > settings.summerEnd
    ) {
      return "El periodo de verano debe tener fechas válidas y estar dentro del año seleccionado.";
    }
  }
  return null;
}

export function validateAllDays(data: ScheduleData, year: number): string | null {
  const prefix = `${year}-`;
  for (const [date, record] of Object.entries(data.days)) {
    if (!date.startsWith(prefix)) continue;
    const error = validateDayRecord(date, record, data);
    if (error) return error;
  }
  return validateBankBalance(data, year);
}

export function getMonthSummary(
  data: ScheduleData,
  year: number,
  month: number,
): MonthSummary {
  const activityMinutes = Object.fromEntries(
    [...Object.keys(ACTIVITY_DEFINITIONS), "CR"].map((code) => [code, 0]),
  ) as Record<ReportCode, number>;
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const startDate = getDateKey(year, month, 1);
  const bankStartMinutes = getBankBalance(data, year, startDate);
  let bankBalance = bankStartMinutes;
  let scheduledMinutes = 0;
  let workWithoutCategoryMinutes = 0;
  let unpaidCoverageMinutes = 0;
  let paidCoverageMinutes = 0;
  let bankSpentMinutes = 0;
  const days: MonthDaySummary[] = [];

  for (let day = 1; day <= numberOfDays; day += 1) {
    const date = getDateKey(year, month, day);
    const record = data.days[date] ?? { activities: [], coverages: [] };
    const planned = getScheduledMinutes(date, data);
    const categorized = record.activities.reduce(
      (total, activity) => total + activity.minutes,
      0,
    );
    const earned = record.coverages
      .filter((coverage) => !coverage.paid)
      .reduce((total, coverage) => total + coverage.minutes, 0);
    const spent = record.activities
      .filter((activity) => activity.code === "CD")
      .reduce((total, activity) => total + activity.minutes, 0);
    const paid = record.coverages
      .filter((coverage) => coverage.paid)
      .reduce((total, coverage) => total + coverage.minutes, 0);

    scheduledMinutes += planned;
    workWithoutCategoryMinutes += Math.max(0, planned - categorized);
    unpaidCoverageMinutes += earned;
    paidCoverageMinutes += paid;
    bankSpentMinutes += spent;
    bankBalance += earned - spent;
    for (const activity of record.activities) {
      activityMinutes[activity.code] += activity.minutes;
    }
    activityMinutes.CR += paid;

    days.push({
      date,
      scheduledMinutes: planned,
      activities: record.activities,
      extraCoverages: record.coverages,
      workWithoutCategoryMinutes: Math.max(0, planned - categorized),
      earnedMinutes: earned,
      spentMinutes: spent,
    });
  }

  return {
    days,
    scheduledMinutes,
    workWithoutCategoryMinutes,
    activityMinutes,
    unpaidCoverageMinutes,
    paidCoverageMinutes,
    bankStartMinutes,
    bankEarnedMinutes: unpaidCoverageMinutes,
    bankSpentMinutes,
    bankEndMinutes: bankBalance,
  };
}
