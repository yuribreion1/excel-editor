# Tasks: Direct Spreadsheet Cell Editing

**Input**: Design documents from `/specs/002-edit-spreadsheet-cells/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/xlsx-editing-contract.md`

**Tests**: Required. This feature changes parsing, rendering, editing behavior, and persistence, so each user story includes unit and integration coverage.

**Organization**: Tasks are grouped by user story to keep each increment independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: User story label for story-phase tasks only (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact repository path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare fixtures and test helpers for editable workbook workflows.

- [X] T001 Extend fixture generation for editable and blocked workbook scenarios in scripts/create-fixtures.mjs
- [X] T002 [P] Add fixture path helpers for new editable workbook scenarios in tests/helpers/fixturePaths.ts
- [X] T003 [P] Extend editable custom-editor test doubles for save, backup, and message round-trips in tests/helpers/fakes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared editable document, save-safety, and messaging primitives required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting any user story work.

- [X] T004 Create shared edit, worksheet-session, and save-assessment types in src/types/workbook-edit.ts
- [X] T005 [P] Extend workbook and viewer state models for editable cells, dirty state, and warnings in src/types/workbook.ts and src/types/viewer-state.ts
- [X] T006 [P] Implement workbook-, sheet-, and cell-level editability assessment in src/parsing/workbookRiskScanner.ts
- [X] T007 [P] Implement workbook serialization, reload, and backup helpers in src/persistence/workbookSerializer.ts
- [X] T008 Create the editable custom document model with history state in src/editor/XlsxCustomDocument.ts
- [X] T009 [P] Expand extension ↔ webview message contracts for editing, cell updates, and editor messages in src/webview/messageTypes.ts

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Edit a cell in place (Priority: P1) 🎯 MVP

**Goal**: Let the user edit a supported cell directly in the grid and see the workbook become dirty immediately.

**Independent Test**: Open a supported `.xlsx` workbook, edit one visible editable cell, and verify the grid value updates immediately and the document shows unsaved changes before any save occurs.

### Tests for User Story 1 ⚠️

- [X] T010 [P] [US1] Add cell editability and pending-edit mapping tests in tests/unit/editor/tableViewModelBuilder.editing.test.ts
- [X] T011 [P] [US1] Add dirty-state and undo/redo document tests in tests/unit/editor/XlsxCustomDocument.editing.test.ts
- [X] T012 [P] [US1] Add inline editing integration coverage for the custom editor in tests/integration/xlsxCellEditing.test.ts

### Implementation for User Story 1

- [X] T013 [P] [US1] Extend table cell metadata for addresses, edit values, blockers, and pending edits in src/editor/tableViewModelBuilder.ts
- [X] T014 [P] [US1] Implement the editable custom editor provider lifecycle in src/editor/XlsxEditorProvider.ts
- [X] T015 [US1] Implement committed cell edits, dirty tracking, and undo/redo application in src/editor/XlsxCustomDocument.ts
- [X] T016 [P] [US1] Implement inline cell editing, blocked-cell affordances, and dirty-state UI in src/webview/xlsxViewerApp.ts and src/webview/xlsxViewer.css
- [X] T017 [US1] Register src/editor/XlsxEditorProvider.ts in src/extension.ts and retire src/editor/XlsxReadonlyEditorProvider.ts from the active editor flow

**Checkpoint**: User Story 1 is functional and testable as the MVP.

---

## Phase 4: User Story 2 - Save edited workbook safely (Priority: P2)

**Goal**: Persist edited workbook values safely, block lossy saves, and keep the document state correct across save lifecycle operations.

**Independent Test**: Edit multiple cells in a supported workbook, save the document, reopen it, and verify the saved values persist while unaffected workbook data remains intact; then attempt a blocked save path and verify the user receives actionable guidance without silent corruption.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Add save-safety regression tests for blocked workbook shapes in tests/unit/parsing/workbookRiskScanner.test.ts
- [X] T019 [P] [US2] Add workbook serializer round-trip and backup tests in tests/unit/persistence/workbookSerializer.test.ts
- [X] T020 [P] [US2] Add save, Save As, revert, and blocked-save integration coverage in tests/integration/xlsxSaveFlow.test.ts

### Implementation for User Story 2

- [X] T021 [P] [US2] Implement workbook-level save blockers and user-facing save assessments in src/parsing/workbookRiskScanner.ts
- [X] T022 [P] [US2] Implement SheetJS write-buffer, reload, and failure mapping helpers in src/persistence/workbookSerializer.ts
- [X] T023 [US2] Implement save, Save As, revert, and backup behavior in src/editor/XlsxCustomDocument.ts
- [X] T024 [US2] Wire saveCustomDocument, saveCustomDocumentAs, revertCustomDocument, and backupCustomDocument in src/editor/XlsxEditorProvider.ts and src/types/viewer-state.ts
- [X] T025 [US2] Render save-blocked and save-failed guidance in src/webview/xlsxViewerApp.ts

**Checkpoint**: User Stories 1 and 2 work independently, with safe persistence covered by tests.

---

## Phase 5: User Story 3 - Continue editing across sheets and sessions (Priority: P3)

**Goal**: Keep pending edits coherent across sheet switches, reopen flows, and hot-exit recovery.

**Independent Test**: Open a multi-sheet workbook, edit one sheet, switch away and back, then save or restore from backup and confirm the edited values and dirty/clean state remain consistent.

### Tests for User Story 3 ⚠️

- [X] T026 [P] [US3] Add worksheet-session pending-edit and active-sheet tests in tests/unit/editor/XlsxCustomDocument.navigation.test.ts
- [X] T027 [P] [US3] Add multi-sheet persistence and hot-exit recovery integration coverage in tests/integration/xlsxSheetEditingPersistence.test.ts

### Implementation for User Story 3

- [X] T028 [P] [US3] Preserve per-sheet pending edits and active sheet selection in src/editor/XlsxCustomDocument.ts and src/types/workbook.ts
- [X] T029 [P] [US3] Refresh sheet state and targeted cell updates after navigation in src/editor/XlsxEditorProvider.ts and src/editor/tableViewModelBuilder.ts
- [X] T030 [US3] Restore backup-backed and reopened workbook state into the grid in src/persistence/workbookSerializer.ts and src/webview/xlsxViewerApp.ts

**Checkpoint**: All three user stories are independently testable and complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, regression coverage, and responsiveness work that touches multiple stories.

- [X] T031 [P] Update editable workflow documentation in README.md and specs/002-edit-spreadsheet-cells/quickstart.md
- [X] T032 [P] Add blocked-open and blocked-edit regression coverage in tests/unit/parsing/xlsxUnsupportedWorkbook.test.ts and tests/integration/xlsxReadonlyOpen.test.ts
- [X] T033 Improve large-workbook edit responsiveness and user-facing message copy in src/webview/xlsxViewerApp.ts and src/editor/XlsxEditorProvider.ts
- [X] T034 Validate npm run compile and npm test behavior against package.json and specs/002-edit-spreadsheet-cells/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 → Phase 2**: Setup tasks prepare fixtures and helpers needed by the editable implementation.
- **Phase 2 → Phase 3**: Foundational types, document state, risk scanning, serialization, and message contracts block all story work.
- **Phase 3 → Phase 4**: Safe save flows depend on the committed-edit and dirty-state behavior from User Story 1.
- **Phase 4 → Phase 5**: Multi-sheet restore and hot-exit recovery depend on the save/backup infrastructure from User Story 2.
- **Phase 6**: Starts after the desired user stories are complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on later stories.
- **US2 (P2)**: Starts after US1 because saving needs the editable document flow and dirty-state model.
- **US3 (P3)**: Starts after US2 because cross-sheet restore and session recovery depend on the final save/backup lifecycle.

### Within Each User Story

- Write the listed tests first and confirm they fail before implementing the story.
- Finish shared model/view-model work before wiring provider or webview behavior.
- Complete document logic before final extension registration or lifecycle wiring.
- Validate the independent test criteria before moving to the next story.

### Parallel Opportunities

- **Setup**: T002 and T003 can run in parallel after T001.
- **Foundational**: T005, T006, T007, and T009 can run in parallel after T004; T008 follows once those primitives exist.
- **US1**: T010, T011, and T012 can run in parallel; T013, T014, and T016 can then proceed in parallel before T015/T017 final wiring.
- **US2**: T018, T019, and T020 can run in parallel; T021 and T022 can then proceed in parallel before T023–T025.
- **US3**: T026 and T027 can run in parallel; T028 and T029 can then proceed in parallel before T030.
- **Polish**: T031 and T032 can run in parallel; T033 and T034 can follow after core implementation stabilizes.

---

## Parallel Example: User Story 1

```bash
Task: "Add cell editability and pending-edit mapping tests in tests/unit/editor/tableViewModelBuilder.editing.test.ts"
Task: "Add dirty-state and undo/redo document tests in tests/unit/editor/XlsxCustomDocument.editing.test.ts"
Task: "Add inline editing integration coverage in tests/integration/xlsxCellEditing.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add save-safety regression tests in tests/unit/parsing/workbookRiskScanner.test.ts"
Task: "Add serializer round-trip tests in tests/unit/persistence/workbookSerializer.test.ts"
Task: "Add save/revert integration coverage in tests/integration/xlsxSaveFlow.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add worksheet-session pending-edit tests in tests/unit/editor/XlsxCustomDocument.navigation.test.ts"
Task: "Add multi-sheet persistence and hot-exit recovery tests in tests/integration/xlsxSheetEditingPersistence.test.ts"
Task: "Refresh sheet state and targeted cell updates in src/editor/XlsxEditorProvider.ts and src/editor/tableViewModelBuilder.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver User Story 1 end-to-end.
3. Run the User Story 1 independent test and fix regressions before expanding scope.

### Incremental Delivery

1. Build fixture/test infrastructure and foundational editor primitives.
2. Deliver **US1** for direct cell editing and dirty-state visibility.
3. Deliver **US2** for safe save, Save As, revert, and backup behavior.
4. Deliver **US3** for sheet-switch continuity and session recovery.
5. Finish with cross-cutting docs, regressions, and responsiveness polish.

### Suggested MVP Scope

- **MVP**: Through Phase 3 (User Story 1) only.
- **Why**: It proves editable grid behavior and dirty tracking without taking on persistence complexity too early.

---

## Notes

- Total tasks: **34**
- User story task counts: **US1 = 8**, **US2 = 8**, **US3 = 5**
- All tasks follow the required checklist format: checkbox, sequential ID, optional `[P]`, required story labels for story phases, and exact file paths.
