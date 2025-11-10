// Core data types for the automotive appraisal app
export interface ExtractedVehicleData {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  location: string;
  reportType: 'CCC_ONE' | 'MITCHELL' | string;
  extractionConfidence: number;
  extractionErrors: string[];
  settlementValue?: number;
  marketValue?: number;
  // OCR-specific metadata
  extractionMethod?: 'standard' | 'ocr' | 'hybrid';
  ocrConfidence?: number;
  fieldConfidences?: Record<string, number>;
  // Validation metadata
  validationResults?: ValidationResult[];
  // Comparable vehicles analysis fields
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  equipment?: string[];
}

export interface PDFProcessingResult {
  success: boolean;
  extractedData?: ExtractedVehicleData;
  appraisalId?: string;
  errors: string[];
  warnings: string[];
  processingTime: number;
  // OCR-specific result metadata
  extractionMethod?: 'standard' | 'ocr' | 'hybrid';
  ocrConfidence?: number;
  pageCount?: number;
}

export interface AppraisalRecord {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  status: 'draft' | 'complete';
  data: ExtractedVehicleData;
  processingTime?: number;
  // Comparable vehicles metadata
  hasComparables?: boolean;
  comparableCount?: number;
  marketAnalysisComplete?: boolean;
  calculatedMarketValue?: number;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

// Validation types
export interface ValidationResult {
  field: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  confidence: number;
}

export interface FieldValidation {
  vin?: ValidationResult;
  year?: ValidationResult;
  make?: ValidationResult;
  model?: ValidationResult;
  mileage?: ValidationResult;
}

// OCR-specific types
export interface OCRProcessingOptions {
  density: number;
  imageFormat: 'png' | 'jpg';
  preprocessImages: boolean;
  parallelProcessing: boolean;
  maxImageSize: {
    width: number;
    height: number;
  };
}

export interface ExtractionResult {
  text: string;
  method: 'standard' | 'ocr' | 'hybrid';
  confidence: number;
  pageCount: number;
  processingTime: number;
  warnings: string[];
}

// Application settings
export interface AppSettings {
  autoOCRFallback: boolean;
  ocrQuality: 'fast' | 'balanced' | 'accurate';
  confidenceThresholds: {
    warning: number;
    error: number;
  };
  defaultExportFormat: 'csv' | 'json';
  defaultSaveLocation: string;
  dateFormat?: string;
  numberFormat?: string;
  // Report branding and customization settings
  reportDefaults?: {
    appraiserName: string;
    appraiserCredentials: string;
    companyName: string;
    companyLogoPath: string;
    includeDetailedCalculations: boolean;
    includeQualityScoreBreakdown: boolean;
  };
}

// Search and filtering
export interface SearchFilters {
  vin?: string;
  make?: string;
  model?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  extractionMethod?: 'standard' | 'ocr' | 'hybrid';
  confidenceRange?: {
    min: number;
    max: number;
  };
  status?: 'draft' | 'complete';
}

// Progress and Error callback types
export type ProgressCallback = (data: { progress: number; message: string }) => void;
export type OCRProgressCallback = (progress: number, message: string) => void;
export type ErrorCallback = (error: { message: string; stack?: string; type?: string }) => void;
export type CleanupFunction = () => void;

// Enhanced error types
export enum ErrorType {
  FILE_INVALID = 'file_invalid',
  FILE_TOO_LARGE = 'file_too_large',
  FILE_EMPTY = 'file_empty',
  FILE_CORRUPTED = 'file_corrupted',
  MIME_TYPE_INVALID = 'mime_type_invalid',
  EXTENSION_INVALID = 'extension_invalid',
  PROCESSING_FAILED = 'processing_failed',
  EXTRACTION_FAILED = 'extraction_failed',
  STORAGE_ERROR = 'storage_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  recoverable: boolean;
  suggestedAction?: string;
}

// System information interface
export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  nodeVersion: string;
}

// ============================================================================
// Comparable Vehicles Analysis Types
// ============================================================================

// Geographic coordinates for distance calculations
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Quality score breakdown showing all factors
export interface QualityScoreBreakdown {
  baseScore: number; // Always 100.0
  distancePenalty: number;
  agePenalty: number;
  ageBonus: number;
  mileagePenalty: number;
  mileageBonus: number;
  equipmentPenalty: number;
  equipmentBonus: number;
  finalScore: number;
  
  // Detailed explanations for UI display
  explanations: {
    distance: string;
    age: string;
    mileage: string;
    equipment: string;
  };
}

// Mileage adjustment details
export interface MileageAdjustment {
  mileageDifference: number;
  depreciationRate: number;
  adjustmentAmount: number;
  explanation: string;
}

// Equipment adjustment details
export interface EquipmentAdjustment {
  feature: string;
  type: 'missing' | 'extra';
  value: number;
  explanation: string;
}

// Condition adjustment details
export interface ConditionAdjustment {
  comparableCondition: string;
  lossVehicleCondition: string;
  multiplier: number;
  adjustmentAmount: number;
  explanation: string;
}

// Complete price adjustments for a comparable
export interface PriceAdjustments {
  mileageAdjustment: MileageAdjustment;
  equipmentAdjustments: EquipmentAdjustment[];
  conditionAdjustment: ConditionAdjustment;
  totalAdjustment: number;
  adjustedPrice: number;
}

// Comparable vehicle data structure
export interface ComparableVehicle {
  id: string;
  appraisalId: string;
  
  // Source information
  source: string; // 'AutoTrader', 'Cars.com', 'CarMax', 'Manual Entry', etc.
  sourceUrl?: string;
  dateAdded: Date;
  
  // Vehicle details
  year: number;
  make: string;
  model: string;
  vin?: string; // VIN of the comparable vehicle
  trim?: string;
  mileage: number;
  
  // Location and distance
  location: string; // City, State format
  coordinates?: Coordinates;
  distanceFromLoss: number; // in miles
  
  // Pricing
  listPrice: number;
  adjustedPrice?: number; // After all adjustments
  
  // Condition and equipment
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  equipment: string[]; // Array of equipment features
  
  // Quality scoring
  qualityScore: number;
  qualityScoreBreakdown: QualityScoreBreakdown;
  
  // Adjustments
  adjustments: PriceAdjustments;
  
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Confidence factors for market value calculation
export interface ConfidenceFactors {
  comparableCount: number;
  qualityScoreVariance: number;
  priceVariance: number;
}

// Calculation step for transparency
export interface CalculationStep {
  step: number;
  description: string;
  calculation: string;
  result: number;
}

// Market value calculation breakdown
export interface MarketValueCalculation {
  comparables: Array<{
    id: string;
    listPrice: number;
    adjustedPrice: number;
    qualityScore: number;
    weightedValue: number;
  }>;
  
  totalWeightedValue: number;
  totalWeights: number;
  finalMarketValue: number;
  
  // Step-by-step calculation for transparency
  steps: CalculationStep[];
}

// Complete market analysis for an appraisal
export interface MarketAnalysis {
  appraisalId: string;
  lossVehicle: ExtractedVehicleData;
  
  // Comparables summary
  comparablesCount: number;
  comparables: ComparableVehicle[];
  
  // Market value calculation
  calculatedMarketValue: number;
  calculationMethod: 'quality-weighted-average';
  confidenceLevel: number; // 0-100
  confidenceFactors: ConfidenceFactors;
  
  // Insurance comparison
  insuranceValue: number;
  valueDifference: number;
  valueDifferencePercentage: number;
  isUndervalued: boolean;
  
  // Detailed calculation breakdown
  calculationBreakdown: MarketValueCalculation;
  
  // Metadata
  calculatedAt: Date;
  lastUpdated: Date;
}

// Equipment feature definition
export interface EquipmentFeature {
  name: string;
  category: 'comfort' | 'technology' | 'performance' | 'safety' | 'appearance';
  standardValue: number; // Default adjustment value
  description: string;
}

// Report generation options
export interface ReportOptions {
  includeSummary: boolean;
  includeDetailedCalculations: boolean;
  includeComparablesList: boolean;
  includeMethodology: boolean;
  format: 'pdf' | 'html';
}

// Validation error types for comparables
export enum ComparableValidationError {
  INVALID_YEAR = 'invalid_year',
  INVALID_MILEAGE = 'invalid_mileage',
  INVALID_PRICE = 'invalid_price',
  INVALID_LOCATION = 'invalid_location',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  GEOCODING_FAILED = 'geocoding_failed',
  OUTLIER_PRICE = 'outlier_price',
  UNREALISTIC_MILEAGE = 'unrealistic_mileage'
}

// Validation result for comparable data
export interface ComparableValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    error: ComparableValidationError;
    message: string;
    suggestedAction?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestedAction?: string;
  }>;
}

// Report validation error types
export enum ReportValidationError {
  MISSING_LOSS_VEHICLE = 'missing_loss_vehicle',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INSUFFICIENT_COMPARABLES = 'insufficient_comparables',
  MISSING_COMPARABLE_FIELDS = 'missing_comparable_fields',
  MARKET_VALUE_NOT_CALCULATED = 'market_value_not_calculated',
  INVALID_DATA = 'invalid_data'
}

// Validation result for report generation
export interface ReportValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    error: ReportValidationError;
    message: string;
    suggestedAction?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestedAction?: string;
  }>;
}

// ============================================================================
// Report History Types
// ============================================================================

// Report history record
export interface ReportHistoryRecord {
  id: string;
  appraisalId: string;
  filePath: string;
  generatedAt: Date;
  
  // Vehicle information for display
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
    vin: string;
  };
  
  // Report options used
  options: {
    appraiserName: string;
    appraiserCredentials?: string;
    companyName?: string;
    includeDetailedCalculations: boolean;
    includeQualityScoreBreakdown: boolean;
    selectedComparables?: string[];
  };
  
  // Report metadata
  metadata: {
    comparableCount: number;
    calculatedMarketValue: number;
    insuranceValue?: number;
    fileSize?: number;
  };
}

// Global window interface for Electron IPC - Complete API surface
declare global {
  interface Window {
    electron: {
      // PDF Processing
      processPDF: (buffer: Uint8Array) => Promise<PDFProcessingResult>;
      
      // Storage Operations - Complete API
      getAppraisals: () => Promise<AppraisalRecord[]>;
      getAppraisal: (id: string) => Promise<AppraisalRecord | undefined>;
      updateAppraisalStatus: (id: string, status: 'draft' | 'complete') => Promise<boolean>;
      deleteAppraisal: (id: string) => Promise<boolean>;
      
      // Progress Reporting Event Listeners
      onProcessingProgress: (callback: ProgressCallback) => CleanupFunction;
      onProcessingComplete: (callback: (data: { success: boolean; data?: unknown; error?: string }) => void) => CleanupFunction;
      
      // Error Handling Event Listeners
      onProcessingError: (callback: ErrorCallback) => CleanupFunction;
      onStorageError: (callback: ErrorCallback) => CleanupFunction;
      
      // System Operations
      showErrorDialog: (title: string, message: string) => Promise<void>;
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
      
      // Utility Methods
      removeAllListeners: () => void;
      
      // Development and Debugging
      getAppVersion: () => Promise<string>;
      getSystemInfo: () => Promise<SystemInfo>;
      openDevTools: () => Promise<void>;
      
      // Asset Availability
      checkAssetsAvailable: () => Promise<boolean>;
      
      // Settings Management
      getSettings: () => Promise<AppSettings>;
      updateSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
      resetSettings: () => Promise<boolean>;
      validateSettings: () => Promise<{ valid: boolean; errors: string[] }>;
      
      // Enhanced OCR Processing
      processPDFWithOCR: (buffer: Uint8Array, options?: any) => Promise<PDFProcessingResult>;
      
      // Data Validation
      validateVehicleData: (data: Partial<ExtractedVehicleData>) => Promise<FieldValidation>;
      
      // Export Operations
      exportToCSV: (appraisalIds: string[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      exportToJSON: (appraisalIds: string[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      
      // Appraisal Management Operations
      updateAppraisal: (id: string, data: ExtractedVehicleData) => Promise<boolean>;
      findDuplicates: (vin: string) => Promise<AppraisalRecord[]>;
      hasDuplicate: (vin: string, excludeId?: string) => Promise<boolean>;
      backupStorage: () => Promise<boolean>;
      restoreStorage: () => Promise<boolean>;
      verifyStorageIntegrity: () => Promise<{ valid: boolean; errors: string[] }>;
      
      // Error Log Management
      getErrorLog: () => Promise<Array<{
        timestamp: string;
        operation: string;
        userAction: string;
        errorMessage: string;
        category: string;
      }>>;
      clearErrorLog: () => Promise<boolean>;
      exportErrorLog: () => Promise<{ success: boolean; path?: string; error?: string }>;
      
      // OCR Status and Configuration
      getOCRStatus: () => Promise<{ available: boolean; error: string | null }>;
      
      // Performance Metrics
      getPerformanceMetrics: () => Promise<any>;
      resetPerformanceMetrics: () => Promise<boolean>;
      
      // System Diagnostics
      getSystemDiagnostics: () => Promise<any>;
      getSystemRecommendations: () => Promise<string[]>;
      checkFeatureAvailability: (featureName: string) => Promise<boolean>;
      exportDiagnostics: () => Promise<{ success: boolean; path?: string; error?: string }>;
      
      // Comparable Vehicles Operations
      saveComparable: (comparable: ComparableVehicle) => Promise<{ success: boolean; error?: string }>;
      updateComparable: (id: string, updates: Partial<ComparableVehicle>) => Promise<{ success: boolean; error?: string }>;
      deleteComparable: (id: string) => Promise<{ success: boolean; error?: string }>;
      getComparables: (appraisalId: string) => Promise<ComparableVehicle[]>;
      deleteComparablesForAppraisal: (appraisalId: string) => Promise<{ success: boolean; error?: string }>;
      
      // Market Analysis Operations
      calculateMarketValue: (appraisalId: string) => Promise<{ success: boolean; marketAnalysis?: MarketAnalysis; error?: string }>;
      getMarketAnalysis: (appraisalId: string) => Promise<MarketAnalysis | undefined>;
      
      // Geolocation Operations
      geocodeLocation: (location: string) => Promise<{ success: boolean; coordinates?: Coordinates; error?: string }>;
      calculateDistance: (coord1: Coordinates, coord2: Coordinates) => Promise<number>;
      
      // Report Generation
      exportMarketAnalysis: (appraisalId: string, options: ReportOptions) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      
      // Comparable Validation
      validateComparable: (comparable: Partial<ComparableVehicle>) => Promise<ComparableValidationResult>;
      
      // Report History Operations
      getReportHistory: () => Promise<ReportHistoryRecord[]>;
      addReportToHistory: (report: ReportHistoryRecord) => Promise<{ success: boolean; error?: string }>;
      deleteReportFromHistory: (id: string) => Promise<{ success: boolean; error?: string }>;
      openReportFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}