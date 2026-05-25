import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxEditorProvider } from '../../src/editor/XlsxEditorProvider';
import { fixtureUri } from '../helpers/fixturePaths';
import { FakeWebviewPanel } from '../helpers/fakes';

suite('xlsx cell editing integration', () => {
  test('commits an inline cell edit and marks the document dirty', async () => {
    const uri = fixtureUri('editable-single-sheet.xlsx');
    const provider = new XlsxEditorProvider(uri);
    const document = await provider.openCustomDocument(uri, {
      backupId: undefined,
      untitledDocumentData: undefined
    });
    const panel = new FakeWebviewPanel();

    await provider.resolveCustomEditor(
      document,
      panel as unknown as Parameters<XlsxEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });
    await panel.webview.send({
      type: 'commitCellEdit',
      sheetId: 'Summary',
      address: 'B2',
      value: '130'
    });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as {
      type: string;
      state: { isDirty: boolean };
      cell?: { address: string; displayValue: string; hasPendingEdit: boolean };
    };
    assert.equal(message.type, 'cellUpdate');
    assert.equal(message.state.isDirty, true);
    assert.equal(message.cell?.address, 'B2');
    assert.equal(message.cell?.displayValue, '130');
    assert.equal(message.cell?.hasPendingEdit, true);
  });
});
