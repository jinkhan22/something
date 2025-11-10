// Test to understand the model extraction issue in Mitchell reports

const pdfParse = require('pdf-parse');
const fs = require('fs');

// Mitchell patterns from current implementation
const MITCHELL_PATTERNS = {
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+([A-Za-z]+)\s+([A-Za-z0-9\s\.\-\(\)]+?)(?:\s+(?:ö|\|)|AWD|FWD|RWD|$)/im,
};

// Vehicle manufacturers list (sorted by length - longest first)
const VEHICLE_MANUFACTURERS = [
  'Aston Martin', 'Alfa Romeo', 'Land Rover', 'Range Rover', 'Rolls Royce',
  'AM General', 'American Motors', 'Harley Davidson', 'General Motors',
  'Acura', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 
  'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lexus', 'Lincoln',
  'Lucid', 'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz', 'Mitsubishi', 
  'Nissan', 'Porsche', 'Ram', 'Rivian', 'Subaru', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo'
];

// Current parseMakeModel function
function parseMakeModel(vehicleText) {
  const cleanText = vehicleText.trim();
  console.log('  🔍 Parsing vehicle text:', JSON.stringify(cleanText));
  
  // First try exact manufacturer matches
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      const make = manufacturer;
      
      // Extract everything after the manufacturer name until the first "|"
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      
      console.log('  ✅ Found manufacturer:', make);
      console.log('  📝 Text after make:', JSON.stringify(afterMake));
      console.log('  🚗 Extracted model:', JSON.stringify(model));
      
      // Only return if we found a meaningful model
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Fallback: if no manufacturer found, use first word as make
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const modelParts = words.slice(1);
    const model = modelParts.join(' ').replace(/\|.*$/, '').trim();
    console.log('  ⚠️  Fallback parsing - Make:', make, 'Model:', model);
    return { make, model };
  }
  
  console.log('  ❌ Failed to parse make/model');
  return { make: words[0] || '', model: '' };
}

async function testModelExtractionIssue() {
  console.log('🚀 Testing Model Extraction Issue in Mitchell Reports\n');
  
  const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf')).slice(0, 3);
  
  for (const file of files) {
    console.log(`\n📄 ===== TESTING FILE: ${file} =====`);
    
    try {
      const buffer = fs.readFileSync(file);
      const data = await pdfParse(buffer);
      const text = data.text;
      
      console.log('📊 Report Type:', text.includes('CCC ONE') || text.includes('CCC One') ? 'CCC_ONE' : 'MITCHELL');
      
      if (text.includes('CCC ONE') || text.includes('CCC One')) {
        console.log('⏭️  Skipping CCC report, focusing on Mitchell...\n');
        continue;
      }
      
      // Test the current vehicleInfo pattern
      console.log('\n🔎 Testing current MITCHELL vehicleInfo pattern...');
      const vehicleMatch1 = text.match(MITCHELL_PATTERNS.vehicleInfo);
      if (vehicleMatch1) {
        console.log('✅ Pattern matched!');
        console.log('  Year:', vehicleMatch1[1]);
        console.log('  Captured group 2 (expected Make):', JSON.stringify(vehicleMatch1[2]));
        console.log('  Captured group 3 (expected Model):', JSON.stringify(vehicleMatch1[3]));
        
        const makeModelText = `${vehicleMatch1[2]} ${vehicleMatch1[3]}`.trim();
        console.log('  Combined Make+Model text:', JSON.stringify(makeModelText));
        
        const parsed = parseMakeModel(makeModelText);
        console.log('  🎯 FINAL RESULT - Make:', JSON.stringify(parsed.make), 'Model:', JSON.stringify(parsed.model));
      } else {
        console.log('❌ Current pattern did not match');
      }
      
      // Test the simple approach you described
      console.log('\n🧪 Testing your suggested simple approach...');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().startsWith('loss vehicle:')) {
          console.log('📍 Found Loss Vehicle line:', JSON.stringify(line));
          
          const afterColon = line.split(':')[1]?.trim();
          if (afterColon) {
            console.log('  After colon:', JSON.stringify(afterColon));
            
            // Your simple pattern: Year Make Model | ...
            const simpleMatch = afterColon.match(/^(\d{4})\s+(.+?)\s+\|/);
            if (simpleMatch) {
              const year = simpleMatch[1];
              const makeModelPart = simpleMatch[2].trim();
              
              console.log('  Year:', year);
              console.log('  Make+Model part (before |):', JSON.stringify(makeModelPart));
              
              // Now parse this using the manufacturer list
              const simpleParsed = parseMakeModel(makeModelPart);
              console.log('  🎯 SIMPLE RESULT - Make:', JSON.stringify(simpleParsed.make), 'Model:', JSON.stringify(simpleParsed.model));
            } else {
              console.log('  ❌ Simple pattern did not match');
            }
          }
          break;
        }
      }
      
    } catch (error) {
      console.log('❌ Error processing', file, ':', error.message);
    }
  }
}

testModelExtractionIssue().catch(console.error);