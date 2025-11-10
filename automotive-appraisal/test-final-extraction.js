// Test the final improved extraction
const testText = `i l : ord Super Duty F-250 | XLT 4 Door Crew Cab 7 Foot Bed | 6.7L 8 Cyl Diesel Turbocharged A 4WD`;

console.log('🧪 Testing Final Improved Extraction');
console.log('Test text:', JSON.stringify(testText));

function extractVehicleInfoWithOCR(text) {
  // Standard pattern
  const standardMatch = text.match(/Loss vehicle:\s*(\d{4})\s+(.+?)\s*\|/im);
  if (standardMatch) {
    return {
      year: parseInt(standardMatch[1]) || 0,
      makeModel: standardMatch[2].trim(),
      method: 'standard'
    };
  }
  
  // OCR patterns
  const ocrPatterns = [
    /(?:i\s+l|oss\s+vehicle|Loss\s+ehicle|oss\s+ehicle):\s*(\d{4})\s+(.+?)\s*\|/im,
    /(?:i\s+l|oss\s+vehicle):\s*(.+?)\s*\|\s*.+?\|\s*(.+?)(?:\s*\||$)/im
  ];
  
  for (const pattern of ocrPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      const potentialYear = parseInt(match[1]);
      if (potentialYear >= 1990 && potentialYear <= 2030) {
        return {
          year: potentialYear,
          makeModel: match[2].trim(),
          method: 'ocr-pattern'
        };
      }
    }
  }
  
  // Fallback: Any colon pattern
  const colonPattern = /:\s*(.+?)\s*\|/;
  const colonMatch = text.match(colonPattern);
  if (colonMatch) {
    const fullText = colonMatch[1].trim();
    console.log('  Colon match found:', JSON.stringify(fullText));
    
    if (fullText.length > 10) {
      const yearMatch = fullText.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1990 && year <= 2030) {
          const makeModel = fullText.replace(/\d{4}\s*/, '').trim();
          if (makeModel.length > 3) {
            return { 
              year, 
              makeModel,
              method: 'colon-fallback'
            };
          }
        }
      }
    }
  }
  
  return null;
}

function parseMakeModelRobust(vehicleText) {
  const cleanText = vehicleText.trim();
  console.log('  🔍 Parsing:', JSON.stringify(cleanText));
  
  // Special handling for OCR corrupted "Ford" -> "ord"
  if (cleanText.toLowerCase().startsWith('ord ')) {
    const make = 'Ford';
    const model = cleanText.replace(/^ord\s*/i, '').trim();
    console.log('  🔧 OCR corrected Ford - Model:', JSON.stringify(model));
    return { make, model };
  }
  
  const manufacturers = [
    'Land Rover', 'Range Rover', 'Ford', 'Toyota', 'Honda', 'BMW',
    'Mercedes', 'Audi', 'Volkswagen', 'Hyundai', 'Volvo', 'Nissan'
  ];
  
  for (const manufacturer of manufacturers) {
    const index = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (index !== -1) {
      const make = manufacturer;
      const afterMake = cleanText.substring(index + manufacturer.length).trim();
      const model = afterMake;
      
      console.log('  ✅ Found manufacturer:', make);
      console.log('  🚗 Model:', JSON.stringify(model));
      
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Fallback
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const model = words.slice(1).join(' ');
    console.log('  ⚠️  Fallback - Make:', make, 'Model:', model);
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

console.log('\n🔧 Testing extraction...');
const result = extractVehicleInfoWithOCR(testText);

if (result) {
  console.log('✅ Extraction successful!');
  console.log('  Year:', result.year);
  console.log('  Make+Model:', JSON.stringify(result.makeModel));
  console.log('  Method:', result.method);
  
  const parsed = parseMakeModelRobust(result.makeModel);
  console.log('\n🎯 Final parsing result:');
  console.log('  Make:', JSON.stringify(parsed.make));
  console.log('  Model:', JSON.stringify(parsed.model));
  
  if (parsed.make === 'Ford' && parsed.model.includes('Super Duty F-250')) {
    console.log('\n🎉 SUCCESS! Correctly extracted Ford Super Duty F-250 from OCR corruption!');
  }
} else {
  console.log('❌ Extraction failed');
}