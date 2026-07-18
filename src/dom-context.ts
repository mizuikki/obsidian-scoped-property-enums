import { TFile, type App } from "obsidian";
import { canonicalBaseProperty, exactRowFilePath } from "./dom-identity";

export interface DomTarget {
  file: TFile;
  property: string;
  kind: "properties" | "bases";
  anchor: HTMLElement;
}

interface FileBackedView {
  containerEl?: HTMLElement;
  file?: TFile;
}

function uniqueMarkdownViewFile(app: App, element: HTMLElement): TFile | null {
  const files = app.workspace
    .getLeavesOfType("markdown")
    .map((leaf) => leaf.view as FileBackedView)
    .filter((view) => view.containerEl?.contains(element) && view.file instanceof TFile)
    .map((view) => view.file as TFile);
  return files.length === 1 ? files[0] : null;
}

export function resolvePropertiesTarget(
  app: App,
  propertyRow: HTMLElement,
): DomTarget | null {
  if (!propertyRow.matches(".metadata-property[data-property-key]")) return null;
  const property = propertyRow.getAttribute("data-property-key");
  const anchor = propertyRow.querySelector<HTMLElement>(".metadata-property-value");
  const file = uniqueMarkdownViewFile(app, propertyRow);
  if (!property || !anchor || !file || file.extension !== "md") return null;
  return { file, property, kind: "properties", anchor };
}

export function resolveBasesTarget(app: App, cell: HTMLElement): DomTarget | null {
  const property = canonicalBaseProperty(cell);
  const path = exactRowFilePath(cell);
  const anchor = cell.querySelector<HTMLElement>(".bases-table-cell");
  if (!property || !path || !anchor) return null;
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile) || file.extension !== "md") return null;
  return { file, property, kind: "bases", anchor };
}
