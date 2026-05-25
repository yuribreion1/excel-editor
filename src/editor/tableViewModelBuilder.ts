import * as XLSX from 'xlsx';

import type { ParsedWorkbook, TableCell, WorksheetTable } from '../types/workbook';

function getRawValueType(cell: XLSX.CellObject | undefined): TableCell['rawValueType'] {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return 'blank';
  }

  switch (cell.t) {
    case 's':
      return 'text';
    case 'n':
      return 'number';
    case 'b':
      return 'boolean';
    case 'd':
      return 'date';
    default:
      return 'unknown';
  }
}

function getColumnLabel(index: number): string {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function findMergedAnchors(sheet: XLSX.WorkSheet): Set<string> {
  const anchors = new Set<string>();
  const merges = sheet['!merges'] ?? [];

  for (const merge of merges) {
    anchors.add(`${merge.s.r}:${merge.s.c}`);
  }

  return anchors;
}

export function buildWorksheetTable(
  parsedWorkbook: ParsedWorkbook,
  sheetId: string
): WorksheetTable {
  const sheet = parsedWorkbook.workbook.Sheets[sheetId];

  if (!sheet) {
    throw new Error(`Worksheet "${sheetId}" was not found in the workbook.`);
  }

  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  const rowCount = range ? range.e.r - range.s.r + 1 : 0;
  const columnCount = range ? range.e.c - range.s.c + 1 : 0;
  const hiddenRows = (sheet['!rows'] ?? []).filter((row) => row?.hidden).length;
  const hiddenColumns = (sheet['!cols'] ?? []).filter((column) => column?.hidden).length;
  const mergeCount = (sheet['!merges'] ?? []).length;
  const anchors = findMergedAnchors(sheet);
  const structureWarnings: string[] = [];

  if (mergeCount > 0) {
    structureWarnings.push(
      `${mergeCount} merged range${mergeCount === 1 ? '' : 's'} were flattened to fit the simple table view.`
    );
  }

  if (hiddenRows > 0) {
    structureWarnings.push(
      `${hiddenRows} hidden row${hiddenRows === 1 ? '' : 's'} remain in the table with no hidden-row styling.`
    );
  }

  if (hiddenColumns > 0) {
    structureWarnings.push(
      `${hiddenColumns} hidden column${hiddenColumns === 1 ? '' : 's'} remain in the table with no hidden-column styling.`
    );
  }

  const rowHeaders = Array.from({ length: rowCount }, (_, index) => String(index + 1));
  const columnHeaders = Array.from({ length: columnCount }, (_, index) => getColumnLabel(index));
  const cellMatrix: TableCell[][] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowCells: TableCell[] = [];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({
        r: range ? range.s.r + rowIndex : rowIndex,
        c: range ? range.s.c + columnIndex : columnIndex
      });
      const cell = sheet[address];

      rowCells.push({
        rowIndex,
        columnIndex,
        displayValue:
          cell?.w !== undefined
            ? String(cell.w)
            : cell?.v !== undefined && cell.v !== null
              ? String(cell.v)
              : '',
        rawValueType: getRawValueType(cell),
        isMergedAnchor: anchors.has(`${rowIndex}:${columnIndex}`),
        isHiddenByStructure:
          Boolean(sheet['!rows']?.[rowIndex]?.hidden) ||
          Boolean(sheet['!cols']?.[columnIndex]?.hidden)
      });
    }

    cellMatrix.push(rowCells);
  }

  return {
    id: sheetId,
    name: sheetId,
    rowCount,
    columnCount,
    rowHeaders,
    columnHeaders,
    cellMatrix,
    structureWarnings
  };
}
