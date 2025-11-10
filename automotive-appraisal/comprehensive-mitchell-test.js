const pdfParse = require('pdf-parse');
const fs = require('fs');

async function comprehensiveMitchellTest() {
  console.log('🔍 Comprehensive Mitchell Report Analysis\n');
  
  const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
  
  for (const file of files) {
    console.log(`\n📄 ===== ANALYZING: ${file} =====`);
    
    try {
      const buffer = fs.readFileSync(file);
      const data = await pdfParse(buffer);
      const text = data.text;
      const lines = text.split('\n');
      
      // Determine report type
      const isCCC = text.includes('CCC ONE') || text.includes('CCC One') || 
                   text.includes('CCC Information Services') || text.includes('CCC Valuations');
      const isMitchell = text.includes('Mitchell') || text.includes('MITCHELL');
      
      console.log('📊 Report Type Detection:');
      console.log(`  CCC Indicators: ${isCCC}`);
      console.log(`  Mitchell Indicators: ${isMitchell}`);
      
      if (isCCC) {
        console.log('  🏷️  IDENTIFIED AS: CCC Report');
        console.log('  ⏭️  Skipping CCC report...');
        continue;
      }
      
      if (!isMitchell) {
        console.log('  ❓ Unknown report type, testing as potential Mitchell...');
      } else {
        console.log('  🏷️  IDENTIFIED AS: Mitchell Report');
      }
      
      // Look for Loss Vehicle patterns
      console.log('\n🔎 Looking for Loss Vehicle patterns...');
      let foundVehicleInfo = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for the specific pattern you mentioned
        if (line.toLowerCase().includes('loss vehicle:')) {
          console.log(`  📍 Found at line ${i + 1}: ${JSON.stringify(line)}`);
          
          const afterColon = line.split(':')[1]?.trim();
          if (afterColon && afterColon.length > 10) {
            console.log(`  📝 After colon: ${JSON.stringify(afterColon)}`);
            
            // Test your simple pattern: Year Make Model | ...
            const simpleMatch = afterColon.match(/^(\d{4})\s+(.+?)\s*\|/);
            if (simpleMatch) {
              const year = simpleMatch[1];
              const makeModelPart = simpleMatch[2].trim();
              
              console.log(`  ✅ EXTRACTED - Year: ${year}, Make+Model: "${makeModelPart}"`);
              
              // Now test manufacturer parsing
              const manufacturers = ['Hyundai', 'Toyota', 'Ford', 'BMW', 'Mercedes', 'Volvo', 'Honda', 'Nissan', 'Chevrolet', 'Dodge', 'Jeep', 'GMC', 'Audi', 'Lexus', 'Infiniti', 'Acura', 'Subaru', 'Mazda', 'Kia', 'Volkswagen', 'Porsche', 'Jaguar', 'Land Rover', 'Range Rover', 'Cadillac', 'Buick', 'Lincoln'];
              
              let foundMake = '';
              let model = '';
              
              for (const make of manufacturers) {
                if (makeModelPart.toLowerCase().startsWith(make.toLowerCase())) {
                  foundMake = make;
                  model = makeModelPart.substring(make.length).trim();
                  break;
                }
              }
              
              if (foundMake) {
                console.log(`  🎯 PARSED - Make: "${foundMake}", Model: "${model}"`);
                foundVehicleInfo = true;
              } else {
                console.log(`  ⚠️  Could not identify manufacturer in "${makeModelPart}"`);
              }
            } else {
              console.log(`  ❌ Simple pattern didn't match`);
            }
          }
          break; // Only check first occurrence
        }
      }
      
      if (!foundVehicleInfo) {
        console.log('  ❌ No valid vehicle info found in this file');
        
        // Let's see if there are any loss vehicle lines at all
        const lossVehicleLines = lines.filter(line => 
          line.toLowerCase().includes('loss vehicle')
        ).slice(0, 3); // Show first 3
        
        if (lossVehicleLines.length > 0) {
          console.log('  📋 Found these loss vehicle related lines:');
          lossVehicleLines.forEach(line => {
            console.log(`    ${JSON.stringify(line.trim())}`);
          });
        }
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${file}: ${error.message}`);
    }
  }
}

comprehensiveMitchellTest().catch(console.error);