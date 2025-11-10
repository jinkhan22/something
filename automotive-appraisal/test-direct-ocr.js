/**
 * Direct OCR test using the ocr-worker
 */
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

async function testDirectOCR() {
  const pdfPath = path.join(__dirname, '../valuation_report_samples/14 santa fe eval.pdf');
  const outputPath = path.join(__dirname, 'santa-fe-ocr-output.txt');
  
  console.log('Loading PDF:', pdfPath);
  const buffer = await fs.readFile(pdfPath);
  console.log('PDF size:', buffer.length, 'bytes');
  
  // Write to temp file
  const tempInput = path.join(__dirname, 'temp-input.pdf');
  await fs.writeFile(tempInput, buffer);
  
  const workerPath = path.join(__dirname, 'ocr-worker.ts');
  
  console.log('\n=== Starting OCR Extraction ===\n');
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', workerPath, tempInput, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: __dirname
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      try {
        const { progress, message } = JSON.parse(data.toString().trim());
        console.log(`Progress: ${progress}% ${message || ''}`);
      } catch (e) {
        process.stderr.write(data);
      }
    });
    
    child.on('close', async (code) => {
      console.log('\n=== OCR Process Complete ===\n');
      
      if (code === 0 && stdout.includes('SUCCESS')) {
        const text = await fs.readFile(outputPath, 'utf-8');
        console.log('Extracted text length:', text.length, 'characters\n');
        
        // Search for Market Value
        const lines = text.split('\n');
        
        console.log('=== Searching for "Market Value" ===');
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
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.toLowerCase().includes('base') && line.toLowerCase().includes('value')) {
            console.log(`Line ${i}: "${line}"`);
            const match = line.match(/Base\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i);
            if (match) {
              console.log(`  Base Value: $${match[1]}`);
            }
          }
        }
        
        console.log(`\n✅ Full OCR output saved to: ${outputPath}`);
        
        // Cleanup
        await fs.unlink(tempInput).catch(() => {});
        
        resolve(text);
      } else {
        reject(new Error(`OCR failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

testDirectOCR().catch(console.error);
