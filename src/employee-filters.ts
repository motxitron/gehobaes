export function matchesEmployeeFilters(
  values: Readonly<Record<string, string>>,
  filters: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(filters).every(([key, filter]) => {
    const query = normalizeSearchText(filter);
    return (
      query.length === 0 ||
      normalizeSearchText(values[key] ?? "").includes(query)
    );
  });
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}
