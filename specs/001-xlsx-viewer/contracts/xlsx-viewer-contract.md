# XLSX Viewer Contract

## Purpose

Define the user-visible behavior for opening and viewing `.xlsx` files in the
first read-only release of the VS Code extension.

## Supported Input Contract

- The viewer accepts local `.xlsx` workbook files opened from Visual Studio
  Code.
- The viewer is responsible for showing workbook data in a table-oriented
  experience rather than exposing raw binary file contents.
- Files that are corrupted, encrypted, or otherwise unsupported must not open in
  the custom viewer as if they were valid.

## Read-Only Behavior Contract

- The viewer presents workbook data for inspection only.
- The UI must clearly communicate that cells and columns cannot be edited in
  this release.
- The viewer must not modify the underlying workbook as part of open, load, or
  sheet switching actions.

## Loading and Ready-State Contract

- When a workbook is opened, the UI first enters a loading state.
- Once the active worksheet is ready, the UI shows:
  - the current sheet name
  - an Excel-like table with visible row and column ordering
  - visible cell values for the selected sheet
- If the workbook contains multiple worksheets, the UI exposes a visible way to
  switch between them.

## Unsupported Structure Contract

- When a workbook contains structures that cannot be represented exactly in the
  simple table view, the viewer must keep the data understandable and surface a
  warning when fidelity is reduced.
- Hidden sheets may be excluded from normal navigation if that behavior is
  clearly consistent and documented in the UI.
- Merged cells, hidden rows, and hidden columns must not cause broken layout or
  silent corruption of what the user sees.

## Error Contract

- If a workbook cannot be opened, the viewer shows a user-facing error state
  that explains the failure in plain language.
- Error states must distinguish between unsupported or encrypted workbooks and
  unexpected failures where possible.
- The viewer must not leave the user with a blank table and no explanation.

## Performance Contract

- For supported workbooks up to 10 MB, the viewer should reach a readable table
  state within 5 seconds under normal desktop usage.
- Sheet changes should feel immediate for typical workbooks and must not require
  reopening the file.
