# Tasks: Editable Spreadsheet with Save

**Input**: Design documents from `/specs/003-editable-spreadsheet-save/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Test tasks are REQUIRED for this feature. The change directly
affects parsing (editability assessment) and persistence (save round-trip),
both of which are regression-prone per the constitution (Principle IV).

**Context**: The editing and saving infrastructure (cell edit, undo/redo, dirty
state, VS Code save lifecycle) was fully implemented in the previous feature.
This feature removes a single over-conservative guard in
`workbookRiskScanner.ts` (`getWorkbookStyleBlocker`) that blocked all
real-world `.xlsx` files from reaching that infrastructure. The test suite must
verify the guard is gone and that saving a style-rich workbook does not corrupt
styles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the test harness is ready and create the shared style-rich
fixture needed by all user-story test phases.

- [ ] T001 Confirm the test runner resolves `tests/helpers/fixturePaths.ts`
      and that `tests/fixtures/workbooks/` exists (no code change needed — this
      is a pre-flight check before adding new fixtures)
- [ ] T002 [P] Create a programmatic style-rich `.xlsx` fixture builder helper
      in `tests/helpers/styleRichFixture.ts` that uses SheetJS
      (`XLSX.utils.book_new`, `XLSX.write` with `cellStyles: true`) to produce
      a workbook whose `Styles.CellXf` table has more than one entry — this is
      the workbook type that was incorrectly blocked by the style guard

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the regression baseline. Write and confirm that the
style-rich editability test FAILS against the current code before the blocker
is removed. This red → green cycle is the verification that the guard was truly
blocking and that removing it fixes the problem.

**⚠️ CRITICAL**: Complete T003 before removing any code. The test must be
observed to FAIL first.

- [ ] T003 Add a failing unit test in `tests/unit/parsing/workbookRiskScanner.test.ts`
      asserting that `assessWorkbookEditability(styleRichWorkbook)` returns
      `editable: true` — use the helper from T002; run `npm test` and confirm
      this test FAILS with the current code before proceeding

**Checkpoint**: T003 is red → style guard confirmed present → implementation can begin

---

## Phase 3: User Story 1 — Open a spreadsheet ready to edit (Priority: P1) 🎯 MVP

**Goal**: Remove the `getWorkbookStyleBlocker` check so that standard `.xlsx`
files (which have style tables) open in an editable state by default. This is
the root cause fix that unblocks all remaining user stories.

**Independent Test**: Open any real-world `.xlsx` file in the Extension
Development Host (F5). Confirm no "Read only" badge appears in the header and
the subtitle reads "Editable workbook". Confirm `npm test` is fully green.

### Tests for User Story 1 ⚠️

> **T003 (Phase 2) is the primary red test for this story. The tasks below add
> positive and edge-case coverage that should also be written before
> implementation (they will pass trivially after T004 but provide regression
> guards).**

- [ ] T004 [P] [US1] Add a unit test in `tests/unit/parsing/workbookRiskScanner.test.ts`
      confirming that a workbook with zero extra styles (`CellXf` length ≤ 1)
      is still editable — ensures the removal did not accidentally break the
      clean-state path
- [ ] T005 [P] [US1] Add a unit test in `tests/unit/parsing/workbookRiskScanner.test.ts`
      confirming that a VBA/macro workbook (`vbaraw` present) remains
      `editable: false` after the style guard is removed — this is the
      regression guard for the remaining blocker

### Implementation for User Story 1

- [ ] T006 [US1] In `src/parsing/workbookRiskScanner.ts`, delete the
      `getWorkbookStyleBlocker` function (lines ~38–48) and remove its call
      site inside `assessWorkbookEditability` (the `if (styleBlocker)` block,
      ~lines 103–106); do not touch any other guard or function
- [ ] T007 [US1] Run `npm test` and confirm T003 (Phase 2) is now GREEN and
      all other existing tests still pass; if any test fails, investigate before
      proceeding

**Checkpoint**: `npm test` fully green; style-rich workbooks now open editable —
User Story 1 is independently complete

---

## Phase 4: User Story 2 — Change a cell value (Priority: P1)

**Goal**: Confirm that cell editing works end-to-end for style-rich workbooks.
The `applyEdit` path in `XlsxCustomDocument` was already implemented; this
phase adds targeted regression coverage for the newly unblocked workbook type.

**Independent Test**: Open a style-rich `.xlsx` file, click a cell, type a new
value, confirm the cell immediately displays the new value and the document
dirty indicator appears.

### Tests for User Story 2 ⚠️

- [ ] T008 [P] [US2] Add a unit test in
      `tests/unit/editor/XlsxCustomDocument.editing.test.ts` that creates an
      `XlsxCustomDocument` from a style-rich workbook (using the T002 helper)
      and calls `applyEdit` on a plain text cell — assert the returned
      `CellEditOperation` is defined, `isDirty` becomes `true`, and the cell
      snapshot reflects the new value
- [ ] T009 [P] [US2] Add a unit test in
      `tests/unit/editor/XlsxCustomDocument.editing.test.ts` for a style-rich
      workbook: call `applyEdit` on a formula cell and assert it returns
      `undefined` with an editor warning message — confirms cell-level guards
      still fire correctly on the now-unblocked workbook

### Implementation for User Story 2

- [ ] T010 [US2] Run `npm test`; verify T008 and T009 pass with zero code
      changes (the `applyEdit` implementation was complete before this feature)
      — if either fails, diagnose and fix the test helper or fixture, not the
      production code

**Checkpoint**: Cell editing verified for style-rich workbooks — User Story 2
independently confirmed

---

## Phase 5: User Story 3 — Save the file (Priority: P2)

**Goal**: Verify that saving a style-rich workbook round-trips all cell styles
without corruption. The `writeWorkbookToUri` / `serializeWorkbook` path was
already implemented with `cellStyles: true`; this phase adds an explicit
regression test.

**Independent Test**: Open a style-rich `.xlsx`, change a cell value, press
`Ctrl+S`, close the file, reopen it — confirm the new value is present and
cell formatting is unchanged.

### Tests for User Story 3 ⚠️

- [ ] T011 [P] [US3] Add an integration test in
      `tests/integration/xlsxSaveFlow.test.ts` (or a new file
      `tests/integration/xlsxStyleRichSave.test.ts`) that:
      (a) generates a style-rich workbook via the T002 helper,
      (b) writes it to a temp file with `writeWorkbookToUri`,
      (c) reads the file back with `parseWorkbookBytes`,
      (d) asserts the `Styles.CellXf` entry count is unchanged and a sample
      cell's style index (`s` field) matches the original
- [ ] T012 [P] [US3] Add a unit test in
      `tests/unit/persistence/workbookSerializer.test.ts` that serializes a
      style-rich workbook with `serializeWorkbook`, then deserializes and checks
      that `Styles.CellXf` length is preserved — confirms the `cellStyles: true`
      write option is effective

### Implementation for User Story 3

- [ ] T013 [US3] Run `npm test`; verify T011 and T012 pass with zero code
      changes — the serializer already uses `cellStyles: true`; if either test
      fails, investigate `workbookSerializer.ts` `serializeWorkbook` options

**Checkpoint**: Style-preserving save confirmed — User Story 3 independently verified

---

## Phase 6: User Story 4 — Unsaved changes prompt on close (Priority: P3)

**Goal**: Confirm that VS Code's native "unsaved changes" prompt appears when
closing a dirty style-rich workbook. This is handled entirely by the VS Code
`CustomDocument` protocol via `XlsxEditorProvider`; no code changes are
expected.

**Independent Test**: In the Extension Development Host, open a style-rich
`.xlsx`, change a cell value, attempt to close the tab — confirm VS Code
presents a "Save / Don't Save / Cancel" dialog.

### Tests for User Story 4 ⚠️

- [ ] T014 [P] [US4] Add a unit test in
      `tests/unit/editor/XlsxCustomDocument.editing.test.ts` confirming that
      after `applyEdit` on a style-rich workbook, `document.isDirty` is `true`
      and `document.canUndo` is `true` — the dirty signal is what triggers VS
      Code's close prompt, so this unit test is a sufficient proxy

### Implementation for User Story 4

- [ ] T015 [US4] Run `npm test`; verify T014 passes with zero code changes —
      dirty-state tracking was already implemented; if it fails, diagnose
      `XlsxCustomDocument.isDirty` logic only

**Checkpoint**: Dirty-state signal confirmed; VS Code native close prompt
behaviour verified through manual test in Extension Development Host

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup across all stories.

- [ ] T016 [P] Run the full `npm test` suite one final time and confirm all
      tests pass including the new ones from T003–T014; record output
- [ ] T017 [P] Update `CHANGELOG.md` with an entry under "Unreleased" noting
      that style-rich `.xlsx` workbooks now open in editable mode (removed the
      style guard that caused the false read-only state)
- [ ] T018 Manual E2E validation per `specs/003-editable-spreadsheet-save/quickstart.md`:
      open a real-world `.xlsx` with formatted cells in the Extension
      Development Host (F5), confirm no "Read only" badge, confirm cell editing
      and `Ctrl+S` save work end-to-end, confirm reopening the file shows
      persisted values with unchanged formatting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (needs T002 fixture helper)
- **Phase 3 (US1)**: Depends on Phase 2 (T003 must be red before T006)
- **Phase 4 (US2)**: Depends on Phase 3 (style blocker must be removed first)
- **Phase 5 (US3)**: Depends on Phase 3 (blocker removed; can run in parallel with Phase 4)
- **Phase 6 (US4)**: Depends on Phase 3 (can run in parallel with Phases 4 and 5)
- **Phase 7 (Polish)**: Depends on all story phases complete and green

### User Story Dependencies

- **US1 (P1)**: Blocks all other stories — must complete first
- **US2 (P1)**: Independent after US1; no dependency on US3 or US4
- **US3 (P2)**: Independent after US1; can run in parallel with US2 and US4
- **US4 (P3)**: Independent after US1; can run in parallel with US2 and US3

### Within Each Phase

1. Write and confirm tests FAIL (or are new) before touching production code
2. Make the minimal production code change
3. Re-run `npm test` — all tests must be green before moving to the next phase
4. Commit after each phase checkpoint

### Parallel Opportunities

- T004 and T005 (US1 tests) can be written in parallel
- T008 and T009 (US2 tests) can be written in parallel
- T011 and T012 (US3 tests) can be written in parallel
- Phases 4, 5, and 6 can all begin immediately after Phase 3 checkpoint

---

## Parallel Example: After Phase 3 (US1 complete)

```bash
# Phases 4, 5, and 6 can all start in parallel once US1 is green:

# Developer A — Phase 4 (US2):
Task: "Add unit test T008 for style-rich cell edit in XlsxCustomDocument.editing.test.ts"
Task: "Add unit test T009 for formula-cell guard on style-rich workbook"
Task: "Run npm test to confirm T008 and T009 pass (T010)"

# Developer B — Phase 5 (US3):
Task: "Add integration test T011 for style-preserving save in xlsxStyleRichSave.test.ts"
Task: "Add unit test T012 for serializer round-trip in workbookSerializer.test.ts"
Task: "Run npm test to confirm T011 and T012 pass (T013)"

# Developer C — Phase 6 (US4):
Task: "Add dirty-state unit test T014 in XlsxCustomDocument.editing.test.ts"
Task: "Run npm test to confirm T014 passes (T015)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003 — confirm red)
3. Complete Phase 3: US1 (T004–T007 — remove the guard, go green)
4. **STOP and VALIDATE**: `npm test` fully green; manual E2E check in Extension Development Host
5. The MVP is already shippable at this point

### Incremental Delivery

1. Phase 1–2: Fixture infrastructure ready
2. Phase 3 (US1): Remove blocker → all workbooks editable → **ship MVP**
3. Phase 4 (US2): Confirm cell-editing regression coverage → ship
4. Phase 5 (US3): Confirm style-preserving save coverage → ship
5. Phase 6 (US4): Confirm close-prompt dirty signal → ship
6. Phase 7: CHANGELOG + final E2E → release

### Single-developer fast path

With one developer, work sequentially:
T001 → T002 → T003 (red) → T004 → T005 → T006 → T007 (green) → T008 → T009 →
T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018

Total implementation effort is dominated by the test additions; the production
code change is a single function deletion and two lines removed from its caller.

---

## Notes

- [P] tasks = different files, safe to run in parallel
- [Story] label maps each task to a specific user story for traceability
- **Production code change is minimal**: delete `getWorkbookStyleBlocker` and 3 lines in `assessWorkbookEditability` — everything else is tests
- The T002 fixture helper is reused across Phases 3–6; invest time in making it robust
- Avoid changing `workbookSerializer.ts`, `XlsxCustomDocument.ts`, or `xlsxViewerApp.ts` — they are correct as-is
- Commit after each phase checkpoint to isolate changes
