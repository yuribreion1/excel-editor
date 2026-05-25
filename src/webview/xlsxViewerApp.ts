import fs from 'node:fs/promises';

import * as vscode from 'vscode';

export async function getXlsxViewerHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): Promise<string> {
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'src', 'webview', 'xlsxViewer.css')
  );
  const nonce = createNonce();
  const script = getInlineScript(nonce);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${cssUri}" />
    <title>XLSX Viewer</title>
  </head>
  <body>
    <div id="app" class="viewer-shell">
      <p class="viewer-loading">Loading workbook...</p>
    </div>
    <script nonce="${nonce}">
${script}
    </script>
  </body>
</html>`;
}

export async function readWebviewStylesheet(extensionUri: vscode.Uri): Promise<string> {
  const stylesheetPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'xlsxViewer.css').fsPath;
  return fs.readFile(stylesheetPath, 'utf8');
}

function createNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function getInlineScript(nonce: string): string {
  return `
const vscode = acquireVsCodeApi();
const app = document.getElementById('app');
let currentState = undefined;
let activeEditor = undefined;

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function showInlineMessage(kind, text) {
  const existing = app.querySelector('.viewer-editor-message');
  if (existing) {
    existing.remove();
  }

  if (!text) {
    return;
  }

  const message = create('div', 'viewer-editor-message viewer-editor-message--' + kind, text);
  message.addEventListener('click', () => {
    vscode.postMessage({ type: 'dismissEditorMessage' });
  });
  app.appendChild(message);
}

function commitCellEdit(cellElement, inputElement) {
  const address = cellElement.dataset.address;
  const sheetId = cellElement.dataset.sheetId;
  if (!address || !sheetId) {
    return;
  }

  vscode.postMessage({
    type: 'commitCellEdit',
    sheetId,
    address,
    value: inputElement.value
  });
}

function startInlineEditing(cellElement) {
  if (activeEditor) {
    return;
  }

  if (cellElement.dataset.editable !== 'true') {
    showInlineMessage('warning', cellElement.dataset.blockReason || 'This cell is read-only.');
    return;
  }

  const initialValue = cellElement.dataset.editValue || '';
  const input = document.createElement('input');
  input.className = 'cell-editor-input';
  input.type = 'text';
  input.value = initialValue;
  cellElement.replaceChildren(input);
  cellElement.classList.add('is-editing');
  activeEditor = { cellElement, input };
  input.focus();
  input.select();

  let cancelled = false;
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      cancelled = true;
      renderState(currentState);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitCellEdit(cellElement, input);
    }
  });

  input.addEventListener('blur', () => {
    if (cancelled) {
      return;
    }

    commitCellEdit(cellElement, input);
  });
}

function renderTable(table) {
  const wrapper = create('div', 'viewer-table-wrapper');
  const tableElement = create('table', 'viewer-table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(create('th', 'corner-cell', ''));

  table.columnHeaders.forEach((header) => {
    headRow.appendChild(create('th', 'column-header', header));
  });

  head.appendChild(headRow);
  tableElement.appendChild(head);

  const body = document.createElement('tbody');
  table.cellMatrix.forEach((row, rowIndex) => {
    const rowElement = document.createElement('tr');
    rowElement.appendChild(create('th', 'row-header', table.rowHeaders[rowIndex] || String(rowIndex + 1)));

    row.forEach((cell) => {
      const classNames = ['cell'];
      if (cell.isHiddenByStructure) {
        classNames.push('is-muted');
      }
      if (cell.hasPendingEdit) {
        classNames.push('is-pending');
      }
      if (!cell.isEditable) {
        classNames.push('is-blocked');
      }

      const cellElement = create('td', classNames.join(' '), cell.displayValue);
      cellElement.tabIndex = 0;
      cellElement.dataset.address = cell.address;
      cellElement.dataset.sheetId = table.id;
      cellElement.dataset.editable = String(cell.isEditable);
      cellElement.dataset.editValue = cell.editValue;
      if (cell.editBlockReason) {
        cellElement.dataset.blockReason = cell.editBlockReason;
        cellElement.title = cell.editBlockReason;
      }
      if (cell.isMergedAnchor) {
        cellElement.dataset.mergedAnchor = 'true';
      }
      cellElement.addEventListener('dblclick', () => startInlineEditing(cellElement));
      cellElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          startInlineEditing(cellElement);
        }
      });
      cellElement.addEventListener('click', () => {
        if (!cell.isEditable && cell.editBlockReason) {
          showInlineMessage('warning', cell.editBlockReason);
        }
      });
      rowElement.appendChild(cellElement);
    });

    body.appendChild(rowElement);
  });

  tableElement.appendChild(body);
  wrapper.appendChild(tableElement);
  return wrapper;
}

function renderState(state) {
  currentState = state;
  activeEditor = undefined;
  app.replaceChildren();

  const header = create('header', 'viewer-header');
  const titleBlock = create('div', 'viewer-title-block');
  titleBlock.appendChild(create('h1', 'viewer-title', state.title || 'Workbook'));
  titleBlock.appendChild(create(
    'p',
    'viewer-subtitle',
    state.readOnly
      ? 'Read-only workbook preview'
      : state.isDirty
        ? 'Editable workbook • unsaved changes'
        : 'Editable workbook'
  ));
  header.appendChild(titleBlock);
  header.appendChild(create(
    'span',
    'viewer-badge',
    state.readOnly ? 'Read only' : state.isDirty ? 'Dirty' : 'Clean'
  ));
  app.appendChild(header);

  if (state.message) {
    app.appendChild(create('div', 'viewer-message', state.message));
  }

  if (state.editorMessage) {
    showInlineMessage(state.editorMessage.kind, state.editorMessage.text);
  }

  const statusRow = create('div', 'viewer-status-row');
  statusRow.appendChild(create(
    'span',
    'viewer-status-pill',
    state.readOnly
      ? state.editability.readOnlyReason || 'Editing is disabled for this workbook.'
      : state.isDirty
        ? 'Unsaved edits are pending.'
        : 'All workbook changes are saved.'
  ));
  const undoStatus = create(
    'span',
    'viewer-status-pill viewer-status-pill--secondary',
    'Undo ' + (state.canUndo ? 'available' : 'unavailable') + ' • Redo ' + (state.canRedo ? 'available' : 'unavailable')
  );
  statusRow.appendChild(undoStatus);
  app.appendChild(statusRow);

  if (state.warnings && state.warnings.length > 0) {
    const warningList = create('ul', 'viewer-warnings');
    state.warnings.forEach((warning) => {
      const item = create('li', 'viewer-warning', warning);
      warningList.appendChild(item);
    });
    app.appendChild(warningList);
  }

  if (state.availableSheets && state.availableSheets.length > 0) {
    const tabs = create('div', 'sheet-tabs');
    state.availableSheets.forEach((sheet) => {
      const button = create('button', sheet.id === state.selectedSheetId ? 'sheet-tab is-active' : 'sheet-tab', sheet.name);
      button.type = 'button';
      button.dataset.sheetId = sheet.id;
      button.addEventListener('click', () => {
        vscode.postMessage({ type: 'selectSheet', sheetId: sheet.id });
      });
      tabs.appendChild(button);
    });
    app.appendChild(tabs);
  }

  if (state.table) {
    if (state.table.structureWarnings && state.table.structureWarnings.length > 0) {
      const structureList = create('ul', 'viewer-warnings');
      state.table.structureWarnings.forEach((warning) => {
        structureList.appendChild(create('li', 'viewer-warning', warning));
      });
      app.appendChild(structureList);
    }
    app.appendChild(renderTable(state.table));
  }
}

window.addEventListener('message', (event) => {
  const message = event.data;
  if (message && message.type === 'state') {
    renderState(message.state);
  } else if (message && message.type === 'cellUpdate') {
    renderState(message.state);
  } else if (message && message.type === 'editorMessage') {
    showInlineMessage(message.message.kind, message.message.text);
  }
});

vscode.postMessage({ type: 'ready', nonce: '${nonce}' });
`;
}
