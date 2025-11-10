const fs = require('fs');
const pdfParse = require('pdf-parse').default || require('pdf-parse');

async function checkVIN() {
  const buffer = fs.readFileSync('../valuation_report_samples/Valution Report.pdf');
  const data = await (typeof pdfParse === 'function' ? pdfParse(buffer) : require('pdf-parse')(buffer));
  const text = data.text;
  
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
  const vins = text.match(vinPattern);
  console.log('All VINs found:', vins);
  console.log('Total VINs:', vins ? vins.length : 0);
  console.log('');
  
  // Show first 50 lines to find Vehicle Information section
  const lines = text.split('\n');
  console.log('=== First 50 lines (looking for Vehicle Information section) ===\n');
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    if (lines[i].trim()) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
}

checkVIN().catch(console.error);
