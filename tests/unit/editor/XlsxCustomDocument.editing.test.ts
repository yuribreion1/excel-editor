import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxCustomDocument } from '../../../src/editor/XlsxCustomDocument';
import { loadWorkbook, parseWorkbookBytes } from '../../../src/parsing/xlsxWorkbookLoader';
import { assessCellEditability } from '../../../src/parsing/workbookRiskScanner';
import { serializeWorkbook } from '../../../src/persistence/workbookSerializer';
import { fixtureUri } from '../../helpers/fixturePaths';
import { createStyleRichWorkbook } from '../../helpers/styleRichFixture';
import * as vscode from 'vscode';

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

  // T008: Style-rich workbooks are now editable end-to-end.
  test('allows cell edits on style-rich workbooks', () => {
    const rawWorkbook = createStyleRichWorkbook();
    const uri = vscode.Uri.file('/fake/style-rich.xlsx');
    const bytes = serializeWorkbook(rawWorkbook);
    const parsed = parseWorkbookBytes(uri, bytes);

    assert.equal(parsed.editability.editable, true, 'Style-rich workbook should be editable');
    const document = XlsxCustomDocument.fromParsedWorkbook(uri, parsed);

    const operation = document.applyEdit('Results', 'B2', '999');
    assert.ok(operation, 'applyEdit should succeed on a style-rich workbook');
    assert.equal(document.isDirty, true);
    assert.equal(findCellDisplay(document, 'B2'), '999');
  });

  // T009: Formula cells are still read-only even in style-rich workbooks.
  test('keeps formula cells read-only in style-rich workbooks', () => {
    const rawWorkbook = createStyleRichWorkbook();
    rawWorkbook.Sheets.Results.B3 = { t: 'n', v: 300, f: 'SUM(B2:B2)' };
    const uri = vscode.Uri.file('/fake/style-rich-formula.xlsx');
    const bytes = serializeWorkbook(rawWorkbook);
    const parsed = parseWorkbookBytes(uri, bytes);

    const assessment = assessCellEditability(parsed, 'Results', 'B3');
    assert.equal(assessment.editable, false);
    assert.match(assessment.readOnlyReason ?? '', /formula/i);
  });
});
