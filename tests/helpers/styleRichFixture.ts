import * as XLSX from 'xlsx';

type WorkbookWithStyles = XLSX.WorkBook & {
  Styles?: { CellXf?: unknown[] };
};

/**
 * Creates a workbook whose Styles.CellXf table contains more than one entry,
 * which was previously used by getWorkbookStyleBlocker to flag the workbook as
 * read-only. Used in tests that verify style-rich workbooks are now editable.
 */
export function createStyleRichWorkbook(): XLSX.WorkBook {
  const workbook: WorkbookWithStyles = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Name', 'Score'],
    ['Alpha', 100],
    ['Beta', 200]
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Results');

  // Inject a multi-entry CellXf style table to simulate a style-rich workbook.
  // SheetJS populates this when cellStyles: true is used during XLSX.read().
  workbook.Styles = {
    CellXf: [
      { numFmtId: 0, fontId: 0, fillId: 0, borderId: 0 },
      { numFmtId: 0, fontId: 1, fillId: 2, borderId: 0 }
    ]
  };

  return workbook;
}

/**
 * Creates a workbook with a VBA/macro payload (vbaraw present).
 * Used in regression tests to confirm VBA workbooks remain blocked
 * even after the style guard is removed.
 */
export function createVbaWorkbook(): XLSX.WorkBook & { vbaraw?: Uint8Array } {
  const workbook: WorkbookWithStyles & { vbaraw?: Uint8Array } = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Macro'], ['=SUM(A1)']]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  workbook.vbaraw = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]);
  return workbook;
}
