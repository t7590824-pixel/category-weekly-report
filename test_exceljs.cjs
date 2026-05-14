const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const { Readable } = require('stream');

async function test() {
  // 先用 xlsx 创建一个含中文的 xlsx buffer
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['business_year_and_week', 'skc'], ['2026年4月', 'AA01']]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // 用 exceljs 解析
  const workbook = new ExcelJS.Workbook();
  const stream = Readable.from(buf);
  await workbook.xlsx.read(stream);
  const sheet = workbook.worksheets[0];
  const headers = [];
  const rows = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      row.eachCell((cell) => headers.push(String(cell.value)));
    } else {
      const r = {};
      row.eachCell((cell, colNum) => {
        r[headers[colNum-1]] = String(cell.value ?? '');
      });
      rows.push(r);
    }
  });
  console.log('exceljs result:', JSON.stringify(rows));
}
test().catch(console.error);
