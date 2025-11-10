// Test specific OCR pattern for the failing case
const testText = `i l : ord Super Duty F-250 | XLT 4 Door Crew Cab 7 Foot Bed | 6.7L 8 Cyl Diesel Turbocharged A 4WD© 2025 Mitchell International, Inc. All Rights Reserved. Claim # 25-679137965-01 | Page 2`;

console.log('🧪 Testing OCR Pattern Recognition');
console.log('Test text:', JSON.stringify(testText));

// Current patterns
const patterns = [
  /(?:i\s+l|oss\s+vehicle|Loss\s+ehicle|oss\s+ehicle):\s*(\d{4})\s+(.+?)\s*\|/im,
  /(?:i\s+l|oss\s+vehicle):\s*(.+?)\s*\|\s*.+?\|\s*(.+?)(?:\s*\||$)/im
];

console.log('\n🔍 Testing existing patterns...');
patterns.forEach((pattern, index) => {
  const match = testText.match(pattern);
  if (match) {
    console.log(`✅ Pattern ${index + 1} matched:`);
    console.log('  Full match:', JSON.stringify(match[0]));
    console.log('  Group 1:', JSON.stringify(match[1]));
    console.log('  Group 2:', JSON.stringify(match[2]));
  } else {
    console.log(`❌ Pattern ${index + 1} failed`);
  }
});

// Let's try a more specific pattern for this exact case
console.log('\n🎯 Testing specific pattern for OCR corruption...');
const specificPattern = /(?:i\s+l|oss\s+vehicle):\s*(.+?)\s*\|/im;
const specificMatch = testText.match(specificPattern);

if (specificMatch) {
  console.log('✅ Specific pattern matched:');
  console.log('  Full match:', JSON.stringify(specificMatch[0]));
  console.log('  Captured text:', JSON.stringify(specificMatch[1]));
  
  // Now test parsing this
  const capturedText = specificMatch[1].trim();
  console.log('\n🔧 Parsing captured text:', JSON.stringify(capturedText));
  
  // Check if it contains a year
  const yearMatch = capturedText.match(/(\d{4})/);
  if (yearMatch) {
    console.log('  Year found:', yearMatch[1]);
    // Remove year and get make/model
    const withoutYear = capturedText.replace(/\d{4}\s*/, '').trim();
    console.log('  Make+Model:', JSON.stringify(withoutYear));
    
    // Test Ford OCR correction
    if (withoutYear.toLowerCase().startsWith('ord')) {
      const corrected = withoutYear.replace(/^ord\s*/i, 'Ford ');
      console.log('  🔧 OCR corrected:', JSON.stringify(corrected));
    }
  } else {
    console.log('  ❌ No year found in captured text');
  }
} else {
  console.log('❌ Specific pattern failed');
}

// Test a simpler approach - just look for the make/model pattern after any colon
console.log('\n🎲 Testing simpler colon-based approach...');
const colonPattern = /:\s*(.+?)\s*\|/;
const colonMatch = testText.match(colonPattern);

if (colonMatch) {
  console.log('✅ Colon pattern matched:');
  console.log('  Captured:', JSON.stringify(colonMatch[1]));
  
  const fullText = colonMatch[1].trim();
  
  // Extract year
  const yearMatch = fullText.match(/(\d{4})/);
  if (yearMatch) {
    const year = yearMatch[1];
    const makeModel = fullText.replace(/\d{4}\s*/, '').trim();
    
    console.log('  📅 Year:', year);
    console.log('  🚗 Make+Model:', JSON.stringify(makeModel));
    
    // Test Ford correction
    if (makeModel.toLowerCase().startsWith('ord')) {
      const correctedMakeModel = makeModel.replace(/^ord\s*/i, 'Ford ');
      console.log('  🔧 Corrected Make+Model:', JSON.stringify(correctedMakeModel));
    }
  }
}