import * as vscode from 'vscode';

import { buildWorksheetTable } from './tableViewModelBuilder';
import { loadWorkbook } from '../parsing/xlsxWorkbookLoader';
import { normalizeWorkbookOpenError } from '../parsing/workbookOpenError';
import type { ParsedWorkbook } from '../types/workbook';
import type { ViewerState } from '../types/viewer-state';
import type { FromWebviewMessage, ToWebviewMessage } from '../webview/messageTypes';
import { getXlsxViewerHtml } from '../webview/xlsxViewerApp';

class XlsxCustomDocument implements vscode.CustomDocument {
  public activeSheetId?: string;

  public constructor(
    public readonly uri: vscode.Uri,
    public readonly workbook: ParsedWorkbook
  ) {
    this.activeSheetId = workbook.activeSheetId;
  }

  public dispose(): void {
    // No external resources to release.
  }
}

export class XlsxReadonlyEditorProvider
  implements vscode.CustomReadonlyEditorProvider<XlsxCustomDocument>
{
  public static readonly viewType = 'excelEditor.xlsxViewer';

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public async openCustomDocument(uri: vscode.Uri): Promise<XlsxCustomDocument> {
    const workbook = await loadWorkbook(uri);
    return new XlsxCustomDocument(uri, workbook);
  }

  public async resolveCustomEditor(
    document: XlsxCustomDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'out')]
    };
    webviewPanel.title = document.workbook.fileName;
    webviewPanel.webview.html = await getXlsxViewerHtml(
      webviewPanel.webview,
      this.extensionUri
    );

    webviewPanel.webview.onDidReceiveMessage(async (message: FromWebviewMessage) => {
      if (message.type === 'ready') {
        await this.postState(document, webviewPanel.webview);
        return;
      }

      if (message.type === 'selectSheet') {
        document.activeSheetId = message.sheetId;
        await this.postState(document, webviewPanel.webview);
      }
    });
  }

  private async postState(
    document: XlsxCustomDocument,
    webview: vscode.Webview
  ): Promise<void> {
    const state = this.getViewerState(document);
    const message: ToWebviewMessage = {
      type: 'state',
      state
    };
    await webview.postMessage(message);
  }

  private getViewerState(document: XlsxCustomDocument): ViewerState {
    const selectedSheetId = document.activeSheetId ?? document.workbook.activeSheetId;

    try {
      const table = buildWorksheetTable(document.workbook, selectedSheetId);

      return {
        loadState: 'ready',
        title: document.workbook.fileName,
        readOnly: true,
        availableSheets: document.workbook.sheets,
        selectedSheetId,
        table,
        warnings: document.workbook.warnings
      };
    } catch (error) {
      const normalized = normalizeWorkbookOpenError(error);

      return {
        loadState: normalized.code === 'unsupported' ? 'unsupported' : 'error',
        title: document.workbook.fileName,
        readOnly: true,
        availableSheets: document.workbook.sheets,
        selectedSheetId,
        warnings: document.workbook.warnings,
        message: normalized.message
      };
    }
  }
}
