import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'workbooks');
await fs.mkdir(fixturesDir, { recursive: true });

const basicWorkbook = XLSX.utils.book_new();
const basicSheet = XLSX.utils.aoa_to_sheet([
  ['Name', 'Amount', 'Active'],
  ['Alice', 120, true],
  ['Bob', 75, false]
]);
XLSX.utils.book_append_sheet(basicWorkbook, basicSheet, 'Summary');
XLSX.writeFile(basicWorkbook, path.join(fixturesDir, 'basic-single-sheet.xlsx'));

const multiWorkbook = XLSX.utils.book_new();
const overviewSheet = XLSX.utils.aoa_to_sheet([
  ['Quarter', 'Revenue'],
  ['Q1', 1000],
  ['Q2', 1200]
]);
const teamSheet = XLSX.utils.aoa_to_sheet([
  ['Team', 'Lead'],
  ['Platform', 'Nina'],
  ['QA', 'Marco']
]);
teamSheet['!cols'] = [{ wch: 14 }, { wch: 16, hidden: true }];
teamSheet['!rows'] = [{}, {}, { hidden: true }];
XLSX.utils.book_append_sheet(multiWorkbook, overviewSheet, 'Overview');
XLSX.utils.book_append_sheet(multiWorkbook, teamSheet, 'Team');
XLSX.writeFile(multiWorkbook, path.join(fixturesDir, 'multi-sheet.xlsx'));

await fs.writeFile(
  path.join(fixturesDir, 'unsupported-password.xlsx'),
  'password protected content placeholder',
  'utf8'
);
await fs.writeFile(
  path.join(fixturesDir, 'malformed.xlsx'),
  'this is not a valid xlsx package',
  'utf8'
);
