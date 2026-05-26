import assert from 'node:assert/strict';
import { suite, test } from 'mocha';
import * as XLSX from 'xlsx';

import { assessWorkbookEditability } from '../../../src/parsing/workbookRiskScanner';
import { createStyleRichWorkbook, createVbaWorkbook } from '../../helpers/styleRichFixture';

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

  // T003: This test must FAIL before getWorkbookStyleBlocker is removed (red → green).
  test('allows style-rich workbooks to be edited', () => {
    const workbook = createStyleRichWorkbook();

    const assessment = assessWorkbookEditability(workbook);
    assert.equal(assessment.editable, true, 'Style-rich workbooks should be editable');
    assert.equal(assessment.readOnlyReason, undefined);
  });

  // T004: Workbook with no extra styles remains editable (clean baseline).
  test('allows workbooks with no extra styles to be edited', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['A', 'B'], [1, 2]]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    const assessment = assessWorkbookEditability(workbook);
    assert.equal(assessment.editable, true);
  });

  // T005: VBA workbooks must remain blocked after the style guard removal.
  test('continues to block VBA/macro workbooks after style guard removal', () => {
    const workbook = createVbaWorkbook();

    const assessment = assessWorkbookEditability(workbook);
    assert.equal(assessment.editable, false);
    assert.match(assessment.readOnlyReason ?? '', /macro-enabled/i);
  });
});
