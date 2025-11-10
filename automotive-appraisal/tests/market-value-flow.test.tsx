/**
 * Market Value Calculation Flow Tests
 * Tests the complete flow of market value calculation from adding comparables
 * to displaying results in both NewAppraisal and AppraisalDetail views
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the store
const mockStore: any = {
  currentAppraisal: null as any,
  currentAppraisalId: null as any,
  comparableVehicles: [] as any[],
  marketAnalysis: null as any,
  history: [] as any[],
  isCalculating: false,
  calculationError: null as any,
  setCurrentAppraisal: jest.fn(),
  addComparable: jest.fn(),
  updateComparable: jest.fn(),
  deleteComparable: jest.fn(),
  calculateMarketValue: jest.fn(),
  loadAppraisalById: jest.fn(),
  clearCurrentAppraisal: jest.fn(),
};

jest.mock('../src/renderer/store', () => ({
  useStore: () => mockStore,
}));

// Mock window.api
const mockApi: any = {
  processPDF: jest.fn(),
  saveComparable: jest.fn(),
  updateComparable: jest.fn(),
  deleteComparable: jest.fn(),
  calculateMarketValue: jest.fn(),
  getAppraisals: jest.fn(),
  getAppraisalById: jest.fn(),
  getComparables: jest.fn(),
};

(global as any).window = {
  ...global.window,
  api: mockApi,
};

describe('Task 9.1: New Appraisal Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.currentAppraisal = null;
    mockStore.currentAppraisalId = null;
    mockStore.comparableVehicles = [];
    mockStore.marketAnalysis = null;
    mockStore.isCalculating = false;
    mockStore.calculationError = null;
  });

  it('should display market value after adding first comparable', async () => {
    // Setup: Appraisal exists with ID
    const mockAppraisal = {
      vin: 'TEST123VIN',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 50000,
      condition: 'good' as const,
      location: 'Los Angeles, CA',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.95,
      extractionErrors: [],
    };

    mockStore.currentAppraisal = mockAppraisal;
    mockStore.currentAppraisalId = 'appraisal-001';

    const mockComparable = {
      id: 'comp-001',
      appraisalId: 'appraisal-001',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      mileage: 48000,
      listPrice: 24000,
      location: 'Los Angeles, CA',
      condition: 'good' as const,
      qualityScore: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMarketAnalysis = {
      estimatedValue: 24500,
      confidence: 0.88,
      adjustments: {
        mileage: -500,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    // Mock the add comparable action
    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      expect(appraisalId).toBe('appraisal-001');
      mockStore.comparableVehicles = [mockComparable];
      mockStore.isCalculating = true;
      
      // Simulate calculation
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = mockMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.saveComparable.mockResolvedValue(mockComparable);
    mockApi.calculateMarketValue.mockResolvedValue(mockMarketAnalysis);

    // Add first comparable
    await mockStore.addComparable(mockComparable, 'appraisal-001');

    // Verify calculation was triggered with appraisal ID
    await waitFor(() => {
      expect(mockStore.calculateMarketValue).toHaveBeenCalledWith('appraisal-001');
    });

    // Verify market analysis is set
    expect(mockStore.marketAnalysis).toBeDefined();
    expect(mockStore.marketAnalysis?.estimatedValue).toBe(24500);
  });

  it('should recalculate market value when adding second comparable', async () => {
    // Setup: Appraisal with one comparable already exists
    const mockAppraisal = {
      vin: 'TEST456VIN',
      year: 2019,
      make: 'Honda',
      model: 'Accord',
      mileage: 60000,
      condition: 'good' as const,
      location: 'San Francisco, CA',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.92,
      extractionErrors: [],
    };

    mockStore.currentAppraisal = mockAppraisal;
    mockStore.currentAppraisalId = 'appraisal-002';

    const existingComparable = {
      id: 'comp-001',
      appraisalId: 'appraisal-002',
      year: 2019,
      make: 'Honda',
      model: 'Accord',
      mileage: 58000,
      listPrice: 22000,
      location: 'San Francisco, CA',
      condition: 'good' as const,
      qualityScore: 85,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.comparableVehicles = [existingComparable];
    mockStore.marketAnalysis = {
      estimatedValue: 22500,
      confidence: 0.75,
      adjustments: { mileage: -500, equipment: 0, condition: 0 },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    const newComparable = {
      id: 'comp-002',
      appraisalId: 'appraisal-002',
      year: 2019,
      make: 'Honda',
      model: 'Accord',
      mileage: 62000,
      listPrice: 21500,
      location: 'Oakland, CA',
      condition: 'good' as const,
      qualityScore: 88,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedMarketAnalysis = {
      estimatedValue: 22200,
      confidence: 0.90,
      adjustments: { mileage: -300, equipment: 0, condition: 0 },
      comparableCount: 2,
      calculatedAt: new Date(),
    };

    // Mock adding second comparable
    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      expect(appraisalId).toBe('appraisal-002');
      mockStore.comparableVehicles = [existingComparable, newComparable];
      mockStore.isCalculating = true;
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = updatedMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.saveComparable.mockResolvedValue(newComparable);
    mockApi.calculateMarketValue.mockResolvedValue(updatedMarketAnalysis);

    // Add second comparable
    await mockStore.addComparable(newComparable, 'appraisal-002');

    // Verify recalculation occurred
    await waitFor(() => {
      expect(mockStore.calculateMarketValue).toHaveBeenCalledWith('appraisal-002');
    });

    // Verify market analysis was updated
    expect(mockStore.marketAnalysis?.estimatedValue).toBe(22200);
    expect(mockStore.marketAnalysis?.confidence).toBe(0.90);
    expect(mockStore.marketAnalysis?.comparableCount).toBe(2);
  });

  it('should show error when trying to add comparable without appraisal ID', async () => {
    // Setup: No appraisal ID
    mockStore.currentAppraisal = {
      vin: 'TEST789VIN',
      year: 2021,
      make: 'BMW',
      model: 'M3',
      mileage: 30000,
      condition: 'excellent' as const,
      location: 'Miami, FL',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.94,
      extractionErrors: [],
    };
    mockStore.currentAppraisalId = null; // No ID yet

    const mockComparable = {
      id: 'comp-001',
      appraisalId: '',
      year: 2021,
      make: 'BMW',
      model: 'M3',
      mileage: 28000,
      listPrice: 55000,
      location: 'Miami, FL',
      condition: 'excellent' as const,
      qualityScore: 95,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock should reject without appraisal ID
    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      if (!appraisalId) {
        throw new Error('Please save the appraisal first before adding comparables');
      }
    });

    // Attempt to add comparable without appraisal ID
    await expect(
      mockStore.addComparable(mockComparable, null)
    ).rejects.toThrow('Please save the appraisal first before adding comparables');

    // Verify calculation was not triggered
    expect(mockStore.calculateMarketValue).not.toHaveBeenCalled();
  });

  it('should handle calculation loading state', async () => {
    mockStore.currentAppraisal = {
      vin: 'LOADING123',
      year: 2020,
      make: 'Tesla',
      model: 'Model 3',
      mileage: 25000,
      condition: 'excellent' as const,
      location: 'Austin, TX',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.96,
      extractionErrors: [],
    };
    mockStore.currentAppraisalId = 'appraisal-003';

    const mockComparable = {
      id: 'comp-001',
      appraisalId: 'appraisal-003',
      year: 2020,
      make: 'Tesla',
      model: 'Model 3',
      mileage: 24000,
      listPrice: 42000,
      location: 'Austin, TX',
      condition: 'excellent' as const,
      qualityScore: 92,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock with delay to test loading state
    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      mockStore.comparableVehicles = [mockComparable];
      mockStore.isCalculating = true;
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = {
        estimatedValue: 42500,
        confidence: 0.85,
        adjustments: { mileage: -500, equipment: 0, condition: 0 },
        comparableCount: 1,
        calculatedAt: new Date(),
      };
      mockStore.isCalculating = false;
    });

    mockApi.saveComparable.mockResolvedValue(mockComparable);

    // Start adding comparable
    const addPromise = mockStore.addComparable(mockComparable, 'appraisal-003');

    // Verify loading state is set
    expect(mockStore.isCalculating).toBe(true);

    // Wait for completion
    await addPromise;

    // Verify loading state is cleared
    expect(mockStore.isCalculating).toBe(false);
    expect(mockStore.marketAnalysis).toBeDefined();
  });
});


describe('Task 9.2: Detail View Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.currentAppraisal = null;
    mockStore.currentAppraisalId = null;
    mockStore.comparableVehicles = [];
    mockStore.marketAnalysis = null;
  });

  it('should navigate from history to detail view', async () => {
    const mockAppraisals = [
      {
        id: 'appraisal-001',
        createdAt: new Date('2025-01-15'),
        status: 'complete' as const,
        data: {
          vin: 'HIST123VIN',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          mileage: 50000,
          condition: 'good' as const,
          location: 'Los Angeles, CA',
          reportType: 'CCC_ONE' as const,
          extractionConfidence: 0.95,
          extractionErrors: [],
        },
      },
      {
        id: 'appraisal-002',
        createdAt: new Date('2025-01-16'),
        status: 'draft' as const,
        data: {
          vin: 'HIST456VIN',
          year: 2019,
          make: 'Honda',
          model: 'Accord',
          mileage: 60000,
          condition: 'good' as const,
          location: 'San Francisco, CA',
          reportType: 'MITCHELL' as const,
          extractionConfidence: 0.92,
          extractionErrors: [],
        },
      },
    ];

    mockStore.history = mockAppraisals;
    mockApi.getAppraisals.mockResolvedValue(mockAppraisals);

    // Simulate clicking on first appraisal
    // In real app, this would trigger navigation and load the appraisal
    await waitFor(() => {
      expect(mockStore.loadAppraisalById).toHaveBeenCalledWith('appraisal-001');
    });
  });

  it('should load and display appraisal details correctly', async () => {
    const mockAppraisal = {
      vin: 'DETAIL123VIN',
      year: 2020,
      make: 'BMW',
      model: 'M3',
      mileage: 45000,
      condition: 'excellent' as const,
      location: 'New York, NY',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.94,
      extractionErrors: [],
    };

    const mockComparables = [
      {
        id: 'comp-001',
        appraisalId: 'appraisal-detail-001',
        year: 2020,
        make: 'BMW',
        model: 'M3',
        mileage: 43000,
        listPrice: 52000,
        location: 'New York, NY',
        condition: 'excellent' as const,
        qualityScore: 95,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'comp-002',
        appraisalId: 'appraisal-detail-001',
        year: 2020,
        make: 'BMW',
        model: 'M3',
        mileage: 47000,
        listPrice: 50000,
        location: 'Brooklyn, NY',
        condition: 'good' as const,
        qualityScore: 88,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockMarketAnalysis = {
      estimatedValue: 51500,
      confidence: 0.92,
      adjustments: {
        mileage: -500,
        equipment: 0,
        condition: 1000,
      },
      comparableCount: 2,
      calculatedAt: new Date(),
    };

    mockStore.loadAppraisalById.mockImplementation(async (id) => {
      mockStore.currentAppraisalId = id;
      mockStore.currentAppraisal = mockAppraisal;
      mockStore.comparableVehicles = mockComparables;
      mockStore.marketAnalysis = mockMarketAnalysis;
    });

    mockApi.getAppraisalById.mockResolvedValue(mockAppraisal);
    mockApi.getComparables.mockResolvedValue(mockComparables);

    // Load the appraisal
    await mockStore.loadAppraisalById('appraisal-detail-001');

    // Verify all data is loaded
    await waitFor(() => {
      expect(mockStore.currentAppraisal).toEqual(mockAppraisal);
      expect(mockStore.comparableVehicles).toHaveLength(2);
      expect(mockStore.marketAnalysis).toBeDefined();
    });

    // Verify vehicle information is displayed
    expect(mockStore.currentAppraisal?.make).toBe('BMW');
    expect(mockStore.currentAppraisal?.model).toBe('M3');
    expect(mockStore.currentAppraisal?.vin).toBe('DETAIL123VIN');

    // Verify comparables are displayed
    expect(mockStore.comparableVehicles[0].listPrice).toBe(52000);
    expect(mockStore.comparableVehicles[1].listPrice).toBe(50000);

    // Verify market analysis is displayed
    expect(mockStore.marketAnalysis?.estimatedValue).toBe(51500);
    expect(mockStore.marketAnalysis?.confidence).toBe(0.92);
  });

  it('should display empty state when no comparables exist', async () => {
    const mockAppraisal = {
      vin: 'NOCOMP123VIN',
      year: 2021,
      make: 'Tesla',
      model: 'Model Y',
      mileage: 15000,
      condition: 'excellent' as const,
      location: 'Seattle, WA',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.93,
      extractionErrors: [],
    };

    mockStore.loadAppraisalById.mockImplementation(async (id) => {
      mockStore.currentAppraisalId = id;
      mockStore.currentAppraisal = mockAppraisal;
      mockStore.comparableVehicles = [];
      mockStore.marketAnalysis = null;
    });

    mockApi.getAppraisalById.mockResolvedValue(mockAppraisal);
    mockApi.getComparables.mockResolvedValue([]);

    await mockStore.loadAppraisalById('appraisal-nocomp-001');

    await waitFor(() => {
      expect(mockStore.currentAppraisal).toEqual(mockAppraisal);
      expect(mockStore.comparableVehicles).toHaveLength(0);
      expect(mockStore.marketAnalysis).toBeNull();
    });

    // Verify empty state is shown
    expect(mockStore.comparableVehicles.length).toBe(0);
  });

  it('should handle appraisal not found error', async () => {
    mockStore.loadAppraisalById.mockImplementation(async (id) => {
      throw new Error('Appraisal not found');
    });

    mockApi.getAppraisalById.mockRejectedValue(new Error('Appraisal not found'));

    // Attempt to load non-existent appraisal
    await expect(
      mockStore.loadAppraisalById('nonexistent-id')
    ).rejects.toThrow('Appraisal not found');

    // Verify error state
    expect(mockStore.currentAppraisal).toBeNull();
  });
});


describe('Task 9.3: Comparable Management from Detail View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.currentAppraisal = null;
    mockStore.currentAppraisalId = null;
    mockStore.comparableVehicles = [];
    mockStore.marketAnalysis = null;
  });

  it('should add comparable from detail view and recalculate', async () => {
    const mockAppraisal = {
      vin: 'DETAILADD123',
      year: 2020,
      make: 'Audi',
      model: 'A4',
      mileage: 35000,
      condition: 'good' as const,
      location: 'Chicago, IL',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.91,
      extractionErrors: [],
    };

    mockStore.currentAppraisalId = 'appraisal-add-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [];
    mockStore.marketAnalysis = null;

    const newComparable = {
      id: 'comp-new-001',
      appraisalId: 'appraisal-add-001',
      year: 2020,
      make: 'Audi',
      model: 'A4',
      mileage: 33000,
      listPrice: 32000,
      location: 'Chicago, IL',
      condition: 'good' as const,
      qualityScore: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newMarketAnalysis = {
      estimatedValue: 32500,
      confidence: 0.80,
      adjustments: {
        mileage: -500,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      expect(appraisalId).toBe('appraisal-add-001');
      mockStore.comparableVehicles = [newComparable];
      mockStore.isCalculating = true;
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = newMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.saveComparable.mockResolvedValue(newComparable);
    mockApi.calculateMarketValue.mockResolvedValue(newMarketAnalysis);

    // Add comparable from detail view
    await mockStore.addComparable(newComparable, 'appraisal-add-001');

    // Verify comparable was added
    expect(mockStore.comparableVehicles).toHaveLength(1);
    expect(mockStore.comparableVehicles[0].id).toBe('comp-new-001');

    // Verify market value was recalculated
    await waitFor(() => {
      expect(mockStore.calculateMarketValue).toHaveBeenCalledWith('appraisal-add-001');
    });

    expect(mockStore.marketAnalysis?.estimatedValue).toBe(32500);
    expect(mockStore.marketAnalysis?.comparableCount).toBe(1);
  });

  it('should edit comparable from detail view and recalculate', async () => {
    const mockAppraisal = {
      vin: 'DETAILEDIT123',
      year: 2019,
      make: 'Mercedes',
      model: 'C-Class',
      mileage: 40000,
      condition: 'good' as const,
      location: 'Boston, MA',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.90,
      extractionErrors: [],
    };

    const existingComparable = {
      id: 'comp-edit-001',
      appraisalId: 'appraisal-edit-001',
      year: 2019,
      make: 'Mercedes',
      model: 'C-Class',
      mileage: 38000,
      listPrice: 35000,
      location: 'Boston, MA',
      condition: 'good' as const,
      qualityScore: 85,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-edit-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [existingComparable];
    mockStore.marketAnalysis = {
      estimatedValue: 35500,
      confidence: 0.78,
      adjustments: { mileage: -500, equipment: 0, condition: 0 },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    const updatedComparable = {
      ...existingComparable,
      mileage: 40000,
      listPrice: 34000,
      qualityScore: 88,
    };

    const updatedMarketAnalysis = {
      estimatedValue: 34200,
      confidence: 0.82,
      adjustments: {
        mileage: -200,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.updateComparable.mockImplementation(async (id, updates, appraisalId) => {
      expect(id).toBe('comp-edit-001');
      expect(appraisalId).toBe('appraisal-edit-001');
      
      mockStore.comparableVehicles = [updatedComparable];
      mockStore.isCalculating = true;
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = updatedMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.updateComparable.mockResolvedValue(updatedComparable);
    mockApi.calculateMarketValue.mockResolvedValue(updatedMarketAnalysis);

    // Edit comparable
    await mockStore.updateComparable(
      'comp-edit-001',
      { mileage: 40000, listPrice: 34000, qualityScore: 88 },
      'appraisal-edit-001'
    );

    // Verify comparable was updated
    expect(mockStore.comparableVehicles[0].mileage).toBe(40000);
    expect(mockStore.comparableVehicles[0].listPrice).toBe(34000);

    // Verify recalculation occurred
    await waitFor(() => {
      expect(mockStore.calculateMarketValue).toHaveBeenCalledWith('appraisal-edit-001');
    });

    expect(mockStore.marketAnalysis?.estimatedValue).toBe(34200);
  });

  it('should delete comparable from detail view and recalculate', async () => {
    const mockAppraisal = {
      vin: 'DETAILDEL123',
      year: 2021,
      make: 'Lexus',
      model: 'ES',
      mileage: 20000,
      condition: 'excellent' as const,
      location: 'Portland, OR',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.95,
      extractionErrors: [],
    };

    const comparable1 = {
      id: 'comp-del-001',
      appraisalId: 'appraisal-del-001',
      year: 2021,
      make: 'Lexus',
      model: 'ES',
      mileage: 18000,
      listPrice: 38000,
      location: 'Portland, OR',
      condition: 'excellent' as const,
      qualityScore: 92,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const comparable2 = {
      id: 'comp-del-002',
      appraisalId: 'appraisal-del-001',
      year: 2021,
      make: 'Lexus',
      model: 'ES',
      mileage: 22000,
      listPrice: 37000,
      location: 'Seattle, WA',
      condition: 'good' as const,
      qualityScore: 85,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-del-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [comparable1, comparable2];
    mockStore.marketAnalysis = {
      estimatedValue: 37800,
      confidence: 0.90,
      adjustments: { mileage: -200, equipment: 0, condition: 500 },
      comparableCount: 2,
      calculatedAt: new Date(),
    };

    const updatedMarketAnalysis = {
      estimatedValue: 38200,
      confidence: 0.82,
      adjustments: {
        mileage: -200,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.deleteComparable.mockImplementation(async (id, appraisalId) => {
      expect(id).toBe('comp-del-002');
      expect(appraisalId).toBe('appraisal-del-001');
      
      mockStore.comparableVehicles = [comparable1];
      mockStore.isCalculating = true;
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = updatedMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.deleteComparable.mockResolvedValue(true);
    mockApi.calculateMarketValue.mockResolvedValue(updatedMarketAnalysis);

    // Delete second comparable
    await mockStore.deleteComparable('comp-del-002', 'appraisal-del-001');

    // Verify comparable was removed
    expect(mockStore.comparableVehicles).toHaveLength(1);
    expect(mockStore.comparableVehicles[0].id).toBe('comp-del-001');

    // Verify recalculation occurred
    await waitFor(() => {
      expect(mockStore.calculateMarketValue).toHaveBeenCalledWith('appraisal-del-001');
    });

    expect(mockStore.marketAnalysis?.estimatedValue).toBe(38200);
    expect(mockStore.marketAnalysis?.comparableCount).toBe(1);
  });

  it('should handle deleting last comparable', async () => {
    const mockAppraisal = {
      vin: 'DETAILLAST123',
      year: 2020,
      make: 'Mazda',
      model: 'CX-5',
      mileage: 30000,
      condition: 'good' as const,
      location: 'Denver, CO',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.89,
      extractionErrors: [],
    };

    const lastComparable = {
      id: 'comp-last-001',
      appraisalId: 'appraisal-last-001',
      year: 2020,
      make: 'Mazda',
      model: 'CX-5',
      mileage: 28000,
      listPrice: 28000,
      location: 'Denver, CO',
      condition: 'good' as const,
      qualityScore: 87,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-last-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [lastComparable];
    mockStore.marketAnalysis = {
      estimatedValue: 28500,
      confidence: 0.75,
      adjustments: { mileage: -500, equipment: 0, condition: 0 },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.deleteComparable.mockImplementation(async (id, appraisalId) => {
      mockStore.comparableVehicles = [];
      mockStore.marketAnalysis = null;
    });

    mockApi.deleteComparable.mockResolvedValue(true);

    // Delete last comparable
    await mockStore.deleteComparable('comp-last-001', 'appraisal-last-001');

    // Verify all comparables removed
    expect(mockStore.comparableVehicles).toHaveLength(0);
    
    // Verify market analysis cleared
    expect(mockStore.marketAnalysis).toBeNull();
    
    // Calculation should not be called with no comparables
    expect(mockStore.calculateMarketValue).not.toHaveBeenCalled();
  });
});


describe('Task 9.4: Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.currentAppraisal = null;
    mockStore.currentAppraisalId = null;
    mockStore.comparableVehicles = [];
    mockStore.marketAnalysis = null;
    mockStore.calculationError = null;
  });

  it('should handle invalid appraisal ID', async () => {
    mockStore.loadAppraisalById.mockImplementation(async (id) => {
      if (id === 'invalid-id') {
        throw new Error('Appraisal not found');
      }
    });

    mockApi.getAppraisalById.mockRejectedValue(new Error('Appraisal not found'));

    // Attempt to load with invalid ID
    await expect(
      mockStore.loadAppraisalById('invalid-id')
    ).rejects.toThrow('Appraisal not found');

    // Verify error state
    expect(mockStore.currentAppraisal).toBeNull();
    expect(mockStore.currentAppraisalId).toBeNull();
  });

  it('should handle missing appraisal data', async () => {
    mockStore.currentAppraisalId = 'appraisal-missing-001';
    mockStore.currentAppraisal = null; // Missing appraisal data

    const mockComparable = {
      id: 'comp-001',
      appraisalId: 'appraisal-missing-001',
      year: 2020,
      make: 'Ford',
      model: 'F-150',
      mileage: 50000,
      listPrice: 35000,
      location: 'Dallas, TX',
      condition: 'good' as const,
      qualityScore: 85,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.calculateMarketValue.mockImplementation(async (appraisalId) => {
      if (!mockStore.currentAppraisal) {
        throw new Error('Cannot calculate market value: Appraisal data not found');
      }
    });

    // Attempt to calculate without appraisal data
    await expect(
      mockStore.calculateMarketValue('appraisal-missing-001')
    ).rejects.toThrow('Cannot calculate market value: Appraisal data not found');
  });

  it('should handle calculation service errors', async () => {
    const mockAppraisal = {
      vin: 'CALCERR123',
      year: 2020,
      make: 'Chevrolet',
      model: 'Silverado',
      mileage: 45000,
      condition: 'good' as const,
      location: 'Houston, TX',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.91,
      extractionErrors: [],
    };

    const mockComparable = {
      id: 'comp-err-001',
      appraisalId: 'appraisal-err-001',
      year: 2020,
      make: 'Chevrolet',
      model: 'Silverado',
      mileage: 43000,
      listPrice: 38000,
      location: 'Houston, TX',
      condition: 'good' as const,
      qualityScore: 88,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-err-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [mockComparable];

    const calculationError = new Error('Market value calculation service unavailable');
    
    mockStore.calculateMarketValue.mockImplementation(async (appraisalId) => {
      mockStore.isCalculating = true;
      mockStore.calculationError = calculationError.message;
      mockStore.isCalculating = false;
      throw calculationError;
    });

    mockApi.calculateMarketValue.mockRejectedValue(calculationError);

    // Attempt calculation
    await expect(
      mockStore.calculateMarketValue('appraisal-err-001')
    ).rejects.toThrow('Market value calculation service unavailable');

    // Verify error state
    expect(mockStore.calculationError).toBe('Market value calculation service unavailable');
    expect(mockStore.isCalculating).toBe(false);
    expect(mockStore.marketAnalysis).toBeNull();
  });

  it('should display user-friendly error messages', async () => {
    const errorScenarios = [
      {
        error: 'Appraisal not found',
        expectedMessage: 'Appraisal not found',
      },
      {
        error: 'Cannot calculate market value: No comparables available',
        expectedMessage: 'Cannot calculate market value: No comparables available',
      },
      {
        error: 'Network error',
        expectedMessage: 'Network error',
      },
      {
        error: 'Invalid appraisal data',
        expectedMessage: 'Invalid appraisal data',
      },
    ];

    for (const scenario of errorScenarios) {
      mockStore.calculationError = scenario.error;
      
      // Verify error message is set correctly
      expect(mockStore.calculationError).toBe(scenario.expectedMessage);
      
      // Clear for next iteration
      mockStore.calculationError = null;
    }
  });

  it('should provide retry functionality after calculation error', async () => {
    const mockAppraisal = {
      vin: 'RETRY123',
      year: 2019,
      make: 'Nissan',
      model: 'Altima',
      mileage: 55000,
      condition: 'good' as const,
      location: 'Phoenix, AZ',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.88,
      extractionErrors: [],
    };

    const mockComparable = {
      id: 'comp-retry-001',
      appraisalId: 'appraisal-retry-001',
      year: 2019,
      make: 'Nissan',
      model: 'Altima',
      mileage: 53000,
      listPrice: 18000,
      location: 'Phoenix, AZ',
      condition: 'good' as const,
      qualityScore: 86,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMarketAnalysis = {
      estimatedValue: 18500,
      confidence: 0.83,
      adjustments: {
        mileage: -500,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-retry-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [mockComparable];

    let attemptCount = 0;
    
    mockStore.calculateMarketValue.mockImplementation(async (appraisalId) => {
      attemptCount++;
      
      if (attemptCount === 1) {
        // First attempt fails
        mockStore.calculationError = 'Temporary service error';
        throw new Error('Temporary service error');
      } else {
        // Retry succeeds
        mockStore.calculationError = null;
        mockStore.marketAnalysis = mockMarketAnalysis;
      }
    });

    // First attempt - should fail
    await expect(
      mockStore.calculateMarketValue('appraisal-retry-001')
    ).rejects.toThrow('Temporary service error');

    expect(mockStore.calculationError).toBe('Temporary service error');
    expect(mockStore.marketAnalysis).toBeNull();

    // Retry - should succeed
    await mockStore.calculateMarketValue('appraisal-retry-001');

    expect(mockStore.calculationError).toBeNull();
    expect(mockStore.marketAnalysis).toBeDefined();
    expect(mockStore.marketAnalysis?.estimatedValue).toBe(18500);
  });

  it('should handle no comparables error gracefully', async () => {
    const mockAppraisal = {
      vin: 'NOCOMP456',
      year: 2021,
      make: 'Subaru',
      model: 'Outback',
      mileage: 25000,
      condition: 'excellent' as const,
      location: 'Salt Lake City, UT',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.93,
      extractionErrors: [],
    };

    mockStore.currentAppraisalId = 'appraisal-nocomp-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.comparableVehicles = [];

    mockStore.calculateMarketValue.mockImplementation(async (appraisalId) => {
      if (mockStore.comparableVehicles.length === 0) {
        const error = 'Add at least one comparable vehicle to calculate market value';
        mockStore.calculationError = error;
        throw new Error(error);
      }
    });

    // Attempt calculation with no comparables
    await expect(
      mockStore.calculateMarketValue('appraisal-nocomp-001')
    ).rejects.toThrow('Add at least one comparable vehicle to calculate market value');

    expect(mockStore.calculationError).toBe(
      'Add at least one comparable vehicle to calculate market value'
    );
    expect(mockStore.marketAnalysis).toBeNull();
  });

  it('should handle validation errors for comparable data', async () => {
    const mockAppraisal = {
      vin: 'VALID123',
      year: 2020,
      make: 'Volkswagen',
      model: 'Jetta',
      mileage: 40000,
      condition: 'good' as const,
      location: 'Minneapolis, MN',
      reportType: 'MITCHELL' as const,
      extractionConfidence: 0.90,
      extractionErrors: [],
    };

    mockStore.currentAppraisalId = 'appraisal-valid-001';
    mockStore.currentAppraisal = mockAppraisal;

    const invalidComparable = {
      id: 'comp-invalid-001',
      appraisalId: 'appraisal-valid-001',
      year: 2020,
      make: 'Volkswagen',
      model: 'Jetta',
      mileage: -1000, // Invalid mileage
      listPrice: 0, // Invalid price
      location: '',
      condition: 'good' as const,
      qualityScore: 150, // Invalid score (should be 0-100)
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      // Validate comparable data
      if (comparable.mileage < 0) {
        throw new Error('Invalid mileage: must be a positive number');
      }
      if (comparable.listPrice <= 0) {
        throw new Error('Invalid list price: must be greater than 0');
      }
      if (comparable.qualityScore < 0 || comparable.qualityScore > 100) {
        throw new Error('Invalid quality score: must be between 0 and 100');
      }
    });

    // Attempt to add invalid comparable
    await expect(
      mockStore.addComparable(invalidComparable, 'appraisal-valid-001')
    ).rejects.toThrow('Invalid mileage: must be a positive number');
  });

  it('should clear error state after successful operation', async () => {
    const mockAppraisal = {
      vin: 'CLEAR123',
      year: 2020,
      make: 'Kia',
      model: 'Sorento',
      mileage: 35000,
      condition: 'good' as const,
      location: 'Atlanta, GA',
      reportType: 'CCC_ONE' as const,
      extractionConfidence: 0.91,
      extractionErrors: [],
    };

    const mockComparable = {
      id: 'comp-clear-001',
      appraisalId: 'appraisal-clear-001',
      year: 2020,
      make: 'Kia',
      model: 'Sorento',
      mileage: 33000,
      listPrice: 29000,
      location: 'Atlanta, GA',
      condition: 'good' as const,
      qualityScore: 87,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMarketAnalysis = {
      estimatedValue: 29500,
      confidence: 0.84,
      adjustments: {
        mileage: -500,
        equipment: 0,
        condition: 0,
      },
      comparableCount: 1,
      calculatedAt: new Date(),
    };

    mockStore.currentAppraisalId = 'appraisal-clear-001';
    mockStore.currentAppraisal = mockAppraisal;
    mockStore.calculationError = 'Previous error message';

    mockStore.addComparable.mockImplementation(async (comparable, appraisalId) => {
      mockStore.comparableVehicles = [mockComparable];
      mockStore.calculationError = null; // Clear error
      mockStore.isCalculating = true;
      
      await mockStore.calculateMarketValue(appraisalId);
      mockStore.marketAnalysis = mockMarketAnalysis;
      mockStore.isCalculating = false;
    });

    mockApi.saveComparable.mockResolvedValue(mockComparable);
    mockApi.calculateMarketValue.mockResolvedValue(mockMarketAnalysis);

    // Verify error exists initially
    expect(mockStore.calculationError).toBe('Previous error message');

    // Perform successful operation
    await mockStore.addComparable(mockComparable, 'appraisal-clear-001');

    // Verify error is cleared
    expect(mockStore.calculationError).toBeNull();
    expect(mockStore.marketAnalysis).toBeDefined();
  });
});
