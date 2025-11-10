const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { PDFParse } = require('pdf-parse');

async function testPDFExtraction(pdfPath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(80));
  
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Try PDF text extraction first
    console.log('\n📄 Attempting PDF text extraction...');
    try {
      const parser = new PDFParse();
      const pdfData = await parser.parse(dataBuffer);
      if (pdfData.text && pdfData.text.trim().length > 100) {
        console.log(`✓ PDF text extracted: ${pdfData.text.length} characters`);
        console.log('\n--- First 2000 characters ---');
        console.log(pdfData.text.substring(0, 2000));
        console.log('\n--- VALUATION SUMMARY section ---');
        const valuationIdx = pdfData.text.indexOf('VALUATION SUMMARY');
        if (valuationIdx !== -1) {
          console.log(pdfData.text.substring(valuationIdx, valuationIdx + 1000));
        }
        console.log('\n--- VEHICLE DETAILS section ---');
        const vehicleIdx = pdfData.text.indexOf('VEHICLE DETAILS');
        if (vehicleIdx !== -1) {
          console.log(pdfData.text.substring(vehicleIdx, vehicleIdx + 1000));
        }
      } else {
        console.log('⚠️  PDF text extraction returned insufficient text, will try OCR');
      }
    } catch (e) {
      console.log('⚠️  PDF text extraction failed:', e.message);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

// Test with the Volvo CCC One report
const volvoPath = path.join(__dirname, '..', 'valuation_report_samples', 'Allstate CCC Valuation XC60 Volvo 2015.pdf');
testPDFExtraction(volvoPath).catch(console.error);
