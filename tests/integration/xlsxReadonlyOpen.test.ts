import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxEditorProvider } from '../../src/editor/XlsxEditorProvider';
import { fixtureUri } from '../helpers/fixturePaths';
import { FakeWebviewPanel } from '../helpers/fakes';

suite('xlsx blocked open flow', () => {
  test('posts a ready editable state for a supported workbook', async () => {
    const provider = new XlsxEditorProvider(fixtureUri('basic-single-sheet.xlsx'));
    const document = await provider.openCustomDocument(fixtureUri('basic-single-sheet.xlsx'), {
      backupId: undefined,
      untitledDocumentData: undefined
    });
    const panel = new FakeWebviewPanel();

    await provider.resolveCustomEditor(
      document,
      panel as unknown as Parameters<XlsxEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as { state: { loadState: string; readOnly: boolean; table?: { rowCount: number } } };
    assert.equal(message.state.loadState, 'ready');
    assert.equal(message.state.readOnly, false);
    assert.equal(message.state.table?.rowCount, 3);
    assert.match(panel.webview.html, /Loading workbook/);
  });

  test('surfaces blocked editing metadata for formula cells', async () => {
    const provider = new XlsxEditorProvider(fixtureUri('editable-formulas.xlsx'));
    const document = await provider.openCustomDocument(fixtureUri('editable-formulas.xlsx'), {
      backupId: undefined,
      untitledDocumentData: undefined
    });
    const panel = new FakeWebviewPanel();

    await provider.resolveCustomEditor(
      document,
      panel as unknown as Parameters<XlsxEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as {
      state: {
        table?: {
          isEditable: boolean;
          cellMatrix: Array<Array<{ isEditable: boolean; editBlockReason?: string }>>;
        };
      };
    };
    assert.equal(message.state.table?.isEditable, true);
    assert.equal(message.state.table?.cellMatrix[1]?.[2]?.isEditable, false);
    assert.match(message.state.table?.cellMatrix[1]?.[2]?.editBlockReason ?? '', /formula/i);
  });
});
