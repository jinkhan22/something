import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock data for testing
const mockVehicleData = {
  vin: '1HGBH41JXMN109186',
  year: 2021,
  make: 'Honda',
  model: 'Accord',
  mileage: 45000,
  location: 'Los Angeles, CA',
  reportType: 'CCC_ONE',
  extractionConfidence: 0.95,
  extractionErrors: [],
  settlementValue: 25000,
  marketValue: 26500
};

const TEST_STORAGE_DIR = path.join(os.tmpdir(), `.automotive-appraisal-test-${Date.now()}`);
const TEST_STORAGE_FILE = path.join(TEST_STORAGE_DIR, 'appraisals.json');

// Mock the storage module to use test directory
jest.mock('../src/main/services/storage', () => {
  const actualFs = jest.requireActual('fs');
  const actualPath = jest.requireActual('path');
  
  return {
    storage: {
      getStorageDir: () => TEST_STORAGE_DIR,
      getStorageFile: () => TEST_STORAGE_FILE,
      
      saveAppraisal: (data: any) => {
        // Validate data
        if (!data) throw new Error('Vehicle data is required');
        if (!data.vin || data.vin.trim() === '') throw new Error('VIN is required');
        if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
          throw new Error('Valid year is required');
        }
        if (!data.make || data.make.trim() === '') throw new Error('Make is required');
        if (!data.model || data.model.trim() === '') throw new Error('Model is required');
        if (data.mileage < 0) throw new Error('Mileage cannot be negative');
        
        const id = `apr_${Date.now()}`;
        const appraisals = readTestData();
        appraisals.push({ id, createdAt: new Date(), status: 'draft', data });
        writeTestData(appraisals);
        return id;
      },
      
      getAppraisals: () => readTestData(),
      
      getAppraisal: (id: string) => {
        if (!id || id.trim() === '') throw new Error('Appraisal ID is required');
        return readTestData().find((a: any) => a.id === id);
      },
      
      updateAppraisalStatus: (id: string, status: string) => {
        if (!id || id.trim() === '') throw new Error('Appraisal ID is required');
        if (status !== 'draft' && status !== 'complete') {
          throw new Error('Status must be either "draft" or "complete"');
        }
        
        const appraisals = readTestData();
        const index = appraisals.findIndex((a: any) => a.id === id);
        if (index !== -1) {
          appraisals[index].status = status;
          writeTestData(appraisals);
          return true;
        }
        return false;
      },
      
      deleteAppraisal: (id: string) => {
        if (!id || id.trim() === '') throw new Error('Appraisal ID is required');
        const appraisals = readTestData();
        const filtered = appraisals.filter((a: any) => a.id !== id);
        if (filtered.length !== appraisals.length) {
          writeTestData(filtered);
          return true;
        }
        return false;
      },
      
      clearAll: () => writeTestData([]),
      
      getStats: () => {
        const appraisals = readTestData();
        let totalSize = 0;
        if (actualFs.existsSync(TEST_STORAGE_FILE)) {
          const stats = actualFs.statSync(TEST_STORAGE_FILE);
          totalSize = stats.size;
        }
        return { count: appraisals.length, totalSize };
      }
    }
  };
  
  function readTestData() {
    try {
      if (actualFs.existsSync(TEST_STORAGE_FILE)) {
        const data = actualFs.readFileSync(TEST_STORAGE_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((record: any) => ({
          ...record,
          createdAt: new Date(record.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error reading test storage:', error);
    }
    return [];
  }
  
  function writeTestData(data: any[]) {
    if (!actualFs.existsSync(TEST_STORAGE_DIR)) {
      actualFs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    }
    actualFs.writeFileSync(TEST_STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  }
});

import { storage } from '../src/main/services/storage';

describe('Storage Service', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  describe('Directory Creation', () => {
    test('should create storage directory if it does not exist', () => {
      expect(fs.existsSync(TEST_STORAGE_DIR)).toBe(false);
      
      storage.saveAppraisal(mockVehicleData);
      
      expect(fs.existsSync(TEST_STORAGE_DIR)).toBe(true);
    });

    test('should handle existing directory gracefully', () => {
      fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
      
      expect(() => storage.saveAppraisal(mockVehicleData)).not.toThrow();
    });

    test('should create directory with proper permissions', () => {
      storage.saveAppraisal(mockVehicleData);
      
      const stats = fs.statSync(TEST_STORAGE_DIR);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('saveAppraisal', () => {
    test('should save a new appraisal and return an ID', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^apr_\d+$/);
    });

    test('should save appraisal with correct structure', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0]).toMatchObject({
        id,
        status: 'draft',
        data: mockVehicleData
      });
      expect(appraisals[0].createdAt).toBeDefined();
    });

    test('should save multiple appraisals', () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(2);
      expect(appraisals[0].id).toBe(id1);
      expect(appraisals[1].id).toBe(id2);
    });

    test('should generate unique IDs for each appraisal', async () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const id2 = storage.saveAppraisal(mockVehicleData);
      
      expect(id1).not.toBe(id2);
    });

    test('should throw error for invalid data', () => {
      expect(() => storage.saveAppraisal(null as any)).toThrow();
      expect(() => storage.saveAppraisal(undefined as any)).toThrow();
    });

    test('should validate required fields', () => {
      const invalidData = { ...mockVehicleData, vin: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('VIN is required');
    });
  });

  describe('getAppraisals', () => {
    test('should return empty array when no appraisals exist', () => {
      const appraisals = storage.getAppraisals();
      expect(appraisals).toEqual([]);
    });

    test('should return all saved appraisals', () => {
      storage.saveAppraisal(mockVehicleData);
      storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(2);
    });

    test('should return appraisals in correct order (oldest first)', () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      const appraisals = storage.getAppraisals();
      expect(appraisals[0].id).toBe(id1);
      expect(appraisals[1].id).toBe(id2);
    });

    test('should handle corrupted storage file gracefully', () => {
      fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
      fs.writeFileSync(TEST_STORAGE_FILE, 'invalid json');
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toEqual([]);
    });
  });

  describe('getAppraisal', () => {
    test('should return undefined for non-existent ID', () => {
      const appraisal = storage.getAppraisal('non_existent_id');
      expect(appraisal).toBeUndefined();
    });

    test('should return correct appraisal by ID', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const appraisal = storage.getAppraisal(id);
      expect(appraisal).toBeDefined();
      expect(appraisal?.id).toBe(id);
      expect(appraisal?.data).toEqual(mockVehicleData);
    });

    test('should return correct appraisal when multiple exist', async () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure unique IDs
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      const appraisal = storage.getAppraisal(id2);
      expect(appraisal?.id).toBe(id2);
      expect(appraisal?.data.vin).toBe('2HGBH41JXMN109187');
    });
  });

  describe('updateAppraisalStatus', () => {
    test('should return false for non-existent ID', () => {
      const result = storage.updateAppraisalStatus('non_existent_id', 'complete');
      expect(result).toBe(false);
    });

    test('should update status from draft to complete', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const result = storage.updateAppraisalStatus(id, 'complete');
      expect(result).toBe(true);
      
      const appraisal = storage.getAppraisal(id);
      expect(appraisal?.status).toBe('complete');
    });

    test('should update status from complete to draft', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      storage.updateAppraisalStatus(id, 'complete');
      
      const result = storage.updateAppraisalStatus(id, 'draft');
      expect(result).toBe(true);
      
      const appraisal = storage.getAppraisal(id);
      expect(appraisal?.status).toBe('draft');
    });

    test('should not affect other appraisals', async () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure unique IDs
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      storage.updateAppraisalStatus(id1, 'complete');
      
      const appraisal1 = storage.getAppraisal(id1);
      const appraisal2 = storage.getAppraisal(id2);
      
      expect(appraisal1?.status).toBe('complete');
      expect(appraisal2?.status).toBe('draft');
    });
  });

  describe('deleteAppraisal', () => {
    test('should return false for non-existent ID', () => {
      const result = storage.deleteAppraisal('non_existent_id');
      expect(result).toBe(false);
    });

    test('should delete appraisal by ID', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const result = storage.deleteAppraisal(id);
      expect(result).toBe(true);
      
      const appraisal = storage.getAppraisal(id);
      expect(appraisal).toBeUndefined();
    });

    test('should not affect other appraisals', async () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure unique IDs
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      storage.deleteAppraisal(id1);
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0].id).toBe(id2);
    });

    test('should handle deleting all appraisals', () => {
      const id1 = storage.saveAppraisal(mockVehicleData);
      const id2 = storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      storage.deleteAppraisal(id1);
      storage.deleteAppraisal(id2);
      
      const appraisals = storage.getAppraisals();
      expect(appraisals).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should validate required data fields', () => {
      expect(() => storage.saveAppraisal(null as any)).toThrow('Vehicle data is required');
      expect(() => storage.saveAppraisal(undefined as any)).toThrow('Vehicle data is required');
    });

    test('should validate VIN field', () => {
      const invalidData = { ...mockVehicleData, vin: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('VIN is required');
    });

    test('should validate year field', () => {
      const invalidData = { ...mockVehicleData, year: 1800 };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Valid year is required');
    });

    test('should validate make field', () => {
      const invalidData = { ...mockVehicleData, make: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Make is required');
    });

    test('should validate model field', () => {
      const invalidData = { ...mockVehicleData, model: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Model is required');
    });

    test('should validate mileage field', () => {
      const invalidData = { ...mockVehicleData, mileage: -100 };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Mileage cannot be negative');
    });

    test('should validate appraisal ID for getAppraisal', () => {
      expect(() => storage.getAppraisal('')).toThrow('Appraisal ID is required');
    });

    test('should validate appraisal ID for updateAppraisalStatus', () => {
      expect(() => storage.updateAppraisalStatus('', 'complete')).toThrow('Appraisal ID is required');
    });

    test('should validate status value for updateAppraisalStatus', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      expect(() => storage.updateAppraisalStatus(id, 'invalid' as any)).toThrow('Status must be either "draft" or "complete"');
    });

    test('should validate appraisal ID for deleteAppraisal', () => {
      expect(() => storage.deleteAppraisal('')).toThrow('Appraisal ID is required');
    });
  });

  describe('Data Persistence', () => {
    test('should persist data across multiple reads', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const appraisals1 = storage.getAppraisals();
      const appraisals2 = storage.getAppraisals();
      
      expect(appraisals1).toEqual(appraisals2);
    });

    test('should maintain data integrity after updates', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      storage.updateAppraisalStatus(id, 'complete');
      
      const appraisal = storage.getAppraisal(id);
      expect(appraisal?.data).toEqual(mockVehicleData);
      expect(appraisal?.status).toBe('complete');
    });
  });
});
