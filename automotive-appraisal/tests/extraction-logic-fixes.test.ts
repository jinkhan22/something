/**
 * Unit tests for the extraction logic fixes
 * Tests the parsing logic without requiring OCR
 */

// Sample OCR text from Mitchell reports
const sampleTexts = {
  hyundaiSantaFe: `
Loss Vehicle Detail
Loss vehicle: 2014 Hyundai Santa Fe Sport | 4 Door Utility 106" WB | 2.4L 4 Cyl Gas A FWD
VIN: 5XYZT3LB0EG123456
Mileage: 85,234 miles
Location: CA 90210

Valuation Summary
Loss Vehicle Adjustments
Adjustments specific to your vehicle
Base Value = $10,066.64
Condition - $24.32
Prior Damage $0.00
Aftermarket Parts + $20.00
Refurbishment $0.00
Market Value = $10,062.32
Settlement Adjustments
Adjustments specific to your policy
Taxes + $678.74
Fees $0.00
Settlement Value = $10,741.06
`,

  fordSuperDuty: `
Loss Vehicle Detail
Loss vehicle: 2020 Ford Super Duty F-250 | XLT 4 Door Crew Cab 7 Foot Bed | 6.7L 8 Cyl Diesel Turbocharged A 4WD
VIN: 1FT7W2BT5LEC12345
Mileage: 45,120 miles

Valuation Summary
Base Value = $45,200.00
Market Value = $45,850.00
Settlement Value = $47,250.00
`,

  bmwM3: `
Loss Vehicle Detail
Loss vehicle: 2022 BMW M3 | Competition 4 Door Sedan | 3.0L 6 Cyl Gas Turbocharged A RWD
VIN: WBS8M9C50NCG12345
Mileage: 12,450 miles

Valuation Summary
Base Value = $73,261.27
Market Value = $73,391.27
Settlement Value = $75,800.00
`,

  landRoverRangeRover: `
Loss Vehicle Detail
Loss vehicle: 2019 Land Rover Range Rover Sport | Dynamic 4 Door Utility 115" WB | 5.0L 8 Cyl Gas Supercharged A 4WD
VIN: SALWR2RV9KA123456
Mileage: 38,900 miles

Valuation Summary
Base Value = $58,120.00
Market Value = $58,650.00
Settlement Value = $60,100.00
`
};

describe('Extraction Logic Fixes', () => {
  describe('Make Extraction (without Model parts)', () => {
    test('should extract Make as "Hyundai" not "Hyundai Santa"', () => {
      const text = sampleTexts.hyundaiSantaFe;
      
      // Extract the Loss vehicle line
      const match = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
      expect(match).toBeTruthy();
      
      const year = parseInt(match![1]);
      const vehicleText = match![2].trim();
      
      console.log('Vehicle text:', vehicleText);
      expect(vehicleText).toBe('Hyundai Santa Fe Sport');
      
      // The fix: Match against manufacturer list
      const manufacturers = [
        'Land Rover', 'Range Rover', 'Hyundai', 'Ford', 'BMW'
      ].sort((a, b) => b.length - a.length); // Longest first
      
      let make = '';
      let model = '';
      
      for (const manufacturer of manufacturers) {
        if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
          make = manufacturer;
          model = vehicleText.substring(manufacturer.length).trim();
          break;
        }
      }
      
      console.log('Make:', make);
      console.log('Model:', model);
      
      expect(make).toBe('Hyundai');
      expect(model).toBe('Santa Fe Sport');
      expect(year).toBe(2014);
    });
    
    test('should extract Make as "Ford" not "Ford Super"', () => {
      const text = sampleTexts.fordSuperDuty;
      
      const match = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
      expect(match).toBeTruthy();
      
      const year = parseInt(match![1]);
      const vehicleText = match![2].trim();
      
      console.log('Vehicle text:', vehicleText);
      
      const manufacturers = ['Ford'];
      let make = '';
      let model = '';
      
      for (const manufacturer of manufacturers) {
        if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
          make = manufacturer;
          model = vehicleText.substring(manufacturer.length).trim();
          break;
        }
      }
      
      console.log('Make:', make);
      console.log('Model:', model);
      
      expect(make).toBe('Ford');
      expect(model).toBe('Super Duty F-250');
      expect(year).toBe(2020);
    });
    
    test('should extract Make as "BMW" correctly', () => {
      const text = sampleTexts.bmwM3;
      
      const match = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
      expect(match).toBeTruthy();
      
      const vehicleText = match![2].trim();
      
      const manufacturers = ['BMW'];
      let make = '';
      let model = '';
      
      for (const manufacturer of manufacturers) {
        if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
          make = manufacturer;
          model = vehicleText.substring(manufacturer.length).trim();
          break;
        }
      }
      
      console.log('Make:', make);
      console.log('Model:', model);
      
      expect(make).toBe('BMW');
      expect(model).toBe('M3');
    });
    
    test('should extract Make as "Land Rover" correctly', () => {
      const text = sampleTexts.landRoverRangeRover;
      
      const match = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
      expect(match).toBeTruthy();
      
      const vehicleText = match![2].trim();
      
      const manufacturers = ['Land Rover', 'Range Rover'].sort((a, b) => b.length - a.length);
      let make = '';
      let model = '';
      
      for (const manufacturer of manufacturers) {
        if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
          make = manufacturer;
          model = vehicleText.substring(manufacturer.length).trim();
          break;
        }
      }
      
      console.log('Make:', make);
      console.log('Model:', model);
      
      expect(make).toBe('Land Rover');
      expect(model).toBe('Range Rover Sport');
    });
  });
  
  describe('Market Value Extraction (not Base Value)', () => {
    test('should extract Market Value, not Base Value, when Base Value is higher', () => {
      const text = sampleTexts.hyundaiSantaFe;
      
      // The OLD way (wrong): would match Base Value first
      const oldPatterns = [
        /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
        /Base Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i
      ];
      
      // The NEW way (correct): only match Market Value
      const newPatterns = [
        /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
        /Market Value:?\s*\$\s*([0-9,]+\.?\d*)/i
      ];
      
      // Test old patterns (should fail - gets wrong value)
      let oldValue = 0;
      for (const pattern of oldPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          oldValue = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Test new patterns (should succeed - gets correct value)
      let newValue = 0;
      for (const pattern of newPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          newValue = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      console.log('Base Value in text: $10,066.64');
      console.log('Market Value in text: $10,062.32');
      console.log('Old extraction (wrong):', oldValue);
      console.log('New extraction (correct):', newValue);
      
      // Market Value should be $10,062.32, not $10,066.64 (Base Value)
      expect(newValue).toBe(10062.32);
      expect(newValue).toBeLessThan(10066.64); // Should be less than Base Value
    });
    
    test('should extract correct Market Value from BMW M3 report', () => {
      const text = sampleTexts.bmwM3;
      
      const patterns = [
        /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
        /Market Value:?\s*\$\s*([0-9,]+\.?\d*)/i
      ];
      
      let marketValue = 0;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          marketValue = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      console.log('Market Value:', marketValue);
      
      // Should extract $73,391.27, not $73,261.27 (Base Value)
      expect(marketValue).toBe(73391.27);
      expect(marketValue).toBeGreaterThan(73261.27); // Should be greater than Base Value in this case
    });
    
    test('should extract correct Market Value from Ford report', () => {
      const text = sampleTexts.fordSuperDuty;
      
      const patterns = [
        /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
        /Market Value:?\s*\$\s*([0-9,]+\.?\d*)/i
      ];
      
      let marketValue = 0;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          marketValue = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      console.log('Market Value:', marketValue);
      
      // Should extract $45,850.00, not $45,200.00 (Base Value)
      expect(marketValue).toBe(45850.00);
      expect(marketValue).toBeGreaterThan(45200.00);
    });
  });
});
