import { Modal, Notice, Plugin, SuggestModal, TFile } from "obsidian";
import { ScopedEnumDomAdapter } from "./dom-adapter";
import { EnumValueModal, TargetFileModal } from "./modals";
import {
  cloneDefaultSettings,
  folderContains,
  matchRule,
  validateSettings,
  type ScopedEnumRule,
  type ValidatedSettings,
} from "./rules";
import { ScopedPropertyEnumsSettingTab } from "./settings-tab";
import { ScopedEnumUpdateService } from "./update-service";

class PropertyRuleModal extends SuggestModal<ScopedEnumRule> {
  constructor(
    app: ScopedPropertyEnumsPlugin["app"],
    private readonly rules: ScopedEnumRule[],
    private readonly onSelect: (rule: ScopedEnumRule) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose a property");
  }

  getSuggestions(query: string): ScopedEnumRule[] {
    const normalized = query.toLocaleLowerCase();
    return this.rules.filter((rule) =>
      rule.property.toLocaleLowerCase().includes(normalized),
    );
  }

  renderSuggestion(rule: ScopedEnumRule, element: HTMLElement): void {
    element.setText(rule.property);
  }

  onChooseSuggestion(rule: ScopedEnumRule): void {
    this.onSelect(rule);
  }
}

export default class ScopedPropertyEnumsPlugin extends Plugin {
  validation: ValidatedSettings = validateSettings(cloneDefaultSettings());
  private updateService!: ScopedEnumUpdateService;
  private domAdapter!: ScopedEnumDomAdapter;
  private activeModal: Modal | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.updateService = new ScopedEnumUpdateService(
      this.app.fileManager,
      () => this.validation.rules,
    );
    this.domAdapter = new ScopedEnumDomAdapter(
      this.app,
      () => this.validation.rules,
      (file, property, rule) => this.openValuePicker(file, property, rule),
    );

    this.addSettingTab(new ScopedPropertyEnumsSettingTab(this.app, this));
    this.addCommand({
      id: "edit-scoped-property-enum",
      name: "Edit scoped enum property",
      callback: () => this.openTargetPicker(),
    });

    this.registerEvent(this.app.workspace.on("layout-change", () => this.domAdapter.refresh()));
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.domAdapter.refresh()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.domAdapter.refresh()),
    );
    this.domAdapter.start();
    this.register(() => this.domAdapter.stop());
    this.register(() => this.activeModal?.close());

    if (!this.validation.supportedVersion) {
      new Notice(
        "Scoped Property Enums: unsupported settings schema. All rules are disabled.",
      );
    } else if (this.validation.errors.length > 0) {
      new Notice(
        `Scoped Property Enums: ${this.validation.errors.length} invalid configuration entries are disabled.`,
      );
    }
  }

  private async loadSettings(): Promise<void> {
    const loaded: unknown = await this.loadData();
    if (loaded === null || loaded === undefined) {
      const defaults = cloneDefaultSettings();
      await this.saveData(defaults);
      this.validation = validateSettings(defaults);
      return;
    }
    this.validation = validateSettings(loaded);
  }

  async replaceSettings(raw: unknown): Promise<void> {
    await this.saveData(raw);
    this.validation = validateSettings(raw);
    this.domAdapter?.refresh();
  }

  async restoreDefaultSettings(): Promise<void> {
    await this.replaceSettings(cloneDefaultSettings());
  }

  private cachedRulesForFile(file: TFile): ScopedEnumRule[] {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (typeof frontmatter?.type !== "string") return [];
    const properties = new Set(
      this.validation.rules
        .filter(
          (rule) =>
            rule.type === frontmatter.type &&
            rule.folders.some((folder) => folderContains(folder, file.path)),
        )
        .map((rule) => rule.property),
    );
    return [...properties].flatMap((property) => {
      const rule = matchRule(
        this.validation.rules,
        file.path,
        frontmatter.type,
        property,
      );
      return rule ? [rule] : [];
    });
  }

  private openTargetPicker(): void {
    const activeFile = this.app.workspace.getActiveFile();
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => this.cachedRulesForFile(file).length > 0)
      .sort((left, right) => {
        if (left === activeFile) return -1;
        if (right === activeFile) return 1;
        return left.path.localeCompare(right.path);
      });
    if (files.length === 0) {
      new Notice("Scoped Property Enums: no matching notes were found.");
      return;
    }
    this.openManagedModal(
      new TargetFileModal(this.app, files, (file) => this.chooseProperty(file)),
    );
  }

  private chooseProperty(file: TFile): void {
    const rules = this.cachedRulesForFile(file);
    if (rules.length === 1) {
      this.openValuePicker(file, rules[0].property, rules[0]);
    } else if (rules.length > 1) {
      this.openManagedModal(
        new PropertyRuleModal(this.app, rules, (rule) =>
          this.openValuePicker(file, rule.property, rule),
        ),
      );
    } else {
      new Notice("Scoped Property Enums: the selected note no longer matches a rule.");
    }
  }

  private openValuePicker(
    file: TFile,
    property: string,
    renderedRule: ScopedEnumRule,
  ): void {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const currentRule = matchRule(
      this.validation.rules,
      file.path,
      frontmatter?.type,
      property,
    );
    if (!currentRule || currentRule !== renderedRule) {
      new Notice("Scoped Property Enums: the rule changed before the menu opened.");
      return;
    }
    this.openManagedModal(
      new EnumValueModal(
        this.app,
        file,
        property,
        currentRule,
        frontmatter?.[property],
        (value) => this.updateService.update(file, property, value),
      ),
    );
  }

  private openManagedModal(modal: Modal): void {
    this.activeModal?.close();
    this.activeModal = modal;
    modal.open();
  }
}
