// Test the mileage line skipping logic

function testMileageSkipping() {
  const testLines = [
    '111,893 miles',        // Should be skipped
    '25,000 miles',         // Should be skipped  
    'Mileage',             // Should be skipped
    't Corolla S Plus 4 Door Sedan 1.8L',  // Should be skipped (single letter)
    'oyota Corolla | S Plus 4 Door Sedan', // Should be processed
    'JOA2182, Ohio, Exp, 03/2026',         // Should be skipped (mostly non-alpha)
    'Title History'        // Should be processed
  ];
  
  console.log('Testing line skipping logic:');
  console.log('=' .repeat(60));
  
  testLines.forEach((line, index) => {
    console.log(`${index + 1}. "${line}"`);
    
    // Test each skip condition
    const isEmpty = !line || line.length < 3;
    const isNumbersOnly = /^[\d\s\-_]+$/.test(line);
    const isMileageWord = line === 'Mileage';
    const isMileageLine = /\d+[,\d]*\s+miles/i.test(line);
    const isSingleLetter = /^[a-zA-Z]\s+/.test(line);
    const isMostlyNumbers = /^[\d\s,\-_().]+$/.test(line);
    
    const shouldSkip = isEmpty || isNumbersOnly || isMileageWord || isMileageLine || isSingleLetter || isMostlyNumbers;
    
    console.log(`   Empty/short: ${isEmpty}`);
    console.log(`   Numbers only: ${isNumbersOnly}`);
    console.log(`   "Mileage" word: ${isMileageWord}`);
    console.log(`   Mileage line: ${isMileageLine}`);
    console.log(`   Single letter: ${isSingleLetter}`);
    console.log(`   Mostly numbers: ${isMostlyNumbers}`);
    console.log(`   → ${shouldSkip ? '❌ SKIP' : '✅ PROCESS'}`);
    console.log('');
  });
}

testMileageSkipping();