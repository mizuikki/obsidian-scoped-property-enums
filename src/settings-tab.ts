import { App, PluginSettingTab, Setting } from "obsidian";
import type ScopedPropertyEnumsPlugin from "./main";

export class ScopedPropertyEnumsSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ScopedPropertyEnumsPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Scoped Property Enums" });
    containerEl.createEl("p", {
      text: "Rules match a vault-relative folder boundary, an exact frontmatter type, and an exact property name.",
    });

    const validation = this.plugin.validation;
    const status = containerEl.createDiv("scoped-property-enums-settings-status");
    if (validation.errors.length === 0) {
      status.setText(`${validation.rules.length} valid rules enabled.`);
      status.addClass("is-valid");
    } else {
      status.addClass("is-invalid");
      status.createEl("strong", {
        text: validation.supportedVersion
          ? `${validation.errors.length} configuration errors`
          : "Unsupported schema version. All rules are disabled.",
      });
      const list = status.createEl("ul");
      for (const error of validation.errors) {
        list.createEl("li", { text: `${error.path}: ${error.message}` });
      }
    }

    let editorValue = JSON.stringify(validation.raw, null, 2);
    const editorSection = containerEl.createDiv("scoped-property-enums-settings-section");
    editorSection.createEl("h3", { text: "Enum rules" });
    editorSection.createEl("p", {
      text: "Invalid rules remain in the JSON document but are excluded from matching.",
    });
    const editor = editorSection.createEl("textarea", {
      cls: "scoped-property-enums-settings-editor",
      attr: { rows: "24", spellcheck: "false" },
    });
    editor.value = editorValue;
    editor.addEventListener("input", () => {
      editorValue = editor.value;
    });

    const actionError = containerEl.createDiv("scoped-property-enums-settings-action-error");
    new Setting(containerEl)
      .addButton((button) =>
        button
          .setButtonText("Apply")
          .setCta()
          .onClick(async () => {
            actionError.empty();
            try {
              const raw: unknown = JSON.parse(editorValue);
              await this.plugin.replaceSettings(raw);
              this.display();
            } catch (error: unknown) {
              actionError.setText(
                error instanceof SyntaxError
                  ? `Invalid JSON: ${error.message}`
                  : "Could not save settings.",
              );
            }
          }),
      )
      .addButton((button) =>
        button.setButtonText("Restore defaults").onClick(async () => {
          actionError.empty();
          try {
            await this.plugin.restoreDefaultSettings();
            this.display();
          } catch {
            actionError.setText("Could not restore default settings.");
          }
        }),
      );
  }
}
