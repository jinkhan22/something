const pdfParse = require('pdf-parse');
const fs = require('fs');

// Test the improved generic parser on all Mitchell report samples
async function testAllMitchellReports() {
  console.log('🚀 TESTING IMPROVED GENERIC MITCHELL PARSER ON ALL SAMPLES\n');
  
  const testFiles = [
    '14 santa fe eval.pdf',
    '25-439600069-ValuationReport.pdf', 
    'valuation -  BARSANO (1).pdf',
    'Valution Report.pdf',
    'VR-1-VEHICLE EVALUAT gION_1 (2).pdf'
  ];
  
  const results = [];
  
  for (const filename of testFiles) {
    try {
      console.log(`\n==================== ${filename} ====================`);
      
      const buffer = fs.readFileSync(`../valuation_report_samples/${filename}`);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      // Detect if it's Mitchell or CCC
      const isMitchell = !text.includes('CCC ONE') && !text.includes('CCC One');
      console.log('📄 Report Type:', isMitchell ? 'MITCHELL' : 'CCC ONE');
      
      if (!isMitchell) {
        console.log('⏭️  Skipping CCC One report for now');
        continue;
      }
      
      // Extract VIN
      const vinPattern = /\\b[A-HJ-NPR-Z0-9]{17}\\b/;
      const vinMatch = text.match(vinPattern);
      const vin = vinMatch ? vinMatch[0] : '';
      
      // Get basic info from VIN if available
      let make = '';
      let year = 0;
      
      if (vin) {
        const VIN_MANUFACTURER_MAP = {
          '1FT': 'Ford', '1GC': 'Chevrolet', '1GM': 'Chevrolet', 
          '2T1': 'Toyota', '4T1': 'Toyota', 'JHM': 'Honda', 'JN1': 'Nissan',
          'KMH': 'Hyundai', 'WBA': 'BMW', 'WBS': 'BMW', 'WDD': 'Mercedes-Benz',
          'YV1': 'Volvo', '5XY': 'Hyundai'
        };
        
        const VIN_YEAR_MAP = {
          '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, 
          '7': 2007, '8': 2008, '9': 2009, 'A': 2010, 'B': 2011, 'C': 2012, 
          'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 
          'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023
        };
        
        const wmi = vin.substring(0, 3);
        make = VIN_MANUFACTURER_MAP[wmi] || '';
        
        const yearChar = vin.charAt(9);
        year = VIN_YEAR_MAP[yearChar] || 0;
      }
      
      // Look for "Loss vehicle:" lines using generic approach
      const lines = text.split('\\n');
      let lossVehicleLine = '';
      let model = '';
      
      // Find loss vehicle line
      for (const line of lines) {
        if (line.toLowerCase().includes('loss') && 
            line.toLowerCase().includes('vehicle') && 
            line.includes(':') &&
            line.length > 20) {
          lossVehicleLine = line.trim();
          break;
        }
      }
      
      // If no clear loss vehicle line, look for vehicle info in any line with pipe patterns
      if (!lossVehicleLine) {
        for (const line of lines) {
          if (line.includes('|') && 
              (line.includes('Door') || line.includes('Sedan') || line.includes('Competition'))) {
            
            // Try to extract model from pipe pattern
            const pipeMatch = line.match(/([A-Za-z0-9\\s\\-]+?)\\s*\\|\\s*([A-Za-z0-9\\s]+?)(?:\\s+\\d+\\s+Door|$)/i);
            if (pipeMatch) {
              const modelPart = pipeMatch[1].trim();
              const trimPart = pipeMatch[2].trim();
              
              // Filter out obvious non-model content
              if (modelPart && 
                  !/^[ilo\\s]+$/.test(modelPart) && 
                  modelPart.length > 1 &&
                  !modelPart.includes('©') &&
                  !modelPart.includes('Page')) {
                
                if (trimPart && 
                    !trimPart.includes('©') && 
                    !trimPart.includes('Page') &&
                    !/^\\d+\\.\\d+L/.test(trimPart)) {
                  model = `${modelPart} ${trimPart}`.replace(/\\s+/g, ' ').trim();
                } else {
                  model = modelPart;
                }
                break;
              }
            }
          }
        }
      }
      
      // Parse loss vehicle line if found
      if (lossVehicleLine && !model) {
        const yearMatch = lossVehicleLine.match(/(\\d{4})/);
        if (yearMatch && !year) year = parseInt(yearMatch[1]);
        
        // Extract vehicle info after "Loss vehicle:"
        const afterColon = lossVehicleLine.split(':')[1];
        if (afterColon) {
          const vehicleInfo = afterColon.trim();
          
          // Look for make in the line
          const manufacturers = ['Toyota', 'Honda', 'BMW', 'Ford', 'Hyundai', 'Volvo', 'Mercedes'];
          for (const mfg of manufacturers) {
            if (vehicleInfo.toLowerCase().includes(mfg.toLowerCase())) {
              make = make || mfg;
              
              // Extract model after manufacturer
              const mfgIndex = vehicleInfo.toLowerCase().indexOf(mfg.toLowerCase());
              const afterMfg = vehicleInfo.substring(mfgIndex + mfg.length).trim();
              const modelMatch = afterMfg.match(/^([A-Za-z0-9\\s\\-]+?)(?:\\s*\\||$)/);
              if (modelMatch) {
                model = modelMatch[1].trim();
              }
              break;
            }
          }
        }
      }
      
      const result = {
        filename,
        vin: vin || 'Not found',
        year: year || 'Not found', 
        make: make || 'Not found',
        model: model || 'Not found',
        lossVehicleLine: lossVehicleLine || 'Not found'
      };
      
      results.push(result);
      
      console.log('🔍 VIN:', result.vin);
      console.log('📅 Year:', result.year);
      console.log('🏭 Make:', result.make);
      console.log('🚗 Model:', result.model);
      if (result.lossVehicleLine !== 'Not found') {
        console.log('📋 Loss Vehicle Line:', result.lossVehicleLine.substring(0, 80) + '...');
      }
      
      // Assess success
      const hasBasicInfo = result.vin !== 'Not found' || (result.make !== 'Not found' && result.year !== 'Not found');
      const hasModel = result.model !== 'Not found' && result.model.length > 1;
      
      if (hasBasicInfo && hasModel) {
        console.log('✅ SUCCESS: Good extraction');
      } else if (hasBasicInfo) {
        console.log('⚠️  PARTIAL: Basic info found, model needs work');  
      } else {
        console.log('❌ FAILED: Insufficient data extracted');
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      results.push({
        filename,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\\n\\n📊 ==================== SUMMARY ====================');
  const successful = results.filter(r => !r.error && r.model !== 'Not found' && r.model.length > 1);
  const partial = results.filter(r => !r.error && (r.vin !== 'Not found' || r.make !== 'Not found') && (r.model === 'Not found' || r.model.length <= 1));
  const failed = results.filter(r => r.error || (r.vin === 'Not found' && r.make === 'Not found'));
  
  console.log(`✅ Successful extractions: ${successful.length}/${results.length}`);
  console.log(`⚠️  Partial extractions: ${partial.length}/${results.length}`);
  console.log(`❌ Failed extractions: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\\n✅ SUCCESS CASES:');
    successful.forEach(r => {
      console.log(`   ${r.filename}: ${r.year} ${r.make} ${r.model}`);
    });
  }
  
  if (partial.length > 0) {
    console.log('\\n⚠️  PARTIAL CASES (need model improvement):');
    partial.forEach(r => {
      console.log(`   ${r.filename}: ${r.year} ${r.make} ${r.model}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\\n❌ FAILED CASES:');
    failed.forEach(r => {
      console.log(`   ${r.filename}: ${r.error || 'No basic vehicle info found'}`);
    });
  }
  
  console.log('\\n🎯 The parser is now using generic Mitchell Report patterns instead of hardcoded vehicle-specific logic!');
}

testAllMitchellReports().catch(console.error);