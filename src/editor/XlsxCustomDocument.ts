import * as vscode from 'vscode';
import * as XLSX from 'xlsx';

import { buildWorksheetTable } from './tableViewModelBuilder';
import { normalizeWorkbookOpenError } from '../parsing/workbookOpenError';
import { assessCellEditability, assessWorkbookEditability, getCellDisplayValue, getCellEditValue, getCellRawValueType } from '../parsing/workbookRiskScanner';
import { loadWorkbook, parseWorkbookBytes } from '../parsing/xlsxWorkbookLoader';
import { loadWorkbookFromBackup, writeWorkbookBackup, writeWorkbookToUri } from '../persistence/workbookSerializer';
import type { EditorMessageState, ViewerState } from '../types/viewer-state';
import type { ParsedWorkbook } from '../types/workbook';
import type { CellEditOperation, CellSnapshot, WorksheetPendingEdits } from '../types/workbook-edit';

export interface DocumentContentChangeEvent {
  kind: 'state' | 'cell' | 'message';
  sheetId?: string;
  address?: string;
  message?: EditorMessageState;
}

interface DocumentOpenOptions {
  activeSheetId?: string;
  pendingEdits?: WorksheetPendingEdits[];
  restoredFromBackup?: boolean;
}

export class XlsxCustomDocument implements vscode.CustomDocument {
  private readonly changeEmitter = new vscode.EventEmitter<DocumentContentChangeEvent>();
  private parsedWorkbook: ParsedWorkbook;
  private readonly editHistory: CellEditOperation[] = [];
  private historyCursor = -1;
  private savePoint = -1;
  private restoredBackupDirty = false;
  private restoredPendingEdits = new Map<string, Set<string>>();
  private currentEditorMessage?: EditorMessageState;

  public activeSheetId: string;

  public static async create(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext
  ): Promise<XlsxCustomDocument> {
    if (openContext.backupId) {
      const restored = await loadWorkbookFromBackup(uri, openContext.backupId);
      return new XlsxCustomDocument(uri, restored.parsedWorkbook, {
        activeSheetId: restored.activeSheetId,
        pendingEdits: restored.pendingEdits,
        restoredFromBackup: true
      });
    }

    if (openContext.untitledDocumentData) {
      return new XlsxCustomDocument(uri, parseWorkbookBytes(uri, openContext.untitledDocumentData));
    }

    return new XlsxCustomDocument(uri, await loadWorkbook(uri));
  }

  public static fromParsedWorkbook(
    uri: vscode.Uri,
    parsedWorkbook: ParsedWorkbook,
    options: DocumentOpenOptions = {}
  ): XlsxCustomDocument {
    return new XlsxCustomDocument(uri, parsedWorkbook, options);
  }

  private constructor(
    public readonly uri: vscode.Uri,
    parsedWorkbook: ParsedWorkbook,
    options: DocumentOpenOptions = {}
  ) {
    this.parsedWorkbook = parsedWorkbook;
    this.activeSheetId =
      options.activeSheetId && parsedWorkbook.sheets.some((sheet) => sheet.id === options.activeSheetId)
        ? options.activeSheetId
        : parsedWorkbook.activeSheetId;
    this.restoredBackupDirty = options.restoredFromBackup ?? false;

    for (const pending of options.pendingEdits ?? []) {
      this.restoredPendingEdits.set(pending.sheetId, new Set(pending.addresses));
    }
  }

  public get onDidChangeContent(): vscode.Event<DocumentContentChangeEvent> {
    return this.changeEmitter.event;
  }

  public get workbook(): ParsedWorkbook {
    return this.parsedWorkbook;
  }

  public get fileName(): string {
    return this.parsedWorkbook.fileName;
  }

  public get editability() {
    return this.parsedWorkbook.editability;
  }

  public get warnings(): string[] {
    return this.parsedWorkbook.warnings;
  }

  public get isDirty(): boolean {
    return this.restoredBackupDirty || this.historyCursor !== this.savePoint;
  }

  public get canUndo(): boolean {
    return this.historyCursor >= 0;
  }

  public get canRedo(): boolean {
    return this.historyCursor < this.editHistory.length - 1;
  }

  public get editorMessage(): EditorMessageState | undefined {
    return this.currentEditorMessage;
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  public selectSheet(sheetId: string): void {
    if (!this.parsedWorkbook.sheets.some((sheet) => sheet.id === sheetId)) {
      return;
    }

    this.activeSheetId = sheetId;
    this.emitChange({ kind: 'state' });
  }

  public dismissEditorMessage(): void {
    this.currentEditorMessage = undefined;
    this.emitChange({ kind: 'message' });
  }

  public getViewerState(): ViewerState {
    const selectedSheetId = this.activeSheetId ?? this.parsedWorkbook.activeSheetId;

    try {
      const table = buildWorksheetTable(this.parsedWorkbook, selectedSheetId, {
        pendingEditAddresses: this.getPendingEditAddresses(selectedSheetId)
      });

      return {
        loadState: 'ready',
        title: this.fileName,
        readOnly: !this.parsedWorkbook.editability.editable,
        isDirty: this.isDirty,
        canUndo: this.canUndo,
        canRedo: this.canRedo,
        availableSheets: this.getAvailableSheets(),
        selectedSheetId,
        table,
        warnings: this.parsedWorkbook.warnings,
        editability: this.parsedWorkbook.editability,
        editorMessage: this.currentEditorMessage
      };
    } catch (error) {
      const normalized = normalizeWorkbookOpenError(error);

      return {
        loadState: normalized.code === 'unsupported' ? 'unsupported' : 'error',
        title: this.fileName,
        readOnly: true,
        isDirty: this.isDirty,
        canUndo: this.canUndo,
        canRedo: this.canRedo,
        availableSheets: this.getAvailableSheets(),
        selectedSheetId,
        warnings: this.parsedWorkbook.warnings,
        message: normalized.message,
        editability: this.parsedWorkbook.editability,
        editorMessage: this.currentEditorMessage
      };
    }
  }

  public applyEdit(sheetId: string, address: string, value: string): CellEditOperation | undefined {
    const editability = assessCellEditability(this.parsedWorkbook, sheetId, address);
    if (!editability.editable) {
      this.setEditorMessage('warning', editability.readOnlyReason ?? 'This cell cannot be edited.');
      return undefined;
    }

    const previousCellSnapshot = this.captureCellSnapshot(sheetId, address);
    const nextCellSnapshot = this.createEditedSnapshot(previousCellSnapshot, value);

    if (previousCellSnapshot.editValue === nextCellSnapshot.editValue) {
      return undefined;
    }

    this.discardRedoHistory();
    this.applyCellSnapshot(sheetId, address, nextCellSnapshot);

    const operation: CellEditOperation = {
      id: `${sheetId}:${address}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      sheetId,
      address,
      previousCellSnapshot,
      nextCellSnapshot,
      status: 'pending',
      label: `Edit ${address}`,
      committedAt: Date.now()
    };

    this.editHistory.push(operation);
    this.historyCursor = this.editHistory.length - 1;
    this.clearRestoredPendingStateFor(sheetId, address);
    this.currentEditorMessage = undefined;
    this.reconcileHistoryStatuses();
    this.emitChange({ kind: 'cell', sheetId, address });
    return operation;
  }

  public async undoEdit(operationId: string): Promise<void> {
    const index = this.editHistory.findIndex((operation) => operation.id === operationId);
    if (index < 0 || index > this.historyCursor) {
      return;
    }

    const operation = this.editHistory[index];
    this.applyCellSnapshot(operation.sheetId, operation.address, operation.previousCellSnapshot);
    this.historyCursor = index - 1;
    this.reconcileHistoryStatuses();
    this.emitChange({ kind: 'cell', sheetId: operation.sheetId, address: operation.address });
  }

  public async redoEdit(operationId: string): Promise<void> {
    const index = this.editHistory.findIndex((operation) => operation.id === operationId);
    if (index < 0 || index !== this.historyCursor + 1) {
      return;
    }

    const operation = this.editHistory[index];
    this.applyCellSnapshot(operation.sheetId, operation.address, operation.nextCellSnapshot);
    this.historyCursor = index;
    this.reconcileHistoryStatuses();
    this.emitChange({ kind: 'cell', sheetId: operation.sheetId, address: operation.address });
  }

  public async save(): Promise<void> {
    await this.persistTo(this.uri);
  }

  public async saveAs(destination: vscode.Uri): Promise<void> {
    await this.persistTo(destination);
  }

  public async revert(): Promise<void> {
    this.parsedWorkbook = await loadWorkbook(this.uri);
    this.activeSheetId = this.parsedWorkbook.sheets.some((sheet) => sheet.id === this.activeSheetId)
      ? this.activeSheetId
      : this.parsedWorkbook.activeSheetId;
    this.editHistory.splice(0, this.editHistory.length);
    this.historyCursor = -1;
    this.savePoint = -1;
    this.restoredBackupDirty = false;
    this.restoredPendingEdits.clear();
    this.currentEditorMessage = undefined;
    this.emitChange({ kind: 'state' });
  }

  public async backup(destination: vscode.Uri): Promise<vscode.CustomDocumentBackup> {
    return writeWorkbookBackup(
      this.uri,
      destination,
      this.parsedWorkbook.workbook,
      this.activeSheetId,
      this.getAllPendingEdits()
    );
  }

  private async persistTo(destination: vscode.Uri): Promise<void> {
    const saveAssessment = assessWorkbookEditability(this.parsedWorkbook.workbook);
    this.parsedWorkbook = {
      ...this.parsedWorkbook,
      editability: saveAssessment
    };

    if (!saveAssessment.editable) {
      const message =
        saveAssessment.readOnlyReason ??
        'This workbook cannot be saved safely in the current editor release.';
      this.setEditorMessage('warning', message);
      throw new Error(message);
    }

    try {
      const savedWorkbook = await writeWorkbookToUri(destination, this.parsedWorkbook.workbook);
      this.parsedWorkbook =
        destination.toString() === this.uri.toString()
          ? savedWorkbook
          : {
              ...savedWorkbook,
              uri: this.parsedWorkbook.uri,
              fileName: this.parsedWorkbook.fileName
            };
      this.savePoint = this.historyCursor;
      this.restoredBackupDirty = false;
      this.restoredPendingEdits.clear();
      this.currentEditorMessage = undefined;
      this.reconcileHistoryStatuses();
      this.emitChange({ kind: 'state' });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Unable to save workbook changes: ${error.message}`
          : 'Unable to save workbook changes because an unexpected error occurred.';
      this.setEditorMessage('error', message);
      throw new Error(message);
    }
  }

  private getAvailableSheets() {
    return this.parsedWorkbook.sheets.map((sheet) => ({
      ...sheet,
      pendingEditCount: this.getPendingEditAddresses(sheet.id).length
    }));
  }

  private getPendingEditAddresses(sheetId: string): string[] {
    const pending = new Set<string>(this.restoredPendingEdits.get(sheetId) ?? []);

    for (let index = this.savePoint + 1; index <= this.historyCursor; index += 1) {
      const operation = this.editHistory[index];
      if (operation?.sheetId === sheetId) {
        pending.add(operation.address);
      }
    }

    return Array.from(pending);
  }

  private getAllPendingEdits(): WorksheetPendingEdits[] {
    return this.getAvailableSheets()
      .map((sheet) => ({
        sheetId: sheet.id,
        addresses: this.getPendingEditAddresses(sheet.id)
      }))
      .filter((pending) => pending.addresses.length > 0);
  }

  private discardRedoHistory(): void {
    if (this.historyCursor >= this.editHistory.length - 1) {
      return;
    }

    const discarded = this.editHistory.splice(this.historyCursor + 1);
    for (const operation of discarded) {
      operation.status = 'discarded';
    }
  }

  private captureCellSnapshot(sheetId: string, address: string): CellSnapshot {
    const sheet = this.parsedWorkbook.workbook.Sheets[sheetId];
    const currentCell = sheet?.[address] as XLSX.CellObject | undefined;

    return {
      address,
      cell: currentCell ? this.cloneCell(currentCell) : undefined,
      displayValue: getCellDisplayValue(currentCell),
      editValue: getCellEditValue(currentCell),
      rawValueType: getCellRawValueType(currentCell)
    };
  }

  private createEditedSnapshot(previous: CellSnapshot, value: string): CellSnapshot {
    const trimmed = value.trim();
    const previousCell = previous.cell;
    let nextCell: XLSX.CellObject | undefined;

    if (trimmed.length === 0) {
      nextCell = undefined;
    } else if (previous.rawValueType === 'number' && !Number.isNaN(Number(trimmed))) {
      nextCell = { ...(previousCell ?? {}), t: 'n', v: Number(trimmed), w: trimmed };
    } else if (previous.rawValueType === 'boolean' && /^(true|false)$/i.test(trimmed)) {
      nextCell = {
        ...(previousCell ?? {}),
        t: 'b',
        v: /^true$/i.test(trimmed),
        w: trimmed.toLowerCase()
      };
    } else if (
      previous.rawValueType === 'date' &&
      !Number.isNaN(new Date(trimmed).getTime())
    ) {
      const date = new Date(trimmed);
      nextCell = { ...(previousCell ?? {}), t: 'd', v: date, w: trimmed };
    } else {
      nextCell = { ...(previousCell ?? {}), t: 's', v: value, h: value, w: value };
    }

    if (nextCell) {
      delete nextCell.f;
    }

    return {
      address: previous.address,
      cell: nextCell ? this.cloneCell(nextCell) : undefined,
      displayValue: nextCell ? getCellDisplayValue(nextCell) : '',
      editValue: nextCell ? getCellEditValue(nextCell) : '',
      rawValueType: getCellRawValueType(nextCell)
    };
  }

  private applyCellSnapshot(sheetId: string, address: string, snapshot: CellSnapshot): void {
    const sheet = this.parsedWorkbook.workbook.Sheets[sheetId];
    if (!sheet) {
      return;
    }

    if (snapshot.cell) {
      sheet[address] = this.cloneCell(snapshot.cell);
    } else {
      delete sheet[address];
    }
  }

  private reconcileHistoryStatuses(): void {
    this.editHistory.forEach((operation, index) => {
      if (index > this.historyCursor) {
        operation.status = 'undone';
        return;
      }

      operation.status =
        !this.restoredBackupDirty && index <= this.savePoint ? 'saved' : 'pending';
    });
  }

  private clearRestoredPendingStateFor(sheetId: string, address: string): void {
    const restoredPending = this.restoredPendingEdits.get(sheetId);
    restoredPending?.delete(address);

    if (restoredPending && restoredPending.size === 0) {
      this.restoredPendingEdits.delete(sheetId);
    }
  }

  private cloneCell(cell: XLSX.CellObject): XLSX.CellObject {
    return {
      ...cell,
      ...(cell.v instanceof Date ? { v: new Date(cell.v) } : {})
    };
  }

  private setEditorMessage(kind: EditorMessageState['kind'], text: string): void {
    this.currentEditorMessage = { kind, text };
    this.emitChange({ kind: 'message', message: this.currentEditorMessage });
  }

  private emitChange(event: DocumentContentChangeEvent): void {
    this.changeEmitter.fire(event);
  }
}
