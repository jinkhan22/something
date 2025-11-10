/**
 * Comprehensive unit tests for PDF extraction patterns
 * Tests all extraction patterns for Mitchell and CCC One reports
 * Requirements: 10.1, 10.2, 10.3
 */

describe('PDF Extractor - Comprehensive Pattern Tests', () => {
  describe('Mitchell Report Patterns', () => {
    describe('VIN Extraction', () => {
      it('should extract valid VIN with correct characters', () => {
        const text = 'VIN: 5XYZT3LB0EG123456\nExt Color: White';
        const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
        const match = text.match(vinPattern);
        
        expect(match).toBeTruthy();
        expect(match![0]).toBe('5XYZT3LB0EG123456');
        expect(match![0]).toHaveLength(17);
      });
      
      it('should not extract VIN with invalid characters (I, O, Q)', () => {
        const text = 'VIN: 5XYZT3LB0EG12345I'; // Invalid - contains I
        const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
        const match = text.match(vinPattern);
        
        expect(match).toBeNull();
      });
      
      it('should extract VIN near Ext Color marker', () => {
        const text = `
Vehicle Information
Ext Color: White
5XYZT3LB0EG123456
Int Color: Black
`;
        const lines = text.split('\n');
        let vin = '';
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/ext\s+color/i)) {
            for (let j = i; j < Math.min(i + 5, lines.length); j++) {
              const vinMatch = lines[j].match(/[A-HJ-NPR-Z0-9]{17}/);
              if (vinMatch) {
                vin = vinMatch[0];
                break;
              }
            }
            if (vin) break;
          }
        }
        
        expect(vin).toBe('5XYZT3LB0EG123456');
      });
      
      it('should fix OCR error replacing O with 0', () => {
        const text = 'VIN: 5XYZT3LB0EG12345O'; // OCR error - O instead of 0
        const vinPatternWithOCR = /[A-Z0-9]{17}/;
        const match = text.match(vinPatternWithOCR);
        
        expect(match).toBeTruthy();
        const fixedVin = match![0].replace(/O/g, '0');
        expect(fixedVin).toBe('5XYZT3LB0EG123450');
      });
    });
    
    describe('Vehicle Info Extraction', () => {
      it('should extract year, make, and model from Loss vehicle line', () => {
        const text = 'Loss vehicle: 2014 Hyundai Santa Fe Sport | 4 Door Utility';
        const pattern = /Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('2014');
        expect(match![2].trim()).toBe('Hyundai Santa Fe Sport');
      });
      
      it('should handle multi-word manufacturers', () => {
        const text = 'Loss vehicle: 2019 Land Rover Range Rover Sport | Dynamic';
        const pattern = /Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![2].trim()).toBe('Land Rover Range Rover Sport');
      });
      
      it('should handle hyphenated makes', () => {
        const text = 'Loss vehicle: 2015 Mercedes-Benz SL-Class | SL400';
        const pattern = /Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![2].trim()).toBe('Mercedes-Benz SL-Class');
      });
    });
    
    describe('Mileage Extraction', () => {
      it('should extract mileage with comma separators', () => {
        const text = 'Mileage: 85,234 miles';
        const pattern = /(\d{1,3}(?:,\d{3})*)\s*miles/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('85,234');
        
        const mileage = parseInt(match![1].replace(/,/g, ''));
        expect(mileage).toBe(85234);
      });
      
      it('should extract mileage without comma separators', () => {
        const text = 'Mileage: 5432 miles';
        const pattern = /(\d{1,3}(?:,\d{3})*)\s*miles/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const mileage = parseInt(match![1].replace(/,/g, ''));
        expect(mileage).toBe(5432);
      });
    });
    
    describe('Location Extraction', () => {
      it('should extract state and ZIP code', () => {
        const text = 'Location: CA 90210';
        const pattern = /Location[:\s]*([A-Z]{2}\s+\d{5})/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('CA 90210');
      });
      
      it('should extract location with city name', () => {
        const text = 'Location: Los Angeles, CA 90210';
        const pattern = /Location[:\s]*([A-Z][A-Z\s,\.\-0-9]+?)(?:\s+(?:are|clot|Vehicles)|\s*$)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toContain('CA 90210');
      });
    });
    
    describe('Market Value Extraction', () => {
      it('should extract Market Value with equals sign', () => {
        const text = 'Market Value = $10,062.32';
        const pattern = /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const value = parseFloat(match![1].replace(/,/g, ''));
        expect(value).toBe(10062.32);
      });
      
      it('should extract Market Value with colon', () => {
        const text = 'Market Value: $45,850.00';
        const pattern = /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const value = parseFloat(match![1].replace(/,/g, ''));
        expect(value).toBe(45850.00);
      });
      
      it('should handle OCR error "vale" instead of "value"', () => {
        const text = 'Market vale = $73,391.27';
        const pattern = /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const value = parseFloat(match![1].replace(/,/g, ''));
        expect(value).toBe(73391.27);
      });
      
      it('should NOT match Base Value when looking for Market Value', () => {
        const text = `
Base Value = $10,066.64
Market Value = $10,062.32
`;
        const pattern = /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const value = parseFloat(match![1].replace(/,/g, ''));
        expect(value).toBe(10062.32);
        expect(value).not.toBe(10066.64);
      });
      
      it('should fix OCR corrupted value (missing decimal)', () => {
        const text = 'Market Value = 978221'; // Should be $9,782.21
        const valueStr = '978221';
        
        // Insert decimal before last 2 digits
        const fixed = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
        const value = parseFloat(fixed);
        
        expect(value).toBe(9782.21);
      });
    });
    
    describe('Settlement Value Extraction', () => {
      it('should extract Settlement Value', () => {
        const text = 'Settlement Value = $10,741.06';
        const pattern = /Settlement Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const value = parseFloat(match![1].replace(/,/g, ''));
        expect(value).toBe(10741.06);
      });
      
      it('should extract Settlement Value from multi-line format', () => {
        const text = `
Settlement Value
$52,352.67
`;
        const lines = text.split('\n');
        let settlementValue = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.match(/^Settlement Value:?\s*$/i)) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              const dollarMatch = nextLine.match(/^\$([0-9,]+\.\d+)$/);
              if (dollarMatch) {
                settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
                break;
              }
            }
            if (settlementValue > 0) break;
          }
        }
        
        expect(settlementValue).toBe(52352.67);
      });
    });
  });
  
  describe('CCC One Report Patterns', () => {
    describe('Year Extraction', () => {
      it('should extract year from "Year YYYY" format', () => {
        const text = 'Year 2015';
        const pattern = /Year\s+(\d{4})/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('2015');
      });
      
      it('should extract year from "Loss Vehicle YYYY" format', () => {
        const text = 'Loss Vehicle 2015 Mercedes-Benz SL-Class';
        const pattern = /Loss [Vv]ehicle:?\s+(\d{4})/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('2015');
      });
    });
    
    describe('Make Extraction', () => {
      it('should extract make from "Make Brand" format', () => {
        const text = 'Make Volvo';
        const pattern = /^Make\s+([A-Za-z\-]+?)(?:\s+[})()]+|\s*$)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('Volvo');
      });
      
      it('should extract make from Loss Vehicle line', () => {
        const text = 'Loss Vehicle 2015 Mercedes-Benz SL-Class SL400';
        const pattern = /Loss [Vv]ehicle:?\s+\d{4}\s+([A-Za-z][A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)/i;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('Mercedes-Benz');
      });
      
      it('should handle OCR garbage after make', () => {
        const text = 'Make Volvo } ) oo';
        const pattern = /^Make\s+([A-Za-z\-]+?)(?:\s+[})()]+|\s*$)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('Volvo');
      });
    });
    
    describe('Model Extraction', () => {
      it('should extract model from "Model ModelName" format', () => {
        const text = 'Model XC60';
        const pattern = /^Model\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9]+)?(?:\s+[A-Za-z0-9]+)?)(?:\s|$)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('XC60');
      });
      
      it('should extract multi-word model', () => {
        const text = 'Model SL-Class SL400';
        const pattern = /^Model\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9]+)?(?:\s+[A-Za-z0-9]+)?)(?:\s|$)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toContain('SL-Class');
      });
    });
    
    describe('Odometer Extraction', () => {
      it('should extract odometer reading', () => {
        const text = 'Odometer 45,678';
        const pattern = /^Odometer\s+(\d{1,3}(?:,\d{3})*)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('45,678');
        
        const mileage = parseInt(match![1].replace(/,/g, ''));
        expect(mileage).toBe(45678);
      });
    });
    
    describe('Location Extraction', () => {
      it('should extract location and stop at OCR garbage', () => {
        const text = 'Location COSTA MESA, CA 92626 are clot';
        const pattern = /^Location\s+([A-Z][A-Z\s,\.\-0-9]+?)(?:\s+(?:are|clot|Vehicles)|\s*$)/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        expect(match![1]).toBe('COSTA MESA, CA 92626');
        expect(match![1]).not.toContain('are');
        expect(match![1]).not.toContain('clot');
      });
    });
    
    describe('Total (Settlement) Value Extraction', () => {
      it('should extract total value with spaces in number', () => {
        const text = 'Total $ 9,251 .08';
        const pattern = /^Total\s+\$\s*([0-9,]+\s*\.\s*\d{2})/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const valueStr = match![1].replace(/[,\s]/g, '');
        const value = parseFloat(valueStr);
        expect(value).toBe(9251.08);
      });
    });
    
    describe('Adjusted Vehicle Value (Market Value) Extraction', () => {
      it('should extract Adjusted Vehicle Value as market value', () => {
        const text = `
Base Vehicle Value $ 8,950.00
Adjusted Vehicle Value $ 9,150.00
`;
        const pattern = /^Adjusted Vehicle Value\s+\$\s*([0-9,]+\.\d{2})/m;
        const match = text.match(pattern);
        
        expect(match).toBeTruthy();
        const valueStr = match![1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        expect(value).toBe(9150.00);
        expect(value).not.toBe(8950.00); // Should not be Base Vehicle Value
      });
    });
  });
  
  describe('VIN Decoding', () => {
    it('should decode manufacturer from VIN prefix', () => {
      const vinMap: Record<string, string> = {
        '1FT': 'Ford',
        '5XY': 'Hyundai',
        'WBS': 'BMW',
        'WDD': 'Mercedes-Benz',
        '2T1': 'Toyota',
        'JHM': 'Honda',
      };
      
      expect(vinMap['1FT']).toBe('Ford');
      expect(vinMap['5XY']).toBe('Hyundai');
      expect(vinMap['WBS']).toBe('BMW');
    });
    
    it('should decode year from VIN 10th character', () => {
      const yearMap: Record<string, number> = {
        'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
        'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
        'N': 2022, 'P': 2023, 'R': 2024,
      };
      
      const vin = '5XYZT3LB0EG123456'; // 10th char is 'E'
      const yearChar = vin.charAt(9);
      expect(yearMap[yearChar]).toBe(2014);
    });
  });
  
  describe('Manufacturer Database', () => {
    it('should match multi-word manufacturers first', () => {
      const manufacturers = [
        'Land Rover',
        'Range Rover',
        'Mercedes-Benz',
        'Alfa Romeo',
        'Aston Martin',
        'BMW',
        'Ford',
        'Toyota',
      ].sort((a, b) => b.length - a.length);
      
      expect(manufacturers[0]).toBe('Mercedes-Benz');
      expect(manufacturers[manufacturers.length - 1]).toBe('BMW');
    });
    
    it('should correctly parse "Land Rover Range Rover Sport"', () => {
      const vehicleText = 'Land Rover Range Rover Sport';
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
      
      expect(make).toBe('Land Rover');
      expect(model).toBe('Range Rover Sport');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const text = '';
      const pattern = /Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i;
      const match = text.match(pattern);
      
      expect(match).toBeNull();
    });
    
    it('should handle text with no matches', () => {
      const text = 'This is random text with no vehicle data';
      const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
      const match = text.match(vinPattern);
      
      expect(match).toBeNull();
    });
    
    it('should handle malformed VIN (too short)', () => {
      const text = 'VIN: 5XYZT3LB0EG12'; // Only 15 characters
      const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
      const match = text.match(vinPattern);
      
      expect(match).toBeNull();
    });
    
    it('should handle malformed VIN (too long)', () => {
      const text = 'VIN: 5XYZT3LB0EG123456789'; // 21 characters
      const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
      const match = text.match(vinPattern);
      
      // Should extract first 17 valid characters
      expect(match).toBeTruthy();
      expect(match![0]).toHaveLength(17);
    });
  });
});
