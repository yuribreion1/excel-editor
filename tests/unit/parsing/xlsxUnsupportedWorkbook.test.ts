import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { normalizeWorkbookOpenError } from '../../../src/parsing/workbookOpenError';
import { assessCellEditability } from '../../../src/parsing/workbookRiskScanner';
import { fixtureUri } from '../../helpers/fixturePaths';

suite('unsupported workbook handling', () => {
  test('normalizes malformed workbook errors', async () => {
    await assert.rejects(
      async () => loadWorkbook(fixtureUri('malformed.xlsx')),
      (error: unknown) => {
        const normalized = normalizeWorkbookOpenError(error);
        assert.match(normalized.message, /malformed|unsupported|password-protected/i);
        return true;
      }
    );
  });

  test('keeps formula cells read-only with a clear reason', async () => {
    const workbook = await loadWorkbook(fixtureUri('editable-formulas.xlsx'));
    const cellAssessment = assessCellEditability(workbook, 'Formulas', 'C2');

    assert.equal(cellAssessment.editable, false);
    assert.match(cellAssessment.readOnlyReason ?? '', /formula cells remain read-only/i);
  });
});
