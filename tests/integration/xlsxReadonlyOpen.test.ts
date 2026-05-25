import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxReadonlyEditorProvider } from '../../src/editor/XlsxReadonlyEditorProvider';
import { fixtureUri } from '../helpers/fixturePaths';
import { FakeWebviewPanel } from '../helpers/fakes';

suite('xlsx readonly open flow', () => {
  test('posts a ready state for a valid workbook', async () => {
    const provider = new XlsxReadonlyEditorProvider(fixtureUri('basic-single-sheet.xlsx'));
    const document = await provider.openCustomDocument(fixtureUri('basic-single-sheet.xlsx'));
    const panel = new FakeWebviewPanel();

    await provider.resolveCustomEditor(
      document,
      panel as unknown as Parameters<XlsxReadonlyEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as { state: { loadState: string; table?: { rowCount: number } } };
    assert.equal(message.state.loadState, 'ready');
    assert.equal(message.state.table?.rowCount, 3);
    assert.match(panel.webview.html, /Loading workbook/);
  });
});
