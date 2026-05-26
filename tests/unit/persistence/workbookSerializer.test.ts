import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbookFromBackup, reloadWorkbookFromBytes, serializeWorkbook, writeWorkbookBackup } from '../../../src/persistence/workbookSerializer';
import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { backupUri, fixtureUri } from '../../helpers/fixturePaths';
import { createStyleRichWorkbook } from '../../helpers/styleRichFixture';
import * as vscode from 'vscode';

suite('workbookSerializer', () => {
  test('round-trips workbook bytes after an in-memory edit', async () => {
    const workbook = await loadWorkbook(fixtureUri('editable-single-sheet.xlsx'));
    const summarySheet = workbook.workbook.Sheets.Summary;
    summarySheet.B2 = { ...summarySheet.B2, t: 'n', v: 130, w: '130' };

    const reloaded = reloadWorkbookFromBytes(
      fixtureUri('editable-single-sheet.xlsx'),
      serializeWorkbook(workbook.workbook)
    );
    assert.equal(reloaded.workbook.Sheets.Summary.B2?.v, 130);
  });

  test('stores backup metadata for pending edits and active sheet selection', async () => {
    const sourceUri = fixtureUri('editable-multi-sheet.xlsx');
    const workbook = await loadWorkbook(sourceUri);
    const destination = backupUri('serializer.backup');
    const backup = await writeWorkbookBackup(
      sourceUri,
      destination,
      workbook.workbook,
      'Team',
      [{ sheetId: 'Overview', addresses: ['B2'] }]
    );

    const restored = await loadWorkbookFromBackup(sourceUri, backup.id);
    assert.equal(restored.activeSheetId, 'Team');
    assert.deepEqual(restored.pendingEdits, [{ sheetId: 'Overview', addresses: ['B2'] }]);
    backup.delete();
  });

  // T012: Styles.CellXf length is preserved on XLSX round-trip (cellStyles: true).
  test('preserves Styles.CellXf entries on round-trip of a style-rich workbook', () => {
    const rawWorkbook = createStyleRichWorkbook();
    const uri = vscode.Uri.file('/fake/style-rich-roundtrip.xlsx');
    const originalStyleCount = (rawWorkbook as typeof rawWorkbook & { Styles?: { CellXf?: unknown[] } }).Styles?.CellXf?.length ?? 0;

    const bytes = serializeWorkbook(rawWorkbook);
    const reloaded = reloadWorkbookFromBytes(uri, bytes);

    const reloadedStyleCount = (reloaded.workbook as typeof reloaded.workbook & { Styles?: { CellXf?: unknown[] } }).Styles?.CellXf?.length ?? 0;
    assert.ok(reloadedStyleCount >= originalStyleCount, `Style count should be preserved. Before: ${originalStyleCount}, After: ${reloadedStyleCount}`);
  });
});
