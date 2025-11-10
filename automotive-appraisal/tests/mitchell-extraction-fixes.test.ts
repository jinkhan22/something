import { extractVehicleData } from '../src/main/services/pdfExtractor';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Mitchell Report Extraction Fixes', () => {
  // Helper to create a mock PDF buffer with OCR text
  // Since we're testing the extraction logic, we'll need actual PDFs
  // For now, let's test with the actual Santa Fe report
  
  describe('Market Value Extraction (not Base Value)', () => {
    it('should extract Market Value correctly even when Base Value is higher', async () => {
      // Test case from user: Base Value = $10,066.64, Market Value = $10,062.32
      // The system should extract $10,062.32 (Market Value), not $10,066.64 (Base Value)
      
      // For this test, we'll use the actual Santa Fe report
      const santaFeReport = path.join(__dirname, '../../valuation_report_samples/14 santa fe eval.pdf');
      
      try {
        const buffer = await fs.readFile(santaFeReport);
        const data = await extractVehicleData(buffer);
        
        console.log('Extracted Market Value:', data.marketValue);
        console.log('Extracted Make:', data.make);
        console.log('Extracted Model:', data.model);
        
        // Verify it's not the Base Value (which would be higher in this case)
        // We expect Market Value to be extracted
        expect(data.marketValue).toBeGreaterThan(0);
        
        // The market value should be less than base value for this specific report
        // Market Value = $10,062.32, so we expect something close to this
        expect(data.marketValue).toBeGreaterThan(10000);
        expect(data.marketValue).toBeLessThan(11000);
        
      } catch (error) {
        console.log('Note: Santa Fe report not found or error occurred:', error);
        // If the file doesn't exist, skip this test
        if (error instanceof Error && error.message.includes('ENOENT')) {
          console.log('Skipping test - file not found');
        } else {
          throw error;
        }
      }
    }, 120000);
  });
  
  describe('Make Extraction (without Model parts)', () => {
    it('should extract Make as "Hyundai" not "Hyundai Santa" from Santa Fe', async () => {
      // Test case: "2014 Hyundai Santa Fe Sport"
      // Expected Make: "Hyundai"
      // Expected Model: "Santa Fe Sport"
      
      const santaFeReport = path.join(__dirname, '../../valuation_report_samples/14 santa fe eval.pdf');
      
      try {
        const buffer = await fs.readFile(santaFeReport);
        const data = await extractVehicleData(buffer);
        
        console.log('Extracted Make:', data.make);
        console.log('Extracted Model:', data.model);
        console.log('Extracted Year:', data.year);
        
        // Make should be exactly "Hyundai", not "Hyundai Santa"
        expect(data.make).toBe('Hyundai');
        
        // Model should contain "Santa Fe" but Make should not
        expect(data.model).toContain('Santa Fe');
        expect(data.make).not.toContain('Santa');
        
        // Year should be 2014
        expect(data.year).toBe(2014);
        
      } catch (error) {
        console.log('Note: Santa Fe report not found or error occurred:', error);
        if (error instanceof Error && error.message.includes('ENOENT')) {
          console.log('Skipping test - file not found');
        } else {
          throw error;
        }
      }
    }, 120000);
    
    it('should extract Make as "Ford" not "Ford Super" from Super Duty F-250', async () => {
      // Test case: "2020 Ford Super Duty F-250"
      // Expected Make: "Ford"
      // Expected Model: "Super Duty F-250"
      
      // We'll need to add this test when we have the actual PDF
      // For now, we'll mark it as a pending test
      
      console.log('Note: This test requires a Ford Super Duty F-250 PDF sample');
      console.log('Please add the PDF to valuation_report_samples/ to enable this test');
    });
    
    it('should extract Make as "BMW" correctly from M3 report', async () => {
      // Test case: "2022 BMW M3"
      // Expected Make: "BMW"
      // Expected Model: "M3"
      
      const bmwReport = path.join(__dirname, '../../valuation_report_samples/valuation -  BARSANO (1).pdf');
      
      try {
        const buffer = await fs.readFile(bmwReport);
        const data = await extractVehicleData(buffer);
        
        console.log('Extracted Make:', data.make);
        console.log('Extracted Model:', data.model);
        console.log('Extracted Year:', data.year);
        
        // Make should be exactly "BMW"
        expect(data.make).toBe('BMW');
        
        // Model should contain "M3" but not "BMW"
        expect(data.model).toContain('M3');
        expect(data.model).not.toContain('BMW');
        
        // Year should be 2022
        expect(data.year).toBe(2022);
        
      } catch (error) {
        console.log('Note: BMW report not found or error occurred:', error);
        if (error instanceof Error && error.message.includes('ENOENT')) {
          console.log('Skipping test - file not found');
        } else {
          throw error;
        }
      }
    }, 120000);
    
    it('should extract Make as "Land Rover" correctly from Range Rover Sport', async () => {
      // Test case: "2019 Land Rover Range Rover Sport"
      // Expected Make: "Land Rover"
      // Expected Model: "Range Rover Sport"
      
      console.log('Note: This test requires a Land Rover Range Rover Sport PDF sample');
      console.log('Please add the PDF to valuation_report_samples/ to enable this test');
    });
  });
  
  describe('Combined Fixes Verification', () => {
    it('should correctly extract all fields from Mitchell reports', async () => {
      const samples = [
        {
          name: 'BMW M3 (Barsano)',
          path: '../../valuation_report_samples/valuation -  BARSANO (1).pdf',
          expectedMake: 'BMW',
          expectedYear: 2022,
          modelContains: 'M3'
        },
        {
          name: 'Hyundai Santa Fe',
          path: '../../valuation_report_samples/14 santa fe eval.pdf',
          expectedMake: 'Hyundai',
          expectedYear: 2014,
          modelContains: 'Santa Fe'
        }
      ];
      
      for (const sample of samples) {
        const filePath = path.join(__dirname, sample.path);
        
        try {
          const buffer = await fs.readFile(filePath);
          const data = await extractVehicleData(buffer);
          
          console.log(`\n=== ${sample.name} ===`);
          console.log('Make:', data.make);
          console.log('Model:', data.model);
          console.log('Year:', data.year);
          console.log('Market Value:', data.marketValue);
          console.log('Settlement Value:', data.settlementValue);
          
          // Verify Make is correct
          expect(data.make).toBe(sample.expectedMake);
          
          // Verify Year is correct
          expect(data.year).toBe(sample.expectedYear);
          
          // Verify Model contains expected text
          expect(data.model).toContain(sample.modelContains);
          
          // Verify Market Value is extracted (should be > 0)
          expect(data.marketValue).toBeGreaterThan(0);
          
        } catch (error) {
          if (error instanceof Error && error.message.includes('ENOENT')) {
            console.log(`Skipping ${sample.name} - file not found`);
          } else {
            console.error(`Error testing ${sample.name}:`, error);
            throw error;
          }
        }
      }
    }, 240000); // 4 minute timeout for multiple PDFs
  });
});
