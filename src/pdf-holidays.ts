import { getDateKey, isDateKey, type DateKey } from "./schedule";

const MONTHS: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  sep: 9,
  setiembre: 9,
  set: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function extractDatesFromText(text: string, year: number): DateKey[] {
  const dates = new Set<DateKey>();
  const normalizedText = text
    .replace(/\s*([./-])\s*/g, "$1")
    .replace(/(\d)\s+(?=\d)/g, "$1");
  const numericDate =
    /\b(\d{1,2})[./-](\d{1,2})(?:(?:[./-]|\s+)(\d{4}))?\b/g;
  const isoDate = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
  const writtenDate =
    /\b(\d{1,2})\s+(?:de\s+)?(enero|ene|febrero|feb|marzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|ago|septiembre|sep|setiembre|set|octubre|oct|noviembre|nov|diciembre|dic)\.?(?:\s+(?:de\s+)?(\d{4}))?\b/gi;

  for (const match of normalizedText.matchAll(numericDate)) {
    const [, dayText, monthText, yearText] = match;
    const parsedYear = yearText ? Number(yearText) : year;
    const day = Number(dayText);
    const month = Number(monthText);
    if (parsedYear === year && isValidDate(parsedYear, month, day)) {
      dates.add(getDateKey(parsedYear, month - 1, day));
    }
  }
  for (const match of normalizedText.matchAll(isoDate)) {
    const [, yearText, monthText, dayText] = match;
    const parsedYear = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (parsedYear === year && isValidDate(parsedYear, month, day)) {
      dates.add(getDateKey(parsedYear, month - 1, day));
    }
  }
  for (const match of normalizedText.matchAll(writtenDate)) {
    const [, dayText, monthText, yearText] = match;
    const parsedYear = yearText ? Number(yearText) : year;
    const day = Number(dayText);
    const month = MONTHS[monthText.toLocaleLowerCase("es-ES")];
    if (parsedYear === year && month && isValidDate(parsedYear, month, day)) {
      dates.add(getDateKey(parsedYear, month - 1, day));
    }
  }
  return [...dates].filter(isDateKey).sort();
}

export async function extractHolidayDates(
  file: File,
  year: number,
): Promise<DateKey[]> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("El PDF supera el límite local de 20 MB.");
  }
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] =
    await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = getDocument({ data: await file.arrayBuffer() });
  try {
    const document = await loadingTask.promise;
    if (document.numPages > 50) {
      throw new Error("El PDF supera el límite local de 50 páginas.");
    }
    let text = "";
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      text += ` ${content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")}`;
    }
    if (!text.trim()) {
      throw new Error(
        "El PDF no contiene texto seleccionable; si está escaneado, añade los festivos manualmente.",
      );
    }
    return extractDatesFromText(text, year);
  } finally {
    await loadingTask.destroy();
  }
}
