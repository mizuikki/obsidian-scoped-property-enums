import {
  FuzzySuggestModal,
  Notice,
  SuggestModal,
  TFile,
  type App,
} from "obsidian";
import type { ScopedEnumRule } from "./rules";

interface EnumChoice {
  value: string;
  unsupported: boolean;
}

export class EnumValueModal extends SuggestModal<EnumChoice> {
  private readonly choices: EnumChoice[];

  constructor(
    app: App,
    private readonly file: TFile,
    private readonly property: string,
    rule: ScopedEnumRule,
    currentValue: unknown,
    private readonly onSelect: (value: string) => Promise<void>,
  ) {
    super(app);
    const unsupported =
      currentValue !== undefined &&
      (typeof currentValue !== "string" || !rule.values.includes(currentValue))
        ? [
            {
              value:
                typeof currentValue === "string"
                  ? currentValue
                  : "(unsupported non-string current value)",
              unsupported: true,
            },
          ]
        : [];
    this.choices = [
      ...unsupported,
      ...rule.values.map((value) => ({ value, unsupported: false })),
    ];
    this.setPlaceholder(`Choose ${property} for ${file.basename}`);
  }

  getSuggestions(query: string): EnumChoice[] {
    const normalized = query.toLocaleLowerCase();
    return this.choices.filter((choice) =>
      choice.value.toLocaleLowerCase().includes(normalized),
    );
  }

  renderSuggestion(choice: EnumChoice, element: HTMLElement): void {
    element.setText(
      choice.unsupported ? `${choice.value} (unsupported current value)` : choice.value,
    );
    element.toggleClass("scoped-property-enums-unsupported", choice.unsupported);
    element.setAttr("aria-disabled", choice.unsupported ? "true" : "false");
  }

  onChooseSuggestion(choice: EnumChoice): void {
    if (choice.unsupported) return;
    void this.onSelect(choice.value).catch((error: unknown) => {
      console.error("Scoped Property Enums update failed", {
        file: this.file.path,
        property: this.property,
        error,
      });
      new Notice(
        error instanceof Error
          ? `Scoped Property Enums: ${error.message}`
          : "Scoped Property Enums could not update the file.",
      );
    });
  }
}

export class TargetFileModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly files: TFile[],
    private readonly onSelect: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose a note with a scoped enum property");
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onSelect(file);
  }
}
