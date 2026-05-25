# Research: Direct Spreadsheet Cell Editing

## Editable VS Code custom editor workflow

**Decision**: Replace the current `CustomReadonlyEditorProvider` with an
editable `CustomEditorProvider` backed by a custom document that owns workbook
state, undo/redo hooks, dirty tracking, save, revert, and backup behavior.

**Rationale**: `.xlsx` is a binary format, so the extension must provide its own
document model to integrate with VS Code save semantics. Official VS Code
guidance and the custom-editor sample both show that editable binary editors
should emit `CustomDocumentEditEvent` entries for user edits and serialize from
extension-side state rather than relying on a webview to remain alive.

**Alternatives considered**:

- **Keep `CustomReadonlyEditorProvider` and add ad hoc save commands**: Rejected
  because it would bypass normal dirty-state, revert, undo/redo, and backup
  behavior.
- **Convert `.xlsx` into a temporary text model**: Rejected because the source
  format is binary and the conversion would add avoidable complexity and risk.

## Workbook state ownership

**Decision**: Keep the authoritative editable workbook state in the extension
host (`XlsxCustomDocument`) and treat the webview as a rendering and edit-input
surface only.

**Rationale**: VS Code can save a custom editor while the webview is hidden, so
save logic cannot depend on reading DOM state. Holding the workbook, pending
edits, and save assessment in the document model keeps save/revert/backup logic
reliable and enables all open webviews for the same document to stay in sync.

**Alternatives considered**:

- **Serialize from the webview DOM on save**: Rejected because hidden webviews
  may be suspended and because it makes save correctness depend on UI state.
- **Use `retainContextWhenHidden: true` to keep the DOM alive**: Rejected
  because VS Code documentation treats that as a memory-heavy escape hatch, not
  the preferred architecture.

## SheetJS edit and save strategy

**Decision**: Mutate specific worksheet cell objects in the in-memory SheetJS
  workbook and save with `XLSX.write(workbook, { type: 'buffer', bookType:
  'xlsx', cellStyles: true })`, then write bytes with
  `vscode.workspace.fs.writeFile`.

**Rationale**: SheetJS CE is already the repository's parsing stack, so reusing
it keeps the design minimal. Direct cell mutation plus buffer serialization is
the supported path for Node and extension environments, and it avoids temporary
files or external processes.

**Alternatives considered**:

- **Swap to ExcelJS for editing only**: Rejected because the repository already
  uses SheetJS and changing the workbook engine would increase migration and
  test cost.
- **Implement raw OOXML ZIP/XML rewriting**: Rejected because it is too complex
  for the first editable milestone.

## Save-fidelity safety rules

**Decision**: Enable editing only for workbook, worksheet, and cell shapes that
this release can preserve safely. Keep risky workbooks read-only, mark blocked
worksheets or cells as non-editable where granularity is sufficient, and surface
explicit reasons for every disabled editing path.

**Rationale**: SheetJS CE does not provide full-fidelity round-tripping for
every Excel feature, and the constitution requires blocking lossy save paths
instead of mutating files silently. The initial safe-editable scope will keep
workbooks read-only for workbook-level fidelity blockers such as macros, chart
sheets, or style-heavy content that CE cannot preserve reliably, and it will
apply narrower worksheet or cell blockers for protected sheets, formula cells,
and merged or structurally hidden cells.

**Alternatives considered**:

- **Allow editing for all openable workbooks with a warning banner only**:
  Rejected because it would knowingly permit lossy saves.
- **Postpone editing until full Excel parity is available**: Rejected because it
  would violate the feature goal and over-scope the milestone.

## Editing interaction model

**Decision**: Use an inline cell editor in the webview grid: click to focus,
press Enter or double-click to edit, commit on Enter/blur, and cancel on Escape.
The webview sends a single committed-edit message to the extension for each
confirmed change.

**Rationale**: This is the smallest interaction that still feels spreadsheet-like
inside VS Code and avoids introducing a full formula bar or multi-cell editing
model. Sending only committed edits keeps the extension/webview contract small
and maps cleanly to undoable `CustomDocumentEditEvent` entries.

**Alternatives considered**:

- **Contenteditable cells for every keystroke**: Rejected because it complicates
  selection, validation, and undo semantics.
- **A separate side-panel editor or command palette flow**: Rejected because it
  weakens the direct in-grid editing experience promised by the feature.

## Testing strategy

**Decision**: Add unit tests for risk scanning, cell mutation, serialization, and
view-model editability, plus integration tests for edit/dirty/save/revert/sheet
navigation workflows in the custom editor.

**Rationale**: The constitution requires automated coverage for editing,
persistence, and rendering workflows, and this feature adds regression-prone
state transitions around undo, dirty state, and safe-save gating. Fixtures let
the repository exercise supported and blocked workbook shapes with repeatable
expectations.

**Alternatives considered**:

- **Rely on manual save testing only**: Rejected because it would not protect the
  core data-handling workflow.
- **Full browser automation only**: Rejected because the custom editor behavior
  can be covered more efficiently through unit plus VS Code integration tests.
