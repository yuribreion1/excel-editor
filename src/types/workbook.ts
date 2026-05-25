import type * as XLSX from 'xlsx';

import type { CellRawValueType, WorkbookSaveAssessment } from './workbook-edit';

export interface WorksheetSummary {
  id: string;
  name: string;
  visibilityState: 'visible' | 'hidden' | 'veryHidden';
  isEditable: boolean;
  editBlockReason?: string;
  pendingEditCount: number;
}

export interface ParsedWorkbook {
  uri: string;
  fileName: string;
  workbook: XLSX.WorkBook;
  sheets: WorksheetSummary[];
  activeSheetId: string;
  warnings: string[];
  editability: WorkbookSaveAssessment;
}

export interface TableCell {
  address: string;
  rowIndex: number;
  columnIndex: number;
  displayValue: string;
  editValue: string;
  rawValueType: CellRawValueType;
  isEditable: boolean;
  editBlockReason?: string;
  isMergedAnchor: boolean;
  isInsideMergedRange: boolean;
  isHiddenByStructure: boolean;
  hasPendingEdit: boolean;
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
  isEditable: boolean;
  editBlockReason?: string;
}
