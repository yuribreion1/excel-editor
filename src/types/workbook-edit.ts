import type * as XLSX from 'xlsx';

export type CellRawValueType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'blank'
  | 'formula'
  | 'error'
  | 'unknown';

export interface WorkbookSaveAssessment {
  editable: boolean;
  blockedFeatures: string[];
  warnings: string[];
  readOnlyReason?: string;
  saveTargetFormat: 'xlsx';
}

export interface WorksheetEditAssessment {
  editable: boolean;
  warnings: string[];
  readOnlyReason?: string;
}

export interface CellEditAssessment {
  editable: boolean;
  rawValueType: CellRawValueType;
  isMergedAnchor: boolean;
  isInsideMergedRange: boolean;
  isHiddenByStructure: boolean;
  readOnlyReason?: string;
}

export interface CellSnapshot {
  address: string;
  cell?: XLSX.CellObject;
  displayValue: string;
  editValue: string;
  rawValueType: CellRawValueType;
}

export type CellEditStatus = 'pending' | 'saved' | 'undone' | 'discarded';

export interface CellEditOperation {
  id: string;
  sheetId: string;
  address: string;
  previousCellSnapshot: CellSnapshot;
  nextCellSnapshot: CellSnapshot;
  status: CellEditStatus;
  label: string;
  committedAt: number;
}

export interface WorksheetPendingEdits {
  sheetId: string;
  addresses: string[];
}

export interface BackupPayload {
  version: 1;
  sourceUri: string;
  activeSheetId?: string;
  pendingEdits: WorksheetPendingEdits[];
  workbookData: string;
}
