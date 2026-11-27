import * as XLSX from "xlsx";
import {
  HOLIDAY_DEFINITIONS,
  getDateKey,
  isDateKey,
  type DateKey,
  type HolidayCode,
} from "./schedule";

export interface HolidayImportEntry {
  date: DateKey;
  code: HolidayCode;
  description: string;
}

function parseDate(value: unknown, year: number): DateKey | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const date = getDateKey(value.getFullYear(), value.getMonth(), value.getDate());
    return date.startsWith(`${year}-`) && isDateKey(date) ? date : null;
  }
  if (typeof value === "number") {
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts || parts.y !== year) return null;
    const date = getDateKey(parts.y, parts.m - 1, parts.d);
    return isDateKey(date) ? date : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const spanish = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (!iso && !spanish) return null;
  const parsedYear = Number(iso?.[1] ?? spanish?.[3]);
  const month = Number(iso?.[2] ?? spanish?.[2]);
  const day = Number(iso?.[3] ?? spanish?.[1]);
  if (parsedYear !== year) return null;
  const date = getDateKey(parsedYear, month - 1, day);
  return isDateKey(date) ? date : null;
}

function parseCode(value: unknown): HolidayCode | null {
  if (typeof value !== "string") return null;
  const code = /^((?:DI|FL|FA|FN))\b/i.exec(value.trim())?.[1].toUpperCase();
  return code && Object.prototype.hasOwnProperty.call(HOLIDAY_DEFINITIONS, code)
    ? (code as HolidayCode)
    : null;
}

function parseCsv(text: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("El CSV contiene un campo entrecomillado sin cerrar.");
  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function rowsToEntries(rows: unknown[][], year: number): HolidayImportEntry[] {
  if (rows.length === 0) return [];
  const normalizeHeader = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase("es-ES")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const headers = rows[0].map(normalizeHeader);
  const dateColumn = headers.findIndex((value) => value === "fecha" || value === "date");
  const codeColumn = headers.findIndex(
    (value) =>
      value === "codigo" ||
      value === "code" ||
      value === "tipo" ||
      value === "nomenclatura",
  );
  const descriptionColumn = headers.findIndex(
    (value) => value === "descripcion" || value === "description",
  );
  const hasHeader = dateColumn >= 0 || codeColumn >= 0;
  const columns = {
    date: hasHeader && dateColumn >= 0 ? dateColumn : 0,
    code: hasHeader && codeColumn >= 0 ? codeColumn : 1,
    description:
      hasHeader && descriptionColumn >= 0 ? descriptionColumn : 2,
  };
  const entries: HolidayImportEntry[] = [];
  for (const [index, row] of rows.entries()) {
    if (hasHeader && index === 0) continue;
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const date = parseDate(row[columns.date], year);
    const code = parseCode(row[columns.code]);
    if (!date || !code) {
      throw new Error(
        `La fila ${index + 1} debe incluir una fecha válida de ${year} y un código DI, FL, FA o FN.`,
      );
    }
    const description = String(row[columns.description] ?? "").trim();
    entries.push({
      date,
      code,
      description: description || HOLIDAY_DEFINITIONS[code],
    });
  }
  return entries;
}

export function parseHolidayCsv(
  text: string,
  year: number,
  delimiter: "," | ";",
): HolidayImportEntry[] {
  return rowsToEntries(parseCsv(text, delimiter), year);
}

export async function parseHolidaySpreadsheet(
  file: File,
  year: number,
): Promise<HolidayImportEntry[]> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("El fichero supera el límite local de 20 MB.");
  }
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
    type: "array",
    cellDates: true,
  });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("El fichero Excel no contiene hojas.");
  return rowsToEntries(
    XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
      header: 1,
      raw: true,
      defval: "",
    }),
    year,
  );
}
