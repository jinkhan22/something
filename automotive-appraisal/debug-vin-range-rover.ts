// Debug VIN extraction for Range Rover report

const text = `Vehicle Valuation Report
Prepared For Progressive Group of Insurance Companies (800) 321-9843
Claim Information
Claim Number Policy Number Loss Type Owner
25-663175275-01 COLLISION SEBASTIAO FERREIRA 705
GALLERIA DR WILLIAMSTOWN, NJ
08094 +1-862-2358320
Loss Date Reported Date Valuation Report Date Valuation Report ID Version Number
05/16/2025 05/17/2025 05/23/2025 1021571494 2
Vehicle Information
Year Make Model Location Mileage
2019 Land Rover Range Rover Sport Dynamic 4 ~~ NJ 08094 43,008 miles
Door Utility 115" WB 5.0L 8 Cyl
Gas Supercharged A 4WD
Ext Color License VIN Title History
Fuji White SALWR2REOKA836519 Yes`;

const lines = text.split('\n');
const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;

console.log('Looking for "Ext Color" line...\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/ext\s+color|exterior\s+color/i)) {
    console.log(`✓ Found "Ext Color" at line ${i}: "${line}"`);
    console.log('\nChecking next 5 lines for VIN:');
    
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const checkLine = lines[j];
      const vinMatch = checkLine.match(vinPattern);
      console.log(`  Line ${j}: "${checkLine}"`);
      if (vinMatch) {
        console.log(`    ✓ VIN FOUND: ${vinMatch[0]}`);
      } else {
        console.log(`    ✗ No VIN match`);
      }
    }
    break;
  }
}

// Also check what the full VIN line looks like
console.log('\n' + '='.repeat(80));
console.log('Full text search for VIN pattern:');
const allMatches = text.match(new RegExp(vinPattern.source, 'g'));
if (allMatches) {
  console.log(`Found ${allMatches.length} VIN(s): ${allMatches.join(', ')}`);
} else {
  console.log('No VINs found!');
}

// Check line by line
console.log('\nLine-by-line search:');
lines.forEach((line, idx) => {
  const vinMatch = line.match(vinPattern);
  if (vinMatch) {
    console.log(`Line ${idx}: "${line}" → VIN: ${vinMatch[0]}`);
  }
});
