# Implementation Plan: Editable Spreadsheet with Save

**Branch**: `agents/spreadsheet-editing-specification-3` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-editable-spreadsheet-save/spec.md`

## Summary

Remove the style-richness read-only blocker from `workbookRiskScanner.ts` so
that standard `.xlsx` files open in an editable state by default. The
serialization layer already preserves cell styles via `cellStyles: true`; the
guard was overly conservative. No new UI surfaces or data-flow changes are
required — removing the single `getWorkbookStyleBlocker` check (and its call
site) is the entire behavioural change. Saving, dirty-state tracking, and
undo/redo continue to use the existing infrastructure unchanged.

## Technical Context

**Language/Version**: TypeScript 6 (strict mode)

**Primary Dependencies**: SheetJS (`xlsx` 0.20.3, commercial CDN tgz), VS Code
Extension API (^1.120.0), webpack 5 bundler

**Storage**: On-disk `.xlsx` files via `vscode.workspace.fs`; in-memory
`XLSX.WorkBook` during editing; custom-format backup written via VS Code's
`CustomDocument` backup API

**Testing**: Mocha + `@vscode/test-electron` (in-process extension host tests);
test entry at `src/test/suite/index.ts`; fixtures expected under `tests/fixtures/`

**Target Platform**: VS Code desktop (Electron), Linux / macOS / Windows

**Project Type**: VS Code custom editor extension

**Performance Goals**: Cell edit reflected within 1 second; save completes
within 5 seconds for workbooks up to 10 000 cells (per spec SC-003, SC-004)

**Constraints**: Round-trip save must not corrupt styles, formulas, merged cells,
or chart data; partial writes on failure must not leave a corrupted file;
VBA/macro workbooks remain blocked at save time

**Scale/Scope**: Single-user desktop editing; workbooks up to 10 000 cells within
performance targets; larger files degrade gracefully without crashing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Tabular Fit**: Removing the style blocker directly enables cell editing
      for the typical `.xlsx` workbook, the core table-editing use case.
- [x] **Scope Discipline**: The change is a single guard removal; no new UI,
      no new dependencies, no speculative features.
- [x] **Data Safety**: `serializeWorkbook` uses `cellStyles: true`; non-cell
      content (formulas, merges, charts) is preserved on round-trip. Failure
      paths (permission error, disk-full) already surface user-visible errors
      and leave the original file intact. VBA/macro workbooks remain blocked.
- [x] **Automated Coverage**: Test cases required for: (a) style-rich workbook
      opens editable, (b) cell edit + save round-trip preserves styles,
      (c) save failure leaves file intact, (d) VBA workbook remains blocked.
- [x] **Responsiveness & Reliability**: Performance bounds defined in spec
      (SC-003, SC-004); error handling for save failures already implemented in
      `XlsxCustomDocument.persistTo()`; no new blocking operations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/003-editable-spreadsheet-save/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── webview-messages.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── editor/
│   ├── tableViewModelBuilder.ts   ← read-only, no changes needed
│   ├── XlsxCustomDocument.ts      ← read-only, no changes needed
│   └── XlsxEditorProvider.ts      ← read-only, no changes needed
├── parsing/
│   ├── workbookRiskScanner.ts     ← PRIMARY CHANGE: remove getWorkbookStyleBlocker
│   ├── workbookOpenError.ts
│   └── xlsxWorkbookLoader.ts
├── persistence/
│   └── workbookSerializer.ts      ← verify cellStyles: true (already present)
├── types/
│   ├── viewer-state.ts
│   ├── workbook-edit.ts
│   └── workbook.ts
├── webview/
│   ├── xlsxViewerApp.ts           ← read-only, readOnly branches remain valid
│   ├── xlsxViewer.css
│   └── messageTypes.ts
└── extension.ts

tests/
├── fixtures/                      ← ADD: style-rich .xlsx test fixture
├── integration/
└── unit/
    └── workbookRiskScanner.test.ts ← ADD or UPDATE: style-rich editability tests
```

**Structure Decision**: All existing source structure is retained. The
implementation touches exactly one function body in `workbookRiskScanner.ts`.
Test fixtures and test cases are added for regression coverage.

## Complexity Tracking

> No constitution violations identified. No entries required.
