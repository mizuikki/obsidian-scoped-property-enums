# Manual Acceptance Matrix

Target runtime: Obsidian Desktop 1.12.7 in an isolated test vault.

Acceptance run: 2026-07-18, Linux (KDE Plasma), Obsidian Desktop 1.12.7 (Flatpak), plugin commit `c846a10392c87d36e1c6f91b7bed857c5259b3de`, vault `tmp/.manual-test-vault`.

Record the date, operating system, exact Obsidian version, plugin commit, and result for every release candidate. Do not accept a Bases case unless the interacted row and canonical property can be confirmed from the resulting YAML.

## Notes and Values

- [x] Proposal Properties offers only `draft`, `under-review`, `approved`, `rejected`, `withdrawn`. PASS 2026-07-18: exact menu verified in `Proposals.base` and `approved` persisted to the proposal row.
- [x] Project Properties offers only `active`, `on-hold`, `completed`, `archived`. PASS 2026-07-18: exact menu verified in `Projects.base`.
- [x] Archived Project Properties uses the Project value set. PASS 2026-07-18: the archived row offered exactly `active`, `on-hold`, `completed`, `archived`.
- [x] ADR Properties offers only `proposed`, `accepted`, `deprecated`, `superseded`. PASS 2026-07-18: exact row-local menu verified and `deprecated` persisted.
- [x] Project Note Properties offers only `meeting`, `experiment`, `debug`, `research`, `review`. PASS 2026-07-18: exact row-local menu verified and `debug` persisted.
- [x] Templates, examples, `_README.md`, directory lookalikes, non-target properties, case-mismatched types, and missing types have no trigger. PASS 2026-07-18: dedicated fixtures for every category were opened in Markdown Properties and showed no plugin trigger.
- [x] The retained `note_kind: design` remains unchanged on plugin load, settings refresh, Base render, and menu open; it is marked unsupported and changes only after an explicit legal selection. PASS 2026-07-18: `design` remained in YAML and showed the red unsupported marker in Markdown Properties and Bases; only explicitly selecting `meeting` changed YAML.

## Properties Context

- [x] Two Markdown tabs resolve each property row to its own file. PASS 2026-07-18: `test-proposal` and `test-project` were open in separate tabs; selecting `rejected` and `active` updated only their respective YAML files.
- [x] Split panes and a pop-out window continue to resolve the containing Markdown leaf. PASS 2026-07-18: split `test-proposal` and `test-project` panes updated only their containing files; after moving the Project pane to a pop-out, selecting `completed` updated only `test-project.md`.
- [x] Rerendering Properties does not duplicate triggers. PASS 2026-07-18: repeated tab switches and Properties rerenders retained exactly one trigger on each matched row.
- [x] A changed type or moved/deleted file between menu open and selection does not write. PASS 2026-07-18: changing `type` after opening the menu and separately moving the file before selecting both left `status: draft` unchanged.
- [x] Disabling and uninstalling the plugin removes every trigger and leaves native text editing usable. PASS 2026-07-18: disabling removed the proposal trigger and the native status editor accepted `approved`; UI-confirmed uninstall removed the plugin card and left the native editor available.

## Bases Context

- [x] Top-level `Proposals.base`, `Projects.base`, and `Project Notes.base` write the interacted row only. PASS 2026-07-18: confirmed in each top-level Base; YAML checks showed only the selected row changed.
- [x] Dashboard embedded Open Proposals, All Projects, and All Material write the interacted row only. PASS 2026-07-18: selections in all four controlled embedded cells updated only their titled rows; YAML confirmed the targets.
- [x] Sorting and filtering do not change row identity. PASS 2026-07-18: descending title sort preserved identity (`test-project` alone changed to `on-hold`); in filtered `Needs Review`, selecting `active` on the missing-status row updated only `missing-status.md` and removed that row from the filter. The fixture was restored afterward.
- [x] Switching views and rerendering does not duplicate or misplace triggers. PASS 2026-07-18: repeated `All Projects` / `Needs Review` switches retained exactly one plugin trigger in each filtered status cell. DOM inspection confirmed one trigger for both the illegal and missing rows; the initial visual result was a misclassification of the compact trigger icons.
- [x] Multiple Base tabs and a pop-out Base preserve row-local identity. PASS 2026-07-18: `Proposals.base` in the main window and `Projects.base` in a pop-out both retained triggers; selections persisted only to the interacted proposal and project rows.
- [x] Formula columns and `file.*` columns never receive a trigger. PASS 2026-07-18: a `formula.status_copy` column and the `file.name` cells rendered without triggers while the canonical `status` cells remained enhanced.
- [x] Hiding `file.name` removes the enhancement unless an exact row identity remains available; native editing continues. PASS 2026-07-18: removing `file.name` from `All Projects` removed every enum trigger and the native status editor still accepted focus.
- [x] A row with missing or ambiguous file identity receives no trigger. PASS 2026-07-18: the no-`file.name` rows had no exact identity and received no plugin triggers.
- [x] Focusing another Markdown file never redirects a Base update. PASS 2026-07-18: after focusing `test-proposal.md`, returning to `Projects.base` and selecting `on-hold` changed only `test-project.md`; the proposal remained `approved`.

## Writes and Failures

- [x] Saved values are YAML strings and no unrelated key changes. PASS 2026-07-18: Base selections persisted as scalar YAML strings with surrounding frontmatter unchanged.
- [x] Invalid YAML produces a notice and leaves the file byte-for-byte unchanged. PASS 2026-07-18: frontmatter was made invalid after menu open; selection failed non-destructively and the SHA-256 remained `57e8262c0b067e81201f5f084da292db670571c1f8601bc1f742e9388a30107e`.
- [x] A rule or allowed value changed after menu open prevents the stale selection. PASS 2026-07-18: with the original four-value Project menu open, the live rule was replaced with `active` only; selecting the now-stale `completed` entry produced `Value is no longer allowed` and left `status: archived` plus SHA-256 `ae14fd69f03b5e334c873238a8443bbfbd396c563b241162c53683437f0a98bf` unchanged. Defaults were restored afterward.
- [x] Repeated identical choices are deduplicated and different choices for one file are serialized. PASS 2026-07-18: repeated `active` selections followed by rapid `completed` then `archived` selections completed without duplicate UI or YAML corruption; the serialized final scalar was `status: archived` and an unrelated proposal stayed byte-identical.
- [x] Missing/out-of-vault files and write failures produce non-destructive notices. PASS 2026-07-18: moving `test-project.md` outside the vault after menu open and separately removing write permission from both file and parent directory prevented the stale selections; the restored file retained SHA-256 `ae14fd69f03b5e334c873238a8443bbfbd396c563b241162c53683437f0a98bf`.
- [x] Reloading, disabling, and uninstalling do not rewrite any file. PASS 2026-07-18: the combined SHA-256 over every Markdown and Base file remained `7e030d31000976d995c7ee3cf1c2cba95dcae0e04e0b0af47fe817b52270f57c` after app reload, disable, and UI-confirmed uninstall.

## Settings and Command

- [x] First install stores and enables the four default rules. PASS 2026-07-18: initial `data.json` contained all four defaults and Settings reported `4 valid rules enabled`.
- [x] Invalid rules remain visible, show exact errors, and do not match. PASS 2026-07-18: a duplicate value remained in the JSON editor, showed `enumRules[0].values[1]: Duplicate value: draft`, and produced no trigger.
- [x] Overlapping scopes disable every conflicting rule. PASS 2026-07-18: `10-Projects` and `10-Projects/Sub` produced `enumRules[2]: Scope overlaps enumRules[1] for the same type and property`; the project Properties row had no trigger.
- [x] An unknown `schemaVersion` disables all rules and shows a notice. PASS 2026-07-18: schema `999` showed `Unsupported schema version. All rules are disabled` plus the exact schema error; the matching project row had no trigger.
- [x] Restore defaults occurs only after selecting the explicit button. PASS 2026-07-18: invalid saved rules persisted across closing/reopening Settings; selecting `Restore defaults` replaced them and restored `4 valid rules enabled`.
- [x] The command picker is searchable and sorts the active matching Markdown file first. PASS 2026-07-18: active `10-Projects/test-project.md` appeared first; searching `ADR-001` filtered to the ADR note.
- [x] The command requires explicit note selection and never chooses a background Base row. PASS 2026-07-18: dismissing the picker made no write; when invoked from `Projects.base`, it opened the note picker without preselecting or updating either visible Base row.

## Project-Level Validation

- [x] `Proposals.base#Needs Review` catches missing and illegal Proposal status. PASS 2026-07-18: the view showed the illegal fixture and both missing-status Proposal rows while excluding the legal Proposal.
- [x] `Projects.base#Needs Review` catches missing and illegal Project status. PASS 2026-07-18: the view showed exactly the illegal and missing Project fixtures.
- [x] `Project Notes.base#Needs Review` independently catches illegal Project Note `note_kind` and ADR `status` without cross-type checks. PASS 2026-07-18: the view showed exactly `illegal-kind` and the illegal ADR status row.
