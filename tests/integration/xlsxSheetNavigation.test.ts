import assert from 'node:assert/strict';
import { suite, test } from 'mocha';

import { XlsxReadonlyEditorProvider } from '../../src/editor/XlsxReadonlyEditorProvider';
import { fixtureUri } from '../helpers/fixturePaths';
import { FakeWebviewPanel } from '../helpers/fakes';

suite('xlsx sheet navigation', () => {
  test('updates the active sheet after a selection message', async () => {
    const provider = new XlsxReadonlyEditorProvider(fixtureUri('multi-sheet.xlsx'));
    const document = await provider.openCustomDocument(fixtureUri('multi-sheet.xlsx'));
    const panel = new FakeWebviewPanel();

    await provider.resolveCustomEditor(
      document,
      panel as unknown as Parameters<XlsxReadonlyEditorProvider['resolveCustomEditor']>[1]
    );
    await panel.webview.send({ type: 'ready' });
    await panel.webview.send({ type: 'selectSheet', sheetId: 'Team' });

    const message = panel.webview.postedMessages[
      panel.webview.postedMessages.length - 1
    ] as { state: { selectedSheetId?: string; table?: { name: string } } };
    assert.equal(message.state.selectedSheetId, 'Team');
    assert.equal(message.state.table?.name, 'Team');
  });
});
