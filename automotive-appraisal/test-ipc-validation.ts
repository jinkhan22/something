/**
 * Test that simulates the full IPC handler validation logic
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { extractVehicleData } from './src/main/services/pdfExtractor';

async function simulateIPCHandler(filePath: string, fileName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing IPC Handler Flow: ${fileName}`);
  console.log('='.repeat(70));
  
  try {
    const buffer = await fs.readFile(filePath);
    console.log(`Step 1: Buffer loaded (${buffer.length} bytes) ✅`);
    
    if (buffer.length === 0) {
      throw new Error('Invalid PDF buffer provided');
    }
    
    if (buffer.length > 50 * 1024 * 1024) {
      throw new Error('PDF file too large (maximum 50MB)');
    }
    console.log(`Step 2: Buffer validation passed ✅`);
    
    let progressUpdates: Array<{ progress: number; message?: string }> = [];
    
    const extractedData = await extractVehicleData(buffer, (progress, message) => {
      progressUpdates.push({ progress, message });
      if (progress % 20 === 0 || progress === 100) {
        console.log(`   OCR Progress: ${progress}% - ${message || ''}`);
      }
    });
    console.log(`Step 3: Data extraction completed ✅`);
    
    // IPC Handler Validation (THIS IS WHERE THE BUG WAS)
    console.log(`\nStep 4: IPC Handler Validation`);
    console.log('─'.repeat(70));
    
    const hasVin = !!extractedData.vin && extractedData.vin.length === 17;
    const hasMake = !!extractedData.make;
    const hasYear = !!extractedData.year && extractedData.year > 1990;
    
    console.log(`   VIN (17 chars):  ${hasVin ? '✅' : '❌'} ${extractedData.vin || 'N/A'}`);
    console.log(`   Make:            ${hasMake ? '✅' : '❌'} ${extractedData.make || 'N/A'}`);
    console.log(`   Year (>1990):    ${hasYear ? '✅' : '❌'} ${extractedData.year || 'N/A'}`);
    console.log(`   Report Type:     ${extractedData.reportType}`);
    
    let isValid = false;
    if (extractedData.reportType === 'MITCHELL') {
      isValid = hasVin || (hasMake && hasYear);
      console.log(`\n   Mitchell Validation: VIN OR (Make AND Year)`);
    } else {
      isValid = hasVin || hasMake || hasYear;
      console.log(`\n   CCC One Validation: VIN OR Make OR Year`);
    }
    
    console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isValid) {
      throw new Error('Could not extract required vehicle information from PDF');
    }
    
    console.log(`\nStep 5: IPC Handler Validation PASSED ✅`);
    
    console.log(`\nExtracted Data Summary:`);
    console.log('─'.repeat(70));
    console.log(`   VIN:              ${extractedData.vin || 'N/A'}`);
    console.log(`   Year:             ${extractedData.year || 'N/A'}`);
    console.log(`   Make:             ${extractedData.make || 'N/A'}`);
    console.log(`   Model:            ${extractedData.model || 'N/A'}`);
    console.log(`   Mileage:          ${extractedData.mileage || 'N/A'}`);
    console.log(`   Market Value:     $${extractedData.marketValue || 'N/A'}`);
    console.log(`   Settlement Value: $${extractedData.settlementValue || 'N/A'}`);
    console.log(`   Confidence:       ${extractedData.extractionConfidence}%`);
    
    console.log(`\n✅ SUCCESS: File would be accepted by Electron app!`);
    return { success: true, data: extractedData };
    
  } catch (error) {
    console.log(`\n❌ FAILURE: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`\n⚠️  This file would be REJECTED by the Electron app!`);
    return { success: false, error };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('IPC HANDLER VALIDATION TEST');
  console.log('Testing exact flow that happens in Electron app');
  console.log('='.repeat(70));
  
  const files = [
    {
      path: path.join(__dirname, '../valuation_report_samples/udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf'),
      name: 'UDP File (Mercedes-Benz)'
    },
    {
      path: path.join(__dirname, '../valuation_report_samples/State-Farm-Valuation-Report.pdf'),
      name: 'State Farm File (Acura)'
    }
  ];
  
  const results = [];
  
  for (const file of files) {
    const result = await simulateIPCHandler(file.path, file.name);
    results.push({ name: file.name, ...result });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach((result, i) => {
    const status = result.success ? '✅ WOULD BE ACCEPTED' : '❌ WOULD BE REJECTED';
    console.log(`${i + 1}. ${result.name}:`);
    console.log(`   ${status}`);
  });
  
  const allPassed = results.every(r => r.success);
  
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('✅ ALL FILES WILL WORK IN ELECTRON APP!');
    console.log('You can now test with "npm start"');
  } else {
    console.log('❌ SOME FILES WILL FAIL IN ELECTRON APP');
    console.log('Please review the validation logic');
  }
  console.log('='.repeat(70) + '\n');
}

runTests().catch(console.error);
