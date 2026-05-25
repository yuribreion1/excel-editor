import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { fixtureUri } from '../../helpers/fixturePaths';

suite('xlsxWorkbookLoader', () => {
  test('loads a single-sheet workbook', async () => {
    const workbook = await loadWorkbook(fixtureUri('basic-single-sheet.xlsx'));

    assert.equal(workbook.fileName, 'basic-single-sheet.xlsx');
    assert.equal(workbook.sheets.length, 1);
    assert.equal(workbook.activeSheetId, 'Summary');
    assert.deepEqual(workbook.warnings, []);
    assert.equal(workbook.editability.editable, true);
    assert.equal(workbook.sheets[0]?.isEditable, true);
  });
});
