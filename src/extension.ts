import * as vscode from 'vscode';

import { XlsxReadonlyEditorProvider } from './editor/XlsxReadonlyEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new XlsxReadonlyEditorProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      XlsxReadonlyEditorProvider.viewType,
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
