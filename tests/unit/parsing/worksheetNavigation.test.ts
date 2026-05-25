import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { buildWorksheetTable } from '../../../src/editor/tableViewModelBuilder';
import { fixtureUri } from '../../helpers/fixturePaths';

suite('worksheet navigation', () => {
  test('exposes visible sheets and warns about hidden structures', async () => {
    const workbook = await loadWorkbook(fixtureUri('multi-sheet.xlsx'));
    const overview = buildWorksheetTable(workbook, 'Overview');
    const team = buildWorksheetTable(workbook, 'Team');

    assert.deepEqual(
      workbook.sheets.map((sheet) => sheet.id),
      ['Overview', 'Team']
    );
    assert.equal(overview.rowCount, 3);
    assert.ok(team.structureWarnings.some((warning) => warning.includes('hidden row')));
    assert.ok(team.structureWarnings.some((warning) => warning.includes('hidden column')));
  });
});
