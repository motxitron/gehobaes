import { getDateKey, isDateKey, type DateKey } from "./schedule";

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
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
  const normalizedText = text.replace(/\s*([./-])\s*/g, "$1");
  const numericDate = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g;
  const writtenDate =
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi;

  for (const match of normalizedText.matchAll(numericDate)) {
    const [, dayText, monthText, yearText] = match;
    const parsedYear = Number(yearText);
    const day = Number(dayText);
    const month = Number(monthText);
    if (parsedYear === year && isValidDate(parsedYear, month, day)) {
      dates.add(getDateKey(parsedYear, month - 1, day));
    }
  }
  for (const match of normalizedText.matchAll(writtenDate)) {
    const [, dayText, monthText, yearText] = match;
    const parsedYear = Number(yearText);
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
    return extractDatesFromText(text, year);
  } finally {
    await loadingTask.destroy();
  }
}
