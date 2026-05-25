import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbookFromBackup, reloadWorkbookFromBytes, serializeWorkbook, writeWorkbookBackup } from '../../../src/persistence/workbookSerializer';
import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { backupUri, fixtureUri } from '../../helpers/fixturePaths';

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
});
