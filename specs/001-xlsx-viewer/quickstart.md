# Quickstart: XLSX Viewer Foundation

## Prerequisites

- Node.js LTS installed locally
- npm installed locally
- Visual Studio Code installed

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run compile
   ```

3. Run the automated checks planned for this feature:

   ```bash
   npm test
   ```

## Manual Validation Flow

1. Open this repository in Visual Studio Code.
2. Start the extension in the Extension Development Host.
3. Open a sample `.xlsx` workbook from `tests/fixtures/workbooks/`.
4. Confirm the workbook opens in a read-only Excel-like table view.
5. If the workbook has multiple sheets, switch between them and confirm the
   table updates correctly.
6. Open a malformed or unsupported workbook fixture and confirm the extension
   shows a clear error message.

## Expected Outcomes

- Valid `.xlsx` files open in the custom viewer rather than raw file contents.
- The viewer preserves visible row order, column order, and cell values.
- The viewer makes its read-only scope obvious.
- Unsupported or corrupted files fail with actionable messaging.
