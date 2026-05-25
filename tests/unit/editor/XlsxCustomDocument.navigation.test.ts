import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxCustomDocument } from '../../../src/editor/XlsxCustomDocument';
import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { fixtureUri } from '../../helpers/fixturePaths';

suite('XlsxCustomDocument navigation', () => {
  test('preserves pending edits while switching sheets', async () => {
    const uri = fixtureUri('editable-multi-sheet.xlsx');
    const document = XlsxCustomDocument.fromParsedWorkbook(uri, await loadWorkbook(uri));

    document.applyEdit('Overview', 'B2', '1500');
    document.selectSheet('Team');
    assert.equal(document.getViewerState().selectedSheetId, 'Team');

    document.selectSheet('Overview');
    const table = document.getViewerState().table;
    const editedCell = table?.cellMatrix[1]?.[1];

    assert.equal(document.getViewerState().selectedSheetId, 'Overview');
    assert.equal(editedCell?.displayValue, '1500');
    assert.equal(editedCell?.hasPendingEdit, true);
  });
});
