# excel-editor

Read-only VS Code extension foundation for opening `.xlsx` workbooks in an
Excel-like table view.

## Current scope

- Open supported `.xlsx` files inside Visual Studio Code
- Show workbook content in a read-only tabular grid
- Switch between visible worksheets in the same workbook
- Surface clear errors for malformed, encrypted, or unsupported files

## Development

```bash
npm install
npm run compile
npm test
```

## Notes

- This first milestone is intentionally view-only.
- Advanced Excel behavior such as editing, formula recalculation, and full
  formatting parity is out of scope.
