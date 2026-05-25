import path from 'node:path';

import * as vscode from 'vscode';

export function fixturePath(fileName: string): string {
  return path.resolve(__dirname, '../../../tests/fixtures/workbooks', fileName);
}

export function fixtureUri(fileName: string): vscode.Uri {
  return vscode.Uri.file(fixturePath(fileName));
}

export function backupUri(fileName: string): vscode.Uri {
  const fullPath = path.resolve(
    __dirname,
    '../../../tests/fixtures/backups',
    fileName
  );
  return vscode.Uri.file(fullPath);
}
