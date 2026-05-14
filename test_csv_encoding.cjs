const chardet = require('chardet');
const { TextDecoder } = require('util');
const XLSX = require('xlsx');
const fs = require('fs');

const buffer = fs.readFileSync('/home/ubuntu/upload/月度SKC数据模板-202604.csv');
const detected = chardet.detect(buffer) ?? 'utf-8';
console.log('Detected encoding:', detected);

const encoding = /gb/i.test(detected) ? 'gbk' : 'utf-8';
console.log('Using encoding:', encoding);

const decoder = new TextDecoder(encoding);
const text = decoder.decode(buffer).replace(/^\uFEFF/, '');

// 显示前3行
const lines = text.split('\n').slice(0, 3);
console.log('First 3 lines:');
lines.forEach((l, i) => console.log(`  [${i}] ${l.substring(0, 100)}`));

// 解析
const workbook = XLSX.read(text, { type: 'string' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log('Total rows:', rows.length);
if (rows.length > 0) {
  console.log('First row:', JSON.stringify(rows[0]));
  // 检查 business_year_and_week
  const periods = [...new Set(rows.map(r => r['business_year_and_week']))];
  console.log('Unique periods:', periods);
}
