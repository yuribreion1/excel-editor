import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { buildWorksheetTable } from '../../../src/editor/tableViewModelBuilder';
import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { fixtureUri } from '../../helpers/fixturePaths';

suite('tableViewModelBuilder editing', () => {
  test('maps editable cells and pending edits into table metadata', async () => {
    const workbook = await loadWorkbook(fixtureUri('editable-single-sheet.xlsx'));
    const table = buildWorksheetTable(workbook, 'Summary', {
      pendingEditAddresses: ['B2']
    });

    const amountCell = table.cellMatrix[1]?.[1];
    assert.equal(amountCell?.address, 'B2');
    assert.equal(amountCell?.isEditable, true);
    assert.equal(amountCell?.hasPendingEdit, true);
    assert.equal(amountCell?.editValue, '120');
  });

  test('marks formula cells as blocked for inline editing', async () => {
    const workbook = await loadWorkbook(fixtureUri('editable-formulas.xlsx'));
    const table = buildWorksheetTable(workbook, 'Formulas');
    const formulaCell = table.cellMatrix[1]?.[2];

    assert.equal(formulaCell?.address, 'C2');
    assert.equal(formulaCell?.isEditable, false);
    assert.match(formulaCell?.editBlockReason ?? '', /formula/i);
  });
});
