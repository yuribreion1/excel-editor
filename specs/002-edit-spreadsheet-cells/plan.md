# Implementation Plan: Direct Spreadsheet Cell Editing

**Branch**: `002-edit-spreadsheet-cells` | **Date**: 2026-05-25 | **Spec**: `specs/002-edit-spreadsheet-cells/spec.md`

**Input**: Feature specification from `/specs/002-edit-spreadsheet-cells/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Upgrade the current read-only `.xlsx` custom editor into a safe editable custom
editor for the repository's currently supported `.xlsx` workbooks. The
implementation will replace the
`CustomReadonlyEditorProvider` with a `CustomEditorProvider`, keep the
authoritative workbook state in the extension host, enable inline cell editing
inside the webview grid, persist unsaved edits across sheet switches, and save
back to disk through `vscode.workspace.fs.writeFile`. To satisfy the
constitution's data-safety rule, the first editable release will explicitly
gate editing to workbooks and cells that SheetJS CE can round-trip safely, and
it will keep risky workbooks in read-only mode with actionable guidance.

## Technical Context

**Language/Version**: TypeScript 6.x on the VS Code extension host with a
browser webview UI

**Primary Dependencies**: VS Code Extension API, SheetJS CE (`xlsx` 0.20.3) for
workbook parse/write, Mocha plus `@vscode/test-electron` for automated tests

**Storage**: Local `.xlsx` files on disk, in-memory editable workbook state in a
custom document, plus VS Code custom-editor backup files for hot exit

**Testing**: Fixture-driven unit tests for editability assessment, workbook
mutation, serializer safety, and view-model mapping; integration tests for
editing, dirty state, save/reopen, revert/discard, sheet switching, and blocked
editing paths

**Target Platform**: Desktop Visual Studio Code on Windows, macOS, and Linux

**Project Type**: Single-project VS Code workspace extension with a custom
binary editor webview

**Performance Goals**: Reflect a committed cell edit in under 1 second for 95%
of edits on supported workbooks up to 10 MB; complete save in under 5 seconds
for the same workload; preserve sheet switching responsiveness without forcing a
reopen

**Constraints**: Keep `retainContextWhenHidden` disabled; save must serialize
from extension-side document state rather than depending on a hidden webview; no
formula recalculation; no lossy save path may run silently; initial editable
scope is limited to cells and workbooks the extension can preserve safely

**Scale/Scope**: One open workbook document at a time per editor instance, with
visible-sheet navigation, dozens to low hundreds of cell edits per session, and
first-release editable support focused on simple business workbooks rather than
full Excel parity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Tabular Fit**: The feature directly improves the core table workflow by
      letting users edit visible worksheet cells inside VS Code.
- [x] **Scope Discipline**: The design stays focused on single-cell editing,
      dirty tracking, save/revert, and clear editability limits instead of
      adding formula authoring, styling, or spreadsheet-suite features.
- [x] **Data Safety**: The design blocks lossy workbook shapes from editable
      mode, defines save/revert/backup behavior, and requires explicit guidance
      for unsupported or risky files.
- [x] **Automated Coverage**: Unit and integration coverage are defined for
      workbook mutation, edit gating, persistence, revert, and multi-sheet
      behavior.
- [x] **Responsiveness & Reliability**: Performance targets, practical workbook
      limits, and user-visible save/open failure handling are all defined.

Initial gate review: PASS

Post-design gate review: PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-edit-spreadsheet-cells/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── xlsx-editing-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── editor/
│   ├── XlsxEditorProvider.ts            # replaces readonly provider
│   ├── XlsxCustomDocument.ts            # editable document model + undo/save
│   └── tableViewModelBuilder.ts         # adds editability metadata to cells
├── parsing/
│   ├── workbookOpenError.ts
│   ├── workbookRiskScanner.ts           # new safe-editability assessment
│   └── xlsxWorkbookLoader.ts
├── persistence/
│   └── workbookSerializer.ts            # new write/reload helpers
├── types/
│   ├── workbook-edit.ts                 # new edit + save-risk types
│   ├── viewer-state.ts
│   └── workbook.ts
├── webview/
│   ├── messageTypes.ts
│   ├── xlsxViewer.css
│   └── xlsxViewerApp.ts
└── extension.ts

tests/
├── fixtures/
│   └── workbooks/
├── integration/
└── unit/
```

**Structure Decision**: Keep the existing single-extension layout, but separate
editable document lifecycle, workbook risk assessment, and workbook serialization
so save logic stays extension-side and testable. The webview remains a thin UI
surface that commits user edits, while the extension host owns undo/redo, dirty
state, save/revert, and backup behavior.

## Phase 0 Research Summary

- Replace the readonly provider with `vscode.CustomEditorProvider` so the
  extension can participate in dirty state, undo/redo, save, revert, and backup
  flows for binary `.xlsx` resources.
- Keep the canonical workbook state inside a custom document object and fire
  `CustomDocumentEditEvent` events for committed cell edits; do not depend on a
  hidden webview to supply save data.
- Use SheetJS CE to mutate worksheet cell objects directly and serialize with
  `XLSX.write(..., { type: 'buffer', bookType: 'xlsx' })`, but only enable
  editing for workbook shapes that CE can round-trip safely enough for this
  release.
- Gate editing with layered safety rules: workbook-level blockers such as
  macros, chart sheets, and style-dependent save risks keep the document
  read-only, while sheet- and cell-level blockers such as protected sheets,
  formula cells, and merged or hidden cells disable editing only where needed.
- Use fixture-driven tests and VS Code integration tests to cover edit commits,
  dirty-state transitions, save/reopen, revert, sheet switching, and blocked
  editing paths.

## Phase 1 Design Summary

- `research.md` captures the provider, SheetJS, save-safety, and testing
  decisions that resolve all technical unknowns.
- `data-model.md` defines the editable workbook, worksheet session, cell state,
  cell edit operation, and save assessment models needed for implementation.
- `contracts/xlsx-editing-contract.md` defines the custom editor behavior and
  extension/webview message contract for editing, save, revert, and blocked
  states.
- `quickstart.md` describes the developer flow for building, testing, and
  manually validating editable `.xlsx` behavior.
- `.github/copilot-instructions.md` is updated to point agents at this plan so
  future work and task generation use the new design artifacts.

## Complexity Tracking

No constitutional violations or extra complexity exceptions require
justification for this feature.
