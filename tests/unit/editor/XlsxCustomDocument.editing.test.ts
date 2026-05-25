import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxCustomDocument } from '../../../src/editor/XlsxCustomDocument';
import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { fixtureUri } from '../../helpers/fixturePaths';

function findCellDisplay(document: XlsxCustomDocument, address: string): string | undefined {
  const table = document.getViewerState().table;

  for (const row of table?.cellMatrix ?? []) {
    const cell = row.find((candidate) => candidate.address === address);
    if (cell) {
      return cell.displayValue;
    }
  }

  return undefined;
}

suite('XlsxCustomDocument editing', () => {
  test('tracks dirty state and applies undo/redo for cell edits', async () => {
    const uri = fixtureUri('editable-single-sheet.xlsx');
    const document = XlsxCustomDocument.fromParsedWorkbook(uri, await loadWorkbook(uri));
    const operation = document.applyEdit('Summary', 'B2', '130');

    assert.ok(operation);
    assert.equal(document.isDirty, true);
    assert.equal(findCellDisplay(document, 'B2'), '130');

    await document.undoEdit(operation!.id);
    assert.equal(document.isDirty, false);
    assert.equal(findCellDisplay(document, 'B2'), '120');

    await document.redoEdit(operation!.id);
    assert.equal(document.isDirty, true);
    assert.equal(findCellDisplay(document, 'B2'), '130');
  });
});
