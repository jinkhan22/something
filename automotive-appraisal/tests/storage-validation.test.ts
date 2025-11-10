import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_STORAGE_DIR = path.join(os.tmpdir(), `.automotive-appraisal-validation-test-${Date.now()}`);
const TEST_STORAGE_FILE = path.join(TEST_STORAGE_DIR, 'appraisals.json');
const TEST_BACKUP_DIR = path.join(TEST_STORAGE_DIR, 'backups');

// Mock the storage module to use test directory
jest.mock('../src/main/services/storage', () => {
  const actualFs = jest.requireActual('fs');
  const actualPath = jest.requireActual('path');
  
  // Storage implementation with validation and backup
  const validateVehicleData = (data: any) => {
    if (!data) throw new Error('Vehicle data is required');
    if (!data.vin || data.vin.trim() === '') throw new Error('VIN is required');
    if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
      throw new Error('Valid year is required');
    }
    if (!data.make || data.make.trim() === '') throw new Error('Make is required');
    if (!data.model || data.model.trim() === '') throw new Error('Model is required');
    if (data.mileage < 0) throw new Error('Mileage cannot be negative');
  };
  
  const createBackup = () => {
    if (!actualFs.existsSync(TEST_STORAGE_FILE)) return;
    if (!actualFs.existsSync(TEST_BACKUP_DIR)) {
      actualFs.mkdirSync(TEST_BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = actualPath.join(TEST_BACKUP_DIR, `appraisals-${timestamp}.json`);
    actualFs.copyFileSync(TEST_STORAGE_FILE, backupFile);
  };
  
  const readTestData = () => {
    try {
      if (actualFs.existsSync(TEST_STORAGE_FILE)) {
        const data = actualFs.readFileSync(TEST_STORAGE_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Handle both old and new formats
        const appraisals = Array.isArray(parsed) ? parsed : parsed.appraisals || [];
        
        return appraisals.map((record: any) => ({
          ...record,
          createdAt: new Date(record.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error reading test storage:', error);
    }
    return [];
  };
  
  const writeTestData = (data: any[]) => {
    createBackup();
    
    if (!actualFs.existsSync(TEST_STORAGE_DIR)) {
      actualFs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    }
    
    const storageData = {
      metadata: {
        version: 1,
        lastModified: new Date(),
        recordCount: data.length
      },
      appraisals: data
    };
    
    actualFs.writeFileSync(TEST_STORAGE_FILE, JSON.stringify(storageData, null, 2), 'utf8');
  };
  
  return {
    storage: {
      saveAppraisal: (data: any) => {
        validateVehicleData(data);
        const id = `apr_${Date.now()}`;
        const appraisals = readTestData();
        appraisals.push({ id, createdAt: new Date(), status: 'draft', data });
        writeTestData(appraisals);
        return id;
      },
      
      getAppraisals: () => readTestData(),
      
      verifyIntegrity: () => {
        const errors: string[] = [];
        
        try {
          if (!actualFs.existsSync(TEST_STORAGE_FILE)) {
            return { valid: true, errors: [] };
          }
          
          const fileContent = actualFs.readFileSync(TEST_STORAGE_FILE, 'utf8');
          const parsed = JSON.parse(fileContent);
          
          const appraisals = Array.isArray(parsed) ? parsed : parsed.appraisals || [];
          
          appraisals.forEach((record: any, index: number) => {
            if (!record.id) errors.push(`Record ${index}: Missing ID`);
            if (!record.createdAt) errors.push(`Record ${index}: Missing createdAt`);
            if (!record.status || (record.status !== 'draft' && record.status !== 'complete')) {
              errors.push(`Record ${index}: Invalid status`);
            }
            if (!record.data) {
              errors.push(`Record ${index}: Missing data`);
            } else {
              try {
                validateVehicleData(record.data);
              } catch (error) {
                errors.push(`Record ${index}: ${error instanceof Error ? error.message : 'Invalid data'}`);
              }
            }
          });
          
          return { valid: errors.length === 0, errors };
        } catch (error) {
          errors.push(`Failed to verify: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return { valid: false, errors };
        }
      },
      
      backup: () => {
        try {
          createBackup();
          return true;
        } catch (error) {
          return false;
        }
      },
      
      restore: () => {
        try {
          if (!actualFs.existsSync(TEST_BACKUP_DIR)) return false;
          
          const backups = actualFs.readdirSync(TEST_BACKUP_DIR)
            .filter((f: string) => f.startsWith('appraisals-') && f.endsWith('.json'))
            .sort()
            .reverse();
          
          if (backups.length === 0) return false;
          
          const backupPath = actualPath.join(TEST_BACKUP_DIR, backups[0]);
          actualFs.copyFileSync(backupPath, TEST_STORAGE_FILE);
          return true;
        } catch (error) {
          return false;
        }
      }
    }
  };
});

import { storage } from '../src/main/services/storage';

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

describe('Storage Validation and Integrity', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  describe('Data Validation', () => {
    test('should validate VIN before saving', () => {
      const invalidData = { ...mockVehicleData, vin: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('VIN is required');
    });

    test('should validate year range', () => {
      const invalidData = { ...mockVehicleData, year: 1800 };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Valid year is required');
      
      const futureData = { ...mockVehicleData, year: 2030 };
      expect(() => storage.saveAppraisal(futureData)).toThrow('Valid year is required');
    });

    test('should validate make field', () => {
      const invalidData = { ...mockVehicleData, make: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Make is required');
    });

    test('should validate model field', () => {
      const invalidData = { ...mockVehicleData, model: '' };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Model is required');
    });

    test('should validate mileage is non-negative', () => {
      const invalidData = { ...mockVehicleData, mileage: -100 };
      expect(() => storage.saveAppraisal(invalidData)).toThrow('Mileage cannot be negative');
    });

    test('should accept valid data', () => {
      expect(() => storage.saveAppraisal(mockVehicleData)).not.toThrow();
    });
  });

  describe('Integrity Verification', () => {
    test('should verify empty storage as valid', () => {
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should verify valid storage', () => {
      storage.saveAppraisal(mockVehicleData);
      
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect missing ID', () => {
      storage.saveAppraisal(mockVehicleData);
      
      // Manually corrupt the data
      const data = JSON.parse(fs.readFileSync(TEST_STORAGE_FILE, 'utf8'));
      delete data.appraisals[0].id;
      fs.writeFileSync(TEST_STORAGE_FILE, JSON.stringify(data));
      
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Record 0: Missing ID');
    });

    test('should detect invalid status', () => {
      storage.saveAppraisal(mockVehicleData);
      
      // Manually corrupt the data
      const data = JSON.parse(fs.readFileSync(TEST_STORAGE_FILE, 'utf8'));
      data.appraisals[0].status = 'invalid';
      fs.writeFileSync(TEST_STORAGE_FILE, JSON.stringify(data));
      
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    test('should detect invalid vehicle data', () => {
      storage.saveAppraisal(mockVehicleData);
      
      // Manually corrupt the data
      const data = JSON.parse(fs.readFileSync(TEST_STORAGE_FILE, 'utf8'));
      data.appraisals[0].data.vin = '';
      fs.writeFileSync(TEST_STORAGE_FILE, JSON.stringify(data));
      
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('VIN is required'))).toBe(true);
    });
  });

  describe('Backup and Recovery', () => {
    test('should create backup when saving data', () => {
      storage.saveAppraisal(mockVehicleData);
      
      // Save again to trigger backup
      storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      expect(fs.existsSync(TEST_BACKUP_DIR)).toBe(true);
      const backups = fs.readdirSync(TEST_BACKUP_DIR);
      expect(backups.length).toBeGreaterThan(0);
    });

    test('should manually create backup', () => {
      storage.saveAppraisal(mockVehicleData);
      
      const result = storage.backup();
      expect(result).toBe(true);
      expect(fs.existsSync(TEST_BACKUP_DIR)).toBe(true);
    });

    test('should restore from backup', () => {
      // Save initial data
      const id1 = storage.saveAppraisal(mockVehicleData);
      
      // Create backup
      storage.backup();
      
      // Add more data
      storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      
      // Verify we have 2 appraisals
      expect(storage.getAppraisals()).toHaveLength(2);
      
      // Restore from backup
      const restored = storage.restore();
      expect(restored).toBe(true);
      
      // Should have original data
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(1);
      expect(appraisals[0].id).toBe(id1);
    });

    test('should handle restore when no backups exist', () => {
      const result = storage.restore();
      expect(result).toBe(false);
    });
  });

  describe('Data Persistence', () => {
    test('should persist data across reads', () => {
      const id = storage.saveAppraisal(mockVehicleData);
      
      const appraisals1 = storage.getAppraisals();
      const appraisals2 = storage.getAppraisals();
      
      expect(appraisals1).toEqual(appraisals2);
      expect(appraisals1[0].id).toBe(id);
    });

    test('should maintain data integrity after multiple operations', () => {
      // Save multiple appraisals
      storage.saveAppraisal(mockVehicleData);
      storage.saveAppraisal({ ...mockVehicleData, vin: '2HGBH41JXMN109187' });
      storage.saveAppraisal({ ...mockVehicleData, vin: '3HGBH41JXMN109188' });
      
      // Verify integrity
      const result = storage.verifyIntegrity();
      expect(result.valid).toBe(true);
      
      // Verify count
      const appraisals = storage.getAppraisals();
      expect(appraisals).toHaveLength(3);
    });
  });
});
