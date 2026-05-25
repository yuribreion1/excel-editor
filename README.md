# excel-editor

VS Code extension for opening and safely editing supported `.xlsx` workbooks in
an Excel-like table view.

## Current scope

- Open supported `.xlsx` files inside Visual Studio Code
- Edit supported cells directly in the tabular grid
- Track dirty state plus undo/redo-ready document edits
- Save, Save As, revert, and hot-exit backup flows through the custom editor
- Switch between visible worksheets without losing pending edits
- Surface clear read-only guidance for blocked workbooks, sheets, or cells
- Surface clear errors for malformed, encrypted, or unsupported files

## Development

```bash
npm install
npm run compile
npm test
```

## Notes

- Editing is intentionally limited to workbook and cell shapes the extension can
  round-trip safely with SheetJS CE.
- Formula cells, merged cells, hidden structural cells, and risky workbook
  shapes stay read-only with guidance instead of allowing silent data loss.
- Advanced Excel behavior such as formula authoring/recalculation and full
  formatting parity remains out of scope.
