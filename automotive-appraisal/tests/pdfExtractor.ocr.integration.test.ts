import { extractVehicleData } from '../src/main/services/pdfExtractor';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PDF Extractor Integration Tests with Tesseract OCR', () => {
  const samplesDir = path.join(__dirname, '../../valuation_report_samples');
  
  // Expected data for each sample file
  const expectedData: Record<string, {
    year: number;
    make: string;
    model: string;
    minConfidence: number;
    vin?: string;
    settlementValue?: number;
  }> = {
    '14 santa fe eval.pdf': {
      year: 2014,
      make: 'Hyundai',
      model: 'Santa Fe Sport',
      minConfidence: 95
    },
    '25-439600069-ValuationReport.pdf': {
      year: 2018,
      make: 'Volvo',
      model: 'XC90',
      minConfidence: 95
    },
    '25-679137965_8-7-2025_Total Loss_Valuation.pdf': {
      year: 2020,
      make: 'Ford',
      model: 'Super Duty F-250',
      minConfidence: 95
    },
    'valuation -  BARSANO (1).pdf': {
      year: 2022,
      make: 'BMW',
      model: 'M3',
      minConfidence: 95,
      vin: 'WBS33AY09NFL79043',
      settlementValue: 72641.27
    },
    'Valution Report.pdf': {
      year: 2019,
      make: 'Land Rover',
      model: 'Range Rover Sport',
      minConfidence: 95
    },
    'VR-1-VEHICLE EVALUAT gION_1 (2).pdf': {
      year: 2014,
      make: 'Toyota',
      model: 'Corolla',
      minConfidence: 95
    }
  };
  
  // Test each sample PDF
  Object.entries(expectedData).forEach(([filename, expected]) => {
    describe(filename, () => {
      it('should extract vehicle data accurately with OCR', async () => {
        const filePath = path.join(samplesDir, filename);
        const buffer = await fs.readFile(filePath);
        
        // Track progress
        const progressUpdates: Array<{ progress: number; message?: string }> = [];
        
        const result = await extractVehicleData(buffer, (progress, message) => {
          progressUpdates.push({ progress, message });
        });
        
        // Verify basic extraction
        expect(result).toBeTruthy();
        expect(result.year).toBe(expected.year);
        expect(result.make).toBe(expected.make);
        
        // Model extraction (allow partial matches for complex models)
        if (expected.model) {
          expect(result.model).toBeTruthy();
          expect(result.model.toLowerCase()).toContain(
            expected.model.split(' ')[0].toLowerCase()
          );
        }
        
        // Confidence should be high with OCR
        expect(result.extractionConfidence).toBeGreaterThanOrEqual(expected.minConfidence);
        
        // VIN if specified
        if (expected.vin) {
          expect(result.vin).toBe(expected.vin);
        } else {
          expect(result.vin).toBeTruthy();
          expect(result.vin).toHaveLength(17);
        }
        
        // Settlement value if specified
        if (expected.settlementValue) {
          expect(result.settlementValue).toBe(expected.settlementValue);
        }
        
        // Mileage should be extracted
        expect(result.mileage).toBeGreaterThan(0);
        
        // Progress updates should have been sent
        expect(progressUpdates.length).toBeGreaterThan(0);
        
        console.log(`✅ ${filename}:`, {
          year: result.year,
          make: result.make,
          model: result.model,
          confidence: result.extractionConfidence,
          vin: result.vin,
          mileage: result.mileage
        });
      }, 90000); // 90 second timeout per file
    });
  });
  
  describe('Summary Test', () => {
    it('should successfully extract from all 6 sample files', async () => {
      const results = [];
      
      for (const [filename, expected] of Object.entries(expectedData)) {
        const filePath = path.join(samplesDir, filename);
        const buffer = await fs.readFile(filePath);
        
        try {
          const result = await extractVehicleData(buffer);
          
          results.push({
            filename,
            success: true,
            year: result.year,
            make: result.make,
            model: result.model,
            confidence: result.extractionConfidence,
            hasVin: !!result.vin,
            hasMileage: result.mileage > 0
          });
        } catch (error) {
          results.push({
            filename,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Print summary
      console.log('\n========== EXTRACTION SUMMARY ==========');
      results.forEach((r) => {
        if (r.success) {
          console.log(`✅ ${r.filename}`);
          console.log(`   ${r.year} ${r.make} ${r.model} (${r.confidence}%)`);
        } else {
          console.log(`❌ ${r.filename}`);
          console.log(`   Error: ${r.error}`);
        }
      });
      console.log('========================================\n');
      
      // All should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(6);
      
      // All should have high confidence
      results.forEach((r) => {
        if (r.success) {
          expect(r.confidence).toBeGreaterThanOrEqual(95);
        }
      });
    }, 540000); // 9 minute timeout for all files
  });
  
  describe('Performance Tests', () => {
    it('should process files within acceptable time', async () => {
      const filePath = path.join(samplesDir, 'valuation - BARSANO (1).pdf');
      const buffer = await fs.readFile(filePath);
      
      const startTime = Date.now();
      await extractVehicleData(buffer);
      const endTime = Date.now();
      
      const processingTime = (endTime - startTime) / 1000; // seconds
      
      console.log(`Processing time: ${processingTime.toFixed(2)}s`);
      
      // Should complete within 60 seconds
      expect(processingTime).toBeLessThan(60);
    }, 90000);
  });
  
  describe('Error Handling', () => {
    it('should handle corrupted PDF gracefully', async () => {
      const corruptedBuffer = Buffer.from('Not a real PDF file content');
      
      await expect(
        extractVehicleData(corruptedBuffer)
      ).rejects.toThrow();
    });
    
    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(
        extractVehicleData(emptyBuffer)
      ).rejects.toThrow();
    });
  });
});
