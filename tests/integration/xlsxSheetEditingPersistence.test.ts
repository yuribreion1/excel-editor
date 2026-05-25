import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import * as vscode from 'vscode';
import { suite, test } from 'mocha';

import { XlsxEditorProvider } from '../../src/editor/XlsxEditorProvider';
import { loadWorkbook } from '../../src/parsing/xlsxWorkbookLoader';
import { backupUri, fixturePath } from '../helpers/fixturePaths';
import { FakeWebviewPanel } from '../helpers/fakes';

const noCancellation = {} as vscode.CancellationToken;

async function createWorkingCopy(destinationFileName: string): Promise<vscode.Uri> {
  const destination = backupUri(destinationFileName);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(fixturePath('../backups')));
  await fs.copyFile(fixturePath('editable-multi-sheet.xlsx'), destination.fsPath);
  return destination;
}

suite('xlsx sheet editing persistence integration', () => {
  test('persists multi-sheet edits across sheet switches and reopen flows', async () => {
    const source = await createWorkingCopy('sheet-editing-source.xlsx');
    const provider = new XlsxEditorProvider(source);
    const document = await provider.openCustomDocument(source, {
      backupId: undefined,
      untitledDocumentData: undefined
    });

    document.applyEdit('Overview', 'B2', '1500');
    document.selectSheet('Team');
    document.selectSheet('Overview');
    await provider.saveCustomDocument(document, noCancellation);

    const reopened = await loadWorkbook(source);
    assert.equal(reopened.workbook.Sheets.Overview.B2?.v, 1500);
  });

  test('restores unsaved workbook state from backups', async () => {
    const source = await createWorkingCopy('sheet-editing-backup-source.xlsx');
    const backupDestination = backupUri('sheet-editing.backup');
    const provider = new XlsxEditorProvider(source);
    const document = await provider.openCustomDocument(source, {
      backupId: undefined,
      untitledDocumentData: undefined
    });
    document.selectSheet('Team');
    document.applyEdit('Team', 'A2', 'Platform Ops');
    const backup = await provider.backupCustomDocument(
      document,
      { destination: backupDestination },
      noCancellation
    );

    const restoredDocument = await provider.openCustomDocument(source, {
      backupId: backup.id,
      untitledDocumentData: undefined
    });
    const panel = new FakeWebviewPanel();
    await provider.resolveCustomEditor(
      restoredDocument,
      panel as unknown as Parameters<XlsxEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as {
      state: {
        isDirty: boolean;
        selectedSheetId?: string;
        table?: { cellMatrix: Array<Array<{ displayValue: string }>> };
      };
    };
    assert.equal(message.state.isDirty, true);
    assert.equal(message.state.selectedSheetId, 'Team');
    assert.equal(message.state.table?.cellMatrix[1]?.[0]?.displayValue, 'Platform Ops');
    backup.delete();
  });
});
