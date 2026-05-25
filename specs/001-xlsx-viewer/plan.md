# Implementation Plan: XLSX Viewer Foundation

**Branch**: `001-add-xlsx-viewer` | **Date**: 2026-05-25 | **Spec**: `specs/001-xlsx-viewer/spec.md`

**Input**: Feature specification from `/specs/001-xlsx-viewer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver the first usable milestone of the extension: opening a `.xlsx` workbook
inside VS Code and presenting the selected worksheet in a read-only, Excel-like
table. The implementation will use a TypeScript VS Code workspace extension, a
webview-backed custom read-only editor for the table UI, and a workbook parser
chosen for reliable `.xlsx` support and graceful handling of unsupported
structures.

## Technical Context

**Language/Version**: TypeScript 5.x running on the VS Code extension host

**Primary Dependencies**: VS Code Extension API, SheetJS CE (`xlsx`) for
workbook parsing, `@vscode/test-electron` plus Mocha for extension tests

**Storage**: Local `.xlsx` files on disk with in-memory workbook and view state;
no database or remote storage

**Testing**: Fixture-driven unit tests for workbook parsing and table view-model
mapping, plus VS Code integration tests for file open, sheet navigation, and
error handling

**Target Platform**: Desktop Visual Studio Code on Windows, macOS, and Linux

**Project Type**: Single-project VS Code workspace extension with a custom
read-only editor webview

**Performance Goals**: Reach first readable table render within 5 seconds for
supported workbooks up to 10 MB; keep sheet switching visually responsive for
typical multi-sheet workbooks

**Constraints**: Read-only scope only; no editing, save-back, formula
recalculation, or full Excel parity; unsupported, encrypted, or malformed files
must fail with clear user messaging; large sheets must degrade predictably

**Scale/Scope**: First milestone supports local `.xlsx` viewing, worksheet
switching, and simplified handling of merged or hidden structures for one user
in one VS Code workspace session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Tabular Fit**: The feature is entirely focused on viewing `.xlsx` data in
      an Excel-like table inside VS Code.
- [x] **Scope Discipline**: The design stays read-only and excludes editing,
      workbook creation, and spreadsheet-suite features.
- [x] **Data Safety**: The plan avoids mutating user files and requires explicit
      failure states for corrupted, encrypted, or unsupported workbooks.
- [x] **Automated Coverage**: The plan includes fixture-based parser tests and
      extension integration tests for opening, rendering, sheet switching, and
      failure handling.
- [x] **Responsiveness & Reliability**: The design defines a 10 MB target,
      sheet-loading guardrails, and user-visible handling for large or
      unsupported structures.

Initial gate review: PASS

Post-design gate review: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-xlsx-viewer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── xlsx-viewer-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── commands/
├── editor/
├── parsing/
├── persistence/
├── types/
├── webview/
└── extension.ts

tests/
├── fixtures/
│   └── workbooks/
├── integration/
└── unit/
```

**Structure Decision**: Use a single VS Code extension project. Keep workbook
parsing, editor orchestration, and webview rendering separate so the read-only
viewer can stay simple while still being testable at parser, view-model, and
integration levels.

## Phase 0 Research Summary

- Use TypeScript for the extension because it matches VS Code's primary
  extension development model and reduces integration friction.
- Use SheetJS CE for `.xlsx` parsing because it supports workbook metadata,
  sheet enumeration, and the workbook structures this feature must inspect.
- Use a custom read-only editor backed by a webview because the feature needs a
  dedicated grid-style presentation rather than a text editor fallback.
- Use fixture-based parsing tests plus extension integration tests to cover the
  workflows mandated by the constitution.
- Defer full fidelity support for merged cells, hidden structures, and formula
  semantics; surface predictable approximations or explicit warnings in the UI.

## Phase 1 Design Summary

- `research.md` records the technical decisions and rejected alternatives.
- `data-model.md` defines the workbook, worksheet, cell range, and viewer state
  structures needed for parsing and rendering.
- `contracts/xlsx-viewer-contract.md` defines the user-visible behavior contract
  for opening workbooks, switching sheets, showing loading states, and handling
  unsupported files.
- `quickstart.md` documents the intended local developer flow for validating the
  viewer once implementation begins.

## Complexity Tracking

No constitutional violations or extra complexity exceptions require
justification for this milestone.
