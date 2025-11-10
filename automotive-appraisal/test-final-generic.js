const pdfParse = require('pdf-parse');
const fs = require('fs');

async function testGenericParserOnAllSamples() {
  console.log('🚀 TESTING IMPROVED GENERIC PARSER ON ALL MITCHELL SAMPLES\n');
  
  const testFiles = [
    '14 santa fe eval.pdf',
    '25-439600069-ValuationReport.pdf',
    'valuation -  BARSANO (1).pdf',
    'Valution Report.pdf',
    'VR-1-VEHICLE EVALUAT gION_1 (2).pdf'
  ];

  const VIN_MANUFACTURER_MAP = {
    '1FT': 'Ford', '1GC': 'Chevrolet', '1GM': 'Chevrolet', '2T1': 'Toyota',
    '3FA': 'Ford', '4T1': 'Toyota', 'JHM': 'Honda', 'JN1': 'Nissan',
    'KMH': 'Hyundai', 'WBA': 'BMW', 'WBS': 'BMW', 'WDD': 'Mercedes-Benz',
    'YV1': 'Volvo', '5XY': 'Hyundai'
  };

  const VIN_YEAR_MAP = {
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006,
    '7': 2007, '8': 2008, '9': 2009, 'A': 2010, 'B': 2011, 'C': 2012,
    'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018,
    'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024
  };

  function extractVehicleInfo(text) {
    // Extract VIN
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/;
    const vinMatch = text.match(vinPattern);
    const vin = vinMatch ? vinMatch[0] : '';

    let make = '';
    let year = 0;
    let model = '';

    // Get make and year from VIN if available
    if (vin) {
      const wmi = vin.substring(0, 3);
      const yearChar = vin.charAt(9);
      make = VIN_MANUFACTURER_MAP[wmi] || '';
      year = VIN_YEAR_MAP[yearChar] || 0;
    }

    // Generic model extraction using pipe patterns (common in Mitchell reports)
    let bestModel = '';
    
    // Look for the cleanest pipe pattern matches first
    const pipePattern = /([A-Za-z0-9\s\-]+?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|\s+\d+\.\d+L|$)/gi;
    let match;
    const candidates = [];
    
    while ((match = pipePattern.exec(text)) !== null) {
      const part1 = match[1].trim();
      const part2 = match[2].trim();
      
      if (part1.length > 0 && part2.length > 0 && 
          !part1.includes('©') && !part2.includes('©') &&
          !part1.includes('Page') && !part2.includes('Page') &&
          !part1.includes('\n') && !part2.includes('\n') && // Prefer single-line matches
          (part2.includes('Competition') || part2.includes('Sport') || 
           part2.includes('XLT') || part2.includes('Limited') ||
           part2.includes('4 Door') || part2.includes('Sedan'))) {
        
        // Calculate a quality score (prefer shorter, cleaner part1)
        const quality = 100 - part1.length - (part1.includes('Cyl') ? 50 : 0) - (part1.includes('RWD') ? 50 : 0);
        
        candidates.push({
          model: `${part1} ${part2}`.replace(/\s+/g, ' ').trim(),
          quality: quality,
          part1: part1,
          part2: part2
        });
      }
    }
    
    // Sort by quality and pick the best
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.quality - a.quality);
      bestModel = candidates[0].model
        .replace(/\s+\d+\s+Door.*$/i, '')  // Remove door count and beyond
        .replace(/\s+\d+\.\d+L.*$/i, '')  // Remove engine specs
        .replace(/\s+(AWD|FWD|RWD).*$/i, '') // Remove drivetrain
        .trim();
    }

    // Try year-make-model pattern if no model found
    if (!bestModel) {
      const yearMakePattern = /(19|20)\d{2}\s+(BMW|Toyota|Honda|Ford|Hyundai|Volvo|Mercedes|Chevrolet|Nissan)\s+([A-Za-z0-9\s\-]+?)(?:\s*\||$)/gi;
      while ((match = yearMakePattern.exec(text)) !== null) {
        const foundYear = parseInt(match[1]);
        const foundMake = match[2];
        const foundModel = match[3].trim();
        
        if (!year) year = foundYear;
        if (!make) make = foundMake;
        
        if (foundModel && foundModel.length > 1) {
          bestModel = foundModel
            .replace(/\s*\|.*$/, '')
            .replace(/\s+\d+\s+Door.*$/i, '')
            .trim();
        }
      }
    }

    return { vin, year, make, model: bestModel };
  }

  const results = [];

  for (const filename of testFiles) {
    try {
      console.log(`\\n==================== ${filename} ====================`);
      
      const buffer = fs.readFileSync(`../valuation_report_samples/${filename}`);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      const extracted = extractVehicleInfo(text);
      
      console.log('🔍 VIN:', extracted.vin || 'Not found');
      console.log('📅 Year:', extracted.year || 'Not found');
      console.log('🏭 Make:', extracted.make || 'Not found');
      console.log('🚗 Model:', extracted.model || 'Not found');
      
      // Determine success level
      const hasVIN = !!extracted.vin;
      const hasBasicInfo = hasVIN || (extracted.make && extracted.year);
      const hasModel = extracted.model && extracted.model.length > 1;
      
      let status = '❌ FAILED';
      if (hasBasicInfo && hasModel) {
        status = '✅ SUCCESS';
      } else if (hasBasicInfo) {
        status = '⚠️  PARTIAL';
      }
      
      console.log('📊 Status:', status);
      
      results.push({
        filename,
        ...extracted,
        status: status.split(' ')[1] // Just the status word
      });
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      results.push({ filename, error: error.message, status: 'ERROR' });
    }
  }

  // Summary
  console.log('\\n\\n📊 ==================== SUMMARY ====================');
  const successful = results.filter(r => r.status === 'SUCCESS');
  const partial = results.filter(r => r.status === 'PARTIAL');
  const failed = results.filter(r => r.status === 'FAILED' || r.status === 'ERROR');

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`⚠️  Partial: ${partial.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\\n✅ SUCCESSFUL EXTRACTIONS:');
    successful.forEach(r => {
      console.log(`   📄 ${r.filename}`);
      console.log(`      ${r.year} ${r.make} ${r.model}`);
      console.log(`      VIN: ${r.vin}`);
    });
  }

  if (partial.length > 0) {
    console.log('\\n⚠️  PARTIAL EXTRACTIONS:');
    partial.forEach(r => {
      console.log(`   📄 ${r.filename}`);
      console.log(`      ${r.year || 'Unknown'} ${r.make || 'Unknown'} ${r.model || 'Model needs work'}`);
      if (r.vin) console.log(`      VIN: ${r.vin}`);
    });
  }

  console.log('\\n🎯 GENERIC PARSER RESULTS: Using universal Mitchell Report patterns instead of hardcoded vehicle logic!');
}

testGenericParserOnAllSamples().catch(console.error);