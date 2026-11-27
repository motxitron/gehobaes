import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_DEFINITIONS,
  createEmptySchedule,
  formatMinutes,
  getBankBalance,
  getDateKey,
  getMonthSummary,
  getScheduledMinutes,
  getYearSettings,
  isDateKey,
  isSummerDate,
  minutesToTimeInput,
  parseTimeInput,
  validateAllDays,
  validateBankBalance,
  validateDayRecord,
  validateYearSettings,
  type ActivityCode,
  type DayActivity,
  type DayRecord,
  type ExtraCoverage,
  type ScheduleData,
  type YearSettings,
} from "./schedule";
import { extractHolidayDates } from "./pdf-holidays";
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

interface StoredSchedule {
  data: ScheduleData;
  error: boolean;
}

interface HolidayPreview {
  date: string;
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

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isRecord(value)) return false;
  const { yearly, holidays, exceptions, days } = value;
  if (!isRecord(yearly) || !isRecord(holidays) || !isRecord(exceptions) || !isRecord(days)) {
    return false;
  }
  if (
    !Object.entries(yearly).every(
      ([year, settings]) =>
        /^\d{4}$/.test(year) &&
        isRecord(settings) &&
        Number.isInteger(settings.mondayToThursdayMinutes) &&
        Number.isInteger(settings.fridaySummerMinutes) &&
        typeof settings.summerStart === "string" &&
        typeof settings.summerEnd === "string",
    )
  ) {
    return false;
  }
  if (
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
    if (!parsed.yearly[String(year)]) {
      parsed.yearly[String(year)] = { ...getYearSettings(parsed, year) };
    }
    return { data: parsed, error: false };
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
  const [newActivityCode, setNewActivityCode] = useState<ActivityCode>("F");
  const [newActivityTime, setNewActivityTime] = useState("01:00");
  const [newCoverageTime, setNewCoverageTime] = useState("01:00");
  const [newCoveragePaid, setNewCoveragePaid] = useState(false);
  const [formError, setFormError] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<YearSettings>(() =>
    getYearSettings(data, today.getFullYear()),
  );
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionTime, setExceptionTime] = useState("00:00");
  const [pdfImporting, setPdfImporting] = useState(false);
  const [holidayPreview, setHolidayPreview] = useState<HolidayPreview[]>([]);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const todayDate = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const yearSettings = getYearSettings(data, year);

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
    if (!editingDate && !holidayPreview.length) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingDate(null);
        setHolidayPreview([]);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingDate, holidayPreview.length]);

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
    (total, day) => total + (day?.record.coverages.length ?? 0),
    0,
  );
  const monthSummary = getMonthSummary(data, year, month);
  const summerConfigured = Boolean(yearSettings.summerStart && yearSettings.summerEnd);
  const isPaidCoverageAllowed =
    !!editingDate && isSummerDate(editingDate, yearSettings);

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function openEditor(date: string) {
    const record = data.days[date] ?? { activities: [], coverages: [] };
    setEditingDate(date);
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
    const planned = getScheduledMinutes(editingDate, data);
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
    setDraftActivities((current) => [
      ...current,
      { id: newId(), code: newActivityCode, minutes },
    ]);
    setFormError("");
  }

  function saveDay() {
    if (!editingDate) return;
    const record: DayRecord = {
      activities: draftActivities,
      coverages: draftCoverages,
    };
    const next: ScheduleData = {
      ...data,
      days: { ...data.days },
    };
    if (record.activities.length || record.coverages.length) {
      next.days[editingDate] = record;
    } else {
      delete next.days[editingDate];
    }

    const dayError = validateDayRecord(editingDate, record, next);
    const bankError = validateBankBalance(next, year);
    if (dayError || bankError) {
      setFormError(dayError ?? bankError ?? "No se pudo validar el día.");
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
    };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setHolidayDate("");
    setHolidayDescription("");
    setFormError("");
  }

  function removeHoliday(date: string) {
    const holidays = { ...data.holidays };
    delete holidays[date];
    setStored({ data: { ...data, holidays }, error: false });
    setFormError("");
  }

  function saveException() {
    const minutes = parseTimeInput(exceptionTime);
    if (!isDateKey(exceptionDate) || Number(exceptionDate.slice(0, 4)) !== year) {
      setFormError("Selecciona una fecha válida del año elegido.");
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
    setPdfImporting(true);
    try {
      const dates = await extractHolidayDates(file, year);
      if (!dates.length) {
        setFormError(
          `No se detectaron fechas de ${year}. Puedes añadir los festivos manualmente.`,
        );
        return;
      }
      setHolidayPreview(
        dates.map((date) => ({
          date,
          description: data.holidays[date] ?? "Festivo",
          selected: !data.holidays[date],
        })),
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? `No se pudo leer el PDF localmente: ${error.message}`
          : "No se pudo leer el PDF localmente. Añade los festivos manualmente.",
      );
    } finally {
      setPdfImporting(false);
    }
  }

  function confirmHolidayImport() {
    const selected = holidayPreview.filter((entry) => entry.selected);
    if (!selected.length) {
      setFormError("Selecciona al menos una fecha para importar.");
      return;
    }
    const holidays = { ...data.holidays };
    for (const entry of selected) {
      holidays[entry.date] = entry.description.trim() || "Festivo";
    }
    const next: ScheduleData = { ...data, holidays };
    const validationError = validateAllDays(next, year);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setStored({ data: next, error: false });
    setHolidayPreview([]);
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

        <section className="annual-settings" aria-labelledby="annual-title">
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
          </div>
          <p className="settings-note">
            {summerConfigured
              ? `Verano del ${formatLongDate(yearSettings.summerStart)} al ${formatLongDate(yearSettings.summerEnd)}, ambos incluidos.`
              : "Configura las fechas de verano. Los viernes usan la jornada indicada en todo el año."}
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
                    aria-label={`${formatLongDate(item.date)}, jornada prevista ${formatMinutes(item.scheduledMinutes)}${data.holidays[item.date] ? `, festivo ${data.holidays[item.date]}` : ""}. Editar día`}
                  >
                    <span className="day-cell-heading">
                      <span className="day-number">{item.day}</span>
                      <span className="planned-hours">{formatMinutes(item.scheduledMinutes)}</span>
                    </span>
                    {data.holidays[item.date] && (
                      <span className="holiday-label">{data.holidays[item.date]}</span>
                    )}
                    {item.record.activities.length > 0 && (
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
                    {item.record.activities.length > 0 && (
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
                    {item.record.coverages.length > 0 && (
                      <span className="activity-list">
                        {item.record.coverages.map((coverage) => (
                          <span className={`activity-chip ${coverage.paid ? "paid-coverage" : "bank-coverage"}`} key={coverage.id}>
                            <strong>{coverage.paid ? "CR" : "+CD"}</strong>
                            <span>{formatMinutes(coverage.minutes)}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    {item.record.activities.length === 0 &&
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

        <section className="management-grid" aria-label="Gestión de festivos y excepciones">
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
              <label>Descripción<input type="text" maxLength={80} value={holidayDescription} onChange={(event) => setHolidayDescription(event.target.value)} placeholder="Festivo local" /></label>
              <button type="submit" className="secondary-button">Añadir</button>
            </form>
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
            <p className="privacy-note">El PDF se procesa en este navegador y se descarta; solo se guardan las fechas que confirmes.</p>
            <ul className="date-list">
              {Object.entries(data.holidays)
                .filter(([date]) => date.startsWith(`${year}-`))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, description]) => (
                  <li key={date}>
                    <span><strong>{formatLongDate(date)}</strong> · {description}</span>
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
              <span>Jornada prevista: <strong>{formatMinutes(getScheduledMinutes(editingDate, data))}</strong></span>
              {data.holidays[editingDate] && <span>Festivo: {data.holidays[editingDate]}</span>}
              {Object.prototype.hasOwnProperty.call(data.exceptions, editingDate) && <span>Excepción de jornada</span>}
            </div>
            <h3>Actividades de la jornada</h3>
            <div className="draft-list">
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
                                      ? getScheduledMinutes(editingDate, data)
                                      : item.minutes,
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      {Object.entries(ACTIVITY_DEFINITIONS).map(([code, definition]) => (
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
            <div className="add-row">
              <label>
                Nueva actividad
                <select value={newActivityCode} onChange={(event) => setNewActivityCode(event.target.value as ActivityCode)}>
                  {Object.entries(ACTIVITY_DEFINITIONS).map(([code, definition]) => (
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
            {draftActivities.some((activity) => activity.code === "CD") && (
              <p className="dialog-note">
                Saldo CD antes del día: {formatMinutes(
                  getBankBalance(data, Number(editingDate.slice(0, 4)), editingDate) +
                    draftCoverages.filter((coverage) => !coverage.paid).reduce((sum, coverage) => sum + coverage.minutes, 0),
                )}. El consumo no puede superar el saldo disponible.
              </p>
            )}

            <h3>Cobertura extra fuera de jornada</h3>
            <div className="draft-list">
              {draftCoverages.map((coverage) => (
                <div className="draft-row coverage-row" key={coverage.id}>
                  <span>{coverage.paid ? "CR · Remunerada" : "Cobertura a bolsa CD"}</span>
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
            <div className="add-row">
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
            {!isPaidCoverageAllowed && (
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

      {holidayPreview.length > 0 && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHolidayPreview([]);
          }}
        >
          <section aria-labelledby="holiday-dialog-title" aria-modal="true" className="edit-dialog import-dialog" role="dialog">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">IMPORTACIÓN LOCAL</p>
                <h2 id="holiday-dialog-title">Revisar fechas detectadas</h2>
              </div>
              <button aria-label="Cerrar" className="dialog-close" onClick={() => setHolidayPreview([])} type="button">×</button>
            </div>
            <p className="dialog-note">Confirma las fechas que quieras guardar. El PDF original ya se ha descartado.</p>
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
              <button className="cancel-button" onClick={() => setHolidayPreview([])} type="button">Cancelar</button>
              <button className="save-button" onClick={confirmHolidayImport} type="button">Confirmar festivos</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
