import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppraisalRecord, ExtractedVehicleData, ErrorType } from '../../types';

// Simple file-based storage for MVP
const STORAGE_DIR = path.join(os.homedir(), '.automotive-appraisal');
const STORAGE_FILE = path.join(STORAGE_DIR, 'appraisals.json');
const BACKUP_DIR = path.join(STORAGE_DIR, 'backups');
const STORAGE_VERSION = 1; // Increment this when storage format changes

// Storage metadata for versioning and migration
interface StorageMetadata {
  version: number;
  lastModified: Date;
  recordCount: number;
}

// Storage file structure with metadata
interface StorageData {
  metadata: StorageMetadata;
  appraisals: AppraisalRecord[];
}

// Storage error class for better error handling
class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public type: ErrorType = ErrorType.STORAGE_ERROR
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Validate vehicle data before storage
function validateVehicleData(data: ExtractedVehicleData): void {
  if (!data) {
    throw new StorageError('Vehicle data is required', 'INVALID_DATA');
  }

  if (!data.vin || data.vin.trim() === '') {
    throw new StorageError('VIN is required', 'INVALID_VIN');
  }

  if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
    throw new StorageError('Valid year is required', 'INVALID_YEAR');
  }

  if (!data.make || data.make.trim() === '') {
    throw new StorageError('Make is required', 'INVALID_MAKE');
  }

  if (!data.model || data.model.trim() === '') {
    throw new StorageError('Model is required', 'INVALID_MODEL');
  }

  if (data.mileage < 0) {
    throw new StorageError('Mileage cannot be negative', 'INVALID_MILEAGE');
  }
}

// Create backup of storage file
function createBackup(): void {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      return; // Nothing to backup
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `appraisals-${timestamp}.json`);
    
    fs.copyFileSync(STORAGE_FILE, backupFile);

    // Keep only last 10 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('appraisals-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backups.length > 10) {
      backups.slice(10).forEach(backup => {
        fs.unlinkSync(path.join(BACKUP_DIR, backup));
      });
    }
  } catch (error) {
    console.error('Failed to create backup:', error);
    // Don't throw - backup failure shouldn't prevent operations
  }
}

// Migrate data from old format to new format
function migrateData(data: any): StorageData {
  // If data already has metadata, validate version
  if (data.metadata && data.appraisals) {
    if (data.metadata.version === STORAGE_VERSION) {
      return data as StorageData;
    }
    
    // Handle version migrations here
    console.log(`Migrating storage from version ${data.metadata.version} to ${STORAGE_VERSION}`);
    
    // For now, just update version
    return {
      metadata: {
        version: STORAGE_VERSION,
        lastModified: new Date(),
        recordCount: data.appraisals.length
      },
      appraisals: data.appraisals
    };
  }

  // Old format: array of appraisals without metadata
  if (Array.isArray(data)) {
    console.log('Migrating from legacy array format to versioned format');
    return {
      metadata: {
        version: STORAGE_VERSION,
        lastModified: new Date(),
        recordCount: data.length
      },
      appraisals: data
    };
  }

  // Invalid format
  throw new StorageError('Invalid storage file format', 'INVALID_FORMAT');
}

function readData(): AppraisalRecord[] {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const fileContent = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(fileContent);
      
      // Migrate data if needed
      const storageData = migrateData(parsed);
      
      // Validate appraisals array
      if (!Array.isArray(storageData.appraisals)) {
        console.error('Storage file contains invalid appraisals data');
        return [];
      }
      
      // Convert date strings back to Date objects, migrate records, and validate each record
      return storageData.appraisals
        .map((record: any) => {
          try {
            const baseRecord = {
              ...record,
              createdAt: new Date(record.createdAt)
            };
            // Migrate to ensure all new fields exist
            return migrateAppraisalRecord(baseRecord);
          } catch (error) {
            console.error('Invalid appraisal record:', error);
            return null;
          }
        })
        .filter((record): record is AppraisalRecord => record !== null);
    }
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new StorageError('Permission denied reading storage file', 'EACCES', ErrorType.PERMISSION_ERROR);
    }
    console.error('Error reading storage file:', error);
    
    // Try to restore from backup
    try {
      console.log('Attempting to restore from backup...');
      const restored = restoreFromBackup();
      if (restored) {
        console.log('Successfully restored from backup');
        return restored;
      }
    } catch (restoreError) {
      console.error('Failed to restore from backup:', restoreError);
    }
  }
  return [];
}

// Restore from most recent backup
function restoreFromBackup(): AppraisalRecord[] | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return null;
    }

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('appraisals-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backups.length === 0) {
      return null;
    }

    // Try each backup until we find one that works
    for (const backup of backups) {
      try {
        const backupPath = path.join(BACKUP_DIR, backup);
        const fileContent = fs.readFileSync(backupPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        const storageData = migrateData(parsed);
        
        // Restore the backup to main storage file
        fs.copyFileSync(backupPath, STORAGE_FILE);
        
        return storageData.appraisals.map((record: any) => ({
          ...record,
          createdAt: new Date(record.createdAt)
        }));
      } catch (error) {
        console.error(`Failed to restore from backup ${backup}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('Error during backup restoration:', error);
  }
  
  return null;
}

function writeData(data: AppraisalRecord[]): void {
  try {
    // Create backup before writing
    createBackup();
    
    // Ensure directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    
    // Create storage data with metadata
    const storageData: StorageData = {
      metadata: {
        version: STORAGE_VERSION,
        lastModified: new Date(),
        recordCount: data.length
      },
      appraisals: data
    };
    
    // Write to temporary file first, then rename (atomic operation)
    const tempFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(storageData, null, 2), 'utf8');
    
    // Verify the written file is valid JSON
    try {
      const verification = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
      if (!verification.metadata || !verification.appraisals) {
        throw new Error('Written file has invalid structure');
      }
    } catch (verifyError) {
      fs.unlinkSync(tempFile);
      throw new StorageError('Data validation failed after write', 'VALIDATION_FAILED');
    }
    
    // Atomic rename
    fs.renameSync(tempFile, STORAGE_FILE);
  } catch (error: any) {
    // Clean up temp file if it exists
    const tempFile = `${STORAGE_FILE}.tmp`;
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    // Throw specific error based on error code
    if (error.code === 'EACCES') {
      throw new StorageError('Permission denied writing to storage', 'EACCES', ErrorType.PERMISSION_ERROR);
    } else if (error.code === 'ENOSPC') {
      throw new StorageError('No space left on device', 'ENOSPC', ErrorType.STORAGE_ERROR);
    } else if (error.code === 'EROFS') {
      throw new StorageError('Read-only file system', 'EROFS', ErrorType.STORAGE_ERROR);
    }
    
    throw new StorageError(`Failed to write storage file: ${error.message}`, error.code || 'UNKNOWN');
  }
}

// Migrate appraisal record to include comparable fields
function migrateAppraisalRecord(record: any): AppraisalRecord {
  // Ensure all new fields exist with default values
  return {
    ...record,
    hasComparables: record.hasComparables ?? false,
    comparableCount: record.comparableCount ?? 0,
    marketAnalysisComplete: record.marketAnalysisComplete ?? false,
    calculatedMarketValue: record.calculatedMarketValue ?? undefined,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined
  };
}

// Update appraisal metadata for comparables
function updateAppraisalComparableMetadata(
  appraisalId: string,
  metadata: {
    hasComparables?: boolean;
    comparableCount?: number;
    marketAnalysisComplete?: boolean;
    calculatedMarketValue?: number;
  }
): boolean {
  const appraisals = readData();
  const index = appraisals.findIndex((a: AppraisalRecord) => a.id === appraisalId);
  
  if (index !== -1) {
    appraisals[index] = {
      ...appraisals[index],
      ...metadata,
      updatedAt: new Date()
    };
    writeData(appraisals);
    return true;
  }
  
  return false;
}

export const storage = {
  // Get storage directory (exposed for testing)
  getStorageDir: (): string => STORAGE_DIR,
  
  // Get storage file path (exposed for testing)
  getStorageFile: (): string => STORAGE_FILE,
  
  // Save new appraisal with validation
  saveAppraisal: (data: ExtractedVehicleData): string => {
    // Validate data before saving
    validateVehicleData(data);
    
    const id = `apr_${Date.now()}`;
    const appraisals = readData();
    
    appraisals.push({
      id,
      createdAt: new Date(),
      status: 'draft',
      data,
      hasComparables: false,
      comparableCount: 0,
      marketAnalysisComplete: false
    });
    
    writeData(appraisals);
    return id;
  },
  
  // Get all appraisals
  getAppraisals: (): AppraisalRecord[] => {
    return readData();
  },
  
  // Get single appraisal
  getAppraisal: (id: string): AppraisalRecord | undefined => {
    if (!id || id.trim() === '') {
      throw new StorageError('Appraisal ID is required', 'INVALID_ID');
    }
    
    const appraisals = readData();
    return appraisals.find((a: AppraisalRecord) => a.id === id);
  },
  
  // Update appraisal status
  updateAppraisalStatus: (id: string, status: 'draft' | 'complete'): boolean => {
    if (!id || id.trim() === '') {
      throw new StorageError('Appraisal ID is required', 'INVALID_ID');
    }
    
    if (status !== 'draft' && status !== 'complete') {
      throw new StorageError('Status must be either "draft" or "complete"', 'INVALID_STATUS');
    }
    
    const appraisals = readData();
    const index = appraisals.findIndex((a: AppraisalRecord) => a.id === id);
    
    if (index !== -1) {
      appraisals[index].status = status;
      writeData(appraisals);
      return true;
    }
    
    return false;
  },
  
  // Update entire appraisal record
  updateAppraisal: (id: string, data: ExtractedVehicleData): boolean => {
    if (!id || id.trim() === '') {
      throw new StorageError('Appraisal ID is required', 'INVALID_ID');
    }
    
    // Validate data before updating
    validateVehicleData(data);
    
    const appraisals = readData();
    const index = appraisals.findIndex((a: AppraisalRecord) => a.id === id);
    
    if (index !== -1) {
      appraisals[index].data = data;
      writeData(appraisals);
      return true;
    }
    
    return false;
  },
  
  // Delete appraisal (with cascade delete for comparables)
  deleteAppraisal: (id: string, cascadeDelete: boolean = true): boolean => {
    if (!id || id.trim() === '') {
      throw new StorageError('Appraisal ID is required', 'INVALID_ID');
    }
    
    const appraisals = readData();
    const filteredAppraisals = appraisals.filter((a: AppraisalRecord) => a.id !== id);
    
    if (filteredAppraisals.length !== appraisals.length) {
      writeData(filteredAppraisals);
      
      // Cascade delete comparables if enabled
      if (cascadeDelete) {
        try {
          const comparablesDir = path.join(STORAGE_DIR, 'comparables');
          const comparablesFile = path.join(comparablesDir, `${id}.json`);
          
          if (fs.existsSync(comparablesFile)) {
            fs.unlinkSync(comparablesFile);
            console.log(`Deleted comparables for appraisal ${id}`);
          }
          
          // Also delete market analysis cache if it exists
          const marketAnalysisFile = path.join(comparablesDir, `${id}-analysis.json`);
          if (fs.existsSync(marketAnalysisFile)) {
            fs.unlinkSync(marketAnalysisFile);
            console.log(`Deleted market analysis for appraisal ${id}`);
          }
        } catch (error) {
          console.error('Error during cascade delete of comparables:', error);
          // Don't throw - appraisal deletion succeeded, comparable cleanup is secondary
        }
      }
      
      return true;
    }
    
    return false;
  },
  
  // Clear all appraisals (useful for testing and data reset)
  clearAll: (): void => {
    writeData([]);
  },
  
  // Get storage statistics
  getStats: (): { count: number; totalSize: number } => {
    const appraisals = readData();
    let totalSize = 0;
    
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      totalSize = stats.size;
    }
    
    return {
      count: appraisals.length,
      totalSize
    };
  },
  
  // Manually create backup
  backup: (): boolean => {
    try {
      createBackup();
      return true;
    } catch (error) {
      console.error('Manual backup failed:', error);
      return false;
    }
  },
  
  // Verify data integrity
  verifyIntegrity: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    try {
      if (!fs.existsSync(STORAGE_FILE)) {
        return { valid: true, errors: [] }; // Empty storage is valid
      }
      
      // Read and parse file
      const fileContent = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(fileContent);
      
      // Check structure
      const storageData = migrateData(parsed);
      
      if (!storageData.metadata) {
        errors.push('Missing metadata');
      }
      
      if (!Array.isArray(storageData.appraisals)) {
        errors.push('Appraisals is not an array');
        return { valid: false, errors };
      }
      
      // Validate each appraisal
      storageData.appraisals.forEach((record: any, index: number) => {
        if (!record.id) {
          errors.push(`Record ${index}: Missing ID`);
        }
        if (!record.createdAt) {
          errors.push(`Record ${index}: Missing createdAt`);
        }
        if (!record.status || (record.status !== 'draft' && record.status !== 'complete')) {
          errors.push(`Record ${index}: Invalid status`);
        }
        if (!record.data) {
          errors.push(`Record ${index}: Missing data`);
        } else {
          // Validate vehicle data
          try {
            validateVehicleData(record.data);
          } catch (error) {
            errors.push(`Record ${index}: ${error instanceof Error ? error.message : 'Invalid data'}`);
          }
        }
      });
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Failed to verify integrity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  },
  
  // Restore from backup
  restore: (): boolean => {
    try {
      const restored = restoreFromBackup();
      return restored !== null;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  },
  
  // Find duplicate appraisals by VIN
  findDuplicates: (vin: string): AppraisalRecord[] => {
    if (!vin || vin.trim() === '') {
      return [];
    }
    
    const appraisals = readData();
    const normalizedVin = vin.trim().toUpperCase();
    
    return appraisals.filter((a: AppraisalRecord) => 
      a.data.vin.trim().toUpperCase() === normalizedVin
    );
  },
  
  // Check if an appraisal with the same VIN already exists
  hasDuplicate: (vin: string, excludeId?: string): boolean => {
    if (!vin || vin.trim() === '') {
      return false;
    }
    
    const appraisals = readData();
    const normalizedVin = vin.trim().toUpperCase();
    
    return appraisals.some((a: AppraisalRecord) => 
      a.data.vin.trim().toUpperCase() === normalizedVin && 
      (!excludeId || a.id !== excludeId)
    );
  },
  
  // Update comparable metadata for an appraisal
  updateComparableMetadata: (
    appraisalId: string,
    metadata: {
      hasComparables?: boolean;
      comparableCount?: number;
      marketAnalysisComplete?: boolean;
      calculatedMarketValue?: number;
    }
  ): boolean => {
    if (!appraisalId || appraisalId.trim() === '') {
      throw new StorageError('Appraisal ID is required', 'INVALID_ID');
    }
    
    return updateAppraisalComparableMetadata(appraisalId, metadata);
  },
  
  // Migrate all appraisals to latest format
  migrateAllAppraisals: (): { migrated: number; errors: string[] } => {
    const errors: string[] = [];
    let migrated = 0;
    
    try {
      const appraisals = readData();
      let needsWrite = false;
      
      const migratedAppraisals = appraisals.map((record, index) => {
        try {
          // Check if migration is needed
          if (
            record.hasComparables === undefined ||
            record.comparableCount === undefined ||
            record.marketAnalysisComplete === undefined
          ) {
            migrated++;
            needsWrite = true;
            return migrateAppraisalRecord(record);
          }
          return record;
        } catch (error) {
          errors.push(`Record ${index} (${record.id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
          return record;
        }
      });
      
      if (needsWrite) {
        writeData(migratedAppraisals);
      }
      
      return { migrated, errors };
    } catch (error) {
      errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { migrated, errors };
    }
  },
  
  // Get appraisals with comparable metadata
  getAppraisalsWithComparables: (): AppraisalRecord[] => {
    const appraisals = readData();
    return appraisals.filter((a: AppraisalRecord) => a.hasComparables === true);
  },
  
  // Get appraisals with completed market analysis
  getAppraisalsWithMarketAnalysis: (): AppraisalRecord[] => {
    const appraisals = readData();
    return appraisals.filter((a: AppraisalRecord) => a.marketAnalysisComplete === true);
  }
};