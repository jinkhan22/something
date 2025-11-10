#!/usr/bin/env node
/**
 * Debug script to see the full OCR text structure
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { tmpdir } = require('os');
const { mkdtemp, writeFile, readFile, rm } = require('fs').promises;

async function runOCR(pdfPath) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ocr-test-'));
  const inputPath = path.join(tempDir, 'input.pdf');
  const outputPath = path.join(tempDir, 'output.txt');
  
  try {
    const buffer = fs.readFileSync(pdfPath);
    await writeFile(inputPath, buffer);
    
    const workerPath = path.join(__dirname, 'ocr-worker.ts');
    
    return await new Promise((resolve, reject) => {
      const child = spawn('npx', ['tsx', workerPath, inputPath, outputPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const { progress, message } = JSON.parse(line);
            process.stdout.write(`\r  OCR: ${progress}% - ${message}          `);
          } catch (e) {}
        }
      });
      
      child.on('close', async (code) => {
        process.stdout.write('\n');
        if (code === 0 && stdout.includes('SUCCESS')) {
          const text = await readFile(outputPath, 'utf-8');
          resolve(text);
        } else {
          reject(new Error(`OCR failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
    
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function main() {
  const pdfPath = path.join(__dirname, '..', 'valuation_report_samples', 'Allstate CCC Valuation XC60 Volvo 2015.pdf');
  
  console.log('Running OCR...\n');
  const text = await runOCR(pdfPath);
  
  console.log('\n=== SEARCHING FOR KEY SECTIONS ===\n');
  
  // Find VEHICLE DETAILS section
  const vehicleDetailsIdx = text.indexOf('VEHICLE DETAILS');
  if (vehicleDetailsIdx !== -1) {
    console.log('--- VEHICLE DETAILS SECTION (1500 chars) ---');
    console.log(text.substring(vehicleDetailsIdx, vehicleDetailsIdx + 1500));
  }
  
  // Find VALUATION SUMMARY section
  const valuationIdx = text.indexOf('VALUATION SUMMARY');
  if (valuationIdx !== -1) {
    console.log('\n--- VALUATION SUMMARY SECTION (1000 chars) ---');
    console.log(text.substring(valuationIdx, valuationIdx + 1000));
  }
  
  // Show all lines that match Year pattern
  console.log('\n--- LINES CONTAINING "Year" ---');
  const yearLines = text.split('\n').filter(l => /year/i.test(l));
  yearLines.forEach(l => console.log(`"${l}"`));
  
  // Show Adjusted Vehicle Value area
  console.log('\n--- LINES CONTAINING "Adjusted Vehicle Value" ---');
  const adjValueLines = text.split('\n').filter(l => /adjusted.*vehicle.*value/i.test(l));
  adjValueLines.forEach(l => console.log(`"${l}"`));
}

main().catch(console.error);
