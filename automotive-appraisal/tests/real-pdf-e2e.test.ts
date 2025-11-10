/**
 * Real PDF End-to-End Integration Tests
 * Tests complete workflow with actual PDF samples from valuation_report_samples
 * Validates extraction accuracy, error handling, and complete user workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractVehicleData } from '../src/main/services/pdfExtractor';

// Test timeout for OCR processing
jest.setTimeout(120000); // 2 minutes per test

describe('Real PDF End-to-End Integration Tests', () => {
  const samplesDir = path.join(__dirname, '../../valuation_report_samples');
  
  // Helper to load PDF file
  const loadPDF = (filename: string): Buffer => {
    const filePath = path.join(samplesDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  };

  describe('CCC One Report Extraction', () => {
    test('should extract data from Allstate CCC Valuation XC60 Volvo 2015', async () => {
      const buffer = loadPDF('Allstate CCC Valuation XC60 Volvo 2015.pdf');
      
      const result = await extractVehicleData(buffer);
      
      // Verify basic extraction
      expect(result).toBeDefined();
      expect(result.reportType).toBe('CCC_ONE');
      
      // Verify vehicle data
      expect(result.year).toBe(2015);
      expect(result.make).toBe('Volvo');
      expect(result.model).toContain('XC60');
      
      // Verify VIN format
      if (result.vin) {
        expect(result.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      }
      
      // Verify confidence scoring
      expect(result.extractionConfidence).toBeGreaterThan(0);
      expect(result.extractionConfidence).toBeLessThanOrEqual(1);
      
      // Verify market value extracted
      expect(result.marketValue).toBeGreaterThan(0);
      
      console.log('CCC XC60 Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from State Farm Valuation Report', async () => {
      const buffer = loadPDF('State-Farm-Valuation-Report.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.year).toBeLessThan(2030);
      expect(result.make).toBeTruthy();
      expect(result.model).toBeTruthy();
      
      // Verify extraction confidence
      expect(result.extractionConfidence).toBeGreaterThan(0.5);
      
      console.log('State Farm Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from CCC valuation report 25-439600069', async () => {
      const buffer = loadPDF('25-439600069-ValuationReport.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.reportType).toBe('CCC_ONE');
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      
      console.log('CCC 25-439600069 Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from CCC valuation report 25-679137965', async () => {
      const buffer = loadPDF('25-679137965_8-7-2025_Total Loss_Valuation.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      expect(result.model).toBeTruthy();
      
      console.log('CCC 25-679137965 Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });
  });

  describe('Mitchell Report Extraction', () => {
    test('should extract data from Santa Fe evaluation report', async () => {
      const buffer = loadPDF('14 santa fe eval.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.reportType).toBe('MITCHELL');
      
      // Verify vehicle data
      expect(result.year).toBe(2014);
      expect(result.make).toBe('Hyundai');
      expect(result.model).toContain('Santa Fe');
      
      // Verify VIN
      if (result.vin) {
        expect(result.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      }
      
      // Verify values
      expect(result.marketValue).toBeGreaterThan(0);
      
      console.log('Mitchell Santa Fe Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        settlementValue: result.settlementValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from BARSANO valuation report', async () => {
      const buffer = loadPDF('valuation -  BARSANO (1).pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      expect(result.model).toBeTruthy();
      
      console.log('BARSANO Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        settlementValue: result.settlementValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from UDP valuation report', async () => {
      const buffer = loadPDF('udp_6d63933b-9e6a-4859-ad7f-aca4b4ed04d2.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      
      console.log('UDP Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });
  });

  describe('Various Report Formats', () => {
    test('should extract data from VR-1 Vehicle Evaluation report', async () => {
      const buffer = loadPDF('VR-1-VEHICLE EVALUATION_1_08142025.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      
      console.log('VR-1 Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from Vehicle Assessment Valuation', async () => {
      const buffer = loadPDF('Vehicle Assessment Valuation (3)_1955639487883.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      
      console.log('Vehicle Assessment Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });

    test('should extract data from TL Valuation report', async () => {
      const buffer = loadPDF('TL Valuation.pdf');
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.year).toBeGreaterThan(1990);
      expect(result.make).toBeTruthy();
      
      console.log('TL Valuation Extraction:', {
        vin: result.vin,
        vehicle: `${result.year} ${result.make} ${result.model}`,
        marketValue: result.marketValue,
        confidence: result.extractionConfidence,
      });
    });
  });

  describe('Data Extraction Accuracy Validation', () => {
    test('should extract VINs in correct format', async () => {
      const testFiles = [
        'Allstate CCC Valuation XC60 Volvo 2015.pdf',
        '14 santa fe eval.pdf',
        'State-Farm-Valuation-Report.pdf',
      ];

      for (const filename of testFiles) {
        const buffer = loadPDF(filename);
        const result = await extractVehicleData(buffer);
        
        if (result.vin) {
          // VIN should be 17 characters
          expect(result.vin.length).toBe(17);
          
          // VIN should not contain I, O, or Q
          expect(result.vin).not.toMatch(/[IOQ]/);
          
          // VIN should be alphanumeric
          expect(result.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
        }
      }
    });

    test('should extract years within valid range', async () => {
      const testFiles = [
        'Allstate CCC Valuation XC60 Volvo 2015.pdf',
        '14 santa fe eval.pdf',
        'State-Farm-Valuation-Report.pdf',
        'TL Valuation.pdf',
      ];

      for (const filename of testFiles) {
        const buffer = loadPDF(filename);
        const result = await extractVehicleData(buffer);
        
        expect(result.year).toBeGreaterThanOrEqual(1980);
        expect(result.year).toBeLessThanOrEqual(new Date().getFullYear() + 1);
      }
    });

    test('should extract market values as positive numbers', async () => {
      const testFiles = [
        'Allstate CCC Valuation XC60 Volvo 2015.pdf',
        '14 santa fe eval.pdf',
        'State-Farm-Valuation-Report.pdf',
      ];

      for (const filename of testFiles) {
        const buffer = loadPDF(filename);
        const result = await extractVehicleData(buffer);
        
        if (result.marketValue !== undefined) {
          expect(result.marketValue).toBeGreaterThan(0);
          expect(result.marketValue).toBeLessThan(1000000); // Reasonable upper limit
        }
      }
    });

    test('should provide confidence scores for all extractions', async () => {
      const testFiles = [
        'Allstate CCC Valuation XC60 Volvo 2015.pdf',
        '14 santa fe eval.pdf',
      ];

      for (const filename of testFiles) {
        const buffer = loadPDF(filename);
        const result = await extractVehicleData(buffer);
        
        expect(result.extractionConfidence).toBeDefined();
        expect(result.extractionConfidence).toBeGreaterThan(0);
        expect(result.extractionConfidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Error Handling with Invalid Files', () => {
    test('should handle corrupted PDF gracefully', async () => {
      const corruptedBuffer = Buffer.from('This is not a valid PDF file');
      
      await expect(extractVehicleData(corruptedBuffer)).rejects.toThrow();
    });

    test('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.from('');
      
      await expect(extractVehicleData(emptyBuffer)).rejects.toThrow();
    });

    test('should provide extraction errors when data is incomplete', async () => {
      // Test with a file that might have partial data
      const buffer = loadPDF('pdfprint.do.pdf');
      
      const result = await extractVehicleData(buffer);
      
      // Should still return a result, but may have errors
      expect(result).toBeDefined();
      expect(result.extractionErrors).toBeDefined();
      expect(Array.isArray(result.extractionErrors)).toBe(true);
    });
  });

  describe('Complete User Workflow Validation', () => {
    test('should complete full workflow: upload -> extract -> validate', async () => {
      const buffer = loadPDF('Allstate CCC Valuation XC60 Volvo 2015.pdf');
      
      // Step 1: Extract data
      const extractedData = await extractVehicleData(buffer);
      expect(extractedData).toBeDefined();
      
      // Step 2: Validate extracted data
      expect(extractedData.year).toBeTruthy();
      expect(extractedData.make).toBeTruthy();
      expect(extractedData.model).toBeTruthy();
      
      // Step 3: Verify data is ready for storage
      const dataForStorage = {
        id: `appraisal-${Date.now()}`,
        createdAt: new Date(),
        status: 'draft' as const,
        data: extractedData,
      };
      
      expect(dataForStorage.id).toBeTruthy();
      expect(dataForStorage.data).toEqual(extractedData);
      
      console.log('Complete workflow validated for:', {
        vehicle: `${extractedData.year} ${extractedData.make} ${extractedData.model}`,
        confidence: extractedData.extractionConfidence,
      });
    });

    test('should handle multiple PDFs in sequence', async () => {
      const files = [
        'Allstate CCC Valuation XC60 Volvo 2015.pdf',
        '14 santa fe eval.pdf',
      ];
      
      const results = [];
      
      for (const filename of files) {
        const buffer = loadPDF(filename);
        const result = await extractVehicleData(buffer);
        results.push(result);
      }
      
      expect(results).toHaveLength(2);
      expect(results[0].reportType).toBe('CCC_ONE');
      expect(results[1].reportType).toBe('MITCHELL');
      
      // Verify each has unique data
      expect(results[0].year).not.toBe(results[1].year);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should process PDF within reasonable time', async () => {
      const buffer = loadPDF('State-Farm-Valuation-Report.pdf');
      
      const startTime = Date.now();
      await extractVehicleData(buffer);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      // Should complete within 60 seconds
      expect(processingTime).toBeLessThan(60000);
      
      console.log(`Processing time: ${processingTime}ms`);
    });

    test('should handle large PDF files', async () => {
      const buffer = loadPDF('Allstate CCC Valuation XC60 Volvo 2015.pdf');
      const fileSize = buffer.length;
      
      console.log(`File size: ${(fileSize / 1024).toFixed(2)} KB`);
      
      const result = await extractVehicleData(buffer);
      
      expect(result).toBeDefined();
      expect(result.extractionConfidence).toBeGreaterThan(0);
    });
  });
});
