#!/usr/bin/env tsx
/**
 * Test Market Value extraction from all Mitchell reports using actual OCR pipeline
 */

import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

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

function extractFieldMultiple(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractMarketValue(text: string): number | null {
  const lines = text.split('\n');
  
  // First try the inline patterns (updated to match pdfExtractor.ts)
  const patterns = [
    /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*va[lu](?:ue|e)\s*=\s*\$?\s*([0-9,]+\.?\d*)/i,  // "Marketvalue", "Marketvaue"
    /Market\s*va[lu](?:ue|a?ue?)\s*=\s*([0-9]{6,})/i,  // OCR corrupted: 6+ digits, no decimal
  ];
  
  const marketMatch = extractFieldMultiple(text, patterns);
  if (marketMatch) {
    let valueStr = marketMatch.replace(/,/g, '');
    // If 6+ digits with no decimal (OCR error), insert decimal before last 2 digits
    if (/^\d{6,}$/.test(valueStr)) {
      valueStr = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
    }
    return parseFloat(valueStr);
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
    
    // Also check for inline patterns with OCR variations
    const inlineMatch = line.match(/Market\s*va[lu](?:ue|e|aue?)\s*[:\s=]*\$?\s*([0-9,]+\.?\d*)/i);
    if (inlineMatch) {
      let valueStr = inlineMatch[1].replace(/,/g, '');
      // If 6+ digits with no decimal (OCR error), insert decimal before last 2 digits
      if (/^\d{6,}$/.test(valueStr)) {
        valueStr = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
      }
      return parseFloat(valueStr);
    }
  }
  
  return null;
}

function extractBaseValue(text: string): number | null {
  const baseMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.baseValue);
  if (baseMatch) {
    return parseFloat(baseMatch.replace(/,/g, ''));
  }
  return null;
}

function findMarketValueInText(text: string) {
  const lines = text.split('\n');
  const marketValueLines: { lineNumber: number; content: string }[] = [];
  
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

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  let tempDir: string | null = null;
  
  try {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    
    // Read PDF
    const pdfBuffer = await fs.readFile(pdfPath);
    const tempPdfPath = path.join(tempDir, 'input.pdf');
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    console.log('   Converting PDF to images...');
    
    // Convert PDF to images
    const converter = fromPath(tempPdfPath, {
      density: 300,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2400,
      height: 3000,
      preserveAspectRatio: true
    });
    
    console.log('   Initializing OCR...');
    
    // Initialize Tesseract worker
    const worker = await createWorker('eng', 1, {
      cachePath: tempDir,
      logger: () => {}, // Suppress logging
    });
    
    const pageTexts: string[] = [];
    const maxPages = 20;
    
    // Process pages
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`   Processing page ${pageNum}...`);
        
        const pageImage = await converter(pageNum, { responseType: 'image' });
        
        if (!pageImage.path) {
          break;
        }
        
        const { data: { text } } = await worker.recognize(pageImage.path);
        
        if (text.trim()) {
          pageTexts.push(text);
        }
        
      } catch (error) {
        // Reached end of document
        break;
      }
    }
    
    await worker.terminate();
    
    if (pageTexts.length === 0) {
      throw new Error('No text extracted');
    }
    
    return pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
  } finally {
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore
      }
    }
  }
}

async function testMitchellReport(filePath: string) {
  try {
    const fileName = path.basename(filePath);
    
    console.log(`   Extracting text with OCR...`);
    const text = await extractTextFromPDF(filePath);
    
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
      skipped: false,
      text // Save for debugging
    };
    
  } catch (error) {
    return {
      fileName: path.basename(filePath),
      error: error instanceof Error ? error.message : String(error),
      skipped: false
    };
  }
}

async function main() {
  const samplesDir = path.join(__dirname, '../valuation_report_samples');
  const files = (await fs.readdir(samplesDir)).filter(f => f.toLowerCase().endsWith('.pdf'));
  
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         MITCHELL REPORT MARKET VALUE EXTRACTION TEST                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Found ${files.length} PDF files in samples directory\n`);
  
  const results: any[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(samplesDir, file);
    console.log(`\n[${i + 1}/${files.length}] Testing: ${file}`);
    const result = await testMitchellReport(filePath);
    results.push(result);
    
    if (result.skipped) {
      console.log('   ℹ️  Not a Mitchell report, skipping');
    } else if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    } else {
      console.log(`   ✓ Complete`);
    }
  }
  
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
      result.marketValueLines.slice(0, 3).forEach((line: any) => {
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
    console.log('⚠️  REPORTS WITH MISSING MARKET VALUE - DETAILED ANALYSIS');
    console.log('═'.repeat(80) + '\n');
    
    for (const report of failedReports) {
      console.log(`📄 ${report.fileName}`);
      console.log(`   Vehicle: ${report.vehicle}`);
      
      if (report.marketValueLines && report.marketValueLines.length > 0) {
        console.log(`   ⚠️  "Market Value" text found but not extracted. Sample lines:`);
        report.marketValueLines.slice(0, 5).forEach((line: any) => {
          console.log(`      Line ${line.lineNumber}: "${line.content.trim()}"`);
        });
        
        // Show relevant context around first occurrence
        const firstLine = report.marketValueLines[0].lineNumber;
        const textLines = report.text.split('\n');
        console.log(`\n   📝 Context around first occurrence (lines ${Math.max(1, firstLine - 2)} to ${firstLine + 3}):`);
        for (let i = Math.max(0, firstLine - 3); i < Math.min(textLines.length, firstLine + 3); i++) {
          const marker = i === firstLine - 1 ? '➡️  ' : '    ';
          console.log(`      ${marker}Line ${i + 1}: "${textLines[i].trim()}"`);
        }
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
    console.log('Review the detailed analysis above to identify the pattern issues.\n');
  } else {
    console.log('✅ All Mitchell reports successfully extracting Market Value!');
  }
}

main().catch(console.error);
