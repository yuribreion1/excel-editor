import path from 'node:path';

import * as vscode from 'vscode';
import * as XLSX from 'xlsx';

import type { BackupPayload, WorksheetPendingEdits } from '../types/workbook-edit';
import type { ParsedWorkbook } from '../types/workbook';
import { parseWorkbookBytes } from '../parsing/xlsxWorkbookLoader';

const BACKUP_PREFIX = 'excel-editor-backup-v1\n';

function encodeBuffer(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

function decodeBuffer(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

export function serializeWorkbook(workbook: XLSX.WorkBook): Uint8Array {
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    cellStyles: true
  }) as Buffer;

  return Uint8Array.from(buffer);
}

export function reloadWorkbookFromBytes(uri: vscode.Uri, bytes: Uint8Array): ParsedWorkbook {
  return parseWorkbookBytes(uri, bytes);
}

export async function reloadWorkbookFromDisk(uri: vscode.Uri): Promise<ParsedWorkbook> {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return reloadWorkbookFromBytes(uri, bytes);
}

export async function writeWorkbookToUri(
  uri: vscode.Uri,
  workbook: XLSX.WorkBook
): Promise<ParsedWorkbook> {
  const bytes = serializeWorkbook(workbook);
  await vscode.workspace.fs.writeFile(uri, bytes);
  return reloadWorkbookFromBytes(uri, bytes);
}

function encodeBackupPayload(payload: BackupPayload): Uint8Array {
  return new TextEncoder().encode(`${BACKUP_PREFIX}${JSON.stringify(payload)}`);
}

function decodeBackupPayload(data: Uint8Array): BackupPayload {
  const text = new TextDecoder().decode(data);

  if (!text.startsWith(BACKUP_PREFIX)) {
    throw new Error('The custom editor backup is malformed.');
  }

  return JSON.parse(text.slice(BACKUP_PREFIX.length)) as BackupPayload;
}

async function ensureParentDirectory(destination: vscode.Uri): Promise<void> {
  const directory = vscode.Uri.file(path.dirname(destination.fsPath));
  await vscode.workspace.fs.createDirectory(directory);
}

export async function writeWorkbookBackup(
  sourceUri: vscode.Uri,
  destination: vscode.Uri,
  workbook: XLSX.WorkBook,
  activeSheetId: string | undefined,
  pendingEdits: WorksheetPendingEdits[]
): Promise<vscode.CustomDocumentBackup> {
  await ensureParentDirectory(destination);
  const payload: BackupPayload = {
    version: 1,
    sourceUri: sourceUri.toString(),
    activeSheetId,
    pendingEdits,
    workbookData: encodeBuffer(serializeWorkbook(workbook))
  };
  await vscode.workspace.fs.writeFile(destination, encodeBackupPayload(payload));

  return {
    id: destination.toString(),
    delete: () => {
      void vscode.workspace.fs.delete(destination).then(
        () => undefined,
        () => undefined
      );
    }
  };
}

export async function loadWorkbookFromBackup(
  sourceUri: vscode.Uri,
  backupId: string
): Promise<{ parsedWorkbook: ParsedWorkbook; activeSheetId?: string; pendingEdits: WorksheetPendingEdits[] }> {
  const backupUri = vscode.Uri.parse(backupId);
  const payload = decodeBackupPayload(await vscode.workspace.fs.readFile(backupUri));

  return {
    parsedWorkbook: reloadWorkbookFromBytes(sourceUri, decodeBuffer(payload.workbookData)),
    activeSheetId: payload.activeSheetId,
    pendingEdits: payload.pendingEdits
  };
}
