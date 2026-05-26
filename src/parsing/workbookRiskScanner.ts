import * as XLSX from 'xlsx';

import type {
  CellEditAssessment,
  CellRawValueType,
  WorkbookSaveAssessment,
  WorksheetEditAssessment
} from '../types/workbook-edit';
import type { ParsedWorkbook } from '../types/workbook';

function getRawValueType(cell: XLSX.CellObject | undefined): CellRawValueType {
  if (cell?.f) {
    return 'formula';
  }

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
    case 'e':
      return 'error';
    case 'z':
      return 'blank';
    default:
      return 'unknown';
  }
}

function getSheetTypeBlockers(workbook: XLSX.WorkBook): string[] {
  const blockers: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetType = sheet?.['!type'];

    if (sheetType) {
      blockers.push(
        `Worksheet "${sheetName}" uses the unsupported "${sheetType}" sheet type.`
      );
    }
  }

  return blockers;
}

function findMergeInfo(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number
): { isMergedAnchor: boolean; isInsideMergedRange: boolean } {
  const merges = sheet['!merges'] ?? [];

  for (const merge of merges) {
    const withinRows = rowIndex >= merge.s.r && rowIndex <= merge.e.r;
    const withinColumns = columnIndex >= merge.s.c && columnIndex <= merge.e.c;

    if (!withinRows || !withinColumns) {
      continue;
    }

    return {
      isMergedAnchor: merge.s.r === rowIndex && merge.s.c === columnIndex,
      isInsideMergedRange: true
    };
  }

  return {
    isMergedAnchor: false,
    isInsideMergedRange: false
  };
}

export function assessWorkbookEditability(workbook: XLSX.WorkBook): WorkbookSaveAssessment {
  const blockedFeatures: string[] = [];

  if ((workbook as XLSX.WorkBook & { vbaraw?: unknown }).vbaraw) {
    blockedFeatures.push('Macro-enabled workbooks remain read-only in this release.');
  }

  blockedFeatures.push(...getSheetTypeBlockers(workbook));

  return {
    editable: blockedFeatures.length === 0,
    blockedFeatures,
    warnings: [],
    readOnlyReason: blockedFeatures[0],
    saveTargetFormat: 'xlsx'
  };
}

export function assessWorksheetEditability(
  parsedWorkbook: ParsedWorkbook,
  sheetId: string
): WorksheetEditAssessment {
  if (!parsedWorkbook.editability.editable) {
    return {
      editable: false,
      warnings: [],
      readOnlyReason:
        parsedWorkbook.editability.readOnlyReason ??
        'This workbook is read-only in the current editor session.'
    };
  }

  const sheet = parsedWorkbook.workbook.Sheets[sheetId];
  if (!sheet) {
    return {
      editable: false,
      warnings: [],
      readOnlyReason: `Worksheet "${sheetId}" was not found in the workbook.`
    };
  }

  if (sheet['!type']) {
    return {
      editable: false,
      warnings: [],
      readOnlyReason: `Worksheet "${sheetId}" uses the unsupported "${sheet['!type']}" sheet type.`
    };
  }

  if (sheet['!protect']) {
    return {
      editable: false,
      warnings: [],
      readOnlyReason: `Worksheet "${sheetId}" is protected and cannot be edited in this release.`
    };
  }

  return {
    editable: true,
    warnings: []
  };
}

export function assessCellEditability(
  parsedWorkbook: ParsedWorkbook,
  sheetId: string,
  address: string
): CellEditAssessment {
  const worksheetAssessment = assessWorksheetEditability(parsedWorkbook, sheetId);
  const sheet = parsedWorkbook.workbook.Sheets[sheetId];
  const cell = sheet?.[address];
  const coordinates = XLSX.utils.decode_cell(address);
  const mergeInfo = sheet
    ? findMergeInfo(sheet, coordinates.r, coordinates.c)
    : { isMergedAnchor: false, isInsideMergedRange: false };
  const rawValueType = getRawValueType(cell);
  const isHiddenByStructure =
    Boolean(sheet?.['!rows']?.[coordinates.r]?.hidden) ||
    Boolean(sheet?.['!cols']?.[coordinates.c]?.hidden);

  if (!worksheetAssessment.editable) {
    return {
      editable: false,
      rawValueType,
      isMergedAnchor: mergeInfo.isMergedAnchor,
      isInsideMergedRange: mergeInfo.isInsideMergedRange,
      isHiddenByStructure,
      readOnlyReason: worksheetAssessment.readOnlyReason
    };
  }

  if (rawValueType === 'formula') {
    return {
      editable: false,
      rawValueType,
      isMergedAnchor: mergeInfo.isMergedAnchor,
      isInsideMergedRange: mergeInfo.isInsideMergedRange,
      isHiddenByStructure,
      readOnlyReason: 'Formula cells remain read-only in this release.'
    };
  }

  if (rawValueType === 'error') {
    return {
      editable: false,
      rawValueType,
      isMergedAnchor: mergeInfo.isMergedAnchor,
      isInsideMergedRange: mergeInfo.isInsideMergedRange,
      isHiddenByStructure,
      readOnlyReason: 'Cells with spreadsheet errors remain read-only in this release.'
    };
  }

  if (mergeInfo.isInsideMergedRange) {
    return {
      editable: false,
      rawValueType,
      isMergedAnchor: mergeInfo.isMergedAnchor,
      isInsideMergedRange: true,
      isHiddenByStructure,
      readOnlyReason: 'Merged cells remain read-only in this release.'
    };
  }

  if (isHiddenByStructure) {
    return {
      editable: false,
      rawValueType,
      isMergedAnchor: mergeInfo.isMergedAnchor,
      isInsideMergedRange: mergeInfo.isInsideMergedRange,
      isHiddenByStructure: true,
      readOnlyReason: 'Hidden rows and columns remain read-only in this release.'
    };
  }

  return {
    editable: true,
    rawValueType,
    isMergedAnchor: mergeInfo.isMergedAnchor,
    isInsideMergedRange: mergeInfo.isInsideMergedRange,
    isHiddenByStructure
  };
}

export function getCellDisplayValue(cell: XLSX.CellObject | undefined): string {
  if (cell?.w !== undefined) {
    return String(cell.w);
  }

  if (cell?.v instanceof Date) {
    return cell.v.toISOString();
  }

  return cell?.v !== undefined && cell.v !== null ? String(cell.v) : '';
}

export function getCellEditValue(cell: XLSX.CellObject | undefined): string {
  if (cell?.v instanceof Date) {
    return cell.v.toISOString();
  }

  return cell?.v !== undefined && cell.v !== null ? String(cell.v) : '';
}

export function getCellRawValueType(cell: XLSX.CellObject | undefined): CellRawValueType {
  return getRawValueType(cell);
}
