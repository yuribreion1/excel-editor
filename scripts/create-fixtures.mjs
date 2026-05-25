import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'workbooks');
await fs.mkdir(fixturesDir, { recursive: true });

async function writeWorkbook(fileName, workbook) {
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    cellStyles: true
  });
  await fs.writeFile(path.join(fixturesDir, fileName), buffer);
}

const basicWorkbook = XLSX.utils.book_new();
const basicSheet = XLSX.utils.aoa_to_sheet([
  ['Name', 'Amount', 'Active'],
  ['Alice', 120, true],
  ['Bob', 75, false]
]);
XLSX.utils.book_append_sheet(basicWorkbook, basicSheet, 'Summary');
await writeWorkbook('basic-single-sheet.xlsx', basicWorkbook);
await writeWorkbook('editable-single-sheet.xlsx', basicWorkbook);

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
await writeWorkbook('multi-sheet.xlsx', multiWorkbook);
await writeWorkbook('editable-multi-sheet.xlsx', multiWorkbook);

const formulaWorkbook = XLSX.utils.book_new();
const formulaSheet = XLSX.utils.aoa_to_sheet([
  ['Item', 'Value', 'Total'],
  ['Widgets', 2, null]
]);
formulaSheet.C2 = { t: 'n', f: 'B2*10', v: 20, w: '20' };
XLSX.utils.book_append_sheet(formulaWorkbook, formulaSheet, 'Formulas');
await writeWorkbook('editable-formulas.xlsx', formulaWorkbook);

const structureWorkbook = XLSX.utils.book_new();
const structureSheet = XLSX.utils.aoa_to_sheet([
  ['Region', 'Owner', 'Revenue'],
  ['North', 'Ari', 40],
  ['South', 'Bea', 55]
]);
structureSheet['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
structureSheet['!cols'] = [{ wch: 12 }, { wch: 12, hidden: true }, { wch: 12 }];
structureSheet['!rows'] = [{}, {}, { hidden: true }];
XLSX.utils.book_append_sheet(structureWorkbook, structureSheet, 'Structure');
await writeWorkbook('editable-merged-hidden.xlsx', structureWorkbook);

const protectedWorkbook = XLSX.utils.book_new();
const protectedSheet = XLSX.utils.aoa_to_sheet([
  ['Task', 'Owner'],
  ['Spec', 'Yuri'],
  ['Docs', 'Ana']
]);
protectedSheet['!protect'] = {
  selectLockedCells: true,
  selectUnlockedCells: true
};
XLSX.utils.book_append_sheet(protectedWorkbook, protectedSheet, 'Protected');
await writeWorkbook('editable-protected-sheet.xlsx', protectedWorkbook);

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
