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
      const cellElement = create('td', cell.isHiddenByStructure ? 'cell is-muted' : 'cell', cell.displayValue);
      if (cell.isMergedAnchor) {
        cellElement.dataset.mergedAnchor = 'true';
      }
      rowElement.appendChild(cellElement);
    });

    body.appendChild(rowElement);
  });

  tableElement.appendChild(body);
  wrapper.appendChild(tableElement);
  return wrapper;
}

function renderState(state) {
  app.replaceChildren();

  const header = create('header', 'viewer-header');
  const titleBlock = create('div', 'viewer-title-block');
  titleBlock.appendChild(create('h1', 'viewer-title', state.title || 'Workbook'));
  titleBlock.appendChild(create('p', 'viewer-subtitle', state.readOnly ? 'Read-only workbook preview' : 'Workbook preview'));
  header.appendChild(titleBlock);
  header.appendChild(create('span', 'viewer-badge', state.readOnly ? 'Read only' : 'Editable'));
  app.appendChild(header);

  if (state.message) {
    app.appendChild(create('div', 'viewer-message', state.message));
  }

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
  }
});

vscode.postMessage({ type: 'ready', nonce: '${nonce}' });
`;
}
