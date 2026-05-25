import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import * as vscode from 'vscode';
import { suite, test } from 'mocha';

import { XlsxCustomDocument } from '../../src/editor/XlsxCustomDocument';
import { XlsxEditorProvider } from '../../src/editor/XlsxEditorProvider';
import { loadWorkbook } from '../../src/parsing/xlsxWorkbookLoader';
import { backupUri, fixturePath, fixtureUri } from '../helpers/fixturePaths';

const noCancellation = {} as vscode.CancellationToken;

async function createWorkingCopy(sourceFileName: string, destinationFileName: string): Promise<vscode.Uri> {
  const destination = backupUri(destinationFileName);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(fixturePath('../backups')));
  await fs.copyFile(fixturePath(sourceFileName), destination.fsPath);
  return destination;
}

suite('xlsx save flow integration', () => {
  test('saves, saves as, and reverts editable workbooks safely', async () => {
    const source = await createWorkingCopy('editable-single-sheet.xlsx', 'save-flow-source.xlsx');
    const saveAsTarget = backupUri('save-flow-save-as.xlsx');
    const provider = new XlsxEditorProvider(source);
    const document = await provider.openCustomDocument(source, {
      backupId: undefined,
      untitledDocumentData: undefined
    });

    const operation = document.applyEdit('Summary', 'B2', '130');
    assert.ok(operation);
    await provider.saveCustomDocument(document, noCancellation);

    const savedWorkbook = await loadWorkbook(source);
    assert.equal(savedWorkbook.workbook.Sheets.Summary.B2?.v, 130);
    assert.equal(document.isDirty, false);

    document.applyEdit('Summary', 'B3', '95');
    await provider.saveCustomDocumentAs(document, saveAsTarget, noCancellation);
    const savedAsWorkbook = await loadWorkbook(saveAsTarget);
    assert.equal(savedAsWorkbook.workbook.Sheets.Summary.B3?.v, 95);

    document.applyEdit('Summary', 'B2', '222');
    await provider.revertCustomDocument(document, noCancellation);
    assert.equal(document.getViewerState().table?.cellMatrix[1]?.[1]?.displayValue, '130');
  });

  test('blocks save attempts that are unsafe for the current workbook', async () => {
    const uri = fixtureUri('editable-single-sheet.xlsx');
    const parsedWorkbook = await loadWorkbook(uri);
    (parsedWorkbook.workbook as typeof parsedWorkbook.workbook & { vbaraw?: Uint8Array }).vbaraw =
      new Uint8Array([1]);
    const document = XlsxCustomDocument.fromParsedWorkbook(uri, parsedWorkbook);
    const provider = new XlsxEditorProvider(uri);

    document.applyEdit('Summary', 'A2', 'Blocked');
    await assert.rejects(
      () => provider.saveCustomDocument(document, noCancellation),
      /macro-enabled workbooks remain read-only/i
    );
    assert.equal(document.isDirty, true);
    assert.match(document.editorMessage?.text ?? '', /macro-enabled/i);
  });
});
