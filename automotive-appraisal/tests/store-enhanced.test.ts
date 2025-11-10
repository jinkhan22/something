import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { useAppStore } from '../src/renderer/store';
import { ValidationResult, FieldValidation, SearchFilters } from '../src/types';

describe('Enhanced Store - Validation State', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    jest.clearAllMocks();
  });

  it('should set validation results and calculate error/warning flags', () => {
    const store = useAppStore.getState();
    const results: ValidationResult[] = [
      { field: 'vin', isValid: true, warnings: [], errors: [], confidence: 95 },
      { field: 'year', isValid: false, warnings: ['Year seems unusual'], errors: ['Invalid year format'], confidence: 40 }
    ];
    store.setValidationResults(results);
    const state = useAppStore.getState();
    expect(state.validationResults).toEqual(results);
    expect(state.hasValidationErrors).toBe(true);
    expect(state.hasValidationWarnings).toBe(true);
  });

  it('should clear validation state', () => {
    const store = useAppStore.getState();
    store.setValidationResults([
      { field: 'vin', isValid: false, warnings: [], errors: ['Invalid VIN'], confidence: 30 }
    ]);
    store.clearValidation();
    const state = useAppStore.getState();
    expect(state.validationResults).toEqual([]);
    expect(state.fieldValidation).toBeNull();
    expect(state.hasValidationErrors).toBe(false);
    expect(state.hasValidationWarnings).toBe(false);
  });
});

describe('Enhanced Store - Settings State', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('should have default settings', () => {
    const state = useAppStore.getState();
    expect(state.settings.autoOCRFallback).toBe(true);
    expect(state.settings.ocrQuality).toBe('balanced');
    expect(state.settings.defaultExportFormat).toBe('csv');
  });
});

describe('Enhanced Store - Search and Filtering', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('should filter by make', () => {
    const store = useAppStore.getState();
    store.addToHistory({
      id: '1',
      createdAt: new Date(),
      status: 'complete',
      data: { vin: '1HG', year: 2021, make: 'Honda', model: 'Accord', mileage: 50000, location: 'CA', reportType: 'CCC_ONE', extractionConfidence: 90, extractionErrors: [] }
    });
    store.setSearchFilters({ make: 'Honda' });
    expect(useAppStore.getState().filteredAppraisals).toHaveLength(1);
  });
});
