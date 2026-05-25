# Tasks: XLSX Viewer Foundation

**Input**: Design documents from `/specs/001-xlsx-viewer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, contracts/

**Tests**: Automated tests are required for this feature because it changes
parsing, tabular rendering, and user-visible workbook workflows.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **VS Code extension**: `src/`, with feature code under `src/editor/`,
  `src/parsing/`, `src/types/`, and `src/webview/`
- **Tests**: `tests/unit/`, `tests/integration/`, and `tests/fixtures/` at the
  repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the base VS Code extension and test harness needed for all
viewer work.

- [X] T001 Create the extension manifest, commands, and npm scripts in package.json
- [X] T002 Configure TypeScript compilation and output paths in tsconfig.json
- [X] T003 [P] Configure the VS Code extension test harness in .vscode-test.mjs and src/test/suite/index.ts
- [X] T004 [P] Add baseline workbook fixtures in tests/fixtures/workbooks/basic-single-sheet.xlsx and tests/fixtures/workbooks/multi-sheet.xlsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared parser, state, and editor infrastructure that all
user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create shared workbook and worksheet types in src/types/workbook.ts
- [X] T006 [P] Create viewer state and webview message contracts in src/types/viewer-state.ts and src/webview/messageTypes.ts
- [X] T007 Implement `.xlsx` loading and sheet metadata extraction in src/parsing/xlsxWorkbookLoader.ts
- [X] T008 [P] Implement unsupported-workbook error normalization in src/parsing/workbookOpenError.ts
- [X] T009 Implement the custom readonly editor provider and registration in src/editor/XlsxReadonlyEditorProvider.ts and src/extension.ts
- [X] T010 [P] Create the base webview shell and spreadsheet styling in src/webview/xlsxViewerApp.ts and src/webview/xlsxViewer.css

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Open workbook in table view (Priority: P1) 🎯 MVP

**Goal**: Open a valid `.xlsx` file in VS Code and show the active worksheet in
an Excel-like read-only table.

**Independent Test**: Open `tests/fixtures/workbooks/basic-single-sheet.xlsx`
in the Extension Development Host and confirm the file renders as a read-only
table with correct visible row order, column order, and cell values.

### Tests for User Story 1

- [X] T011 [P] [US1] Add parser regression tests for single-sheet workbook loading in tests/unit/parsing/xlsxWorkbookLoader.test.ts
- [X] T012 [P] [US1] Add extension integration coverage for opening `.xlsx` files in tests/integration/xlsxReadonlyOpen.test.ts

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement worksheet-to-table view model mapping in src/editor/tableViewModelBuilder.ts
- [X] T014 [US1] Implement read-only table rendering and visible read-only status copy in src/webview/xlsxViewerApp.ts
- [X] T015 [US1] Connect workbook loading to the readonly editor open flow in src/editor/XlsxReadonlyEditorProvider.ts
- [X] T016 [US1] Add unsupported-file and fatal-open error states in src/editor/XlsxReadonlyEditorProvider.ts and src/webview/xlsxViewerApp.ts

**Checkpoint**: User Story 1 should open supported workbooks in a readable
table view and fail clearly for unsupported files.

---

## Phase 4: User Story 2 - Navigate workbook sheets (Priority: P2)

**Goal**: Let users switch between worksheets in the same workbook without
reopening the file.

**Independent Test**: Open `tests/fixtures/workbooks/multi-sheet.xlsx` in the
Extension Development Host, switch to another worksheet, and confirm the sheet
label, table content, and active sheet state update correctly.

### Tests for User Story 2

- [X] T017 [P] [US2] Add parser regression tests for sheet enumeration and selection in tests/unit/parsing/worksheetNavigation.test.ts
- [X] T018 [P] [US2] Add extension integration coverage for worksheet switching in tests/integration/xlsxSheetNavigation.test.ts

### Implementation for User Story 2

- [X] T019 [P] [US2] Extend workbook and viewer state for available sheet selection in src/types/workbook.ts and src/types/viewer-state.ts
- [X] T020 [US2] Implement active-sheet reload and sheet-switch commands in src/editor/XlsxReadonlyEditorProvider.ts
- [X] T021 [US2] Implement sheet tabs and selection messaging in src/webview/xlsxViewerApp.ts
- [X] T022 [US2] Surface hidden-sheet and unsupported-structure warnings in src/editor/tableViewModelBuilder.ts and src/webview/xlsxViewerApp.ts

**Checkpoint**: User Story 2 should let users inspect multi-sheet workbooks
while preserving the read-only table experience from User Story 1.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Strengthen reliability, documentation, and unsupported-workbook
coverage across all stories.

- [X] T023 [P] Add unsupported-workbook fixtures and regression coverage in tests/fixtures/workbooks/unsupported-password.xlsx, tests/fixtures/workbooks/malformed.xlsx, and tests/unit/parsing/xlsxUnsupportedWorkbook.test.ts
- [X] T024 Update usage and scope documentation in README.md
- [X] T025 Run the manual validation flow from specs/001-xlsx-viewer/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user
  stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and reuses the
  read-only editor shell established in User Story 1
- **Polish (Phase 5)**: Depends on the desired user stories being complete

### User Story Dependencies

- **US1**: Independent MVP once Foundational is complete
- **US2**: Builds on the table viewer from US1 but remains independently
  testable after US1 is in place

### Within Each User Story

- Tests MUST be written and fail before implementation tasks begin
- Shared type updates before editor and webview behavior
- Parser and view-model work before user-visible interaction wiring
- Story checkpoint validation before moving to the next priority

### Parallel Opportunities

- T003 and T004 can run in parallel after T001 and T002
- T006, T008, and T010 can run in parallel once T005 is started
- T011 and T012 can run in parallel for US1
- T013 can run in parallel with T011 and T012 before T014-T016
- T017 and T018 can run in parallel for US2
- T019 can run in parallel with T017 and T018 before T020-T022
- T023 and T024 can run in parallel after story completion

---

## Parallel Example: User Story 1

```bash
Task: "T011 [US1] Add parser regression tests in tests/unit/parsing/xlsxWorkbookLoader.test.ts"
Task: "T012 [US1] Add extension integration coverage in tests/integration/xlsxReadonlyOpen.test.ts"
Task: "T013 [US1] Implement table view model mapping in src/editor/tableViewModelBuilder.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T017 [US2] Add parser regression tests in tests/unit/parsing/worksheetNavigation.test.ts"
Task: "T018 [US2] Add extension integration coverage in tests/integration/xlsxSheetNavigation.test.ts"
Task: "T019 [US2] Extend workbook and viewer state in src/types/workbook.ts and src/types/viewer-state.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the workbook open flow with the single-sheet fixture
5. Demo the read-only viewer before adding worksheet navigation

### Incremental Delivery

1. Setup + Foundational create a usable extension skeleton
2. User Story 1 delivers the first end-to-end viewer MVP
3. User Story 2 adds worksheet navigation without changing the read-only scope
4. Polish hardens unsupported-file handling and documentation

### Suggested MVP Scope

Implement **Phase 1**, **Phase 2**, and **Phase 3** only for the first
shippable increment.

---

## Notes

- Every task follows the required checklist format with checkbox, ID, labels,
  and file paths
- `[P]` tasks are safe to run in parallel because they target separate files or
  can proceed independently from other unfinished tasks
- Each user story phase ends with a concrete independent validation target
