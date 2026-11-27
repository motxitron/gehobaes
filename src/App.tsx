import { useEffect, useMemo, useState } from "react";

type Activity = "coverage" | "vacation" | "leave" | "nonbillable";
type Schedule = Record<string, Activity>;

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
const ACTIVITIES: Record<
  Activity,
  { label: string; short: string; className: string }
> = {
  coverage: { label: "Cobertura", short: "COB", className: "coverage" },
  vacation: { label: "Vacaciones", short: "VAC", className: "vacation" },
  leave: { label: "Permiso", short: "PER", className: "leave" },
  nonbillable: {
    label: "No facturable",
    short: "NF",
    className: "nonbillable",
  },
};

const DEMO_SCHEDULE: Schedule = {
  "2025-01-08": "coverage",
  "2025-01-15": "coverage",
  "2025-01-20": "leave",
  "2025-01-21": "leave",
  "2025-01-27": "nonbillable",
  "2025-02-05": "coverage",
  "2025-02-12": "vacation",
  "2025-02-13": "vacation",
  "2025-02-14": "vacation",
};
const STORAGE_KEY = "motxitron-demo-schedule-v1";

function getDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function loadSchedule(): { schedule: Schedule; error: boolean } {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { schedule: DEMO_SCHEDULE, error: false };

    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { schedule: DEMO_SCHEDULE, error: true };
    }

    const schedule: Schedule = {};
    for (const [date, activity] of Object.entries(parsed)) {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        typeof activity === "string" &&
        activity in ACTIVITIES
      ) {
        schedule[date] = activity as Activity;
      }
    }
    return { schedule, error: false };
  } catch {
    return { schedule: DEMO_SCHEDULE, error: true };
  }
}

function App() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(0);
  const [stored, setStored] = useState(loadSchedule);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | "">("");
  const [saveError, setSaveError] = useState(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const today = new Date();
  const todayDate = getDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.schedule));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [stored.schedule]);

  useEffect(() => {
    if (focusDate) document.getElementById(`day-${focusDate}`)?.focus();
  }, [focusDate, focusRequest]);

  const yearOptions = useMemo(
    () => Array.from({ length: 16 }, (_, index) => 2020 + index),
    [],
  );
  const days = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const date = getDateKey(year, month, day);
      return { day, date, activity: stored.schedule[date] };
    });
  }, [year, month, stored.schedule]);

  function changeMonth(offset: number) {
    const next = new Date(year, month + offset, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function openEditor(date: string, activity?: Activity) {
    setEditingDate(date);
    setSelectedActivity(activity ?? "");
  }

  function saveActivity() {
    if (!editingDate) return;
    setStored((current) => {
      const schedule = { ...current.schedule };
      if (selectedActivity) schedule[editingDate] = selectedActivity;
      else delete schedule[editingDate];
      return { schedule, error: false };
    });
    setEditingDate(null);
  }

  const markedDays = days.filter((day) => day?.activity).length;
  const coverageCount = days.filter(
    (day) => day?.activity === "coverage",
  ).length;

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
            <span className="chevron" aria-hidden="true">
              ⌄
            </span>
          </div>
        </div>
      </header>

      <div className="page-content" id="inicio">
        <section className="page-heading">
          <div>
            <p className="eyebrow">PLANIFICACIÓN PERSONAL</p>
            <h1>Mis horarios</h1>
            <p className="subtitle">
              Consulta y actualiza tu calendario mensual.
            </p>
          </div>
          <label className="year-picker">
            <span>Año</span>
            <select
              aria-label="Seleccionar año"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="notice" role="status">
          <span className="notice-icon" aria-hidden="true">
            i
          </span>
          <p>
            <strong>Prototipo con datos ficticios.</strong> Los cambios se
            guardan solo en este navegador; no hay inicio de sesión ni permisos
            reales.
          </p>
        </section>
        {(stored.error || saveError) && (
          <p className="storage-warning" role="alert">
            No se pudo leer o guardar el calendario en este navegador. Los
            cambios pueden no conservarse al cerrar la página.
          </p>
        )}

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
              <div>
                <dt>Dominio</dt>
                <dd>
                  <span className="tag tag-blue">TEC</span>
                </dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>Tecnológico</dd>
              </div>
              <div>
                <dt>Tipo de cuenta</dt>
                <dd>Usuario normal</dd>
              </div>
              <div>
                <dt>Jornada</dt>
                <dd>9 h / 7 h verano</dd>
              </div>
            </dl>
            <div className="profile-footnote">
              <span aria-hidden="true">◇</span>
              Perfil ficticio para el piloto
            </div>
          </aside>

          <section className="calendar-card" aria-label="Calendario mensual">
            <div className="calendar-toolbar">
              <div className="month-title">
                <h2>
                  {MONTHS[month]} <span>{year}</span>
                </h2>
                <p>
                  {markedDays} días marcados · {coverageCount} coberturas
                </p>
              </div>
              <div className="month-controls">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Mes anterior"
                  onClick={() => changeMonth(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Mes siguiente"
                  onClick={() => changeMonth(1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="today-button"
                  onClick={() => {
                    const today = new Date();
                    const date = getDateKey(
                      today.getFullYear(),
                      today.getMonth(),
                      today.getDate(),
                    );
                    setYear(today.getFullYear());
                    setMonth(today.getMonth());
                    setFocusDate(date);
                    setFocusRequest((request) => request + 1);
                  }}
                >
                  Today
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((weekday) => (
                <div className="weekday" key={weekday}>
                  {weekday}
                </div>
              ))}
              {days.map((item, index) =>
                item ? (
                  <button
                    className={`day-cell${item.activity ? " has-activity" : ""}${index % 7 > 4 ? " weekend" : ""}${item.date === todayDate ? " today" : ""}`}
                    type="button"
                    id={`day-${item.date}`}
                    aria-current={item.date === todayDate ? "date" : undefined}
                    key={item.date}
                    onClick={() => openEditor(item.date, item.activity)}
                    aria-label={`${item.day} de ${MONTHS[month]}${item.activity ? `, ${ACTIVITIES[item.activity].label}` : ""}. Editar`}
                  >
                    <span className="day-number">{item.day}</span>
                    {item.activity ? (
                      <span
                        className={`activity-chip ${ACTIVITIES[item.activity].className}`}
                      >
                        <span className="activity-dot" />
                        <span className="activity-label">
                          {ACTIVITIES[item.activity].label}
                        </span>
                        <span className="activity-short">
                          {ACTIVITIES[item.activity].short}
                        </span>
                      </span>
                    ) : (
                      <span className="empty-day-hint">+ Añadir</span>
                    )}
                  </button>
                ) : (
                  <div className="day-cell outside-month" key={`empty-${index}`} />
                ),
              )}
            </div>

            <div className="calendar-footer">
              <span>Selecciona un día para editar su actividad</span>
              <div className="legend" aria-label="Leyenda">
                {Object.entries(ACTIVITIES).map(([key, activity]) => (
                  <span className="legend-item" key={key}>
                    <span className={`legend-dot ${activity.className}`} />
                    {activity.label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

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
          <section
            aria-labelledby="dialog-title"
            aria-modal="true"
            className="edit-dialog"
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">EDITAR CALENDARIO</p>
                <h2 id="dialog-title">
                  {new Date(`${editingDate}T12:00:00`).toLocaleDateString(
                    "es-ES",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </h2>
              </div>
              <button
                aria-label="Cerrar"
                className="dialog-close"
                onClick={() => setEditingDate(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <label className="activity-select-label" htmlFor="activity-select">
              Actividad
            </label>
            <select
              id="activity-select"
              className="activity-select"
              value={selectedActivity}
              onChange={(event) =>
                setSelectedActivity(event.target.value as Activity | "")
              }
            >
              <option value="">Sin marca</option>
              {Object.entries(ACTIVITIES).map(([key, activity]) => (
                <option key={key} value={key}>
                  {activity.label}
                </option>
              ))}
            </select>
            <p className="dialog-note">
              Este cambio solo se almacena en el navegador actual.
            </p>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                onClick={() => setEditingDate(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="save-button"
                onClick={saveActivity}
                type="button"
              >
                Guardar actividad
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
