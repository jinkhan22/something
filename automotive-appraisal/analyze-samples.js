const pdfParse = require('pdf-parse');
const fs = require('fs');

// Test the ACTUAL current system to see results after our improvements
async function testActualSystem() {
  console.log('🚀 TESTING ACTUAL SYSTEM AFTER GENERIC IMPROVEMENTS\n');
  
  const testFiles = [
    '14 santa fe eval.pdf',
    '25-439600069-ValuationReport.pdf', 
    'valuation -  BARSANO (1).pdf',
    'Valution Report.pdf'
  ];
  
  for (const filename of testFiles) {
    try {
      console.log(`\n==================== ${filename} ====================`);
      
      const buffer = fs.readFileSync(`../valuation_report_samples/${filename}`);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      // Basic analysis first
      console.log('📄 Text length:', text.length);
      console.log('📊 Lines count:', text.split('\\n').length);
      
      // Check if Mitchell
      const isMitchell = !text.includes('CCC ONE') && !text.includes('CCC One');
      console.log('📝 Report Type:', isMitchell ? 'MITCHELL' : 'CCC ONE');
      
      // VIN search
      const vinPattern = /\\b[A-HJ-NPR-Z0-9]{17}\\b/g;
      const vins = text.match(vinPattern);
      console.log('🔍 VINs found:', vins ? vins.length : 0);
      if (vins) {
        vins.forEach((vin, i) => console.log(`   VIN ${i+1}:`, vin));
      }
      
      // Look for "Loss vehicle" patterns
      const lines = text.split('\\n');
      const lossVehicleLines = [];
      const vehicleInfoLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for loss vehicle lines
        if (line.toLowerCase().includes('loss') && 
            line.toLowerCase().includes('vehicle') && 
            line.includes(':')) {
          lossVehicleLines.push({line: line.substring(0, 100), lineNum: i+1});
        }
        
        // Look for pipe-separated vehicle info
        if (line.includes('|') && 
            (line.includes('Door') || line.includes('Sedan') || 
             line.includes('Competition') || line.includes('XLT') ||
             line.includes('Sport'))) {
          vehicleInfoLines.push({line: line.substring(0, 100), lineNum: i+1});
        }
      }
      
      console.log('🚗 Loss vehicle lines found:', lossVehicleLines.length);
      lossVehicleLines.forEach((item, i) => {
        console.log(`   ${i+1}. (Line ${item.lineNum}): ${item.line}...`);
      });
      
      console.log('📋 Vehicle info lines (pipe separated):', vehicleInfoLines.length);
      vehicleInfoLines.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i+1}. (Line ${item.lineNum}): ${item.line}...`);
      });
      
      // Search for year patterns
      const yearPattern = /(19|20)\\d{2}/g;
      const years = text.match(yearPattern);
      const uniqueYears = years ? [...new Set(years)].filter(y => parseInt(y) >= 1990 && parseInt(y) <= 2025) : [];
      console.log('📅 Likely vehicle years:', uniqueYears.slice(0, 5));
      
      // Search for common manufacturers
      const manufacturers = ['Toyota', 'Honda', 'BMW', 'Ford', 'Hyundai', 'Volvo', 'Mercedes', 'Chevrolet', 'Nissan'];
      const foundMfgs = [];
      manufacturers.forEach(mfg => {
        if (text.toLowerCase().includes(mfg.toLowerCase())) {
          foundMfgs.push(mfg);
        }
      });
      console.log('🏭 Manufacturers mentioned:', foundMfgs);
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }
  
  console.log('\\n🎯 This analysis helps us understand what patterns are available in each Mitchell Report!');
}

testActualSystem().catch(console.error);