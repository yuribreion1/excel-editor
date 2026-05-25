# XLSX Editing Contract

## Purpose

Define the user-visible and extension/webview behavior for editable `.xlsx`
files in the first save-capable release of the VS Code custom editor.

## Supported Input Contract

- The editor targets local `.xlsx` workbook files opened from Visual Studio
  Code.
- All supported files continue to open in the custom table editor rather than as
  raw binary content.
- Editing is enabled only when the workbook passes the extension's save-safety
  assessment for this release.

## Workbook Editability Contract

- The editor must assess workbook-level editability during document open.
- If the workbook contains a save-fidelity blocker, the editor remains in
  read-only mode and shows a clear explanation of why editing is unavailable.
- Workbook-level blockers for this release include:
  - macros or VBA content
  - chart or unsupported sheet types
  - workbook content the extension cannot round-trip safely with SheetJS CE
    (for example detected style-dependent content)
- A protected worksheet may remain viewable, but that sheet must stay read-only
  with a sheet-specific explanation instead of disabling the entire workbook
  unless the protection affects the whole save path.

## Cell Editing Contract

- Editable cells are committed through an inline grid editor inside the webview.
- The webview must not mutate authoritative workbook state directly; it submits
  committed edit requests to the extension host.
- Cells are read-only when they are:
  - formula cells
  - error cells
  - merged or inside merged ranges
  - hidden by worksheet structure
  - otherwise blocked by workbook safety rules
- When a cell is blocked, the UI must expose a user-facing reason.

## Dirty State and Undo Contract

- Every committed cell change must emit one undoable custom-document edit so VS
  Code marks the document dirty.
- Undo and Redo must restore prior and next cell values without reloading the
  workbook from disk.
- The editor UI must clearly indicate unsaved changes while the document is
  dirty.

## Save, Save As, Revert, and Backup Contract

- Save and Save As serialize the in-memory workbook from the extension host and
  write bytes with `vscode.workspace.fs.writeFile`.
- Save must not depend on a visible or retained webview.
- Revert reloads workbook data from disk and refreshes all open editor views for
  the document.
- Backup writes the current in-memory workbook to the VS Code backup destination
  so hot exit can restore unsaved work.
- If save cannot complete safely or write to disk fails, the document must
  remain dirty and the user must receive actionable error text.

## Sheet Navigation Contract

- Visible worksheet tabs remain available for multi-sheet workbooks.
- Switching sheets must preserve dirty state and previously committed edits.
- Returning to a sheet with pending edits must show the edited values currently
  held in the custom document.

## Extension ↔ Webview Message Contract

### Messages from webview to extension

- **`ready`**: Requests the current full editor state after the webview loads or
  reloads.
- **`selectSheet`**: Requests a new active worksheet.
- **`commitCellEdit`**: Submits one confirmed edit with `sheetId`, `address`,
  and the proposed cell value.

### Messages from extension to webview

- **`state`**: Sends the complete editor state, including title, editability,
  dirty flag, selected sheet, warnings, and current table model.
- **`cellUpdate`**: Sends the result of a committed, undone, redone, reverted,
  or externally refreshed cell change.
- **`editorMessage`**: Sends blocked-edit guidance or save/open failure text that
  the webview must render clearly.

## Persistence Safety Contract

- Saving must preserve unaffected workbook data for all workbooks the editor
  marks editable.
- The extension must not silently downgrade a workbook from editable to lossy
  save behavior after edits begin.
- Risky or unsupported workbooks may still be viewable, but they must not enter
  editable mode unless the save path is considered safe for this release.
