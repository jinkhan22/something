import Tesseract from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';

// Enhanced patterns matching pdfExtractor.ts
const MITCHELL_PATTERNS = {
  vin: /[A-HJ-NPR-Z0-9]{17}/i,  // No word boundaries to handle OCR concatenation
  marketValue: [
    /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*va[lu](?:ue|e)\s*=\s*\$?\s*([0-9,]+\.?\d*)/i,
    /Market\s*va[lu](?:ue|a?ue?)\s*=\s*([0-9]{6,})/i,
    /[vmu]a[rliu]k[eoa]t\s*[vmu]a[lti][liuo][eoa]\s*=\s*[s\$]?\s*([0-9]{6,})/i,  // Severe OCR corruption
  ],
};

// Extract field with OCR-aware reconstruction
function extractMarketValue(text: string): string | null {
  for (const pattern of MITCHELL_PATTERNS.marketValue) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let valueStr = match[1].replace(/,/g, '');
      
      // Reconstruct decimal if missing (6+ digits)
      if (/^\d{6,}$/.test(valueStr)) {
        // Check for corrupted $ sign (3-5 at start)
        if (/^[3-5]\d{6,}$/.test(valueStr)) {
          valueStr = valueStr.slice(1, -2) + '.' + valueStr.slice(-2);
        } else {
          valueStr = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
        }
      }
      
      const value = parseFloat(valueStr);
      if (!isNaN(value) && value > 0) {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
  }
  return null;
}

// Context-aware VIN extraction
function extractVIN(text: string): string | null {
  const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;  // Valid VIN characters (no I, O, Q)
  const vinPatternWithOCRErrors = /[A-Z0-9]{17}/;  // Includes O for OCR errors
  const lines = text.split('\n');
  let vin: string | null = null;

  // Strategy 1: Look for VIN near "Ext Color" (most reliable)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/ext\s+color|exterior\s+color/i)) {
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        let vinMatch = lines[j].match(vinPattern);
        // Try with OCR error pattern if no match
        if (!vinMatch) {
          vinMatch = lines[j].match(vinPatternWithOCRErrors);
          if (vinMatch) {
            vin = vinMatch[0].replace(/O/g, '0').trim();
            break;
          }
        } else {
          vin = vinMatch[0].trim();
          break;
        }
      }
      if (vin) break;
    }
  }

  // Strategy 2: Check first 30 lines (Vehicle Information section)
  if (!vin) {
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      let vinMatch = lines[i].match(vinPattern);
      // Try with OCR error pattern if no match
      if (!vinMatch) {
        vinMatch = lines[i].match(vinPatternWithOCRErrors);
        if (vinMatch) {
          vin = vinMatch[0].replace(/O/g, '0').trim();
          break;
        }
      } else {
        vin = vinMatch[0].trim();
        break;
      }
    }
  }

  // Strategy 3: Fallback to first match
  if (!vin) {
    let vinMatch = text.match(vinPattern);
    // Try with OCR error pattern if no match
    if (!vinMatch) {
      vinMatch = text.match(vinPatternWithOCRErrors);
      if (vinMatch) {
        vin = vinMatch[0].replace(/O/g, '0').trim();
      }
    } else {
      vin = vinMatch[0].trim();
    }
  }

  return vin;
}

async function testPDFExtraction(pdfPath: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(80));

  try {
    const options = {
      density: 300,
      saveFilename: 'temp',
      savePath: './temp',
      format: 'png',
      width: 2480,
      height: 3508,
    };

    const convert = fromPath(pdfPath, options);
    const pageToConvertAsImage = 1;

    const result = await convert(pageToConvertAsImage, { responseType: 'image' });

    if (!result || !result.path) {
      throw new Error('Failed to convert PDF to image');
    }

    console.log('✓ PDF converted to image');

    const { data: { text } } = await Tesseract.recognize(result.path, 'eng', {
      logger: () => {},
    });

    // Cleanup temp file
    try {
      if (fs.existsSync(result.path)) {
        fs.unlinkSync(result.path);
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    // Check if this is a Mitchell report
    const isMitchell = text.includes('Mitchell') || text.match(/Loss vehicle:/i);
    
    if (!isMitchell) {
      console.log('ℹ️  Not a Mitchell report, skipping');
      return {
        file: path.basename(pdfPath),
        vin: null,
        marketValue: null,
        success: false,
        skipped: true,
      };
    }

    // Extract fields
    const marketValue = extractMarketValue(text);
    const vin = extractVIN(text);

    console.log('\nExtracted Data:');
    console.log(`  VIN:          ${vin || '❌ Not found'}`);
    console.log(`  Market Value: ${marketValue || '❌ Not found'}`);

    // Show sample of OCR text for debugging
    const firstLines = text.split('\n').slice(0, 40).join('\n');
    console.log('\nFirst 40 lines of OCR text:');
    console.log('-'.repeat(80));
    console.log(firstLines);

    return {
      file: path.basename(pdfPath),
      vin,
      marketValue,
      success: !!(vin && marketValue),
    };
  } catch (error: any) {
    console.error(`❌ Error processing file: ${error.message}`);
    return {
      file: path.basename(pdfPath),
      vin: null,
      marketValue: null,
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  const samplesDir = path.join(__dirname, '../valuation_report_samples');
  const pdfFiles = fs.readdirSync(samplesDir)
    .filter((file: string) => file.endsWith('.pdf'))
    .map((file: string) => path.join(samplesDir, file));

  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPLETE MITCHELL EXTRACTION TEST - VIN + Market Value                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nFound ${pdfFiles.length} Mitchell report(s) to test\n`);

  const results = [];
  for (const pdfPath of pdfFiles) {
    const result = await testPDFExtraction(pdfPath);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const mitchellReports = results.filter((r: any) => !r.skipped);
  const successful = mitchellReports.filter((r: any) => r.success);
  console.log(`\nMitchell Reports Found: ${mitchellReports.length}`);
  console.log(`✅ Successful: ${successful.length}/${mitchellReports.length}`);
  
  if (successful.length > 0) {
    console.log('\nSuccessful Extractions:');
    successful.forEach((r: any) => {
      console.log(`  ✓ ${r.file}`);
      console.log(`    VIN: ${r.vin}`);
      console.log(`    Market Value: ${r.marketValue}`);
    });
  }

  const failed = mitchellReports.filter((r: any) => !r.success);
  if (failed.length > 0) {
    console.log('\n❌ Failed Extractions:');
    failed.forEach((r: any) => {
      console.log(`  ✗ ${r.file}`);
      if (r.error) console.log(`    Error: ${r.error}`);
      if (!r.vin) console.log(`    Missing: VIN`);
      if (!r.marketValue) console.log(`    Missing: Market Value`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(successful.length === mitchellReports.length ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
  console.log('='.repeat(80));
}

main().catch(console.error);
