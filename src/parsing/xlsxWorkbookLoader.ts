import path from 'node:path';
import * as vscode from 'vscode';
import * as XLSX from 'xlsx';

import type { ParsedWorkbook, WorksheetSummary } from '../types/workbook';

function mapVisibility(hiddenFlag: number | undefined): WorksheetSummary['visibilityState'] {
  if (hiddenFlag === 1) {
    return 'hidden';
  }

  if (hiddenFlag === 2) {
    return 'veryHidden';
  }

  return 'visible';
}

export async function loadWorkbook(uri: vscode.Uri): Promise<ParsedWorkbook> {
  const fileBytes = await vscode.workspace.fs.readFile(uri);

  if (fileBytes.length < 4 || fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4b) {
    throw new Error('Invalid ZIP container for .xlsx workbook.');
  }

  const workbook = XLSX.read(fileBytes, {
    type: 'buffer',
    cellDates: true,
    cellNF: true,
    cellStyles: true,
    cellText: true
  });

  const workbookSheets = workbook.Workbook?.Sheets ?? [];
  const warnings: string[] = [];
  const visibleSheets: WorksheetSummary[] = [];
  let hiddenSheetCount = 0;

  for (const [index, sheetName] of workbook.SheetNames.entries()) {
    const visibility = mapVisibility(workbookSheets[index]?.Hidden);

    if (visibility !== 'visible') {
      hiddenSheetCount += 1;
      continue;
    }

    visibleSheets.push({
      id: sheetName,
      name: sheetName,
      visibilityState: visibility
    });
  }

  if (hiddenSheetCount > 0) {
    warnings.push(
      `${hiddenSheetCount} hidden worksheet${hiddenSheetCount === 1 ? '' : 's'} ${
        hiddenSheetCount === 1 ? 'was' : 'were'
      } excluded from navigation.`
    );
  }

  if (visibleSheets.length === 0 && workbook.SheetNames[0]) {
    visibleSheets.push({
      id: workbook.SheetNames[0],
      name: workbook.SheetNames[0],
      visibilityState: 'hidden'
    });
    warnings.push('All worksheets are hidden, so the first sheet is shown as a fallback.');
  }

  if (visibleSheets.length === 0) {
    throw new Error('Workbook does not contain any readable worksheets.');
  }

  return {
    uri: uri.toString(),
    fileName: path.basename(uri.fsPath),
    workbook,
    sheets: visibleSheets,
    activeSheetId: visibleSheets[0].id,
    warnings
  };
}
