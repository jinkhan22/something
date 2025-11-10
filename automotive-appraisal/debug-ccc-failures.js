#!/usr/bin/env node
/**
 * Debug specific failing reports
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runOCR(pdfPath) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'ocr-worker.ts');
    const outputPath = `/tmp/ocr-debug.txt`;
    
    const child = spawn('npx', ['tsx', workerPath, pdfPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
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

async function debug(filename) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Debugging: ${filename}`);
  console.log('='.repeat(80));
  
  const pdfPath = path.join(__dirname, '..', 'valuation_report_samples', filename);
  const text = await runOCR(pdfPath);
  
  // Find VEHICLE DETAILS section
  const vehicleIdx = text.indexOf('VEHICLE DETAILS');
  if (vehicleIdx !== -1) {
    console.log('\n--- VEHICLE DETAILS SECTION ---');
    console.log(text.substring(vehicleIdx, vehicleIdx + 800));
  }
  
  // Find VALUATION SUMMARY or settlement
  const valuationIdx = text.indexOf('VALUATION SUMMARY');
  if (valuationIdx !== -1) {
    console.log('\n--- VALUATION SUMMARY ---');
    console.log(text.substring(valuationIdx, valuationIdx + 1000));
  }
  
  // Look for "Total" lines
  console.log('\n--- ALL "Total" LINES ---');
  text.split('\n').filter(l => /total/i.test(l)).forEach(l => console.log(`"${l}"`));
  
  // Look for Make lines
  console.log('\n--- ALL "Make" LINES ---');
  text.split('\n').filter(l => /^make/i.test(l)).forEach(l => console.log(`"${l}"`));
  
  // Look for Location lines
  console.log('\n--- ALL "Location" LINES ---');
  text.split('\n').filter(l => /^location/i.test(l)).forEach(l => console.log(`"${l}"`));
}

async function main() {
  // Debug reports with missing fields
  await debug('54S VE.pdf');  // Missing Settlement Value
  await debug('VR-1-VEHICLE EVALUATION_1_08142025.pdf');  // Missing Make and Settlement
  await debug('udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf');  // Missing Make and Location
  await debug('TL Valuation.pdf');  // Missing Location and Settlement
}

main().catch(console.error);
