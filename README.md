# Scoped Property Enums

Scoped Property Enums is an Obsidian desktop plugin that adds single-select menus to controlled frontmatter properties. A rule must match the note's vault-relative folder, exact `type`, and exact property name before the plugin offers a menu.

The plugin writes ordinary YAML strings through Obsidian's `FileManager.processFrontMatter()` API. Disabling or uninstalling it leaves notes, Bases, QuickAdd, and other workflows unchanged.

## Compatibility

- Obsidian Desktop 1.12.7
- Desktop only (`isDesktopOnly: true`)
- No network access
- No runtime dependencies, UI frameworks, Dataview, or Templater

The package uses `obsidian@1.12.3` for compile-time API types and does not use APIs introduced in Obsidian 1.13.

## Default Rules

| Folder | Type | Property | Values |
| --- | --- | --- | --- |
| `05-Proposals` | `proposal` | `status` | `draft`, `under-review`, `approved`, `rejected`, `withdrawn` |
| `10-Projects`, `90-Archive/Projects` | `project` | `status` | `active`, `on-hold`, `completed`, `archived` |
| `12-ADR` | `adr` | `status` | `proposed`, `accepted`, `deprecated`, `superseded` |
| `11-Project-Notes` | `project-note` | `note_kind` | `meeting`, `experiment`, `debug`, `research`, `review` |

Folder matching uses a path boundary, so `05-Proposals/a.md` matches `05-Proposals`, while `05-Proposals-Old/a.md` does not. Type, property, and value comparisons are case-sensitive.

## Use

In a matching Properties row or Bases table cell, select the list icon at the right edge of the native editor and choose a value. An unsupported current value remains visible and is marked with an alert icon; it changes only after an explicit legal selection.

The command `Scoped Property Enums: Edit scoped enum property` is the fallback when an Obsidian UI change prevents DOM enhancement. It opens a searchable note picker, with the active Markdown note sorted first when it matches. Bases rows are never inferred from the active file.

## Settings

The settings document has `schemaVersion: 1` and an `enumRules` array. The settings tab validates every rule and displays errors. Invalid rules are retained in the saved document but excluded from matching. An unknown schema version disables all rules. `Restore defaults` is the only automatic replacement operation.

Two rules with the same `type` and `property` may not have equal or ancestor/descendant folder scopes. Both overlapping rules are disabled instead of applying array-order precedence.

## Build and Test

```bash
npm install
npm run verify
```

Install `main.js`, `manifest.json`, and `styles.css` in:

```text
<vault>/.obsidian/plugins/scoped-property-enums/
```

The repository includes automated tests for rule matching, settings validation, stale-menu revalidation, YAML failures, concurrent updates, and sanitized Obsidian 1.12.7 DOM fixtures.

## Failure Behavior

The plugin does not replace Obsidian's native inputs. It omits its trigger when the file or property cannot be resolved uniquely. Bases resolution requires both the canonical `data-property="note.<name>"` cell identifier and exactly one exact vault path from that row's `file.name` cell. Formula and `file.*` columns are excluded. Missing files, invalid YAML, changed types, changed rules, and invalidated values leave the target field unchanged and produce a notice.

See [DOM feasibility](docs/dom-feasibility-1.12.7.md) and [manual acceptance](docs/manual-acceptance.md) for compatibility evidence and the release checklist.
