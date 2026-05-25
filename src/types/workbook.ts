import type * as XLSX from 'xlsx';

export interface WorksheetSummary {
  id: string;
  name: string;
  visibilityState: 'visible' | 'hidden' | 'veryHidden';
}

export interface ParsedWorkbook {
  uri: string;
  fileName: string;
  workbook: XLSX.WorkBook;
  sheets: WorksheetSummary[];
  activeSheetId: string;
  warnings: string[];
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  displayValue: string;
  rawValueType: 'text' | 'number' | 'boolean' | 'date' | 'blank' | 'unknown';
  isMergedAnchor: boolean;
  isHiddenByStructure: boolean;
}

export interface WorksheetTable {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  rowHeaders: string[];
  columnHeaders: string[];
  cellMatrix: TableCell[][];
  structureWarnings: string[];
}
