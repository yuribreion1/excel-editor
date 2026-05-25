import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  extensionDevelopmentPath: __dirname,
  extensionTestsPath: path.join(__dirname, 'out', 'src', 'test', 'suite', 'index.js'),
  launchArgs: [__dirname, '--disable-extensions']
};
