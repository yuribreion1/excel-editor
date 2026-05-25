import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const copies = [
  [
    path.join(root, 'src', 'webview', 'xlsxViewer.css'),
    path.join(root, 'out', 'src', 'webview', 'xlsxViewer.css')
  ]
];

for (const [source, target] of copies) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}
