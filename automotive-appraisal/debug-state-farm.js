#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runOCR(pdfPath) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'ocr-worker.ts');
    const outputPath = `/tmp/state-farm-ocr.txt`;
    
    const child = spawn('npx', ['tsx', workerPath, pdfPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', () => {});
    
    child.on('close', (code) => {
      if (code === 0 && stdout.includes('SUCCESS')) {
        const text = fs.readFileSync(outputPath, 'utf-8');
        resolve(text);
      } else {
        reject(new Error(`OCR failed`));
      }
    });
    
    child.on('error', reject);
  });
}

async function main() {
  const pdfPath = path.join(__dirname, '..', 'valuation_report_samples', 'State-Farm-Valuation-Report.pdf');
  const text = await runOCR(pdfPath);
  
  console.log('--- VALUATION SUMMARY ---');
  const valuationIdx = text.indexOf('VALUATION SUMMARY');
  if (valuationIdx !== -1) {
    console.log(text.substring(valuationIdx, valuationIdx + 1200));
  }
  
  console.log('\n--- ALL "Total" LINES ---');
  text.split('\n').filter(l => /total/i.test(l)).forEach(l => console.log(`"${l}"`));
  
  console.log('\n--- Lines around "Value before" ---');
  text.split('\n').forEach((l, i, arr) => {
    if (/value before/i.test(l)) {
      console.log(`[${i-2}] "${arr[i-2]}"`);
      console.log(`[${i-1}] "${arr[i-1]}"`);
      console.log(`[${i}] "${l}"`);
      console.log(`[${i+1}] "${arr[i+1]}"`);
      console.log(`[${i+2}] "${arr[i+2]}"`);
    }
  });
}

main().catch(console.error);
