# Obsidian 1.12.7 DOM Feasibility

## Result

The 1.12.7 desktop structures provide sufficient stable identity signals for progressive enhancement without using visible labels or the active file as a Bases fallback.

| Context | File identity | Property identity | Failure behavior |
| --- | --- | --- | --- |
| Properties | The sole Markdown leaf whose `containerEl` contains the property row, then that view's `TFile` | `.metadata-property[data-property-key]` | No trigger unless both are unique |
| Top-level Base | Exactly one `data-href` path in the same row's `.bases-td[data-property="file.name"]` | Target cell `data-property="note.<name>"` | No trigger when either signal is missing or ambiguous |
| Embedded Base | Same row-local identity as a top-level Base | Same canonical cell identifier | No dependency on the containing or active Markdown file |

Formula IDs (`formula.*`) and computed file IDs (`file.*`) are rejected before rule matching. Row identity remains local to the interacted row, so sorting, filtering, view changes, multiple tabs, pop-out documents, and virtualized rerenders cannot redirect a selection to an active Markdown file.

If the `file.name` identity cell is hidden or horizontally absent from the rendered row, the plugin deliberately omits the enhancement. Native Bases editing remains available. This is a safe loss of enhancement rather than a guessed write target.

## Evidence

- Runtime inspected: Obsidian Flatpak 1.12.7, installed build reported by `flatpak info md.obsidian.Obsidian` on 2026-07-17.
- Application package inspected: `/app/resources/obsidian.asar` from the running 1.12.7 process.
- Relevant 1.12.7 implementation signals:
  - Properties rows set `data-property-key` on `.metadata-property`.
  - Bases table cells set `dataset.property` to the canonical property ID.
  - Note properties use `note.<name>`; formula and implicit file properties use their own namespaces.
  - The file renderer emits the row file link with `data-href`.
- Sanitized fixtures: `tests/fixtures/obsidian-1.12.7/`.
- Automated checks: `tests/dom-identity.test.ts` covers sorted rows, filtered/reordered rows, embedded Bases, hidden identity columns, ambiguous links, formulas, and `file.*` columns.

No note content is present in the fixtures. File names and values are synthetic.

## Adapter Boundary

All private DOM knowledge is isolated in `src/dom-identity.ts`, `src/dom-context.ts`, and `src/dom-adapter.ts`. The write service accepts only a resolved `TFile` and canonical property, and performs its own final rule check inside `processFrontMatter()`. Removing the adapter leaves the command workflow and YAML storage intact.

## Upgrade Rule

Obsidian upgrades require rerunning the manual matrix and recapturing sanitized fixtures. A selector mismatch must remove the enhancement, not introduce a fallback based on focus, visible text, a Base view label, or `workspace.getActiveFile()`.
