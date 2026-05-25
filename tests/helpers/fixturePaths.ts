import path from 'node:path';

import * as vscode from 'vscode';

export function fixtureUri(fileName: string): vscode.Uri {
  const fullPath = path.resolve(
    __dirname,
    '../../../tests/fixtures/workbooks',
    fileName
  );
  return vscode.Uri.file(fullPath);
}
