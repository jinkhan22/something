const fs = require('fs');
const path = require('path');
const { extractVehicleData } = require('./src/main/services/pdfExtractor');

// Test CCC One report extraction
async function testCCCExtraction() {
  console.log('=== Testing CCC One Report Extraction ===\n');
  
  const samplesDir = path.join(__dirname, '..', 'valuation_report_samples');
  
  // List of known CCC One reports based on the provided info
  const cccReports = [
    'Allstate CCC Valuation XC60 Volvo 2015.pdf',
    'State-Farm-Valuation-Report.pdf',
    // Add other CCC reports if identified
  ];
  
  for (const filename of cccReports) {
    const filePath = path.join(samplesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}\n`);
      continue;
    }
    
    console.log(`\n📄 Testing: ${filename}`);
    console.log('='.repeat(80));
    
    try {
      const buffer = fs.readFileSync(filePath);
      const result = await extractVehicleData(buffer);
      
      console.log('\n📊 EXTRACTION RESULTS:');
      console.log('Report Type:', result.reportType);
      console.log('VIN:', result.vin || '❌ NOT FOUND');
      console.log('Year:', result.year || '❌ NOT FOUND');
      console.log('Make:', result.make || '❌ NOT FOUND');
      console.log('Model:', result.model || '❌ NOT FOUND');
      console.log('Mileage:', result.mileage || '❌ NOT FOUND');
      console.log('Location:', result.location || '❌ NOT FOUND');
      console.log('Market Value (Base Vehicle Value):', result.marketValue ? `$${result.marketValue.toLocaleString()}` : '❌ NOT FOUND');
      console.log('Settlement Value (Total):', result.settlementValue ? `$${result.settlementValue.toLocaleString()}` : '❌ NOT FOUND');
      console.log('Confidence Score:', `${result.extractionConfidence}%`);
      
      if (result.extractionErrors && result.extractionErrors.length > 0) {
        console.log('\n⚠️  ERRORS:');
        result.extractionErrors.forEach(err => console.log(`  - ${err}`));
      }
      
      // Expected values for validation (based on the provided example)
      if (filename.includes('Volvo')) {
        console.log('\n✅ EXPECTED VALUES (Volvo XC60):');
        console.log('VIN: YV4902RK6F2702888');
        console.log('Year: 2015');
        console.log('Make: Volvo');
        console.log('Model: XC60');
        console.log('Mileage: 88,959');
        console.log('Market Value: $12,053.00');
        console.log('Settlement Value: $12,197.81');
        
        // Validate
        const errors: string[] = [];
        if (result.vin !== 'YV4902RK6F2702888') errors.push(`VIN mismatch: got ${result.vin}`);
        if (result.year !== 2015) errors.push(`Year mismatch: got ${result.year}`);
        if (result.make !== 'Volvo') errors.push(`Make mismatch: got ${result.make}`);
        if (result.model !== 'XC60') errors.push(`Model mismatch: got ${result.model}`);
        if (result.mileage !== 88959) errors.push(`Mileage mismatch: got ${result.mileage}`);
        if (Math.abs((result.marketValue || 0) - 12053.00) > 0.01) errors.push(`Market Value mismatch: got ${result.marketValue}`);
        if (Math.abs((result.settlementValue || 0) - 12197.81) > 0.01) errors.push(`Settlement Value mismatch: got ${result.settlementValue}`);
        
        if (errors.length > 0) {
          console.log('\n❌ VALIDATION FAILED:');
          errors.forEach(err => console.log(`  - ${err}`));
        } else {
          console.log('\n✅ ALL VALUES MATCH!');
        }
      }
      
    } catch (error) {
      console.error('❌ ERROR:', error instanceof Error ? error.message : error);
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ CCC One Extraction Testing Complete\n');
}

// Run the test
testCCCExtraction().catch(console.error);
