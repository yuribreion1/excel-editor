import fs from 'node:fs/promises';
import path from 'node:path';

import Mocha from 'mocha';

async function collectTestFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true
  });
  const testsRoot = path.resolve(__dirname, '../../../tests');
  const files = await collectTestFiles(testsRoot);

  for (const file of files) {
    mocha.addFile(file);
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed.`));
        return;
      }

      resolve();
    });
  });
}
