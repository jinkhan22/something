import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  ExtractedVehicleData, 
  ProcessingStatus, 
  AppraisalRecord, 
  AppError, 
  ErrorType,
  ValidationResult,
  FieldValidation,
  AppSettings,
  SearchFilters,
  ComparableVehicle,
  MarketAnalysis,
  MarketValueCalculation,
  ReportValidationResult,
  ReportValidationError,
  ReportHistoryRecord
} from '../types';
import { formatErrorForDisplay } from './services/errorMessageMapper';

/**
 * Debounce utility for store actions
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

interface AppState {
  // Current appraisal being processed
  currentAppraisal: ExtractedVehicleData | null;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  processingMessage: string;
  
  // OCR-specific state
  ocrProcessingActive: boolean;
  ocrConfidence: number;
  extractionMethod: 'standard' | 'ocr' | 'hybrid' | null;
  
  // Validation state
  validationResults: ValidationResult[];
  fieldValidation: FieldValidation | null;
  hasValidationErrors: boolean;
  hasValidationWarnings: boolean;
  
  // Enhanced error state management
  error: AppError | null;
  errorMessage: string | null;
  errorDetails: unknown | null;
  
  // History loading and management state
  appraisalHistory: AppraisalRecord[];
  historyLoading: boolean;
  historyError: string | null;
  
  // Settings state
  settings: AppSettings;
  settingsLoading: boolean;
  settingsError: string | null;
  
  // Search and filter state
  searchFilters: SearchFilters;
  filteredAppraisals: AppraisalRecord[];
  
  // Comparable vehicles state
  comparableVehicles: ComparableVehicle[];
  currentComparable: ComparableVehicle | null;
  comparablesLoading: boolean;
  comparablesError: string | null;
  
  // Market analysis state
  marketAnalysis: MarketAnalysis | null;
  marketAnalysisLoading: boolean;
  marketAnalysisError: string | null;
  calculationBreakdown: MarketValueCalculation | null;
  
  // Insurance comparison state
  insuranceValue: number | null;
  calculatedMarketValue: number | null;
  valueDifference: number | null;
  valueDifferencePercentage: number | null;
  isUndervalued: boolean;
  
  // Report history state
  reportHistory: ReportHistoryRecord[];
  reportHistoryLoading: boolean;
  reportHistoryError: string | null;
  
  // Performance optimization - Calculation caching
  calculationCache: Map<string, {
    marketValue: number;
    breakdown: MarketValueCalculation;
    timestamp: number;
    comparablesHash: string;
  }>;
  geocodingCache: Map<string, { latitude: number; longitude: number; timestamp: number }>;
  
  // Performance optimization - Pagination
  comparablesPagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
  
  // Performance optimization - Background processing
  geocodingProgress: {
    total: number;
    completed: number;
    inProgress: boolean;
  };
  
  // Performance optimization - Debouncing
  isRecalculating: boolean;
  recalculationPending: boolean;
  
  // UI state management for sidebar and navigation
  sidebarCollapsed: boolean;
  currentPage: string;
  theme: 'light' | 'dark';
  
  // Actions - Processing
  setAppraisal: (data: ExtractedVehicleData) => void;
  updateAppraisalData: (data: ExtractedVehicleData) => Promise<void>;
  setStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number) => void;
  setProcessingMessage: (message: string) => void;
  setProcessingStatus: (status: ProcessingStatus, progress?: number, message?: string) => void;
  
  // Actions - OCR
  setOCRStatus: (active: boolean, confidence?: number) => void;
  setExtractionMethod: (method: 'standard' | 'ocr' | 'hybrid' | null) => void;
  
  // Actions - Validation
  setValidationResults: (results: ValidationResult[]) => void;
  setFieldValidation: (validation: FieldValidation | null) => void;
  clearValidation: () => void;
  validateCurrentAppraisal: () => Promise<void>;
  validateForReport: () => ReportValidationResult;
  
  // Actions - Error handling
  setError: (error: string | null) => void;
  setAppError: (error: AppError | null) => void;
  createError: (type: ErrorType, message: string, details?: unknown, recoverable?: boolean, suggestedAction?: string) => void;
  clearError: () => void;
  
  // Actions - History management
  loadHistory: () => Promise<void>;
  addToHistory: (record: AppraisalRecord) => void;
  updateHistoryItem: (id: string, updates: Partial<AppraisalRecord>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadAppraisalById: (id: string) => Promise<void>;
  setCurrentAppraisalById: (id: string) => void;
  
  // Actions - Settings management
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => void;
  
  // Actions - Search and filtering
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearchFilters: () => void;
  applyFilters: () => void;
  
  // Actions - Comparable vehicles management
  loadComparables: (appraisalId: string) => Promise<void>;
  addComparable: (comparable: ComparableVehicle, appraisalId?: string) => Promise<void>;
  updateComparable: (id: string, updates: Partial<ComparableVehicle>, appraisalId?: string) => Promise<void>;
  deleteComparable: (id: string, appraisalId?: string) => Promise<void>;
  setCurrentComparable: (comparable: ComparableVehicle | null) => void;
  clearComparables: () => void;
  
  // Actions - Market analysis calculations
  calculateMarketValue: (appraisalId: string) => Promise<void>;
  recalculateMarketValue: (appraisalId?: string) => Promise<void>;
  debouncedRecalculateMarketValue: (appraisalId?: string) => void;
  setMarketAnalysis: (analysis: MarketAnalysis | null) => void;
  setCalculationBreakdown: (breakdown: MarketValueCalculation | null) => void;
  clearMarketAnalysis: () => void;
  
  // Actions - Insurance comparison
  updateInsuranceComparison: () => void;
  setInsuranceValue: (value: number | null) => void;
  
  // Actions - Report history management
  loadReportHistory: () => Promise<void>;
  addReportToHistory: (report: ReportHistoryRecord) => Promise<void>;
  deleteReportFromHistory: (id: string) => Promise<void>;
  
  // Actions - Performance optimization
  getCachedMarketValue: (appraisalId: string, comparablesHash: string) => { marketValue: number; breakdown: MarketValueCalculation } | null;
  setCachedMarketValue: (appraisalId: string, comparablesHash: string, marketValue: number, breakdown: MarketValueCalculation) => void;
  clearCalculationCache: () => void;
  getCachedGeolocation: (location: string) => { latitude: number; longitude: number } | null;
  setCachedGeolocation: (location: string, coordinates: { latitude: number; longitude: number }) => void;
  clearGeolocationCache: () => void;
  setComparablesPagination: (page: number, pageSize: number) => void;
  getPagedComparables: () => ComparableVehicle[];
  setGeocodingProgress: (total: number, completed: number, inProgress: boolean) => void;
  
  // Actions - UI state
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Actions - General
  reset: () => void;
  resetProcessing: () => void;
}

// Separate persisted state from non-persisted state
interface PersistedState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state - Processing
      currentAppraisal: null,
      processingStatus: 'idle',
      processingProgress: 0,
      processingMessage: '',
      
      // Initial state - OCR
      ocrProcessingActive: false,
      ocrConfidence: 0,
      extractionMethod: null,
      
      // Initial state - Validation
      validationResults: [],
      fieldValidation: null,
      hasValidationErrors: false,
      hasValidationWarnings: false,
      
      // Initial state - Error management
      error: null,
      errorMessage: null,
      errorDetails: null,
      
      // Initial state - History
      appraisalHistory: [],
      historyLoading: false,
      historyError: null,
      
      // Initial state - Settings
      settings: {
        autoOCRFallback: true,
        ocrQuality: 'balanced',
        confidenceThresholds: {
          warning: 60,
          error: 40
        },
        defaultExportFormat: 'csv',
        defaultSaveLocation: ''
      },
      settingsLoading: false,
      settingsError: null,
      
      // Initial state - Search and filtering
      searchFilters: {},
      filteredAppraisals: [],
      
      // Initial state - Comparable vehicles
      comparableVehicles: [],
      currentComparable: null,
      comparablesLoading: false,
      comparablesError: null,
      
      // Initial state - Market analysis
      marketAnalysis: null,
      marketAnalysisLoading: false,
      marketAnalysisError: null,
      calculationBreakdown: null,
      
      // Initial state - Insurance comparison
      insuranceValue: null,
      calculatedMarketValue: null,
      valueDifference: null,
      valueDifferencePercentage: null,
      isUndervalued: false,
      
      // Initial state - Report history
      reportHistory: [],
      reportHistoryLoading: false,
      reportHistoryError: null,
      
      // Initial state - Performance optimization
      calculationCache: new Map(),
      geocodingCache: new Map(),
      comparablesPagination: {
        currentPage: 1,
        pageSize: 20,
        totalPages: 1
      },
      geocodingProgress: {
        total: 0,
        completed: 0,
        inProgress: false
      },
      isRecalculating: false,
      recalculationPending: false,
      
      // Initial state - UI (persisted)
      sidebarCollapsed: false,
      currentPage: 'dashboard',
      theme: 'light',
      
      // Processing actions
      setAppraisal: (data) => set({ currentAppraisal: data }),
      updateAppraisalData: async (data: ExtractedVehicleData) => {
        const previousCondition = get().currentAppraisal?.condition;
        const newCondition = data.condition;
        
        // Update the current appraisal
        set({ currentAppraisal: data });
        
        // If condition changed and we have comparables, recalculate market value
        if (previousCondition !== newCondition && get().comparableVehicles.length > 0) {
          console.log('Loss vehicle condition changed, triggering recalculation...', {
            previousCondition,
            newCondition,
            comparablesCount: get().comparableVehicles.length
          });
          
          // Clear the calculation cache to force recalculation
          get().clearCalculationCache();
          
          // Use debounced recalculation to prevent excessive calculations
          get().debouncedRecalculateMarketValue();
        }
      },
      setStatus: (status) => set({ processingStatus: status }),
      setProgress: (progress) => set({ processingProgress: progress }),
      setProcessingMessage: (message) => set({ processingMessage: message }),
      setProcessingStatus: (status, progress, message) => set({
        processingStatus: status,
        ...(progress !== undefined && { processingProgress: progress }),
        ...(message !== undefined && { processingMessage: message })
      }),
      
      // OCR actions
      setOCRStatus: (active, confidence) => set({
        ocrProcessingActive: active,
        ...(confidence !== undefined && { ocrConfidence: confidence })
      }),
      setExtractionMethod: (method) => set({ extractionMethod: method }),
      
      // Validation actions
      setValidationResults: (results) => {
        const hasErrors = results.some(r => r.errors.length > 0);
        const hasWarnings = results.some(r => r.warnings.length > 0);
        set({ 
          validationResults: results,
          hasValidationErrors: hasErrors,
          hasValidationWarnings: hasWarnings
        });
      },
      setFieldValidation: (validation) => {
        const hasErrors = validation ? Object.values(validation).some(v => v && v.errors.length > 0) : false;
        const hasWarnings = validation ? Object.values(validation).some(v => v && v.warnings.length > 0) : false;
        set({ 
          fieldValidation: validation,
          hasValidationErrors: hasErrors,
          hasValidationWarnings: hasWarnings
        });
      },
      clearValidation: () => set({
        validationResults: [],
        fieldValidation: null,
        hasValidationErrors: false,
        hasValidationWarnings: false
      }),
      validateCurrentAppraisal: async () => {
        const { currentAppraisal } = get();
        if (!currentAppraisal) return;
        
        try {
          const validation = await window.electron.validateVehicleData(currentAppraisal);
          get().setFieldValidation(validation);
          
          // Convert field validation to validation results array
          const results: ValidationResult[] = Object.entries(validation)
            .filter(([_, v]) => v !== undefined)
            .map(([field, v]) => ({
              field,
              isValid: v!.isValid,
              warnings: v!.warnings,
              errors: v!.errors,
              confidence: v!.confidence
            }));
          
          get().setValidationResults(results);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Validation failed';
          get().createError(
            ErrorType.PROCESSING_FAILED,
            errorMessage,
            error,
            true,
            'Try validating the data again'
          );
        }
      },
      
      validateForReport: () => {
        const { currentAppraisal, comparableVehicles, calculatedMarketValue } = get();
        const errors: ReportValidationResult['errors'] = [];
        const warnings: ReportValidationResult['warnings'] = [];
        
        // Check if loss vehicle exists
        if (!currentAppraisal) {
          errors.push({
            field: 'lossVehicle',
            error: ReportValidationError.MISSING_LOSS_VEHICLE,
            message: 'No loss vehicle data available',
            suggestedAction: 'Load or extract vehicle data from a PDF before generating a report'
          });
          return { isValid: false, errors, warnings };
        }
        
        // Check loss vehicle required fields
        const requiredVehicleFields: Array<{ key: keyof ExtractedVehicleData; label: string }> = [
          { key: 'vin', label: 'VIN' },
          { key: 'year', label: 'Year' },
          { key: 'make', label: 'Make' },
          { key: 'model', label: 'Model' },
          { key: 'mileage', label: 'Mileage' },
          { key: 'condition', label: 'Condition' }
        ];
        
        for (const { key, label } of requiredVehicleFields) {
          const value = currentAppraisal[key];
          if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && key !== 'year')) {
            errors.push({
              field: `lossVehicle.${key}`,
              error: ReportValidationError.MISSING_REQUIRED_FIELD,
              message: `Loss vehicle ${label} is missing or invalid`,
              suggestedAction: `Enter the ${label} for the loss vehicle`
            });
          }
        }
        
        // Check if at least 3 comparables exist
        if (comparableVehicles.length < 3) {
          errors.push({
            field: 'comparables',
            error: ReportValidationError.INSUFFICIENT_COMPARABLES,
            message: `At least 3 comparable vehicles are required (currently ${comparableVehicles.length})`,
            suggestedAction: 'Add more comparable vehicles to meet the minimum requirement'
          });
        }
        
        // Check all comparables have required fields
        const requiredComparableFields: Array<{ key: keyof ComparableVehicle; label: string }> = [
          { key: 'year', label: 'Year' },
          { key: 'make', label: 'Make' },
          { key: 'model', label: 'Model' },
          { key: 'mileage', label: 'Mileage' },
          { key: 'listPrice', label: 'List Price' },
          { key: 'location', label: 'Location' },
          { key: 'condition', label: 'Condition' }
        ];
        
        comparableVehicles.forEach((comparable, index) => {
          for (const { key, label } of requiredComparableFields) {
            const value = comparable[key];
            if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && key !== 'year')) {
              errors.push({
                field: `comparable[${index}].${key}`,
                error: ReportValidationError.MISSING_COMPARABLE_FIELDS,
                message: `Comparable #${index + 1} is missing ${label}`,
                suggestedAction: `Edit comparable #${index + 1} and enter the ${label}`
              });
            }
          }
        });
        
        // Check if market value has been calculated
        if (calculatedMarketValue === null || calculatedMarketValue === 0) {
          errors.push({
            field: 'marketValue',
            error: ReportValidationError.MARKET_VALUE_NOT_CALCULATED,
            message: 'Market value has not been calculated',
            suggestedAction: 'Add comparable vehicles to calculate the market value'
          });
        }
        
        // Add warnings for optional but recommended fields
        if (!currentAppraisal.equipment || currentAppraisal.equipment.length === 0) {
          warnings.push({
            field: 'lossVehicle.equipment',
            message: 'No equipment features listed for loss vehicle',
            suggestedAction: 'Add equipment features for more accurate adjustments'
          });
        }
        
        if (!currentAppraisal.settlementValue && !currentAppraisal.marketValue) {
          warnings.push({
            field: 'lossVehicle.insuranceValue',
            message: 'No insurance valuation available for comparison',
            suggestedAction: 'Enter the insurance company\'s offered settlement value'
          });
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      },
      
      // Error handling actions
      setError: (error) => set({ errorMessage: error }),
      setAppError: (error) => set({ 
        error,
        errorMessage: error?.message || null,
        errorDetails: error?.details || null
      }),
      createError: (type, message, details, recoverable = true, suggestedAction) => {
        // Map to user-friendly error message
        const formattedError = formatErrorForDisplay(message);
        
        const error: AppError = {
          type,
          message: formattedError.message,
          details: details ? {
            ...(typeof details === 'object' ? details : { value: details }),
            originalMessage: message,
            errorCode: formattedError.errorCode,
            title: formattedError.title
          } : {
            originalMessage: message,
            errorCode: formattedError.errorCode,
            title: formattedError.title
          },
          timestamp: new Date(),
          recoverable: formattedError.isRecoverable || recoverable,
          suggestedAction: formattedError.action || suggestedAction
        };
        
        console.error('[Store Error]', {
          type,
          message: formattedError.message,
          errorCode: formattedError.errorCode,
          action: formattedError.action,
          originalMessage: message,
          details
        });
        
        set({ 
          error,
          errorMessage: formattedError.message,
          errorDetails: error.details
        });
      },
      clearError: () => set({ 
        error: null,
        errorMessage: null,
        errorDetails: null
      }),
      
      // History management actions
      loadHistory: async () => {
        set({ historyLoading: true, historyError: null });
        try {
          const history = await window.electron.getAppraisals();
          set({ 
            appraisalHistory: history,
            historyLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load history';
          set({ 
            historyError: errorMessage,
            historyLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try refreshing the page or check your storage permissions'
          );
        }
      },
      addToHistory: (record) => set((state) => ({
        appraisalHistory: [record, ...state.appraisalHistory]
      })),
      updateHistoryItem: (id, updates) => set((state) => ({
        appraisalHistory: state.appraisalHistory.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      removeFromHistory: (id) => set((state) => ({
        appraisalHistory: state.appraisalHistory.filter(item => item.id !== id)
      })),
      clearHistory: () => set({ appraisalHistory: [] }),
      
      loadAppraisalById: async (id: string) => {
        set({ historyLoading: true, historyError: null });
        try {
          // Load the specific appraisal from storage
          const appraisal = await window.electron.getAppraisal(id);
          
          if (!appraisal) {
            throw new Error(`Appraisal with ID ${id} not found`);
          }
          
          // Set as current appraisal
          set({ 
            currentAppraisal: appraisal.data,
            historyLoading: false
          });
          
          // Load associated comparables
          await get().loadComparables(id);
          
          // Calculate market value if comparables exist
          const { comparableVehicles } = get();
          if (comparableVehicles.length > 0) {
            await get().calculateMarketValue(id);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load appraisal';
          set({ 
            historyError: errorMessage,
            historyLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try refreshing the page or check if the appraisal still exists'
          );
        }
      },
      
      setCurrentAppraisalById: (id: string) => {
        const { appraisalHistory } = get();
        
        // Find appraisal in history by ID
        const appraisal = appraisalHistory.find(record => record.id === id);
        
        if (appraisal) {
          // Set as currentAppraisal
          set({ currentAppraisal: appraisal.data });
        } else {
          get().createError(
            ErrorType.STORAGE_ERROR,
            `Appraisal with ID ${id} not found in history`,
            null,
            true,
            'Try loading the history first or check if the appraisal still exists'
          );
        }
      },
      
      // Settings management actions
      loadSettings: async () => {
        set({ settingsLoading: true, settingsError: null });
        try {
          const settings = await window.electron.getSettings();
          set({ 
            settings,
            settingsLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
          set({ 
            settingsError: errorMessage,
            settingsLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try refreshing the page or check your storage permissions'
          );
        }
      },
      updateSettings: async (newSettings) => {
        set({ settingsLoading: true, settingsError: null });
        try {
          const success = await window.electron.updateSettings(newSettings);
          if (success) {
            set((state) => ({ 
              settings: { ...state.settings, ...newSettings },
              settingsLoading: false
            }));
          } else {
            throw new Error('Failed to update settings');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
          set({ 
            settingsError: errorMessage,
            settingsLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try updating settings again'
          );
        }
      },
      resetSettings: () => set({
        settings: {
          autoOCRFallback: true,
          ocrQuality: 'balanced',
          confidenceThresholds: {
            warning: 60,
            error: 40
          },
          defaultExportFormat: 'csv',
          defaultSaveLocation: ''
        }
      }),
      
      // Search and filtering actions
      setSearchFilters: (filters) => {
        set({ searchFilters: filters });
        get().applyFilters();
      },
      clearSearchFilters: () => {
        set({ searchFilters: {}, filteredAppraisals: [] });
      },
      applyFilters: () => {
        const { appraisalHistory, searchFilters } = get();
        
        let filtered = [...appraisalHistory];
        
        // Apply VIN filter
        if (searchFilters.vin) {
          const vinLower = searchFilters.vin.toLowerCase();
          filtered = filtered.filter(a => 
            a.data.vin.toLowerCase().includes(vinLower)
          );
        }
        
        // Apply make filter
        if (searchFilters.make) {
          const makeLower = searchFilters.make.toLowerCase();
          filtered = filtered.filter(a => 
            a.data.make.toLowerCase().includes(makeLower)
          );
        }
        
        // Apply model filter
        if (searchFilters.model) {
          const modelLower = searchFilters.model.toLowerCase();
          filtered = filtered.filter(a => 
            a.data.model.toLowerCase().includes(modelLower)
          );
        }
        
        // Apply date range filter
        if (searchFilters.dateRange) {
          const { start, end } = searchFilters.dateRange;
          filtered = filtered.filter(a => {
            const createdAt = new Date(a.createdAt);
            return createdAt >= start && createdAt <= end;
          });
        }
        
        // Apply extraction method filter
        if (searchFilters.extractionMethod) {
          filtered = filtered.filter(a => 
            a.data.extractionMethod === searchFilters.extractionMethod
          );
        }
        
        // Apply confidence range filter
        if (searchFilters.confidenceRange) {
          const { min, max } = searchFilters.confidenceRange;
          filtered = filtered.filter(a => 
            a.data.extractionConfidence >= min && 
            a.data.extractionConfidence <= max
          );
        }
        
        // Apply status filter
        if (searchFilters.status) {
          filtered = filtered.filter(a => a.status === searchFilters.status);
        }
        
        set({ filteredAppraisals: filtered });
      },
      
      // Comparable vehicles management actions
      loadComparables: async (appraisalId: string) => {
        set({ comparablesLoading: true, comparablesError: null });
        try {
          const comparables = await window.electron.getComparables(appraisalId);
          set({ 
            comparableVehicles: comparables,
            comparablesLoading: false
          });
          
          // Set up pagination if there are many comparables
          if (comparables.length > 20) {
            get().setComparablesPagination(1, 20);
          } else {
            // Reset pagination for small lists
            set({
              comparablesPagination: {
                currentPage: 1,
                pageSize: 20,
                totalPages: 1
              }
            });
          }
          
          // Automatically recalculate market value if comparables exist
          if (comparables.length > 0) {
            await get().calculateMarketValue(appraisalId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load comparables';
          set({ 
            comparablesError: errorMessage,
            comparablesLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try refreshing the page or check your storage permissions'
          );
        }
      },
      
      addComparable: async (comparable: ComparableVehicle, appraisalId?: string) => {
        set({ comparablesLoading: true, comparablesError: null });
        try {
          const result = await window.electron.saveComparable(comparable);
          
          // Handle both old format (boolean) and new format (object with comparable)
          const success = typeof result === 'boolean' ? result : result.success;
          const enrichedComparable = (result && typeof result === 'object' && 'comparable' in result) 
            ? (result as any).comparable 
            : comparable;
          
          if (success) {
            set((state) => ({ 
              comparableVehicles: [...state.comparableVehicles, enrichedComparable],
              comparablesLoading: false
            }));
            
            // If appraisalId is provided, use direct calculation instead of debounced recalculation
            if (appraisalId) {
              await get().calculateMarketValue(appraisalId);
            } else {
              // Fall back to debounced recalculation for backward compatibility
              get().debouncedRecalculateMarketValue();
            }
          } else {
            throw new Error('Failed to save comparable');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add comparable';
          set({ 
            comparablesError: errorMessage,
            comparablesLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try adding the comparable again'
          );
        }
      },
      
      updateComparable: async (id: string, updates: Partial<ComparableVehicle>, appraisalId?: string) => {
        set({ comparablesLoading: true, comparablesError: null });
        try {
          const result = await window.electron.updateComparable(id, updates);
          
          // Handle both old format (boolean) and new format (object with comparable)
          const success = typeof result === 'boolean' ? result : result.success;
          const updatedComparable = (result && typeof result === 'object' && 'comparable' in result)
            ? (result as any).comparable
            : null;
          
          if (success) {
            set((state) => ({
              comparableVehicles: state.comparableVehicles.map(comp =>
                comp.id === id 
                  ? (updatedComparable || { ...comp, ...updates, updatedAt: new Date() })
                  : comp
              ),
              comparablesLoading: false
            }));
            
            // If appraisalId is provided, use direct calculation instead of debounced recalculation
            if (appraisalId) {
              await get().calculateMarketValue(appraisalId);
            } else {
              // Fall back to debounced recalculation for backward compatibility
              get().debouncedRecalculateMarketValue();
            }
          } else {
            throw new Error('Failed to update comparable');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update comparable';
          set({ 
            comparablesError: errorMessage,
            comparablesLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try updating the comparable again'
          );
        }
      },
      
      deleteComparable: async (id: string, appraisalId?: string) => {
        set({ comparablesLoading: true, comparablesError: null });
        try {
          const success = await window.electron.deleteComparable(id);
          if (success) {
            set((state) => ({
              comparableVehicles: state.comparableVehicles.filter(comp => comp.id !== id),
              comparablesLoading: false
            }));
            
            // If appraisalId is provided, use direct calculation instead of debounced recalculation
            if (appraisalId) {
              await get().calculateMarketValue(appraisalId);
            } else {
              // Fall back to debounced recalculation for backward compatibility
              get().debouncedRecalculateMarketValue();
            }
          } else {
            throw new Error('Failed to delete comparable');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete comparable';
          set({ 
            comparablesError: errorMessage,
            comparablesLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try deleting the comparable again'
          );
        }
      },
      
      setCurrentComparable: (comparable) => set({ currentComparable: comparable }),
      
      clearComparables: () => set({
        comparableVehicles: [],
        currentComparable: null,
        comparablesError: null
      }),
      
      // Market analysis calculation actions
      calculateMarketValue: async (appraisalId: string) => {
        console.log('[calculateMarketValue] Starting calculation', { appraisalId });
        
        let { comparableVehicles, currentAppraisal, appraisalHistory } = get();
        
        // Validation 1: Check if appraisalId is provided
        if (!appraisalId || appraisalId.trim() === '') {
          console.error('[calculateMarketValue] Invalid appraisalId provided');
          get().createError(
            ErrorType.PROCESSING_FAILED,
            'Cannot calculate market value: Invalid appraisal ID',
            { appraisalId },
            true,
            'Ensure the appraisal is saved before calculating market value'
          );
          return;
        }
        
        // If no current appraisal is set, try to load it from history
        if (!currentAppraisal) {
          console.log('[calculateMarketValue] No current appraisal, attempting to load from history');
          const appraisal = appraisalHistory.find(record => record.id === appraisalId);
          if (appraisal) {
            currentAppraisal = appraisal.data;
            set({ currentAppraisal });
            console.log('[calculateMarketValue] Loaded appraisal from history');
          } else {
            // Try to load from storage if not in history
            try {
              console.log('[calculateMarketValue] Attempting to load from storage');
              const loadedAppraisal = await window.electron.getAppraisal(appraisalId);
              if (loadedAppraisal) {
                currentAppraisal = loadedAppraisal.data;
                set({ currentAppraisal });
                console.log('[calculateMarketValue] Loaded appraisal from storage');
              }
            } catch (error) {
              console.error('[calculateMarketValue] Failed to load appraisal:', error);
            }
          }
        }
        
        // Validation 2: Check if currentAppraisal exists
        if (!currentAppraisal) {
          console.error('[calculateMarketValue] No current appraisal available after load attempts');
          get().createError(
            ErrorType.PROCESSING_FAILED,
            'Cannot calculate market value: Appraisal data not found',
            { appraisalId },
            true,
            'Load or create an appraisal before calculating market value'
          );
          return;
        }
        
        // Validation 3: Check if comparables array is not empty
        if (comparableVehicles.length === 0) {
          console.warn('[calculateMarketValue] No comparables available for calculation');
          set({ 
            marketAnalysis: null,
            calculationBreakdown: null,
            calculatedMarketValue: null,
            marketAnalysisError: 'Add at least one comparable vehicle to calculate market value'
          });
          return;
        }
        
        // Validation 4: Check if all required fields are present in currentAppraisal
        // Note: condition is optional - if not provided, we'll use 'Good' as default
        const requiredFields: Array<keyof ExtractedVehicleData> = ['vin', 'year', 'make', 'model', 'mileage'];
        const missingFields = requiredFields.filter(field => {
          const value = currentAppraisal[field];
          return value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && field !== 'year');
        });
        
        if (missingFields.length > 0) {
          console.error('[calculateMarketValue] Missing required fields in appraisal:', missingFields);
          get().createError(
            ErrorType.PROCESSING_FAILED,
            `Cannot calculate market value: Missing required fields (${missingFields.join(', ')})`,
            { appraisalId, missingFields },
            true,
            `Complete the following fields before calculating: ${missingFields.join(', ')}`
          );
          return;
        }
        
        // If condition is missing, default to 'Good'
        if (!currentAppraisal.condition) {
          console.warn('[calculateMarketValue] Loss vehicle condition not specified, defaulting to "Good"');
          currentAppraisal.condition = 'Good';
        }
        
        // Validation 5: Check if comparables have required fields
        const invalidComparables: Array<{ index: number; missingFields: string[] }> = [];
        const requiredComparableFields: Array<keyof ComparableVehicle> = ['year', 'make', 'model', 'mileage', 'listPrice', 'condition'];
        
        comparableVehicles.forEach((comparable, index) => {
          const missing = requiredComparableFields.filter(field => {
            const value = comparable[field];
            return value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && field !== 'year');
          });
          
          if (missing.length > 0) {
            invalidComparables.push({ index: index + 1, missingFields: missing });
          }
        });
        
        if (invalidComparables.length > 0) {
          console.error('[calculateMarketValue] Invalid comparables found:', invalidComparables);
          const errorDetails = invalidComparables.map(c => `Comparable #${c.index}: ${c.missingFields.join(', ')}`).join('; ');
          get().createError(
            ErrorType.PROCESSING_FAILED,
            `Cannot calculate market value: Some comparables have missing required fields`,
            { appraisalId, invalidComparables },
            true,
            `Fix the following comparables: ${errorDetails}`
          );
          return;
        }
        
        console.log('[calculateMarketValue] All validations passed, proceeding with calculation');
        
        // Create a hash of comparables to check cache validity
        const comparablesHash = JSON.stringify(
          comparableVehicles.map(c => ({
            id: c.id,
            price: c.listPrice,
            mileage: c.mileage,
            qualityScore: c.qualityScore
          }))
        );
        
        // Check cache first
        const cached = get().getCachedMarketValue(appraisalId, comparablesHash);
        if (cached) {
          set({ 
            marketAnalysis: {
              appraisalId,
              lossVehicle: currentAppraisal,
              comparablesCount: comparableVehicles.length,
              comparables: comparableVehicles,
              calculatedMarketValue: cached.marketValue,
              calculationMethod: 'quality-weighted-average' as const,
              confidenceLevel: 0,
              confidenceFactors: {
                comparableCount: comparableVehicles.length,
                qualityScoreVariance: 0,
                priceVariance: 0
              },
              insuranceValue: currentAppraisal.settlementValue || currentAppraisal.marketValue || 0,
              valueDifference: 0,
              valueDifferencePercentage: 0,
              isUndervalued: false,
              calculationBreakdown: cached.breakdown,
              calculatedAt: new Date(),
              lastUpdated: new Date()
            },
            calculationBreakdown: cached.breakdown,
            calculatedMarketValue: cached.marketValue,
            marketAnalysisLoading: false
          });
          
          // Update insurance comparison
          get().updateInsuranceComparison();
          return;
        }
        
        set({ marketAnalysisLoading: true, marketAnalysisError: null });
        try {
          console.log('[calculateMarketValue] Calling IPC handler');
          const result = await window.electron.calculateMarketValue(appraisalId);
          
          console.log('[calculateMarketValue] IPC result received:', {
            success: result.success,
            hasMarketAnalysis: !!result.marketAnalysis,
            error: result.error
          });
          
          // Check if the IPC call was successful
          if (!result.success || !result.marketAnalysis) {
            throw new Error(result.error || 'Failed to calculate market value');
          }
          
          const analysis = result.marketAnalysis;
          
          console.log('[calculateMarketValue] Market analysis:', {
            appraisalId: analysis.appraisalId,
            calculatedMarketValue: analysis.calculatedMarketValue,
            comparablesCount: analysis.comparablesCount,
            hasBreakdown: !!analysis.calculationBreakdown
          });
          
          // Cache the result
          get().setCachedMarketValue(
            appraisalId,
            comparablesHash,
            analysis.calculatedMarketValue,
            analysis.calculationBreakdown
          );
          
          set({ 
            marketAnalysis: analysis,
            calculationBreakdown: analysis.calculationBreakdown,
            calculatedMarketValue: analysis.calculatedMarketValue,
            marketAnalysisLoading: false
          });
          
          console.log('[calculateMarketValue] Store updated successfully');
          
          // Update insurance comparison
          get().updateInsuranceComparison();
        } catch (error) {
          console.error('[calculateMarketValue] Error occurred:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to calculate market value';
          set({ 
            marketAnalysisError: errorMessage,
            marketAnalysisLoading: false
          });
          get().createError(
            ErrorType.PROCESSING_FAILED,
            errorMessage,
            error,
            true,
            'Try recalculating the market value'
          );
        }
      },
      
      recalculateMarketValue: async (appraisalId?: string) => {
        const { appraisalHistory, isRecalculating, currentAppraisal, comparableVehicles } = get();
        
        console.log('[recalculateMarketValue] Starting recalculation', {
          providedAppraisalId: appraisalId,
          hasCurrentAppraisal: !!currentAppraisal,
          currentAppraisalVIN: currentAppraisal?.vin,
          comparablesCount: comparableVehicles.length,
          isRecalculating
        });
        
        // Prevent concurrent recalculations
        if (isRecalculating) {
          console.log('[recalculateMarketValue] Recalculation already in progress, marking as pending');
          set({ recalculationPending: true });
          return;
        }
        
        set({ isRecalculating: true, recalculationPending: false });
        
        try {
          // If appraisalId is provided, use it directly
          if (appraisalId) {
            console.log('[recalculateMarketValue] Using provided appraisalId:', appraisalId);
            await get().calculateMarketValue(appraisalId);
            return;
          }
          
          // Fall back to VIN lookup only if appraisalId not provided
          if (currentAppraisal) {
            console.log('[recalculateMarketValue] No appraisalId provided, attempting VIN lookup for:', currentAppraisal.vin);
            
            // Try to find matching appraisal in history by VIN
            const matchingRecord = appraisalHistory.find(
              record => record.data.vin === currentAppraisal.vin
            );
            
            if (matchingRecord) {
              console.log('[recalculateMarketValue] Found matching appraisal by VIN:', matchingRecord.id);
              await get().calculateMarketValue(matchingRecord.id);
            } else {
              console.warn('[recalculateMarketValue] No matching appraisal found in history for VIN:', currentAppraisal.vin);
              get().createError(
                ErrorType.PROCESSING_FAILED,
                'Cannot calculate market value: Appraisal not found in history',
                { vin: currentAppraisal.vin, historyCount: appraisalHistory.length },
                true,
                'Save the appraisal first before adding comparables'
              );
            }
          } else {
            console.warn('[recalculateMarketValue] No current appraisal available for recalculation');
            get().createError(
              ErrorType.PROCESSING_FAILED,
              'Cannot calculate market value: No appraisal data available',
              null,
              true,
              'Load or create an appraisal before calculating market value'
            );
          }
        } catch (error) {
          console.error('[recalculateMarketValue] Error during recalculation:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to recalculate market value';
          get().createError(
            ErrorType.PROCESSING_FAILED,
            errorMessage,
            error,
            true,
            'Try recalculating the market value again'
          );
        } finally {
          set({ isRecalculating: false });
          
          // If another recalculation was requested while we were processing, trigger it now
          if (get().recalculationPending) {
            console.log('[recalculateMarketValue] Processing pending recalculation request');
            set({ recalculationPending: false });
            // Use setTimeout to avoid stack overflow
            setTimeout(() => get().recalculateMarketValue(appraisalId), 0);
          }
        }
      },
      
      // Debounced version of recalculateMarketValue (300ms delay)
      debouncedRecalculateMarketValue: debounce(function(this: any, appraisalId?: string) {
        console.log('[debouncedRecalculateMarketValue] Debounced call triggered', { appraisalId });
        // Show loading indicator during debounce period
        set({ marketAnalysisLoading: true });
        this.recalculateMarketValue(appraisalId);
      }, 300),
      
      setMarketAnalysis: (analysis) => {
        set({ marketAnalysis: analysis });
        if (analysis) {
          set({
            calculationBreakdown: analysis.calculationBreakdown,
            calculatedMarketValue: analysis.calculatedMarketValue
          });
          get().updateInsuranceComparison();
        }
      },
      
      setCalculationBreakdown: (breakdown) => set({ calculationBreakdown: breakdown }),
      
      clearMarketAnalysis: () => set({
        marketAnalysis: null,
        marketAnalysisError: null,
        calculationBreakdown: null,
        calculatedMarketValue: null,
        valueDifference: null,
        valueDifferencePercentage: null,
        isUndervalued: false
      }),
      
      // Insurance comparison actions
      updateInsuranceComparison: () => {
        const { currentAppraisal, calculatedMarketValue } = get();
        
        if (!currentAppraisal || calculatedMarketValue === null) {
          set({
            insuranceValue: null,
            valueDifference: null,
            valueDifferencePercentage: null,
            isUndervalued: false
          });
          return;
        }
        
        // Get insurance value from ExtractedVehicleData fields
        const insuranceValue = currentAppraisal.settlementValue || currentAppraisal.marketValue || null;
        
        if (insuranceValue === null) {
          set({
            insuranceValue: null,
            valueDifference: null,
            valueDifferencePercentage: null,
            isUndervalued: false
          });
          return;
        }
        
        const difference = calculatedMarketValue - insuranceValue;
        const differencePercentage = (difference / insuranceValue) * 100;
        const isUndervalued = difference > 0 && differencePercentage > 5; // More than 5% difference
        
        set({
          insuranceValue,
          valueDifference: difference,
          valueDifferencePercentage: differencePercentage,
          isUndervalued
        });
      },
      
      setInsuranceValue: (value) => {
        set({ insuranceValue: value });
        get().updateInsuranceComparison();
      },
      
      // Report history management actions
      loadReportHistory: async () => {
        set({ reportHistoryLoading: true, reportHistoryError: null });
        try {
          const history = await window.electron.getReportHistory();
          set({ 
            reportHistory: history,
            reportHistoryLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load report history';
          set({ 
            reportHistoryError: errorMessage,
            reportHistoryLoading: false
          });
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try refreshing the page or check your storage permissions'
          );
        }
      },
      
      addReportToHistory: async (report: ReportHistoryRecord) => {
        try {
          const result = await window.electron.addReportToHistory(report);
          if (result.success) {
            set((state) => ({
              reportHistory: [report, ...state.reportHistory]
            }));
          } else {
            throw new Error(result.error || 'Failed to add report to history');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add report to history';
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try generating the report again'
          );
        }
      },
      
      deleteReportFromHistory: async (id: string) => {
        try {
          const result = await window.electron.deleteReportFromHistory(id);
          if (result.success) {
            set((state) => ({
              reportHistory: state.reportHistory.filter(r => r.id !== id)
            }));
          } else {
            throw new Error(result.error || 'Failed to delete report from history');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete report from history';
          get().createError(
            ErrorType.STORAGE_ERROR,
            errorMessage,
            error,
            true,
            'Try deleting the report again'
          );
        }
      },
      
      // Performance optimization actions
      getCachedMarketValue: (appraisalId: string, comparablesHash: string) => {
        const { calculationCache } = get();
        const cached = calculationCache.get(appraisalId);
        
        if (!cached) return null;
        
        // Check if cache is still valid (comparables haven't changed)
        if (cached.comparablesHash !== comparablesHash) return null;
        
        // Check if cache is not too old (5 minutes)
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge > 5 * 60 * 1000) return null;
        
        return {
          marketValue: cached.marketValue,
          breakdown: cached.breakdown
        };
      },
      
      setCachedMarketValue: (appraisalId: string, comparablesHash: string, marketValue: number, breakdown: MarketValueCalculation) => {
        set((state) => {
          const newCache = new Map(state.calculationCache);
          newCache.set(appraisalId, {
            marketValue,
            breakdown,
            timestamp: Date.now(),
            comparablesHash
          });
          return { calculationCache: newCache };
        });
      },
      
      clearCalculationCache: () => {
        set({ calculationCache: new Map() });
      },
      
      getCachedGeolocation: (location: string) => {
        const { geocodingCache } = get();
        const cached = geocodingCache.get(location.toLowerCase());
        
        if (!cached) return null;
        
        // Geocoding cache never expires (locations don't change)
        return {
          latitude: cached.latitude,
          longitude: cached.longitude
        };
      },
      
      setCachedGeolocation: (location: string, coordinates: { latitude: number; longitude: number }) => {
        set((state) => {
          const newCache = new Map(state.geocodingCache);
          newCache.set(location.toLowerCase(), {
            ...coordinates,
            timestamp: Date.now()
          });
          return { geocodingCache: newCache };
        });
      },
      
      clearGeolocationCache: () => {
        set({ geocodingCache: new Map() });
      },
      
      setComparablesPagination: (page: number, pageSize: number) => {
        const { comparableVehicles } = get();
        const totalPages = Math.ceil(comparableVehicles.length / pageSize);
        
        set({
          comparablesPagination: {
            currentPage: Math.min(page, totalPages || 1),
            pageSize,
            totalPages: totalPages || 1
          }
        });
      },
      
      getPagedComparables: () => {
        const { comparableVehicles, comparablesPagination } = get();
        const { currentPage, pageSize } = comparablesPagination;
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        return comparableVehicles.slice(startIndex, endIndex);
      },
      
      setGeocodingProgress: (total: number, completed: number, inProgress: boolean) => {
        set({
          geocodingProgress: {
            total,
            completed,
            inProgress
          }
        });
      },
      
      // UI state actions
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setTheme: (theme) => set({ theme }),
      
      // General actions
      reset: () => set({ 
        currentAppraisal: null, 
        processingStatus: 'idle',
        processingProgress: 0,
        processingMessage: '',
        ocrProcessingActive: false,
        ocrConfidence: 0,
        extractionMethod: null,
        validationResults: [],
        fieldValidation: null,
        hasValidationErrors: false,
        hasValidationWarnings: false,
        error: null,
        errorMessage: null,
        errorDetails: null,
        appraisalHistory: [],
        historyLoading: false,
        historyError: null,
        searchFilters: {},
        filteredAppraisals: [],
        comparableVehicles: [],
        currentComparable: null,
        comparablesLoading: false,
        comparablesError: null,
        marketAnalysis: null,
        marketAnalysisLoading: false,
        marketAnalysisError: null,
        calculationBreakdown: null,
        insuranceValue: null,
        calculatedMarketValue: null,
        valueDifference: null,
        valueDifferencePercentage: null,
        isUndervalued: false,
        reportHistory: [],
        reportHistoryLoading: false,
        reportHistoryError: null,
        currentPage: 'dashboard'
      }),
      resetProcessing: () => set({
        currentAppraisal: null,
        processingStatus: 'idle',
        processingProgress: 0,
        processingMessage: '',
        ocrProcessingActive: false,
        ocrConfidence: 0,
        extractionMethod: null,
        validationResults: [],
        fieldValidation: null,
        hasValidationErrors: false,
        hasValidationWarnings: false,
        error: null,
        errorMessage: null,
        errorDetails: null,
        comparableVehicles: [],
        currentComparable: null,
        comparablesError: null,
        marketAnalysis: null,
        marketAnalysisError: null,
        calculationBreakdown: null,
        insuranceValue: null,
        calculatedMarketValue: null,
        valueDifference: null,
        valueDifferencePercentage: null,
        isUndervalued: false
      })
    }),
    {
      name: 'automotive-appraisal-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist UI preferences
      partialize: (state): PersistedState => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme
      })
    }
  )
);