const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

// Mitchell patterns from pdfExtractor.ts
const MITCHELL_PATTERNS = {
  marketValue: [
    /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
  ],
  baseValue: [
    /Base\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Base\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
    /Base\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
  ],
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+([A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)\s+([\w\s\-]+?)\s*\|/i,
};

function extractFieldMultiple(text, patterns) {
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractMarketValue(text) {
  const lines = text.split('\n');
  
  // First try the inline patterns
  const marketMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.marketValue);
  if (marketMatch) {
    return parseFloat(marketMatch.replace(/,/g, ''));
  }
  
  // Fallback: look for "Market Value" label followed by dollar amount on next lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for "Market Value" label (may have OCR variations)
    if (line.match(/^(Market\s+Val(?:ue|e)|arket\s*Val(?:ue|e)):?\s*$/i)) {
      // Look for the dollar amount in the next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.includes('$')) {
          const dollarMatch = nextLine.match(/\$\s*([0-9,]+\.?\d*)/);
          if (dollarMatch) {
            return parseFloat(dollarMatch[1].replace(/,/g, ''));
          }
        }
      }
    }
    
    // Also check for inline "market vale = $X" pattern in line
    const inlineMatch = line.match(/market\s+val(?:ue|e)\s*[:=]?\s*\$\s*([0-9,]+\.?\d*)/i);
    if (inlineMatch) {
      return parseFloat(inlineMatch[1].replace(/,/g, ''));
    }
  }
  
  return null;
}

function extractBaseValue(text) {
  const baseMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.baseValue);
  if (baseMatch) {
    return parseFloat(baseMatch.replace(/,/g, ''));
  }
  return null;
}

function findMarketValueInText(text) {
  const lines = text.split('\n');
  const marketValueLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('market') && (line.toLowerCase().includes('value') || line.toLowerCase().includes('vale'))) {
      marketValueLines.push({
        lineNumber: i + 1,
        content: line
      });
    }
  }
  
  return marketValueLines;
}

async function extractTextFromPDF(pdfPath, worker) {
  try {
    const { data: { text } } = await worker.recognize(pdfPath);
    return text;
  } catch (error) {
    console.error(`Error extracting text from ${pdfPath}:`, error.message);
    return null;
  }
}

async function testMitchellReport(filePath, worker) {
  try {
    const fileName = path.basename(filePath);
    
    console.log(`   Performing OCR...`);
    const text = await extractTextFromPDF(filePath, worker);
    
    if (!text) {
      return { fileName, error: 'Failed to extract text', skipped: false };
    }
    
    // Check if this is a Mitchell report
    const isMitchell = text.includes('Mitchell') || text.match(/Loss vehicle:/i);
    
    if (!isMitchell) {
      return { fileName, type: 'NON-MITCHELL', skipped: true };
    }
    
    // Extract vehicle info
    const vehicleMatch = text.match(MITCHELL_PATTERNS.vehicleInfo);
    const vehicle = vehicleMatch ? `${vehicleMatch[1]} ${vehicleMatch[2]} ${vehicleMatch[3]}`.trim() : 'Unknown';
    
    // Extract values
    const marketValue = extractMarketValue(text);
    const baseValue = extractBaseValue(text);
    
    // Find all market value references in text
    const marketValueLines = findMarketValueInText(text);
    
    return {
      fileName,
      type: 'MITCHELL',
      vehicle,
      marketValue,
      baseValue,
      marketValueLines,
      success: marketValue !== null,
      skipped: false
    };
    
  } catch (error) {
    return {
      fileName: path.basename(filePath),
      error: error.message,
      skipped: false
    };
  }
}

async function testAllMitchellReports() {
  const samplesDir = path.join(__dirname, '../valuation_report_samples');
  const files = fs.readdirSync(samplesDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         MITCHELL REPORT MARKET VALUE EXTRACTION TEST                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Found ${files.length} PDF files in samples directory\n`);
  console.log('Initializing Tesseract OCR worker...\n');
  
  const worker = await createWorker('eng');
  
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(samplesDir, file);
    console.log(`[${i + 1}/${files.length}] Testing: ${file}`);
    const result = await testMitchellReport(filePath, worker);
    results.push(result);
    console.log('');
  }
  
  await worker.terminate();
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY RESULTS');
  console.log('═'.repeat(80) + '\n');
  
  const mitchellReports = results.filter(r => r.type === 'MITCHELL');
  const successCount = mitchellReports.filter(r => r.success).length;
  const failCount = mitchellReports.filter(r => !r.success && !r.error).length;
  const errorCount = mitchellReports.filter(r => r.error).length;
  
  console.log(`Total Mitchell Reports: ${mitchellReports.length}`);
  console.log(`✅ Successfully Extracted Market Value: ${successCount}`);
  console.log(`❌ Failed to Extract Market Value: ${failCount}`);
  console.log(`⚠️  Errors: ${errorCount}\n`);
  
  // Detailed results
  console.log('DETAILED RESULTS');
  console.log('─'.repeat(80) + '\n');
  
  for (const result of results) {
    if (result.skipped || result.type !== 'MITCHELL') continue;
    
    console.log(`📄 ${result.fileName}`);
    
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}\n`);
      continue;
    }
    
    console.log(`   Vehicle: ${result.vehicle}`);
    
    if (result.marketValue !== null) {
      console.log(`   ✅ Market Value: $${result.marketValue.toFixed(2)}`);
    } else {
      console.log(`   ❌ Market Value: NOT FOUND`);
    }
    
    if (result.baseValue !== null) {
      console.log(`   📊 Base Value: $${result.baseValue.toFixed(2)}`);
    }
    
    // Show where "Market Value" appears in text
    if (result.marketValueLines && result.marketValueLines.length > 0) {
      console.log(`   📍 "Market Value" found in text at:`);
      result.marketValueLines.slice(0, 3).forEach(line => {
        console.log(`      Line ${line.lineNumber}: ${line.content.trim().substring(0, 70)}...`);
      });
      if (result.marketValueLines.length > 3) {
        console.log(`      ... and ${result.marketValueLines.length - 3} more`);
      }
    }
    
    console.log('');
  }
  
  // Reports with issues
  const failedReports = mitchellReports.filter(r => !r.success && !r.error);
  
  if (failedReports.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log('⚠️  REPORTS WITH MISSING MARKET VALUE');
    console.log('═'.repeat(80) + '\n');
    
    for (const report of failedReports) {
      console.log(`📄 ${report.fileName}`);
      console.log(`   Vehicle: ${report.vehicle}`);
      
      if (report.marketValueLines && report.marketValueLines.length > 0) {
        console.log(`   ⚠️  "Market Value" text found but not extracted. Lines:`);
        report.marketValueLines.forEach(line => {
          console.log(`      Line ${line.lineNumber}: ${line.content.trim()}`);
        });
      } else {
        console.log(`   ⚠️  No "Market Value" text found in document at all`);
      }
      
      console.log('');
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`FINAL RESULT: ${successCount}/${mitchellReports.length} Mitchell reports successfully extracted`);
  console.log('═'.repeat(80) + '\n');
  
  if (failCount > 0) {
    console.log('⚠️  ACTION NEEDED: Some Mitchell reports are not extracting Market Value!');
  } else {
    console.log('✅ All Mitchell reports successfully extracting Market Value!');
  }
}

testAllMitchellReports().catch(console.error);
