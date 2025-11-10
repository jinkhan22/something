import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ComparableVehicle, ComparableValidationError } from '../../types';

// Storage directory structure
const STORAGE_DIR = path.join(os.homedir(), '.automotive-appraisal');
const COMPARABLES_DIR = path.join(STORAGE_DIR, 'comparables');

/**
 * Storage error class for comparable operations
 */
class ComparableStorageError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ComparableStorageError';
  }
}

/**
 * ComparableStorageService manages persistent storage of comparable vehicles.
 * Each appraisal has its own comparables file for better organization.
 */
export class ComparableStorageService {
  /**
   * Get the storage path for an appraisal's comparables
   */
  private getStoragePath(appraisalId: string): string {
    return path.join(COMPARABLES_DIR, `${appraisalId}.json`);
  }

  /**
   * Ensure the comparables directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(COMPARABLES_DIR)) {
      fs.mkdirSync(COMPARABLES_DIR, { recursive: true });
    }
  }

  /**
   * Validate a comparable vehicle before storage operations
   */
  private validateComparable(comparable: Partial<ComparableVehicle>): void {
    const errors: string[] = [];

    if (!comparable.appraisalId || comparable.appraisalId.trim() === '') {
      errors.push('Appraisal ID is required');
    }

    if (!comparable.year || comparable.year < 1900 || comparable.year > new Date().getFullYear() + 1) {
      errors.push('Valid year is required (1900 to current year + 1)');
    }

    if (!comparable.make || comparable.make.trim() === '') {
      errors.push('Make is required');
    }

    if (!comparable.model || comparable.model.trim() === '') {
      errors.push('Model is required');
    }

    if (comparable.mileage === undefined || comparable.mileage < 0) {
      errors.push('Valid mileage is required (cannot be negative)');
    }

    if (!comparable.location || comparable.location.trim() === '') {
      errors.push('Location is required');
    }

    if (comparable.listPrice === undefined || comparable.listPrice <= 0) {
      errors.push('Valid list price is required (must be positive)');
    }

    if (!comparable.condition || !['Excellent', 'Good', 'Fair', 'Poor'].includes(comparable.condition)) {
      errors.push('Valid condition is required (Excellent, Good, Fair, or Poor)');
    }

    if (!comparable.source || comparable.source.trim() === '') {
      errors.push('Source is required');
    }

    if (errors.length > 0) {
      throw new ComparableStorageError(
        `Validation failed: ${errors.join(', ')}`,
        'VALIDATION_FAILED'
      );
    }
  }

  /**
   * Read comparables for an appraisal from storage
   */
  private readComparables(appraisalId: string): ComparableVehicle[] {
    const filePath = this.getStoragePath(appraisalId);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);

      if (!Array.isArray(parsed)) {
        console.error('Comparables file contains invalid data');
        return [];
      }

      // Convert date strings back to Date objects
      return parsed.map((comparable: any) => ({
        ...comparable,
        dateAdded: new Date(comparable.dateAdded),
        createdAt: new Date(comparable.createdAt),
        updatedAt: new Date(comparable.updatedAt)
      }));
    } catch (error) {
      console.error('Error reading comparables file:', error);
      return [];
    }
  }

  /**
   * Write comparables for an appraisal to storage
   */
  private writeComparables(appraisalId: string, comparables: ComparableVehicle[]): void {
    try {
      this.ensureDirectoryExists();

      const filePath = this.getStoragePath(appraisalId);
      const tempFile = `${filePath}.tmp`;

      // Write to temporary file first
      fs.writeFileSync(tempFile, JSON.stringify(comparables, null, 2), 'utf8');

      // Verify the written file is valid JSON
      try {
        const verification = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
        if (!Array.isArray(verification)) {
          throw new Error('Written file has invalid structure');
        }
      } catch (verifyError) {
        fs.unlinkSync(tempFile);
        throw new ComparableStorageError('Data validation failed after write', 'VALIDATION_FAILED');
      }

      // Atomic rename
      fs.renameSync(tempFile, filePath);
    } catch (error: any) {
      // Clean up temp file if it exists
      const filePath = this.getStoragePath(appraisalId);
      const tempFile = `${filePath}.tmp`;
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }

      if (error.code === 'EACCES') {
        throw new ComparableStorageError('Permission denied writing to storage', 'EACCES');
      } else if (error.code === 'ENOSPC') {
        throw new ComparableStorageError('No space left on device', 'ENOSPC');
      }

      throw new ComparableStorageError(
        `Failed to write comparables file: ${error.message}`,
        error.code || 'UNKNOWN'
      );
    }
  }

  /**
   * Update appraisal metadata after comparable changes
   */
  private updateAppraisalMetadata(appraisalId: string, comparables: ComparableVehicle[]): void {
    try {
      // Import storage service dynamically to avoid circular dependencies
      const { storage } = require('./storage');
      
      storage.updateComparableMetadata(appraisalId, {
        hasComparables: comparables.length > 0,
        comparableCount: comparables.length,
        // Don't update marketAnalysisComplete here - that's done when analysis is calculated
      });
    } catch (error) {
      console.error('Error updating appraisal metadata:', error);
      // Don't throw - metadata update failure shouldn't prevent comparable operations
    }
  }

  /**
   * Save a new comparable vehicle
   */
  async saveComparable(comparable: ComparableVehicle): Promise<boolean> {
    try {
      // Validate before saving
      this.validateComparable(comparable);

      const comparables = this.readComparables(comparable.appraisalId);

      // Check for duplicate ID
      if (comparables.some(c => c.id === comparable.id)) {
        throw new ComparableStorageError(
          `Comparable with ID ${comparable.id} already exists`,
          'DUPLICATE_ID'
        );
      }

      comparables.push(comparable);
      this.writeComparables(comparable.appraisalId, comparables);
      
      // Update appraisal metadata
      this.updateAppraisalMetadata(comparable.appraisalId, comparables);

      return true;
    } catch (error) {
      console.error('Error saving comparable:', error);
      throw error;
    }
  }

  /**
   * Update an existing comparable vehicle
   */
  async updateComparable(id: string, updates: Partial<ComparableVehicle>): Promise<boolean> {
    try {
      if (!id || id.trim() === '') {
        throw new ComparableStorageError('Comparable ID is required', 'INVALID_ID');
      }

      // Need appraisalId to find the file
      if (!updates.appraisalId) {
        throw new ComparableStorageError('Appraisal ID is required for update', 'MISSING_APPRAISAL_ID');
      }

      const comparables = this.readComparables(updates.appraisalId);
      const index = comparables.findIndex(c => c.id === id);

      if (index === -1) {
        return false;
      }

      // Merge updates with existing data
      const updated = {
        ...comparables[index],
        ...updates,
        updatedAt: new Date()
      };

      // Validate the updated comparable
      this.validateComparable(updated);

      comparables[index] = updated;
      this.writeComparables(updates.appraisalId, comparables);
      
      // Update appraisal metadata
      this.updateAppraisalMetadata(updates.appraisalId, comparables);

      return true;
    } catch (error) {
      console.error('Error updating comparable:', error);
      throw error;
    }
  }

  /**
   * Delete a comparable vehicle
   */
  async deleteComparable(id: string, appraisalId: string): Promise<boolean> {
    try {
      if (!id || id.trim() === '') {
        throw new ComparableStorageError('Comparable ID is required', 'INVALID_ID');
      }

      if (!appraisalId || appraisalId.trim() === '') {
        throw new ComparableStorageError('Appraisal ID is required', 'INVALID_APPRAISAL_ID');
      }

      const comparables = this.readComparables(appraisalId);
      const filteredComparables = comparables.filter(c => c.id !== id);

      if (filteredComparables.length === comparables.length) {
        return false; // Comparable not found
      }

      this.writeComparables(appraisalId, filteredComparables);
      
      // Update appraisal metadata
      this.updateAppraisalMetadata(appraisalId, filteredComparables);
      
      return true;
    } catch (error) {
      console.error('Error deleting comparable:', error);
      throw error;
    }
  }

  /**
   * Get all comparables for an appraisal
   */
  async getComparables(appraisalId: string): Promise<ComparableVehicle[]> {
    try {
      if (!appraisalId || appraisalId.trim() === '') {
        throw new ComparableStorageError('Appraisal ID is required', 'INVALID_APPRAISAL_ID');
      }

      return this.readComparables(appraisalId);
    } catch (error) {
      console.error('Error getting comparables:', error);
      throw error;
    }
  }

  /**
   * Get a single comparable by ID
   */
  async getComparable(id: string, appraisalId: string): Promise<ComparableVehicle | undefined> {
    try {
      if (!id || id.trim() === '') {
        throw new ComparableStorageError('Comparable ID is required', 'INVALID_ID');
      }

      if (!appraisalId || appraisalId.trim() === '') {
        throw new ComparableStorageError('Appraisal ID is required', 'INVALID_APPRAISAL_ID');
      }

      const comparables = this.readComparables(appraisalId);
      return comparables.find(c => c.id === id);
    } catch (error) {
      console.error('Error getting comparable:', error);
      throw error;
    }
  }

  /**
   * Delete all comparables for an appraisal
   */
  async deleteComparablesForAppraisal(appraisalId: string): Promise<boolean> {
    try {
      if (!appraisalId || appraisalId.trim() === '') {
        throw new ComparableStorageError('Appraisal ID is required', 'INVALID_APPRAISAL_ID');
      }

      const filePath = this.getStoragePath(appraisalId);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        
        // Update appraisal metadata to reflect no comparables
        this.updateAppraisalMetadata(appraisalId, []);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting comparables for appraisal:', error);
      throw error;
    }
  }

  /**
   * Get count of comparables for an appraisal
   */
  async getComparablesCount(appraisalId: string): Promise<number> {
    try {
      const comparables = await this.getComparables(appraisalId);
      return comparables.length;
    } catch (error) {
      console.error('Error getting comparables count:', error);
      return 0;
    }
  }

  /**
   * Check if an appraisal has any comparables
   */
  async hasComparables(appraisalId: string): Promise<boolean> {
    try {
      const count = await this.getComparablesCount(appraisalId);
      return count > 0;
    } catch (error) {
      console.error('Error checking if appraisal has comparables:', error);
      return false;
    }
  }

  /**
   * Get storage directory path (for testing)
   */
  getStorageDir(): string {
    return COMPARABLES_DIR;
  }
}
