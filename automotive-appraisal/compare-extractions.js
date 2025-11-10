// Compare pdf-parse extraction with actual PDF text
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function compareExtractions() {
  console.log('🔬 COMPARING PDF-PARSE VS ACTUAL TEXT\n');
  console.log('='.repeat(80));
  
  // Get pdf-parse extraction
  const buffer = fs.readFileSync('../valuation_report_samples/valuation -  BARSANO (1).pdf');
  const data = await pdfParse(buffer);
  const pdfParseText = data.text;
  
  // Get actual text (manually copied)
  const actualText = fs.readFileSync('../text_from_valuation-BARSANO.txt', 'utf8');
  
  console.log('📊 TEXT COMPARISON:\n');
  console.log('pdf-parse length:', pdfParseText.length, 'characters');
  console.log('Actual text length:', actualText.length, 'characters');
  console.log('Difference:', actualText.length - pdfParseText.length, 'characters');
  console.log('');
  
  // Key fields comparison
  console.log('🔍 KEY FIELDS EXTRACTION:\n');
  
  const fields = [
    { name: 'Year', pdfParse: /20\d{2}/, actual: /Year.*?\n(20\d{2})/m },
    { name: 'Make', pdfParse: /BMW/, actual: /Make.*?\n(BMW)/m },
    { name: 'Model', pdfParse: /M3/, actual: /Model.*?\n.*?(M3)/m },
    { name: 'VIN', pdfParse: /WBS33AY09NFL79043/, actual: /WBS33AY09NFL79043/ },
    { name: 'Loss vehicle line', pdfParse: /Loss vehicle:.*?\|/m, actual: /Loss vehicle:.*?\|/m }
  ];
  
  fields.forEach(field => {
    const pdfMatch = pdfParseText.match(field.pdfParse);
    const actualMatch = actualText.match(field.actual);
    
    console.log(`${field.name}:`);
    console.log(`  pdf-parse: ${pdfMatch ? '✅ Found: ' + pdfMatch[0].substring(0, 50) : '❌ Not found'}`);
    console.log(`  Actual:    ${actualMatch ? '✅ Found: ' + (actualMatch[1] || actualMatch[0]).substring(0, 50) : '❌ Not found'}`);
    console.log('');
  });
  
  // Check the "Loss vehicle:" line specifically
  console.log('📋 "LOSS VEHICLE:" LINE COMPARISON:\n');
  
  console.log('In actual text:');
  const actualLossVehicle = actualText.match(/Loss vehicle:.*$/m);
  if (actualLossVehicle) {
    console.log('  ✅', JSON.stringify(actualLossVehicle[0]));
  }
  
  console.log('\nIn pdf-parse text:');
  const pdfParseLossVehicle = pdfParseText.match(/[il\s]*[ol\s]*ss\s+vehicle.*$/m);
  if (pdfParseLossVehicle) {
    console.log('  ⚠️ ', JSON.stringify(pdfParseLossVehicle[0].substring(0, 80)));
  }
  
  // Show first 500 chars of each
  console.log('\n\n📄 FIRST 500 CHARACTERS:\n');
  console.log('ACTUAL TEXT:');
  console.log(actualText.substring(0, 500));
  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('PDF-PARSE TEXT:');
  console.log(pdfParseText.substring(0, 500));
  
  // Find Settlement Value
  console.log('\n\n💰 SETTLEMENT VALUE:\n');
  
  const actualSettlement = actualText.match(/Settlement Value:?\s*\$?([0-9,]+\.?\d*)/i);
  const pdfParseSettlement = pdfParseText.match(/[se]ttle.*?[vV]alue:?\s*\$?([0-9,]+\.?\d*)/i);
  
  console.log('In actual text:', actualSettlement ? `✅ $${actualSettlement[1]}` : '❌ Not found');
  console.log('In pdf-parse:', pdfParseSettlement ? `✅ $${pdfParseSettlement[1]}` : '❌ Not found');
  
  console.log('\n\n💡 ANALYSIS:\n');
  console.log('pdf-parse is having OCR issues because the PDF is likely:');
  console.log('  1. Scanned/image-based (not native text)');
  console.log('  2. Has poor quality or compression');
  console.log('  3. Uses fonts that pdf-parse struggles with');
  console.log('\nThe actual text shows what SHOULD be there.');
  console.log('pdf-parse extracts corrupted/incomplete version.');
}

compareExtractions().catch(console.error);
