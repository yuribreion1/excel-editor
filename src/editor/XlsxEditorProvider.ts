import * as vscode from 'vscode';

import { XlsxCustomDocument } from './XlsxCustomDocument';
import type { TableCell } from '../types/workbook';
import type { FromWebviewMessage, ToWebviewMessage } from '../webview/messageTypes';
import { getXlsxViewerHtml } from '../webview/xlsxViewerApp';

export class XlsxEditorProvider
  implements vscode.CustomEditorProvider<XlsxCustomDocument>
{
  public static readonly viewType = 'excelEditor.xlsxViewer';

  private readonly documentChangeEmitter =
    new vscode.EventEmitter<vscode.CustomDocumentEditEvent<XlsxCustomDocument>>();
  private readonly webviews = new Map<XlsxCustomDocument, Set<vscode.WebviewPanel>>();
  private readonly documentSubscriptions = new Map<XlsxCustomDocument, vscode.Disposable>();

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public get onDidChangeCustomDocument(): vscode.Event<
    vscode.CustomDocumentEditEvent<XlsxCustomDocument>
  > {
    return this.documentChangeEmitter.event;
  }

  public async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext
  ): Promise<XlsxCustomDocument> {
    const document = await XlsxCustomDocument.create(uri, openContext);

    if (!this.documentSubscriptions.has(document)) {
      this.documentSubscriptions.set(
        document,
        document.onDidChangeContent((event) => {
          void this.broadcastDocumentState(document, event.kind === 'cell' ? event : undefined);

          if (event.kind === 'message' && event.message) {
            void this.broadcastEditorMessage(document, event.message);
          }
        })
      );
    }

    return document;
  }

  public async resolveCustomEditor(
    document: XlsxCustomDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist'), vscode.Uri.joinPath(this.extensionUri, 'src')]
    };
    webviewPanel.title = document.fileName;
    webviewPanel.webview.html = await getXlsxViewerHtml(webviewPanel.webview, this.extensionUri);
    this.trackWebview(document, webviewPanel);

    webviewPanel.webview.onDidReceiveMessage(async (message: FromWebviewMessage) => {
      if (message.type === 'ready') {
        await this.postState(document, webviewPanel.webview);
        return;
      }

      if (message.type === 'dismissEditorMessage') {
        document.dismissEditorMessage();
        return;
      }

      if (message.type === 'selectSheet') {
        document.selectSheet(message.sheetId);
        return;
      }

      if (message.type === 'commitCellEdit') {
        const operation = document.applyEdit(message.sheetId, message.address, message.value);
        if (!operation) {
          return;
        }

        this.documentChangeEmitter.fire({
          document,
          label: operation.label,
          undo: () => document.undoEdit(operation.id),
          redo: () => document.redoEdit(operation.id)
        });
      }
    });
  }

  public async saveCustomDocument(
    document: XlsxCustomDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.save();
  }

  public async saveCustomDocumentAs(
    document: XlsxCustomDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.saveAs(destination);
  }

  public async revertCustomDocument(
    document: XlsxCustomDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.revert();
  }

  public async backupCustomDocument(
    document: XlsxCustomDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return document.backup(context.destination);
  }

  private trackWebview(document: XlsxCustomDocument, webviewPanel: vscode.WebviewPanel): void {
    const existing = this.webviews.get(document) ?? new Set<vscode.WebviewPanel>();
    existing.add(webviewPanel);
    this.webviews.set(document, existing);

    webviewPanel.onDidDispose(() => {
      const documentWebviews = this.webviews.get(document);
      documentWebviews?.delete(webviewPanel);

      if (!documentWebviews || documentWebviews.size > 0) {
        return;
      }

      this.webviews.delete(document);
      this.documentSubscriptions.get(document)?.dispose();
      this.documentSubscriptions.delete(document);
    });
  }

  private async postState(
    document: XlsxCustomDocument,
    webview: vscode.Webview
  ): Promise<void> {
    const message: ToWebviewMessage = {
      type: 'state',
      state: document.getViewerState()
    };
    await webview.postMessage(message);
  }

  private async broadcastDocumentState(
    document: XlsxCustomDocument,
    cellEvent?: { sheetId?: string; address?: string }
  ): Promise<void> {
    const webviews = this.webviews.get(document);
    if (!webviews || webviews.size === 0) {
      return;
    }

    const state = document.getViewerState();
    const updatedCell =
      cellEvent && cellEvent.sheetId === state.selectedSheetId && cellEvent.address
        ? this.findCell(state.table?.cellMatrix ?? [], cellEvent.address)
        : undefined;

    for (const panel of webviews) {
      if (cellEvent?.sheetId && cellEvent.address) {
        const cellUpdateMessage: ToWebviewMessage = {
          type: 'cellUpdate',
          sheetId: cellEvent.sheetId,
          address: cellEvent.address,
          cell: updatedCell,
          state
        };
        await panel.webview.postMessage(cellUpdateMessage);
      } else {
        const stateMessage: ToWebviewMessage = {
          type: 'state',
          state
        };
        await panel.webview.postMessage(stateMessage);
      }
    }
  }

  private async broadcastEditorMessage(
    document: XlsxCustomDocument,
    editorMessage: NonNullable<XlsxCustomDocument['editorMessage']>
  ): Promise<void> {
    const webviews = this.webviews.get(document);
    if (!webviews || webviews.size === 0) {
      return;
    }

    for (const panel of webviews) {
      const message: ToWebviewMessage = {
        type: 'editorMessage',
        message: editorMessage
      };
      await panel.webview.postMessage(message);
    }
  }

  private findCell(cellMatrix: TableCell[][], address: string): TableCell | undefined {
    for (const row of cellMatrix) {
      const cell = row.find((candidate) => candidate.address === address);
      if (cell) {
        return cell;
      }
    }

    return undefined;
  }
}
