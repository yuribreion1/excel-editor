# Quickstart: Editable Spreadsheet with Save

## What is being changed

A single guard in `src/parsing/workbookRiskScanner.ts` is removed. The guard
incorrectly blocked all `.xlsx` files that contain more than one cell style
from being edited. After the change, standard `.xlsx` files open in editable
mode by default.

## Files involved

| File | Change |
|------|--------|
| `src/parsing/workbookRiskScanner.ts` | Remove `getWorkbookStyleBlocker` function and its call in `assessWorkbookEditability` |
| `tests/` | Add unit tests for style-rich workbook editability and save round-trip |

## No changes required in

- `src/persistence/workbookSerializer.ts` — already uses `cellStyles: true`
- `src/webview/xlsxViewerApp.ts` — `state.readOnly` branches are correct as-is
- `src/editor/XlsxCustomDocument.ts` — save/dirty/undo infrastructure unchanged
- `src/types/*` — no type changes needed

## Local development setup

```bash
# Install dependencies
npm install

# Build extension (development mode)
npm run compile

# Run in VS Code
# Press F5 in VS Code to launch the Extension Development Host
# Open any .xlsx file to verify it opens in editable mode
```

## Verifying the change manually

1. Open any `.xlsx` file that has formatted cells (any real-world spreadsheet)
2. Confirm no "Read only" badge appears in the header
3. Confirm the subtitle reads "Editable workbook" (not "Read-only workbook preview")
4. Click a cell and type a new value — it should accept input
5. Press `Ctrl+S` — the file should save without error
6. Close and reopen the file — the new value should persist

## Running tests

```bash
npm test
```

Tests cover:
- `assessWorkbookEditability` returns `editable: true` for a style-rich workbook
- `assessWorkbookEditability` returns `editable: false` for a VBA workbook (regression)
- Cell edit + save round-trip preserves all cell styles

## Key architectural note

The editing and saving infrastructure was already fully implemented in a previous
feature. This change only removes the over-conservative read-only guard that
prevented standard workbooks from reaching that infrastructure. No new message
types, no new persistence logic, and no new UI components are introduced.
