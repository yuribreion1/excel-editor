import assert from 'node:assert/strict';
import { suite, test } from 'mocha';
import * as XLSX from 'xlsx';

import { assessWorkbookEditability } from '../../../src/parsing/workbookRiskScanner';

suite('workbookRiskScanner', () => {
  test('blocks macro-enabled workbooks from editable mode', () => {
    const workbook = XLSX.utils.book_new() as XLSX.WorkBook & { vbaraw?: Uint8Array };
    const sheet = XLSX.utils.aoa_to_sheet([['Value'], [1]]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Summary');
    workbook.vbaraw = new Uint8Array([1, 2, 3]);

    const assessment = assessWorkbookEditability(workbook);
    assert.equal(assessment.editable, false);
    assert.match(assessment.readOnlyReason ?? '', /macro-enabled/i);
  });

  test('blocks workbooks with unsupported sheet types', () => {
    const workbook = XLSX.utils.book_new();
    workbook.SheetNames.push('Chart');
    workbook.Sheets.Chart = { '!type': 'chart', A1: { t: 's', v: 'Chart' }, '!ref': 'A1' };

    const assessment = assessWorkbookEditability(workbook);
    assert.equal(assessment.editable, false);
    assert.match(assessment.readOnlyReason ?? '', /unsupported "chart" sheet type/i);
  });
});
