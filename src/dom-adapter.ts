import { Notice, setIcon, type App, type TFile } from "obsidian";
import { resolveBasesTarget, resolvePropertiesTarget, type DomTarget } from "./dom-context";
import { matchRule, type ScopedEnumRule } from "./rules";

const BUTTON_CLASS = "scoped-property-enums-trigger";

export class ScopedEnumDomAdapter {
  private readonly observers = new Map<Document, MutationObserver>();
  private readonly scheduled = new Map<Document, number>();

  constructor(
    private readonly app: App,
    private readonly getRules: () => readonly ScopedEnumRule[],
    private readonly openPicker: (
      file: TFile,
      property: string,
      rule: ScopedEnumRule,
    ) => void,
  ) {}

  start(): void {
    this.refresh();
  }

  refresh(): void {
    const documents = this.findDocuments();
    for (const document of documents) {
      if (!this.observers.has(document)) {
        const ViewMutationObserver = document.defaultView?.MutationObserver;
        if (!ViewMutationObserver || !document.body) continue;
        const observer = new ViewMutationObserver(() => this.schedule(document));
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-property", "data-property-key"],
        });
        this.observers.set(document, observer);
      }
      this.reconcile(document);
    }
    for (const [document, observer] of this.observers) {
      if (documents.has(document)) continue;
      observer.disconnect();
      this.observers.delete(document);
    }
  }

  stop(): void {
    for (const observer of this.observers.values()) observer.disconnect();
    for (const [document, handle] of this.scheduled) {
      document.defaultView?.cancelAnimationFrame(handle);
    }
    this.observers.clear();
    this.scheduled.clear();
    for (const document of this.findDocuments()) {
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((element) => element.remove());
    }
  }

  private findDocuments(): Set<Document> {
    const documents = new Set<Document>();
    if (typeof document !== "undefined") documents.add(document);
    for (const type of ["markdown", "bases"]) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        const container = (leaf.view as { containerEl?: HTMLElement }).containerEl;
        if (container) documents.add(container.ownerDocument);
      }
    }
    return documents;
  }

  private schedule(document: Document): void {
    if (this.scheduled.has(document)) return;
    const handle = document.defaultView?.requestAnimationFrame(() => {
      this.scheduled.delete(document);
      this.reconcile(document);
    });
    if (handle !== undefined) this.scheduled.set(document, handle);
  }

  private reconcile(document: Document): void {
    const candidates = document.querySelectorAll<HTMLElement>(
      ".metadata-property[data-property-key], .bases-tbody .bases-td[data-property^='note.']",
    );
    for (const element of candidates) this.reconcileElement(element);

    for (const button of document.querySelectorAll<HTMLButtonElement>(`.${BUTTON_CLASS}`)) {
      const owner = button.closest<HTMLElement>(
        ".metadata-property[data-property-key], .bases-td[data-property]",
      );
      if (!owner || !Array.from(candidates).includes(owner)) button.remove();
    }
  }

  private reconcileElement(element: HTMLElement): void {
    const target = element.matches(".metadata-property")
      ? resolvePropertiesTarget(this.app, element)
      : resolveBasesTarget(this.app, element);
    const existing = element.querySelector<HTMLButtonElement>(`:scope .${BUTTON_CLASS}`);
    const matched = target ? this.renderMatch(target) : null;
    if (!target || !matched) {
      existing?.remove();
      return;
    }

    const { rule, currentValue } = matched;
    const button = existing ?? this.createButton(target);
    const unsupported =
      currentValue !== undefined &&
      (typeof currentValue !== "string" || !rule.values.includes(currentValue));
    button.dataset.filePath = target.file.path;
    button.dataset.property = target.property;
    button.toggleClass("is-unsupported", unsupported);
    const icon = unsupported ? "circle-alert" : "list-chevrons-up-down";
    if (button.dataset.icon !== icon) {
      setIcon(button, icon);
      button.dataset.icon = icon;
    }
    const label = unsupported
      ? `Choose ${target.property}. The current value is unsupported.`
      : `Choose ${target.property}`;
    button.setAttr("aria-label", label);
    button.setAttr("data-tooltip-position", "top");
    if (!existing) target.anchor.appendChild(button);
  }

  private renderMatch(
    target: DomTarget,
  ): { rule: ScopedEnumRule; currentValue: unknown } | null {
    const frontmatter = this.app.metadataCache.getFileCache(target.file)?.frontmatter;
    if (
      target.kind === "properties" &&
      frontmatter &&
      !Object.prototype.hasOwnProperty.call(frontmatter, target.property)
    ) {
      return null;
    }
    const rule = matchRule(this.getRules(), target.file.path, frontmatter?.type, target.property);
    return rule ? { rule, currentValue: frontmatter?.[target.property] } : null;
  }

  private createButton(target: DomTarget): HTMLButtonElement {
    const button = target.anchor.ownerDocument.createElement("button");
    button.type = "button";
    button.className = `clickable-icon ${BUTTON_CLASS}`;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const owner = button.closest<HTMLElement>(
        ".metadata-property[data-property-key], .bases-td[data-property]",
      );
      const currentTarget = owner?.matches(".metadata-property")
        ? resolvePropertiesTarget(this.app, owner)
        : owner
          ? resolveBasesTarget(this.app, owner)
          : null;
      const matched = currentTarget ? this.renderMatch(currentTarget) : null;
      if (!currentTarget || !matched) {
        button.remove();
        new Notice("Scoped Property Enums: this editor target is no longer available.");
        return;
      }
      this.openPicker(currentTarget.file, currentTarget.property, matched.rule);
    });
    return button;
  }
}
