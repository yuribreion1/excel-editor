# Quickstart: Direct Spreadsheet Cell Editing

## Prerequisites

- Node.js LTS
- npm
- Visual Studio Code desktop

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run compile
   ```

3. Run the automated checks for the editing milestone:

   ```bash
   npm test
   ```

4. Regenerate the workbook fixtures used by the editable workflow tests:

   ```bash
   node scripts/create-fixtures.mjs
   ```

## Recommended Fixture Coverage

Prepare or extend workbook fixtures so manual and automated validation cover:

- a simple editable workbook with plain literal values
- a multi-sheet workbook where edits remain dirty across sheet switches
- a workbook with formula cells that must stay read-only
- a workbook with merged or hidden structures that surfaces edit blockers
- a protected worksheet sample that remains viewable but not editable when the
  workbook metadata exposes protection details
- a workbook with macros/VBA or a chart-sheet style blocker that keeps the whole
  document read-only
- a workbook that triggers save-risk read-only mode because fidelity would be
  lossy

## Manual Validation Flow

1. Open the repository in VS Code and launch the Extension Development Host.
2. Open a supported plain-data `.xlsx` fixture.
3. Confirm the file opens in the custom table editor and indicates editable mode.
4. Select a visible editable cell, start inline editing, change the value, and
   confirm:
   - the new value appears immediately in the grid
   - the workbook is marked dirty in the VS Code tab/editor state
   - an unsaved-change indicator is visible in the editor UI
5. Switch to another sheet and back, then confirm the pending edit is still
   shown and the dirty state remains active.
6. Use Undo and Redo, confirming the cell value and dirty state update
   correctly.
7. Save the document, reopen it, and confirm:
   - the edited value persisted
   - unaffected workbook data remained intact
   - the dirty indicator cleared
8. Use Save As to write the edited workbook to a new file, reopen that file, and
   confirm the saved value and clean state match expectations.
9. Make another edit and run Revert, confirming the workbook returns to the last
   saved value and clears dirty state.
10. Simulate hot-exit recovery by leaving the workbook dirty, reloading the
    window, and confirming the custom-editor backup restores the unsaved edit.
11. Open a workbook with a known workbook-level blocker, such as VBA, chart-sheet
    content, or style-heavy content, and confirm the editor stays read-only with
    a clear explanation.
12. Open a workbook with a known sheet- or cell-level blocker, such as a
    protected worksheet, formula cell, or merged cell, and confirm the UI
    explains why the edit is unavailable instead of failing silently.

## Expected Outcomes

- Supported plain-data workbooks can be edited directly inside the table grid.
- Dirty-state, save, undo/redo, and revert behavior align with VS Code custom
  editor expectations.
- Save As and hot-exit recovery behave consistently with VS Code custom editor
  lifecycle rules.
- Pending edits survive sheet switches inside the same open workbook.
- Save-risk workbooks and blocked cells remain read-only with actionable
  feedback.
- Failed or unsupported save paths never mutate files silently.
