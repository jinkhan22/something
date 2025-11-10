/**
 * Quick Real PDF Integration Tests
 * Runs a subset of critical tests with real PDFs for faster validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractVehicleData } from '../src/main/services/pdfExtractor';

jest.setTimeout(120000);

describe('Quick Real PDF Integration Tests', () => {
  const samplesDir = path.join(__dirname, '../../valuation_report_samples');
  
  const loadPDF = (filename: string): Buffer => {
    const filePath = path.join(samplesDir, filename);
    return fs.readFileSync(filePath);
  };

  test('CCC One: Allstate XC60 Volvo extraction', async () => {
    const buffer = loadPDF('Allstate CCC Valuation XC60 Volvo 2015.pdf');
    const result = await extractVehicleData(buffer);
    
    expect(result.reportType).toBe('CCC_ONE');
    expect(result.year).toBe(2015);
    expect(result.make).toBe('Volvo');
    expect(result.extractionConfidence).toBeGreaterThan(0.8);
    
    console.log('✓ CCC One extraction validated');
  });

  test('Mitchell: Santa Fe extraction', async () => {
    const buffer = loadPDF('14 santa fe eval.pdf');
    const result = await extractVehicleData(buffer);
    
    expect(result.reportType).toBe('MITCHELL');
    expect(result.year).toBe(2014);
    expect(result.make).toBe('Hyundai');
    expect(result.extractionConfidence).toBeGreaterThan(0.8);
    
    console.log('✓ Mitchell extraction validated');
  });

  test('Error handling: corrupted PDF', async () => {
    const corruptedBuffer = Buffer.from('Not a PDF');
    await expect(extractVehicleData(corruptedBuffer)).rejects.toThrow();
    
    console.log('✓ Error handling validated');
  });

  test('Data validation: VIN format', async () => {
    const buffer = loadPDF('State-Farm-Valuation-Report.pdf');
    const result = await extractVehicleData(buffer);
    
    if (result.vin) {
      expect(result.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      expect(result.vin.length).toBe(17);
    }
    
    console.log('✓ VIN validation passed');
  });

  test('Complete workflow validation', async () => {
    const buffer = loadPDF('Allstate CCC Valuation XC60 Volvo 2015.pdf');
    
    // Extract
    const data = await extractVehicleData(buffer);
    expect(data).toBeDefined();
    
    // Validate
    expect(data.year).toBeTruthy();
    expect(data.make).toBeTruthy();
    expect(data.model).toBeTruthy();
    
    // Ready for storage
    const appraisal = {
      id: `test-${Date.now()}`,
      createdAt: new Date(),
      status: 'draft' as const,
      data,
    };
    
    expect(appraisal.id).toBeTruthy();
    expect(appraisal.data).toEqual(data);
    
    console.log('✓ Complete workflow validated');
  });
});
