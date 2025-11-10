/**
 * Test actual extraction logic with TypeScript
 */
import { extractVehicleData } from './src/main/services/pdfExtractor';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testExtraction(filePath: string, fileName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${fileName}`);
  console.log('='.repeat(70));
  
  try {
    const buffer = await fs.readFile(filePath);
    console.log(`✅ File loaded: ${buffer.length} bytes`);
    
    let progressUpdates: Array<{ progress: number; message: string }> = [];
    
    const data = await extractVehicleData(buffer, (progress, message) => {
      progressUpdates.push({ progress, message: message || '' });
    });
    
    console.log(`\n✅ Extraction complete!`);
    console.log(`\nExtracted Data:`);
    console.log('─'.repeat(70));
    console.log(`Report Type:          ${data.reportType}`);
    console.log(`VIN:                  ${data.vin || '❌ NOT FOUND'}`);
    console.log(`Year:                 ${data.year || '❌ NOT FOUND'}`);
    console.log(`Make:                 ${data.make || '❌ NOT FOUND'}`);
    console.log(`Model:                ${data.model || '❌ NOT FOUND'}`);
    console.log(`Mileage:              ${data.mileage || '❌ NOT FOUND'}`);
    console.log(`Location:             ${data.location || '❌ NOT FOUND'}`);
    console.log(`Settlement Value:     $${data.settlementValue || '❌ NOT FOUND'}`);
    console.log(`Market Value:         $${data.marketValue || '❌ NOT FOUND'}`);
    console.log(`Confidence:           ${data.extractionConfidence}%`);
    
    if (data.extractionErrors && data.extractionErrors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      data.extractionErrors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log(`\nProgress Updates: ${progressUpdates.length} updates`);
    
    return { success: true, data };
    
  } catch (error) {
    console.log(`\n❌ Extraction failed!`);
    console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('FULL EXTRACTION TEST WITH ACTUAL APP CODE');
  console.log('='.repeat(70));
  
  const files = [
    {
      path: path.join(__dirname, '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf'),
      name: 'UDP (Mercedes-Benz SL-Class)'
    },
    {
      path: path.join(__dirname, '../valuation_report_samples/State-Farm-Valuation-Report.pdf'),
      name: 'State Farm (Acura)'
    }
  ];
  
  const results = [];
  
  for (const file of files) {
    const result = await testExtraction(file.path, file.name);
    results.push({ name: file.name, ...result });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach((result, i) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${i + 1}. ${result.name}: ${status}`);
  });
  
  const allPassed = results.every(r => r.success);
  
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED');
  }
  console.log('='.repeat(70) + '\n');
}

runTests().catch(console.error);
