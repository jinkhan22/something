/**
 * Test OCR extraction for Santa Fe PDF to see actual output
 */
import { extractTextWithOCRProcess } from './src/main/services/ocrExtractorProcess';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testSantaFeOCR() {
  try {
    const pdfPath = path.join(__dirname, '../valuation_report_samples/14 santa fe eval.pdf');
    
    console.log('Loading PDF:', pdfPath);
    const buffer = await fs.readFile(pdfPath);
    console.log('PDF size:', buffer.length, 'bytes');
    
    console.log('\n=== Starting OCR Extraction ===\n');
    
    const text = await extractTextWithOCRProcess(buffer, (progress, message) => {
      console.log(`Progress: ${progress}% ${message || ''}`);
    });
    
    console.log('\n=== OCR Extraction Complete ===\n');
    console.log('Extracted text length:', text.length, 'characters');
    
    // Search for Market Value and Base Value
    const lines = text.split('\n');
    
    console.log('\n=== Searching for "Market Value" ===');
    let foundMarketValue = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('market') && line.toLowerCase().includes('value')) {
        console.log(`Line ${i}: "${line}"`);
        foundMarketValue = true;
        
        // Try to extract the value
        const patterns = [
          /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
          /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
          /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
          /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            console.log(`  ✅ EXTRACTED: $${match[1]}`);
            break;
          }
        }
      }
    }
    
    if (!foundMarketValue) {
      console.log('❌ No "Market Value" found in OCR text');
    }
    
    console.log('\n=== Searching for "Base Value" ===');
    let foundBaseValue = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('base') && line.toLowerCase().includes('value')) {
        console.log(`Line ${i}: "${line}"`);
        foundBaseValue = true;
        
        // Try to extract the value
        const match = line.match(/Base\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i);
        if (match) {
          console.log(`  Base Value: $${match[1]}`);
        }
      }
    }
    
    if (!foundBaseValue) {
      console.log('❌ No "Base Value" found in OCR text');
    }
    
    console.log('\n=== Valuation Summary Section ===');
    let inValuationSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('valuation summary')) {
        inValuationSection = true;
        console.log(`\nFound "Valuation Summary" at line ${i}`);
      }
      
      if (inValuationSection && i < lines.length) {
        console.log(`Line ${i}: "${line}"`);
        
        // Stop after showing 30 lines from Valuation Summary
        if (i > lines.length - 1 || line.toLowerCase().includes('settlement value')) {
          if (line.toLowerCase().includes('settlement value')) {
            // Show a few more lines
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              console.log(`Line ${j}: "${lines[j].trim()}"`);
            }
          }
          break;
        }
      }
    }
    
    // Save the OCR output to a file for inspection
    const outputPath = path.join(__dirname, 'santa-fe-ocr-output.txt');
    await fs.writeFile(outputPath, text, 'utf-8');
    console.log(`\n✅ Full OCR output saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

testSantaFeOCR();
