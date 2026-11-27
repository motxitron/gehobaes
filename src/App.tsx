import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_DEFINITIONS,
  HOLIDAY_DEFINITIONS,
  createEmptySchedule,
  formatMinutes,
  getBankBalance,
  getDateKey,
  getMonthSummary,
  getScheduledMinutes,
  getVacationDaysUsed,
  getYearSettings,
  isDateKey,
  isSummerDate,
  mergeActivitiesByCode,
  minutesToTimeInput,
  normalizeScheduleData,
  parseTimeInput,
  validateAllDays,
  validateYearSettings,
  type ActivityCode,
  type DayActivity,
  type DayRecord,
  type ExtraCoverage,
  type HolidayCode,
  type ScheduleData,
  type YearSettings,
} from "./schedule";
import { extractHolidayDocument } from "./pdf-holidays";
import type { HolidayImportEntry } from "./holiday-import";
import { buildMonthlyReportHtml } from "./report";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const STORAGE_KEY = "motxitron-schedule-v2";

interface DemoEmployee {
  name: string;
  code: string;
  mondayToThursdayMinutes: number;
  fridaySummerMinutes: number;
  domain: string;
  role: string;
  hspDomain: string;
  pilot?: boolean;
}

const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    name: "Usuario piloto",
    code: "user1",
    mondayToThursdayMinutes: 540,
    fridaySummerMinutes: 420,
    domain: "Dominio de ejemplo",
    role: "Perfil piloto",
    hspDomain: "—",
    pilot: true,
  },
  ...Array.from({ length: 17 }, (_, index) => ({
    name: `Empleado anónimo ${String(index + 2).padStart(2, "0")}`,
    code: `DEMO-${String(index + 2).padStart(2, "0")}`,
    mondayToThursdayMinutes: [540, 510, 480, 495][index % 4],
    fridaySummerMinutes: [420, 390, 420, 360][index % 4],
    domain: `Área ficticia ${String.fromCharCode(65 + (index % 4))}`,
    role: "Rol de demostración",
    hspDomain: "—",
  })),
];

interface StoredSchedule {
  data: ScheduleData;
  error: boolean;
}

interface HolidayPreview {
  date: string;
  code: HolidayCode;
  description: string;
  selected: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActivityCode(value: unknown): value is ActivityCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ACTIVITY_DEFINITIONS, value)
  );
}

function isHolidayCode(value: unknown): value is HolidayCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(HOLIDAY_DEFINITIONS, value)
  );
}

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isRecord(value)) return false;
  const { yearly, holidays, holidayCodes, exceptions, days } = value;
  if (
    !isRecord(yearly) ||
    !isRecord(holidays) ||
    (holidayCodes !== undefined && !isRecord(holidayCodes)) ||
    !isRecord(exceptions) ||
    !isRecord(days)
  ) {
    return false;
  }
  if (
    !Object.entries(yearly).every(
      ([year, settings]) =>
        /^\d{4}$/.test(year) &&
        isRecord(settings) &&
        Number.isInteger(settings.mondayToThursdayMinutes) &&
        Number.isInteger(settings.fridaySummerMinutes) &&
        (settings.vacationQuotaDays === undefined ||
          Number.isInteger(settings.vacationQuotaDays)) &&
        typeof settings.summerStart === "string" &&
        typeof settings.summerEnd === "string",
    )
  ) {
    return false;
  }
  if (
    (holidayCodes !== undefined &&
      !Object.entries(holidayCodes).every(
        ([date, code]) => isDateKey(date) && isHolidayCode(code),
      )) ||
    !Object.entries(holidays).every(
      ([date, description]) => isDateKey(date) && typeof description === "string",
    ) ||
    !Object.entries(exceptions).every(
      ([date, minutes]) => isDateKey(date) && Number.isInteger(minutes),
    )
  ) {
    return false;
  }
  return Object.entries(days).every(
    ([date, record]) =>
      isDateKey(date) &&
      isRecord(record) &&
      Array.isArray(record.activities) &&
      record.activities.every(
        (activity) =>
          isRecord(activity) &&
          typeof activity.id === "string" &&
          isActivityCode(activity.code) &&
          Number.isInteger(activity.minutes),
      ) &&
      Array.isArray(record.coverages) &&
      record.coverages.every(
        (coverage) =>
          isRecord(coverage) &&
          typeof coverage.id === "string" &&
          Number.isInteger(coverage.minutes) &&
          typeof coverage.paid === "boolean",
      ),
  );
}

function loadSchedule(year: number): StoredSchedule {
  const fallback = createEmptySchedule(year);
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { data: fallback, error: false };
    const parsed: unknown = JSON.parse(saved);
    if (!isScheduleData(parsed)) return { data: fallback, error: true };
    const normalized = normalizeScheduleData(parsed);
    if (!normalized.yearly[String(year)]) {
      return {
        data: {
          ...normalized,
          yearly: {
            ...normalized.yearly,
            [year]: { ...getYearSettings(normalized, year) },
          },
        },
        error: false,
      };
    }
    return { data: normalized, error: false };
  } catch {
    return { data: fallback, error: true };
  }
}

function newId(): string {
  return crypto.randomUUID();
}

function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getEmployeeDayCodes(
  employee: DemoEmployee,
  employeeIndex: number,
  date: string,
  data: ScheduleData,
): string[] {
  if (employee.pilot) {
    if (data.holidays[date]) return [data.holidayCodes[date] ?? "DI"];
    const record = data.days[date];
    return record
      ? [
          ...record.activities.map((activity) => activity.code),
          ...record.coverages.map((coverage) => (coverage.paid ? "CR" : "C")),
        ]
      : [];
  }
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || weekday === 6) return [];
  const pattern = (day + employeeIndex * 3) % 23;
  if (pattern === 1) return ["X"];
  if (pattern === 4) return ["F"];
  if (pattern === 9) return ["LD"];
  if (pattern === 15) return ["C"];
  return [];
}

function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [stored, setStored] = useState(() => loadSchedule(today.getFullYear()));
  const { data } = stored;
  const [storageError, setStorageError] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draftActivities, setDraftActivities] = useState<DayActivity[]>([]);
  const [draftCoverages, setDraftCoverages] = useState<ExtraCoverage[]>([]);
  const [draftHoliday, setDraftHoliday] = useState(false);
  const [draftHolidayCode, setDraftHolidayCode] = useState<HolidayCode>("DI");
  const [newActivityCode, setNewActivityCode] =
    useState<Exclude<ActivityCode, "C">>("F");
  const [newActivityTime, setNewActivityTime] = useState("01:00");
  const [newCoverageTime, setNewCoverageTime] = useState("01:00");
  const [newCoveragePaid, setNewCoveragePaid] = useState(false);
  const [formError, setFormError] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<YearSettings>(() =>
    getYearSettings(data, today.getFullYear()),
  );
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayCode, setHolidayCode] = useState<HolidayCode>("DI");
  const [csvDelimiter, setCsvDelimiter] = useState<"," | ";">(",");
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionTime, setExceptionTime] = useState("00:00");
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [holidayPreview, setHolidayPreview] = useState<HolidayPreview[]>([]);
  const [pdfSummerPeriod, setPdfSummerPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const todayDate = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const yearSettings = getYearSettings(data, year);
  const editorSchedule = useMemo(() => {
    if (!editingDate) return data;
    const holidays = { ...data.holidays };
    if (draftHoliday) {
      holidays[editingDate] = data.holidays[editingDate] ?? "";
    } else {
      delete holidays[editingDate];
    }
    return { ...data, holidays };
  }, [data, draftHoliday, editingDate]);
  const editorScheduledMinutes = editingDate
    ? getScheduledMinutes(editingDate, editorSchedule)
    : 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);

  useEffect(() => {
    setSettingsDraft({ ...getYearSettings(data, year) });
  }, [data.yearly, year]);

  useEffect(() => {
    if (focusDate) document.getElementById(`day-${focusDate}`)?.focus();
  }, [focusDate, focusRequest]);

  useEffect(() => {
    if (
      !editingDate &&
      !holidayPreview.length &&
      !pdfSummerPeriod &&
      !configurationOpen &&
      !employeesOpen
    ) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingDate(null);
        setHolidayPreview([]);
        setPdfSummerPeriod(null);
        setConfigurationOpen(false);
        setEmployeesOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [
    configurationOpen,
    employeesOpen,
    editingDate,
    holidayPreview.length,
    pdfSummerPeriod,
  ]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set(
      Array.from({ length: 11 }, (_, index) => currentYear - 5 + index),
    );
    Object.keys(data.yearly).forEach((savedYear) => years.add(Number(savedYear)));
    return [...years].sort((a, b) => a - b);
  }, [data.yearly]);

  const monthDays = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const date = getDateKey(year, month, day);
      return {
        day,
        date,
        record: data.days[date] ?? { activities: [], coverages: [] },
        scheduledMinutes: getScheduledMinutes(date, data),
      };
    });
  }, [data, month, year]);

  const markedDays = monthDays.filter(
    (day) =>
      day &&
      (day.record.activities.length > 0 ||
        day.record.coverages.length > 0 ||
        data.holidays[day.date]),
  ).length;
  const coverageCount = monthDays.reduce(
    (total, day) =>
      total +
      (day && !data.holidays[day.date] ? day.record.coverages.length : 0),
    0,
  );
  const monthSummary = getMonthSummary(data, year, month);
  const summerConfigured = Boolean(yearSettings.summerStart && yearSettings.summerEnd);
  const isPaidCoverageAllowed =
    !!editingDate && isSummerDate(editingDate, yearSettings);
  const draftBankBalance = editingDate
    ? getBankBalance(data, Number(editingDate.slice(0, 4)), editingDate) +
      draftCoverages
        .filter((coverage) => !coverage.paid)
        .reduce((total, coverage) => total + coverage.minutes, 0) -
      draftActivities
        .filter((activity) => activity.code === "CD")
        .reduce((total, activity) => total + activity.minutes, 0)
    : 0;

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function openEditor(date: string) {
    const record = data.days[date] ?? { activities: [], coverages: [] };
    setEditingDate(date);
    setDraftHoliday(Boolean(data.holidays[date]));
    setDraftHolidayCode(data.holidayCodes[date] ?? "DI");
    setDraftActivities(record.activities.map((activity) => ({ ...activity })));
    setDraftCoverages(record.coverages.map((coverage) => ({ ...coverage })));
    setNewActivityCode("F");
    setNewActivityTime("01:00");
    setNewCoverageTime("01:00");
    setNewCoveragePaid(false);
    setFormError("");
  }

  function addActivity() {
    if (!editingDate) return;
    if (draftHoliday) {
      setFormError("No se pueden registrar actividades en un día festivo.");
      return;
    }
    const planned = editorScheduledMinutes;
    const minutes =
      newActivityCode === "X" ? planned : parseTimeInput(newActivityTime);
    if (minutes === null || minutes <= 0) {
      setFormError(
        newActivityCode === "X"
          ? "No se pueden registrar vacaciones X en una fecha sin jornada prevista."
          : "Indica una duración válida mayor que cero.",
      );
      return;
    }
    setDraftActivities((current) => {
      const existing = current.find((activity) => activity.code === newActivityCode);
      if (existing) {
        return current.map((activity) =>
          activity.id === existing.id
            ? {
                ...activity,
                minutes:
                  newActivityCode === "X"
                    ? minutes
                    : activity.minutes + minutes,
              }
            : activity,
        );
      }
      return [...current, { id: newId(), code: newActivityCode, minutes }];
    });
    setFormError("");
  }

  function saveDay() {
    if (!editingDate) return;
    if (draftHoliday && (draftActivities.length > 0 || draftCoverages.length > 0)) {
      setFormError(
        "El día tiene registros horarios. Elimínalos antes de guardarlo como festivo.",
      );
      return;
    }
    const record: DayRecord = {
      activities: mergeActivitiesByCode(draftActivities),
      coverages: draftCoverages,
    };
    const next: ScheduleData = {
      ...data,
      days: { ...data.days },
      holidays: { ...data.holidays },
      holidayCodes: { ...data.holidayCodes },
    };
    if (draftHoliday) {
      next.holidays[editingDate] =
        data.holidays[editingDate] ?? HOLIDAY_DEFINITIONS[draftHolidayCode];
      next.holidayCodes[editingDate] = draftHolidayCode;
    } else {
      delete next.holidays[editingDate];
      delete next.holidayCodes[editingDate];
    }
    if (!draftHoliday && (record.activities.length || record.coverages.length)) {
      next.days[editingDate] = record;
    } else {
      delete next.days[editingDate];
    }

    const validationError = validateAllDays(next, Number(editingDate.slice(0, 4)));
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setEditingDate(null);
  }

  function saveYearSettings() {
    const settingsError = validateYearSettings(year, settingsDraft);
    if (settingsError) {
      setFormError(settingsError);
      return;
    }
    const next: ScheduleData = {
      ...data,
      yearly: { ...data.yearly, [year]: { ...settingsDraft } },
    };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setFormError("");
  }

  function addHoliday() {
    if (!isDateKey(holidayDate) || Number(holidayDate.slice(0, 4)) !== year) {
      setFormError("Selecciona una fecha válida del año elegido.");
      return;
    }
    if (!holidayDescription.trim()) {
      setFormError("Escribe una descripción para el festivo.");
      return;
    }
    const next: ScheduleData = {
      ...data,
      holidays: { ...data.holidays, [holidayDate]: holidayDescription.trim() },
      holidayCodes: { ...data.holidayCodes, [holidayDate]: holidayCode },
    };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setHolidayDate("");
    setHolidayDescription("");
    setHolidayCode("DI");
    setFormError("");
  }

  function removeHoliday(date: string) {
    const holidays = { ...data.holidays };
    const holidayCodes = { ...data.holidayCodes };
    delete holidays[date];
    delete holidayCodes[date];
    setStored({ data: { ...data, holidays, holidayCodes }, error: false });
    setFormError("");
  }

  function saveException() {
    const minutes = parseTimeInput(exceptionTime);
    if (!isDateKey(exceptionDate) || Number(exceptionDate.slice(0, 4)) !== year) {
      setFormError("Selecciona una fecha válida del año elegido.");
      return;
    }
    if (data.holidays[exceptionDate]) {
      setFormError("Quita primero la marca de festivo para crear una excepción de jornada.");
      return;
    }
    if (minutes === null) {
      setFormError("Indica una jornada prevista válida.");
      return;
    }
    const exceptions = { ...data.exceptions, [exceptionDate]: minutes };
    const next: ScheduleData = { ...data, exceptions };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setExceptionDate("");
    setExceptionTime("00:00");
    setFormError("");
  }

  function removeException(date: string) {
    const exceptions = { ...data.exceptions };
    delete exceptions[date];
    const next: ScheduleData = { ...data, exceptions };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setFormError("");
  }

  async function importHolidayPdf(file: File | undefined) {
    if (!file) return;
    setFormError("");
    setPdfStatus({ message: "Leyendo el PDF localmente…", error: false });
    setPdfImporting(true);
    try {
      const extracted = await extractHolidayDocument(file, year);
      if (!extracted.dates.length && !extracted.summerPeriod) {
        setPdfStatus({
          message: `No se detectaron fechas de ${year}. Si el PDF es una imagen escaneada, añade los festivos manualmente.`,
          error: true,
        });
        return;
      }
      setHolidayPreview(
        extracted.dates.map((date) => ({
          date,
          code: data.holidayCodes[date] ?? "DI",
          description: data.holidays[date] ?? "Festivo",
          selected: !data.holidays[date],
        })),
      );
      setPdfSummerPeriod(extracted.summerPeriod);
      setPdfStatus({
        message: [
          `${extracted.dates.length} festivos detectados.`,
          extracted.summerPeriod
            ? `Periodo intensivo detectado: ${formatLongDate(extracted.summerPeriod.start)} a ${formatLongDate(extracted.summerPeriod.end)}.`
            : "",
          "Revísalos y confirma la importación.",
        ]
          .filter(Boolean)
          .join(" "),
        error: false,
      });
    } catch (error) {
      setPdfStatus({
        message:
          error instanceof Error
            ? `No se pudo leer el PDF localmente: ${error.message}`
            : "No se pudo leer el PDF localmente. Añade los festivos manualmente.",
        error: true,
      });
    } finally {
      setPdfImporting(false);
    }
  }

  async function importHolidayFile(
    file: File | undefined,
    delimiter: "," | ";",
  ) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setPdfStatus({
        message: "El fichero supera el límite local de 20 MB.",
        error: true,
      });
      return;
    }
    setFormError("");
    setPdfStatus({ message: "Leyendo el fichero localmente…", error: false });
    try {
      const { parseHolidayCsv, parseHolidaySpreadsheet } = await import(
        "./holiday-import"
      );
      const entries = file.name.toLocaleLowerCase("es-ES").endsWith(".csv")
        ? parseHolidayCsv(await file.text(), year, delimiter)
        : await parseHolidaySpreadsheet(file, year);
      if (!entries.length) {
        setPdfStatus({
          message: "El fichero no contiene filas de festivos.",
          error: true,
        });
        return;
      }
      setHolidayPreview(toHolidayPreview(entries));
      setPdfSummerPeriod(null);
      setPdfStatus({
        message: `Se han leído ${entries.length} filas. Revísalas y confirma la importación.`,
        error: false,
      });
    } catch (error) {
      setPdfStatus({
        message:
          error instanceof Error
            ? `No se pudo leer el fichero: ${error.message}`
            : "No se pudo leer el fichero.",
        error: true,
      });
    }
  }

  function toHolidayPreview(entries: HolidayImportEntry[]): HolidayPreview[] {
    return entries.map((entry) => ({
      ...entry,
      selected: !data.holidays[entry.date],
    }));
  }

  function confirmHolidayImport() {
    const selected = holidayPreview.filter((entry) => entry.selected);
    if (!selected.length && !pdfSummerPeriod) {
      setFormError("Selecciona al menos una fecha para importar.");
      return;
    }
    const holidays = { ...data.holidays };
    const holidayCodes = { ...data.holidayCodes };
    for (const entry of selected) {
      holidays[entry.date] = entry.description.trim() || "Festivo";
      holidayCodes[entry.date] = entry.code;
    }
    const yearly = { ...data.yearly };
    if (pdfSummerPeriod) {
      yearly[String(year)] = {
        ...getYearSettings(data, year),
        summerStart: pdfSummerPeriod.start,
        summerEnd: pdfSummerPeriod.end,
      };
      const settingsError = validateYearSettings(year, yearly[String(year)]);
      if (settingsError) {
        setFormError(settingsError);
        return;
      }
    }
    const next: ScheduleData = { ...data, holidays, holidayCodes, yearly };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setHolidayPreview([]);
    setPdfSummerPeriod(null);
    setPdfStatus({
      message: `Se guardaron ${selected.length} festivos confirmados${pdfSummerPeriod ? " y el periodo intensivo" : ""}.`,
      error: false,
    });
    setFormError("");
  }

  function openMonthlyReport() {
    const report = buildMonthlyReportHtml(data, year, month);
    const url = URL.createObjectURL(new Blob([report], { type: "text/html" }));
    const reportWindow = window.open(url, "_blank");
    if (!reportWindow) {
      URL.revokeObjectURL(url);
      setFormError("El navegador bloqueó la ventana del informe. Permite ventanas emergentes e inténtalo de nuevo.");
      return;
    }
    reportWindow.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setFormError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Gestión de horarios">
          <span className="brand-mark" aria-hidden="true">
            m
          </span>
          <span>
            <strong>motxitron</strong>
            <small>GESTIÓN DE HORARIOS</small>
          </span>
        </a>
        <div className="topbar-right">
          <span className="demo-pill">
            <span className="status-dot" />
            Entorno de demostración
          </span>
          <div className="user-chip" aria-label="Usuario user1">
            <span className="avatar">U1</span>
            <span className="user-chip-copy">
              <strong>user1</strong>
              <small>Usuario piloto</small>
            </span>
            <span className="chevron" aria-hidden="true">⌄</span>
          </div>
        </div>
      </header>

      <div className="page-content" id="inicio">
        <section className="page-heading">
          <div>
            <p className="eyebrow">PLANIFICACIÓN PERSONAL</p>
            <h1>Mis horarios</h1>
            <p className="subtitle">Gestiona jornada, actividades y coberturas.</p>
          </div>
          <label className="year-picker">
            <span>Año</span>
            <select
              aria-label="Seleccionar año"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setFormError("");
              }}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="page-heading-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfigurationOpen(true)}
            >
              Configuración de horario
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEmployeesOpen(true)}
            >
              Todos los empleados
            </button>
          </div>
        </section>

        <section className="notice" role="status">
          <span className="notice-icon" aria-hidden="true">i</span>
          <p>
            <strong>Prototipo con datos ficticios.</strong> La información se
            guarda solo en este navegador; no hay inicio de sesión ni permisos
            reales. No introduzcas datos personales o laborales reales.
          </p>
        </section>
        {(stored.error || storageError) && (
          <p className="storage-warning" role="alert">
            No se pudo leer o guardar el calendario en este navegador. Los
            cambios pueden no conservarse al cerrar la página.
          </p>
        )}
        {formError && <p className="form-feedback" role="alert">{formError}</p>}

        <section className="annual-settings" aria-labelledby="annual-title" hidden>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">CONFIGURACIÓN ANUAL</p>
              <h2 id="annual-title">Jornada de {year}</h2>
            </div>
            <button type="button" className="save-button" onClick={saveYearSettings}>
              Guardar jornada
            </button>
          </div>
          <div className="settings-fields">
            <label>
              Lunes a jueves
              <input
                type="time"
                step="60"
                value={minutesToTimeInput(settingsDraft.mondayToThursdayMinutes)}
                onChange={(event) => {
                  const minutes = parseTimeInput(event.target.value);
                  if (minutes !== null) {
                    setSettingsDraft((current) => ({
                      ...current,
                      mondayToThursdayMinutes: minutes,
                    }));
                  }
                }}
              />
            </label>
            <label>
              Viernes y verano
              <input
                type="time"
                step="60"
                value={minutesToTimeInput(settingsDraft.fridaySummerMinutes)}
                onChange={(event) => {
                  const minutes = parseTimeInput(event.target.value);
                  if (minutes !== null) {
                    setSettingsDraft((current) => ({
                      ...current,
                      fridaySummerMinutes: minutes,
                    }));
                  }
                }}
              />
            </label>
            <label>
              Inicio del verano
              <input
                type="date"
                value={settingsDraft.summerStart}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    summerStart: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Fin del verano
              <input
                type="date"
                value={settingsDraft.summerEnd}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    summerEnd: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Cupo anual de vacaciones (días)
              <input
                type="number"
                min="0"
                max="366"
                step="1"
                value={settingsDraft.vacationQuotaDays}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    vacationQuotaDays: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <p className="settings-note">
            {summerConfigured
              ? `Verano del ${formatLongDate(yearSettings.summerStart)} al ${formatLongDate(yearSettings.summerEnd)}, ambos incluidos.`
              : "Configura las fechas de verano. Los viernes usan la jornada indicada en todo el año."}
            {" "}Vacaciones usadas: {getVacationDaysUsed(data, year)} de {yearSettings.vacationQuotaDays} días.
          </p>
        </section>

        <div className="workspace">
          <aside className="profile-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">PERFIL ACTIVO</p>
                <h2>Usuario piloto</h2>
              </div>
              <span className="profile-avatar">U1</span>
            </div>
            <div className="profile-id">
              <span className="field-label">Identificador</span>
              <strong>user1</strong>
            </div>
            <div className="profile-divider" />
            <p className="eyebrow profile-section-title">DATOS DE EJEMPLO</p>
            <dl className="profile-details">
              <div><dt>Dominio</dt><dd><span className="tag tag-blue">TEC</span></dd></div>
              <div><dt>Rol</dt><dd>Tecnológico</dd></div>
              <div><dt>Tipo de cuenta</dt><dd>Usuario normal</dd></div>
              <div><dt>Jornada L-J</dt><dd>{formatMinutes(yearSettings.mondayToThursdayMinutes)} h</dd></div>
              <div><dt>Viernes / verano</dt><dd>{formatMinutes(yearSettings.fridaySummerMinutes)} h</dd></div>
            </dl>
            <div className="profile-footnote">
              <span aria-hidden="true">◇</span>
              Perfil ficticio para el piloto
            </div>
          </aside>

          <section className="calendar-card" aria-label="Calendario mensual">
            <div className="calendar-toolbar">
              <div className="month-title">
                <h2>{MONTHS[month]} <span>{year}</span></h2>
                <p>{markedDays} días con registros · {coverageCount} coberturas extra</p>
              </div>
              <div className="month-controls">
                <button type="button" className="icon-button" aria-label="Mes anterior" onClick={() => changeMonth(-1)}>‹</button>
                <button type="button" className="icon-button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}>›</button>
                <button
                  type="button"
                  className="today-button"
                  onClick={() => {
                    setYear(today.getFullYear());
                    setMonth(today.getMonth());
                    setFocusDate(todayDate);
                    setFocusRequest((request) => request + 1);
                  }}
                >
                  Today
                </button>
                <button type="button" className="report-button" onClick={openMonthlyReport}>
                  Informe mensual
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((weekday) => (
                <div className="weekday" key={weekday}>{weekday}</div>
              ))}
              {monthDays.map((item, index) =>
                item ? (
                  <button
                    className={`day-cell${index % 7 > 4 ? " weekend" : ""}${item.date === todayDate ? " today" : ""}${data.holidays[item.date] ? " holiday" : ""}`}
                    type="button"
                    id={`day-${item.date}`}
                    aria-current={item.date === todayDate ? "date" : undefined}
                    key={item.date}
                    onClick={() => openEditor(item.date)}
                    aria-label={`${formatLongDate(item.date)}, jornada prevista ${formatMinutes(item.scheduledMinutes)}${data.holidays[item.date] ? `, festivo ${data.holidayCodes[item.date] ?? "DI"} ${data.holidays[item.date]}` : ""}. Editar día`}
                  >
                    <span className="day-cell-heading">
                      <span className="day-number">{item.day}</span>
                      <span className="planned-hours">{formatMinutes(item.scheduledMinutes)}</span>
                    </span>
                    {data.holidays[item.date] && (
                      <span className="holiday-label">{data.holidayCodes[item.date] ?? "DI"} · {data.holidays[item.date]}</span>
                    )}
                    {!data.holidays[item.date] && item.record.activities.length > 0 && (
                      <span className="activity-list">
                        {item.record.activities.map((activity) => (
                          <span
                            className={`activity-chip ${ACTIVITY_DEFINITIONS[activity.code].color}`}
                            key={activity.id}
                          >
                            <strong>{activity.code}</strong>
                            <span>{formatMinutes(activity.minutes)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    {!data.holidays[item.date] && item.record.activities.length > 0 && (
                      <span className="remaining-time">
                        Restante{" "}
                        {formatMinutes(
                          Math.max(
                            0,
                            item.scheduledMinutes -
                              item.record.activities.reduce(
                                (total, activity) => total + activity.minutes,
                                0,
                              ),
                          ),
                        )}
                      </span>
                    )}
                    {!data.holidays[item.date] && item.record.coverages.length > 0 && (
                      <span className="activity-list">
                        {item.record.coverages.map((coverage) => (
                          <span className={`activity-chip ${coverage.paid ? "paid-coverage" : "bank-coverage"}`} key={coverage.id}>
                            <strong>{coverage.paid ? "CR" : "C"}</strong>
                            <span>{formatMinutes(coverage.minutes)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    {!data.holidays[item.date] &&
                      item.record.activities.length === 0 &&
                      item.record.coverages.length === 0 && (
                        <span className="empty-day-hint">+ Añadir</span>
                      )}
                  </button>
                ) : (
                  <div className="day-cell outside-month" key={`empty-${index}`} />
                ),
              )}
            </div>

            <div className="calendar-summary">
              <span>Jornada prevista del mes: <strong>{formatMinutes(monthSummary.scheduledMinutes)}</strong></span>
              <span>Trabajo sin categoría: <strong>{formatMinutes(monthSummary.workWithoutCategoryMinutes)}</strong></span>
              <span>Saldo anual de coberturas: <strong>{formatMinutes(getBankBalance(data, year))}</strong></span>
            </div>
            <div className="calendar-footer">
              <span>Selecciona un día para editar actividades y coberturas.</span>
              <div className="legend" aria-label="Leyenda">
                <span className="legend-item"><span className="legend-dot coverage" />Actividad</span>
                <span className="legend-item"><span className="legend-dot bank-coverage" />Cobertura a CD</span>
                <span className="legend-item"><span className="legend-dot paid-coverage" />Cobertura CR</span>
                <span className="legend-item"><span className="legend-dot holiday" />Festivo</span>
              </div>
            </div>
          </section>
        </div>

        <section className="management-grid" aria-label="Gestión de festivos y excepciones" hidden>
          <div className="management-card">
            <h2>Festivos de {year}</h2>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                addHoliday();
              }}
            >
              <label>Fecha<input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} /></label>
              <label>Tipo
                <select
                  value={holidayCode}
                  onChange={(event) => setHolidayCode(event.target.value as HolidayCode)}
                >
                  {Object.entries(HOLIDAY_DEFINITIONS).map(([code, label]) => (
                    <option key={code} value={code}>{code} · {label}</option>
                  ))}
                </select>
              </label>
              <label>Descripción<input type="text" maxLength={80} value={holidayDescription} onChange={(event) => setHolidayDescription(event.target.value)} placeholder="Festivo local" /></label>
              <button type="submit" className="secondary-button">Añadir</button>
            </form>
            <div className="import-controls">
              <label>
                Separador CSV
                <select
                  value={csvDelimiter}
                  onChange={(event) => setCsvDelimiter(event.target.value as "," | ";")}
                >
                  <option value=",">Coma (,)</option>
                  <option value=";">Punto y coma (;)</option>
                </select>
              </label>
              <label className="file-picker">
                <span>Importar CSV, XLS o XLSX</span>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => {
                    void importHolidayFile(event.currentTarget.files?.[0], csvDelimiter);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <label className="file-picker">
              <span>{pdfImporting ? "Leyendo PDF localmente…" : "Importar desde PDF"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={pdfImporting}
                onChange={(event) => {
                  void importHolidayPdf(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="privacy-note">Los ficheros CSV, Excel y PDF se procesan en este navegador y se descartan; solo se guardan los festivos que confirmes.</p>
            {pdfStatus && (
              <p
                className={`pdf-status${pdfStatus.error ? " error" : ""}`}
                role={pdfStatus.error ? "alert" : "status"}
              >
                {pdfStatus.message}
              </p>
            )}
            <ul className="date-list">
              {Object.entries(data.holidays)
                .filter(([date]) => date.startsWith(`${year}-`))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, description]) => (
                  <li key={date}>
                    <span><strong>{formatLongDate(date)}</strong> · {data.holidayCodes[date] ?? "DI"} · {description}</span>
                    <button type="button" className="text-button" onClick={() => removeHoliday(date)}>Eliminar</button>
                  </li>
                ))}
              {!Object.keys(data.holidays).some((date) => date.startsWith(`${year}-`)) && (
                <li className="empty-list">Todavía no hay festivos para este año.</li>
              )}
            </ul>
          </div>

          <div className="management-card">
            <h2>Excepciones de jornada</h2>
            <p className="management-description">Define horas previstas para trabajar en fines de semana o festivos. Una excepción prevalece sobre el calendario habitual.</p>
            <form
              className="inline-form exception-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveException();
              }}
            >
              <label>Fecha<input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /></label>
              <label>Jornada<input type="time" step="60" value={exceptionTime} onChange={(event) => setExceptionTime(event.target.value)} /></label>
              <button type="submit" className="secondary-button">Guardar</button>
            </form>
            <ul className="date-list">
              {Object.entries(data.exceptions)
                .filter(([date]) => date.startsWith(`${year}-`))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, minutes]) => (
                  <li key={date}>
                    <span><strong>{formatLongDate(date)}</strong> · {formatMinutes(minutes)}</span>
                    <button type="button" className="text-button" onClick={() => removeException(date)}>Eliminar</button>
                  </li>
                ))}
              {!Object.keys(data.exceptions).some((date) => date.startsWith(`${year}-`)) && (
                <li className="empty-list">Todavía no hay excepciones para este año.</li>
              )}
            </ul>
          </div>
        </section>

        <footer className="page-footer">
          <span>Motxitron · piloto de gestión de horarios</span>
          <span>Datos de demostración · no incluir información real</span>
        </footer>
      </div>

      {editingDate && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingDate(null);
          }}
        >
          <section aria-labelledby="dialog-title" aria-modal="true" className="edit-dialog" role="dialog">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">EDITAR JORNADA</p>
                <h2 id="dialog-title">{formatLongDate(editingDate)}</h2>
              </div>
              <button aria-label="Cerrar" className="dialog-close" onClick={() => setEditingDate(null)} type="button">×</button>
            </div>
            <div className="day-context">
              <span>Jornada prevista: <strong>{formatMinutes(editorScheduledMinutes)}</strong></span>
              {data.holidays[editingDate] && <span>Festivo: {data.holidays[editingDate]}</span>}
              {Object.prototype.hasOwnProperty.call(data.exceptions, editingDate) && <span>Excepción de jornada</span>}
            </div>
            <label className="checkbox-label holiday-toggle">
              <input
                type="checkbox"
                checked={draftHoliday}
                onChange={(event) => setDraftHoliday(event.target.checked)}
              />
              Marcar el día como festivo
            </label>
            {draftHoliday && (
              <label className="holiday-type">
                Tipo de festivo
                <select
                  value={draftHolidayCode}
                  onChange={(event) => setDraftHolidayCode(event.target.value as HolidayCode)}
                >
                  {Object.entries(HOLIDAY_DEFINITIONS).map(([code, label]) => (
                    <option key={code} value={code}>{code} · {label}</option>
                  ))}
                </select>
              </label>
            )}
            {draftHoliday && (
              <div className="holiday-editor-notice">
                <p>En los días festivos no se permite añadir actividades ni coberturas.</p>
                {(draftActivities.length > 0 || draftCoverages.length > 0) && (
                  <>
                    <p>Este día conserva registros anteriores. Elimínalos explícitamente antes de guardarlo como festivo.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setDraftActivities([]);
                        setDraftCoverages([]);
                        setFormError("");
                      }}
                    >
                      Eliminar registros del día
                    </button>
                  </>
                )}
              </div>
            )}
            <h3 hidden={draftHoliday}>Actividades de la jornada</h3>
            <div className="draft-list" hidden={draftHoliday}>
              {draftActivities.map((activity) => (
                <div className="draft-row" key={activity.id}>
                  <label>
                    Actividad
                    <select
                      value={activity.code}
                      onChange={(event) => {
                        const code = event.target.value as ActivityCode;
                        setDraftActivities((current) =>
                          current.map((item) =>
                            item.id === activity.id
                              ? {
                                  ...item,
                                  code,
                                  minutes:
                                    code === "X"
                                      ? editorScheduledMinutes
                                      : item.minutes,
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      {Object.entries(ACTIVITY_DEFINITIONS)
                        .filter(([code]) => code !== "C")
                        .map(([code, definition]) => (
                        <option key={code} value={code}>{code} · {definition.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Duración
                    <input
                      type="time"
                      step="60"
                      value={minutesToTimeInput(activity.minutes)}
                      disabled={activity.code === "X"}
                      onChange={(event) => {
                        const minutes = parseTimeInput(event.target.value);
                        if (minutes !== null) {
                          setDraftActivities((current) =>
                            current.map((item) =>
                              item.id === activity.id ? { ...item, minutes } : item,
                            ),
                          );
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="text-button remove-row" onClick={() => setDraftActivities((current) => current.filter((item) => item.id !== activity.id))}>Eliminar</button>
                </div>
              ))}
              {draftActivities.length === 0 && <p className="empty-list">No hay actividades registradas.</p>}
            </div>
            <div className="add-row" hidden={draftHoliday}>
              <label>
                Nueva actividad
                <select value={newActivityCode} onChange={(event) => setNewActivityCode(event.target.value as Exclude<ActivityCode, "C">)}>
                  {Object.entries(ACTIVITY_DEFINITIONS)
                    .filter(([code]) => code !== "C")
                    .map(([code, definition]) => (
                    <option key={code} value={code}>{code} · {definition.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Duración
                <input type="time" step="60" value={newActivityTime} disabled={newActivityCode === "X"} onChange={(event) => setNewActivityTime(event.target.value)} />
              </label>
              <button type="button" className="secondary-button" onClick={addActivity}>Añadir</button>
            </div>
            {!draftHoliday && draftActivities.some((activity) => activity.code === "CD") && (
              <p className="dialog-note">
                Saldo CD antes del día: {formatMinutes(
                  getBankBalance(data, Number(editingDate.slice(0, 4)), editingDate) +
                    draftCoverages.filter((coverage) => !coverage.paid).reduce((sum, coverage) => sum + coverage.minutes, 0),
                )}. El consumo no puede superar el saldo disponible.
              </p>
            )}

            <h3 hidden={draftHoliday}>Cobertura extra (C / CR), fuera de jornada</h3>
            <div className="draft-list" hidden={draftHoliday}>
              {draftCoverages.map((coverage) => (
                <div className="draft-row coverage-row" key={coverage.id}>
                  <span>{coverage.paid ? "CR · Remunerada" : "C · Añadida a la bolsa CD"}</span>
                  <label>
                    Duración
                    <input
                      type="time"
                      step="60"
                      value={minutesToTimeInput(coverage.minutes)}
                      onChange={(event) => {
                        const minutes = parseTimeInput(event.target.value);
                        if (minutes !== null) {
                          setDraftCoverages((current) =>
                            current.map((item) =>
                              item.id === coverage.id ? { ...item, minutes } : item,
                            ),
                          );
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="text-button remove-row" onClick={() => setDraftCoverages((current) => current.filter((item) => item.id !== coverage.id))}>Eliminar</button>
                </div>
              ))}
              {draftCoverages.length === 0 && <p className="empty-list">No hay coberturas extra.</p>}
            </div>
            <div className="add-row" hidden={draftHoliday}>
              <label>
                Duración extra
                <input type="time" step="60" value={newCoverageTime} onChange={(event) => setNewCoverageTime(event.target.value)} />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newCoveragePaid}
                  disabled={!isPaidCoverageAllowed}
                  onChange={(event) => setNewCoveragePaid(event.target.checked)}
                />
                Remunerada (CR)
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (draftHoliday) {
                    setFormError("No se pueden registrar coberturas en un día festivo.");
                    return;
                  }
                  const minutes = parseTimeInput(newCoverageTime);
                  if (minutes === null || minutes <= 0) {
                    setFormError("Indica una duración de cobertura superior a cero.");
                    return;
                  }
                  if (newCoveragePaid && !isPaidCoverageAllowed) {
                    setFormError("La cobertura solo se puede marcar como remunerada durante el periodo de verano.");
                    return;
                  }
                  setDraftCoverages((current) => [
                    ...current,
                    { id: newId(), minutes, paid: newCoveragePaid },
                  ]);
                  setNewCoveragePaid(false);
                  setFormError("");
                }}
              >
                Añadir
              </button>
            </div>
            {!draftHoliday && <p className="dialog-note">
              Saldo CD tras guardar: {formatMinutes(draftBankBalance)}. Los
              cambios de la bolsa se aplican al pulsar «Guardar día».
            </p>}
            {!draftHoliday && !isPaidCoverageAllowed && (
              <p className="dialog-note">CR solo está disponible dentro del periodo anual de verano.</p>
            )}

            {formError && <p className="form-feedback" role="alert">{formError}</p>}
            <div className="dialog-actions">
              <button className="cancel-button" onClick={() => setEditingDate(null)} type="button">Cancelar</button>
              <button className="save-button" onClick={saveDay} type="button">Guardar día</button>
            </div>
          </section>
        </div>
      )}

      {(holidayPreview.length > 0 || pdfSummerPeriod) && (
        <div
          className="dialog-backdrop holiday-import-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setHolidayPreview([]);
              setPdfSummerPeriod(null);
            }
          }}
        >
          <section aria-labelledby="holiday-dialog-title" aria-modal="true" className="edit-dialog import-dialog" role="dialog">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">IMPORTACIÓN LOCAL</p>
                <h2 id="holiday-dialog-title">Revisar datos importados</h2>
              </div>
              <button aria-label="Cerrar" className="dialog-close" onClick={() => {
                setHolidayPreview([]);
                setPdfSummerPeriod(null);
              }} type="button">×</button>
            </div>
            <p className="dialog-note">Confirma las fechas y el periodo intensivo que quieras guardar. El fichero original ya se ha descartado.</p>
            {pdfSummerPeriod && (
              <div className="summer-period-preview">
                <strong>Periodo intensivo detectado</strong>
                <label>
                  Inicio
                  <input
                    type="date"
                    value={pdfSummerPeriod.start}
                    onChange={(event) =>
                      setPdfSummerPeriod((current) =>
                        current ? { ...current, start: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="date"
                    value={pdfSummerPeriod.end}
                    onChange={(event) =>
                      setPdfSummerPeriod((current) =>
                        current ? { ...current, end: event.target.value } : current,
                      )
                    }
                  />
                </label>
              </div>
            )}
            <div className="holiday-preview-list">
              {holidayPreview.map((entry, index) => (
                <div className="holiday-preview-row" key={entry.date}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      onChange={(event) =>
                        setHolidayPreview((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, selected: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    {formatLongDate(entry.date)}
                  </label>
                  <select
                    aria-label={`Tipo de festivo de ${formatLongDate(entry.date)}`}
                    value={entry.code}
                    onChange={(event) =>
                      setHolidayPreview((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, code: event.target.value as HolidayCode }
                            : item,
                        ),
                      )
                    }
                  >
                    {Object.entries(HOLIDAY_DEFINITIONS).map(([code, label]) => (
                      <option key={code} value={code}>{code} · {label}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`Descripción de ${formatLongDate(entry.date)}`}
                    type="text"
                    maxLength={80}
                    value={entry.description}
                    onChange={(event) =>
                      setHolidayPreview((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            {formError && <p className="form-feedback" role="alert">{formError}</p>}
            <div className="dialog-actions">
              <button className="cancel-button" onClick={() => {
                setHolidayPreview([]);
                setPdfSummerPeriod(null);
              }} type="button">Cancelar</button>
              <button className="save-button" onClick={confirmHolidayImport} type="button">Confirmar festivos</button>
            </div>
          </section>
        </div>
      )}

      {configurationOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfigurationOpen(false);
          }}
        >
          <section
            aria-labelledby="configuration-title"
            aria-modal="true"
            className="edit-dialog configuration-dialog"
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">AJUSTES DEL CALENDARIO</p>
                <h2 id="configuration-title">Configuración de horario · {year}</h2>
              </div>
              <button
                aria-label="Cerrar configuración"
                className="dialog-close"
                onClick={() => setConfigurationOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <section className="annual-settings configuration-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">JORNADA ANUAL</p>
                  <h2>Horario y vacaciones</h2>
                </div>
                <button type="button" className="save-button" onClick={saveYearSettings}>
                  Guardar jornada
                </button>
              </div>
              <div className="settings-fields">
                <label>
                  Lunes a jueves
                  <input
                    type="time"
                    step="60"
                    value={minutesToTimeInput(settingsDraft.mondayToThursdayMinutes)}
                    onChange={(event) => {
                      const minutes = parseTimeInput(event.target.value);
                      if (minutes !== null) {
                        setSettingsDraft((current) => ({
                          ...current,
                          mondayToThursdayMinutes: minutes,
                        }));
                      }
                    }}
                  />
                </label>
                <label>
                  Viernes y verano
                  <input
                    type="time"
                    step="60"
                    value={minutesToTimeInput(settingsDraft.fridaySummerMinutes)}
                    onChange={(event) => {
                      const minutes = parseTimeInput(event.target.value);
                      if (minutes !== null) {
                        setSettingsDraft((current) => ({
                          ...current,
                          fridaySummerMinutes: minutes,
                        }));
                      }
                    }}
                  />
                </label>
                <label>
                  Inicio del verano
                  <input
                    type="date"
                    value={settingsDraft.summerStart}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        summerStart: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Fin del verano
                  <input
                    type="date"
                    value={settingsDraft.summerEnd}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        summerEnd: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Cupo de vacaciones (días)
                  <input
                    type="number"
                    min="0"
                    max="366"
                    step="1"
                    value={settingsDraft.vacationQuotaDays}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        vacationQuotaDays: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <p className="settings-note">
                Vacaciones usadas: {getVacationDaysUsed(data, year)} de {yearSettings.vacationQuotaDays} días.
                {summerConfigured
                  ? ` Periodo intensivo: ${formatLongDate(yearSettings.summerStart)}–${formatLongDate(yearSettings.summerEnd)}.`
                  : " Configura las fechas para aplicar la jornada de verano."}
              </p>
            </section>

            <section className="management-grid configuration-management">
              <div className="management-card">
                <h2>Festivos</h2>
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addHoliday();
                  }}
                >
                  <label>
                    Fecha
                    <input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} />
                  </label>
                  <label>
                    Tipo
                    <select value={holidayCode} onChange={(event) => setHolidayCode(event.target.value as HolidayCode)}>
                      {Object.entries(HOLIDAY_DEFINITIONS).map(([code, label]) => (
                        <option key={code} value={code}>{code} · {label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descripción
                    <input type="text" maxLength={80} value={holidayDescription} onChange={(event) => setHolidayDescription(event.target.value)} placeholder="Festivo local" />
                  </label>
                  <button type="submit" className="secondary-button">Añadir</button>
                </form>
                <div className="import-controls">
                  <label>
                    Separador CSV
                    <select value={csvDelimiter} onChange={(event) => setCsvDelimiter(event.target.value as "," | ";")}>
                      <option value=",">Coma (,)</option>
                      <option value=";">Punto y coma (;)</option>
                    </select>
                  </label>
                  <label className="file-picker">
                    <span>Importar CSV, XLS o XLSX</span>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(event) => {
                        void importHolidayFile(event.currentTarget.files?.[0], csvDelimiter);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <label className="file-picker">
                    <span>{pdfImporting ? "Leyendo PDF…" : "Importar desde PDF"}</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={pdfImporting}
                      onChange={(event) => {
                        void importHolidayPdf(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="privacy-note">
                  Se admiten fechas dd/mm/aaaa y códigos DI, FL, FA o FN. Los ficheros se procesan solo en este navegador; no se suben.
                </p>
                {pdfStatus && (
                  <p className={`pdf-status${pdfStatus.error ? " error" : ""}`} role={pdfStatus.error ? "alert" : "status"}>
                    {pdfStatus.message}
                  </p>
                )}
                <ul className="date-list">
                  {Object.entries(data.holidays)
                    .filter(([date]) => date.startsWith(`${year}-`))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, description]) => (
                      <li key={date}>
                        <span><strong>{formatLongDate(date)}</strong> · {data.holidayCodes[date] ?? "DI"} · {description}</span>
                        <button type="button" className="text-button" onClick={() => removeHoliday(date)}>Eliminar</button>
                      </li>
                    ))}
                  {!Object.keys(data.holidays).some((date) => date.startsWith(`${year}-`)) && (
                    <li className="empty-list">Todavía no hay festivos para este año.</li>
                  )}
                </ul>
              </div>

              <div className="management-card">
                <h2>Excepciones de jornada</h2>
                <p className="management-description">Define horas para trabajar en fines de semana y fechas no festivas. Un festivo marcado siempre mantiene jornada cero.</p>
                <form
                  className="inline-form exception-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveException();
                  }}
                >
                  <label>Fecha<input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /></label>
                  <label>Jornada<input type="time" step="60" value={exceptionTime} onChange={(event) => setExceptionTime(event.target.value)} /></label>
                  <button type="submit" className="secondary-button">Guardar</button>
                </form>
                <ul className="date-list">
                  {Object.entries(data.exceptions)
                    .filter(([date]) => date.startsWith(`${year}-`))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, minutes]) => (
                      <li key={date}>
                        <span><strong>{formatLongDate(date)}</strong> · {formatMinutes(minutes)}</span>
                        <button type="button" className="text-button" onClick={() => removeException(date)}>Eliminar</button>
                      </li>
                    ))}
                  {!Object.keys(data.exceptions).some((date) => date.startsWith(`${year}-`)) && (
                    <li className="empty-list">Todavía no hay excepciones para este año.</li>
                  )}
                </ul>
              </div>
            </section>
            {formError && <p className="form-feedback" role="alert">{formError}</p>}
          </section>
        </div>
      )}

      {employeesOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEmployeesOpen(false);
          }}
        >
          <section
            aria-labelledby="department-title"
            aria-modal="true"
            className="edit-dialog department-dialog"
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">VISTA DE DEMOSTRACIÓN</p>
                <h2 id="department-title">Calendario de todos los empleados · {year}</h2>
              </div>
              <label className="employee-month-picker">
                Mes
                <select
                  aria-label="Mes del calendario de empleados"
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                >
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="employee-month-picker">
                Año
                <select
                  aria-label="Año del calendario de empleados"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                >
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <button aria-label="Cerrar vista" className="dialog-close" onClick={() => setEmployeesOpen(false)} type="button">×</button>
            </div>
            <p className="dialog-note">
              Vista general en formato de cuadrícula. Solo user1 usa datos guardados en este navegador; el resto son empleados ficticios de demostración, no una plantilla real de personal.
            </p>
            <div className="department-scroll">
              <table className="department-table" aria-label="Calendario mensual de empleados ficticios">
                <thead>
                  <tr>
                    <th rowSpan={2}>Nombre</th>
                    <th rowSpan={2}>Código de usuario</th>
                    <th rowSpan={2}>L-J</th>
                    <th rowSpan={2}>V/Verano</th>
                    <th rowSpan={2}>Dominio funcional</th>
                    <th rowSpan={2}>Rol</th>
                    <th rowSpan={2}>Dominio HSP</th>
                    {Array.from(
                      { length: new Date(year, month + 1, 0).getDate() },
                      (_, index) => {
                        const weekday = (new Date(year, month, index + 1).getDay() + 6) % 7;
                        return (
                          <th key={`weekday-${index}`}>
                            {WEEKDAYS[weekday]}
                          </th>
                        );
                      },
                    )}
                  </tr>
                  <tr>
                    {Array.from(
                      { length: new Date(year, month + 1, 0).getDate() },
                      (_, index) => (
                        <th key={`date-${index}`}>{index + 1}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_EMPLOYEES.map((employee, employeeIndex) => (
                    <tr key={employee.code}>
                      <th>{employee.name}</th>
                      <td>{employee.code}</td>
                      <td>
                        {formatMinutes(
                          employee.pilot
                            ? yearSettings.mondayToThursdayMinutes
                            : employee.mondayToThursdayMinutes,
                        )}
                      </td>
                      <td>
                        {formatMinutes(
                          employee.pilot
                            ? yearSettings.fridaySummerMinutes
                            : employee.fridaySummerMinutes,
                        )}
                      </td>
                      <td>{employee.domain}</td>
                      <td>{employee.role}</td>
                      <td>{employee.hspDomain}</td>
                      {Array.from(
                        { length: new Date(year, month + 1, 0).getDate() },
                        (_, dayIndex) => {
                          const date = getDateKey(year, month, dayIndex + 1);
                          const codes = getEmployeeDayCodes(
                            employee,
                            employeeIndex,
                            date,
                            data,
                          );
                        return (
                          <td key={`${employee.code}-${date}`}>
                            {codes.map((code, codeIndex) => (
                              <span
                                className={`employee-schedule-code ${
                                  code === "CR"
                                    ? "paid-coverage"
                                    : code === "C"
                                      ? "bank-coverage"
                                      : ACTIVITY_DEFINITIONS[code as ActivityCode]?.color ?? ""
                                }`}
                                key={`${code}-${codeIndex}`}
                              >
                                {code}
                              </span>
                            ))}
                          </td>
                        );
                        },
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
