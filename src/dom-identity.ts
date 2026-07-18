export function canonicalBaseProperty(cell: HTMLElement): string | null {
  if (
    !cell.matches(".bases-tbody .bases-tr > .bases-td") ||
    cell.closest(".bases-thead, .bases-table-group-summary-row, .bases-table-footer")
  ) {
    return null;
  }
  const propertyId = cell.dataset.property;
  if (!propertyId?.startsWith("note.")) return null;
  const property = propertyId.slice("note.".length);
  return property.length > 0 ? property : null;
}

export function exactRowFilePath(cell: HTMLElement): string | null {
  const row = cell.closest<HTMLElement>(".bases-tr");
  if (!row) return null;
  const fileCells = Array.from(
    row.querySelectorAll<HTMLElement>(":scope > .bases-td[data-property='file.name']"),
  );
  if (fileCells.length !== 1) return null;
  const paths = new Set(
    Array.from(fileCells[0].querySelectorAll<HTMLElement>("[data-href]"))
      .map((link) => link.getAttribute("data-href"))
      .filter((path): path is string => Boolean(path)),
  );
  return paths.size === 1 ? [...paths][0] : null;
}
