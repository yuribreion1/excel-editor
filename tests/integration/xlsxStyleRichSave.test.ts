import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';

import * as vscode from 'vscode';
import { suite, test } from 'mocha';

import { XlsxEditorProvider } from '../../src/editor/XlsxEditorProvider';
import { loadWorkbook } from '../../src/parsing/xlsxWorkbookLoader';
import { serializeWorkbook } from '../../src/persistence/workbookSerializer';
import { createStyleRichWorkbook } from '../helpers/styleRichFixture';

const noCancellation = {} as vscode.CancellationToken;

async function writeStyleRichFixture(fileName: string): Promise<vscode.Uri> {
  const rawWorkbook = createStyleRichWorkbook();
  const bytes = serializeWorkbook(rawWorkbook);
  const tmpPath = path.join(os.tmpdir(), fileName);
  await vscode.workspace.fs.writeFile(vscode.Uri.file(tmpPath), bytes);
  return vscode.Uri.file(tmpPath);
}

suite('style-rich xlsx save flow integration', () => {
  // T011: Style-rich workbooks can be edited and saved with styles preserved.
  test('edits and saves style-rich workbook with Styles.CellXf preserved', async () => {
    const uri = await writeStyleRichFixture('style-rich-save-test.xlsx');
    const provider = new XlsxEditorProvider(uri);
    const document = await provider.openCustomDocument(uri, {
      backupId: undefined,
      untitledDocumentData: undefined
    });

    assert.equal(document.workbook.editability.editable, true, 'Style-rich workbook must be editable');

    const operation = document.applyEdit('Results', 'B2', '777');
    assert.ok(operation, 'applyEdit should succeed for style-rich workbook');
    assert.equal(document.isDirty, true);

    await provider.saveCustomDocument(document, noCancellation);
    assert.equal(document.isDirty, false);

    const reloaded = await loadWorkbook(uri);
    assert.equal(reloaded.workbook.Sheets.Results.B2?.v, 777);

    const reloadedStyles = (reloaded.workbook as typeof reloaded.workbook & { Styles?: { CellXf?: unknown[] } }).Styles?.CellXf;
    assert.ok(Array.isArray(reloadedStyles) && reloadedStyles.length >= 2, 'Styles.CellXf should be preserved on save');
  });

  // T011: Style-rich workbooks round-trip editability — reloading preserves the editable state.
  test('reloaded style-rich workbook is still editable', async () => {
    const uri = await writeStyleRichFixture('style-rich-reload-test.xlsx');
    const reloaded = await loadWorkbook(uri);
    assert.equal(reloaded.editability.editable, true, 'Reloaded style-rich workbook should remain editable');
  });
});
