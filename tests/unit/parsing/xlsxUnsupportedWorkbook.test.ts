import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { loadWorkbook } from '../../../src/parsing/xlsxWorkbookLoader';
import { normalizeWorkbookOpenError } from '../../../src/parsing/workbookOpenError';
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
});
