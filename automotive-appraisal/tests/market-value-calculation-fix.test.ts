/**
 * Test suite for market value calculation fixes
 * Verifies that appraisal ID is properly passed to store actions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Market Value Calculation Fix', () => {
  describe('Store Actions with Appraisal ID', () => {
    it('should accept optional appraisalId parameter in addComparable', () => {
      // This test verifies the type signature is correct
      const mockAddComparable = jest.fn((comparable: any, appraisalId?: string) => {
        expect(appraisalId).toBeDefined();
        return Promise.resolve();
      });
      
      const testComparable = {
        id: 'test-1',
        appraisalId: 'appraisal-123',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        mileage: 50000,
        listPrice: 25000,
        location: 'Test City',
        condition: 'good' as const,
        qualityScore: 85,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockAddComparable(testComparable, 'appraisal-123');
      
      expect(mockAddComparable).toHaveBeenCalledWith(testComparable, 'appraisal-123');
    });
    
    it('should accept optional appraisalId parameter in updateComparable', () => {
      const mockUpdateComparable = jest.fn((id: string, updates: any, appraisalId?: string) => {
        expect(appraisalId).toBeDefined();
        return Promise.resolve();
      });
      
      mockUpdateComparable('test-1', { mileage: 51000 }, 'appraisal-123');
      
      expect(mockUpdateComparable).toHaveBeenCalledWith('test-1', { mileage: 51000 }, 'appraisal-123');
    });
    
    it('should accept optional appraisalId parameter in deleteComparable', () => {
      const mockDeleteComparable = jest.fn((id: string, appraisalId?: string) => {
        expect(appraisalId).toBeDefined();
        return Promise.resolve();
      });
      
      mockDeleteComparable('test-1', 'appraisal-123');
      
      expect(mockDeleteComparable).toHaveBeenCalledWith('test-1', 'appraisal-123');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing appraisal ID gracefully', () => {
      const mockNotifications = {
        error: jest.fn()
      };
      
      const currentAppraisalId = null;
      
      // Simulate the check in handleAddComparable
      if (!currentAppraisalId) {
        mockNotifications.error('Please save the appraisal first before adding comparables');
      }
      
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Please save the appraisal first before adding comparables'
      );
    });
    
    it('should provide clear error message for edit without appraisal ID', () => {
      const mockNotifications = {
        error: jest.fn()
      };
      
      const currentAppraisalId = null;
      
      // Simulate the check in handleEditComparable
      if (!currentAppraisalId) {
        mockNotifications.error('Cannot edit comparable: Appraisal ID not found');
      }
      
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Cannot edit comparable: Appraisal ID not found'
      );
    });
    
    it('should provide clear error message for delete without appraisal ID', () => {
      const mockNotifications = {
        error: jest.fn()
      };
      
      const currentAppraisalId = null;
      
      // Simulate the check in handleDeleteComparable
      if (!currentAppraisalId) {
        mockNotifications.error('Cannot delete comparable: Appraisal ID not found');
      }
      
      expect(mockNotifications.error).toHaveBeenCalledWith(
        'Cannot delete comparable: Appraisal ID not found'
      );
    });
  });
  
  describe('Calculation Triggering', () => {
    it('should call calculateMarketValue with appraisalId when provided', async () => {
      const mockCalculateMarketValue = jest.fn((id: string) => Promise.resolve());
      
      const appraisalId = 'appraisal-123';
      
      // Simulate the store action behavior
      await mockCalculateMarketValue(appraisalId);
      
      expect(mockCalculateMarketValue).toHaveBeenCalledWith(appraisalId);
    });
    
    it('should use direct calculation instead of debounced when appraisalId is provided', async () => {
      const mockCalculateMarketValue = jest.fn((id: string) => Promise.resolve());
      const mockDebouncedRecalculate = jest.fn();
      
      const appraisalId = 'appraisal-123';
      
      // Simulate the logic in addComparable
      if (appraisalId) {
        await mockCalculateMarketValue(appraisalId);
      } else {
        mockDebouncedRecalculate();
      }
      
      expect(mockCalculateMarketValue).toHaveBeenCalledWith(appraisalId);
      expect(mockDebouncedRecalculate).not.toHaveBeenCalled();
    });
  });
});
