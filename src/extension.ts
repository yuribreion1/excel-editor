import * as vscode from 'vscode';

import { XlsxEditorProvider } from './editor/XlsxEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new XlsxEditorProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      XlsxEditorProvider.viewType,
      provider,
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: {
          retainContextWhenHidden: false
        }
      }
    )
  );
}

export function deactivate(): void {
  // Nothing to dispose explicitly.
}
