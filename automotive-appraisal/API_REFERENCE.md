# API Reference

Complete reference for all IPC APIs exposed by the application.

## Table of Contents

- [PDF Processing](#pdf-processing)
- [Appraisal Management](#appraisal-management)
- [Comparable Vehicles](#comparable-vehicles)
- [Market Analysis](#market-analysis)
- [Report Generation](#report-generation)
- [Settings](#settings)
- [System](#system)
- [Error Handling](#error-handling)

## PDF Processing

### processPDF

Process a PDF file and extract vehicle data.

**Signature**:
```typescript
processPDF(buffer: Uint8Array): Promise<PDFProcessingResult>
```

**Parameters**:
- `buffer`: PDF file as Uint8Array

**Returns**:
```typescript
interface PDFProcessingResult {
  success: boolean;
  extractedData?: ExtractedVehicleData;
  appraisalId?: string;
  errors: string[];
  warnings: string[];
  processingTime: number;
  extractionMethod?: 'standard' | 'ocr' | 'hybrid';
  ocrConfidence?: number;
  pageCount?: number;
}
```

**Example**:
```typescript
const fileBuffer = await file.arrayBuffer();
const result = await window.electron.processPDF(new Uint8Array(fileBuffer));

if (result.success) {
  console.log('Extracted data:', result.extractedData);
  console.log('Appraisal ID:', result.appraisalId);
} else {
  console.error('Errors:', result.errors);
}
```

### processPDFWithOCR

Process PDF with specific OCR options.

**Signature**:
```typescript
processPDFWithOCR(buffer: Uint8Array, options?: OCRProcessingOptions): Promise<PDFProcessingResult>
```

**Parameters**:
- `buffer`: PDF file as Uint8Array
- `options`: Optional OCR configuration

**Options**:
```typescript
interface OCRProcessingOptions {
  density: number;              // DPI (150, 300, 600)
  imageFormat: 'png' | 'jpg';
  preprocessImages: boolean;
  parallelProcessing: boolean;
  maxImageSize: {
    width: number;
    height: number;
  };
}
```

## Appraisal Management

### getAppraisals

Retrieve all appraisals.

**Signature**:
```typescript
getAppraisals(): Promise<AppraisalRecord[]>
```

**Returns**:
```typescript
interface AppraisalRecord {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  status: 'draft' | 'complete';
  data: ExtractedVehicleData;
  processingTime?: number;
  hasComparables?: boolean;
  comparableCount?: number;
  marketAnalysisComplete?: boolean;
  calculatedMarketValue?: number;
}
```

**Example**:
```typescript
const appraisals = await window.electron.getAppraisals();
console.log(`Found ${appraisals.length} appraisals`);
```

### getAppraisal

Retrieve a specific appraisal by ID.

**Signature**:
```typescript
getAppraisal(id: string): Promise<AppraisalRecord | undefined>
```

**Parameters**:
- `id`: Appraisal ID

**Example**:
```typescript
const appraisal = await window.electron.getAppraisal('appr_123456');
if (appraisal) {
  console.log('VIN:', appraisal.data.vin);
}
```

### updateAppraisal

Update appraisal data.

**Signature**:
```typescript
updateAppraisal(id: string, data: ExtractedVehicleData): Promise<boolean>
```

**Parameters**:
- `id`: Appraisal ID
- `data`: Updated vehicle data

**Example**:
```typescript
const success = await window.electron.updateAppraisal('appr_123456', {
  ...existingData,
  mileage: 50000
});
```

### updateAppraisalStatus

Update appraisal status.

**Signature**:
```typescript
updateAppraisalStatus(id: string, status: 'draft' | 'complete'): Promise<boolean>
```

**Example**:
```typescript
await window.electron.updateAppraisalStatus('appr_123456', 'complete');
```

### deleteAppraisal

Delete an appraisal and all associated data.

**Signature**:
```typescript
deleteAppraisal(id: string): Promise<boolean>
```

**Example**:
```typescript
const success = await window.electron.deleteAppraisal('appr_123456');
if (success) {
  console.log('Appraisal deleted');
}
```

## Comparable Vehicles

### saveComparable

Save a new or updated comparable vehicle.

**Signature**:
```typescript
saveComparable(comparable: ComparableVehicle): Promise<{ success: boolean; error?: string }>
```

**Parameters**:
```typescript
interface ComparableVehicle {
  id: string;
  appraisalId: string;
  source: string;
  sourceUrl?: string;
  dateAdded: Date;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  location: string;
  coordinates?: Coordinates;
  distanceFromLoss: number;
  listPrice: number;
  adjustedPrice?: number;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  equipment: string[];
  qualityScore: number;
  qualityScoreBreakdown: QualityScoreBreakdown;
  adjustments: PriceAdjustments;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```typescript
const comparable = {
  id: 'comp_789012',
  appraisalId: 'appr_123456',
  source: 'AutoTrader',
  year: 2018,
  make: 'Toyota',
  model: 'Camry',
  mileage: 45000,
  location: 'Atlanta, GA',
  listPrice: 19200,
  condition: 'Good',
  equipment: ['Navigation', 'Heated Seats'],
  // ... other fields
};

const result = await window.electron.saveComparable(comparable);
if (result.success) {
  console.log('Comparable saved');
}
```

### updateComparable

Update an existing comparable vehicle.

**Signature**:
```typescript
updateComparable(id: string, updates: Partial<ComparableVehicle>): Promise<{ success: boolean; error?: string }>
```

**Example**:
```typescript
await window.electron.updateComparable('comp_789012', {
  mileage: 46000,
  listPrice: 19000
});
```

### deleteComparable

Delete a comparable vehicle.

**Signature**:
```typescript
deleteComparable(id: string): Promise<{ success: boolean; error?: string }>
```

**Example**:
```typescript
await window.electron.deleteComparable('comp_789012');
```

### getComparables

Get all comparables for an appraisal.

**Signature**:
```typescript
getComparables(appraisalId: string): Promise<ComparableVehicle[]>
```

**Example**:
```typescript
const comparables = await window.electron.getComparables('appr_123456');
console.log(`Found ${comparables.length} comparables`);
```

### deleteComparablesForAppraisal

Delete all comparables for an appraisal.

**Signature**:
```typescript
deleteComparablesForAppraisal(appraisalId: string): Promise<{ success: boolean; error?: string }>
```

## Market Analysis

### calculateMarketValue

Calculate market value for an appraisal.

**Signature**:
```typescript
calculateMarketValue(appraisalId: string): Promise<{ success: boolean; marketAnalysis?: MarketAnalysis; error?: string }>
```

**Returns**:
```typescript
interface MarketAnalysis {
  appraisalId: string;
  lossVehicle: ExtractedVehicleData;
  comparablesCount: number;
  comparables: ComparableVehicle[];
  calculatedMarketValue: number;
  calculationMethod: 'quality-weighted-average';
  confidenceLevel: number;
  confidenceFactors: ConfidenceFactors;
  insuranceValue: number;
  valueDifference: number;
  valueDifferencePercentage: number;
  isUndervalued: boolean;
  calculationBreakdown: MarketValueCalculation;
  calculatedAt: Date;
  lastUpdated: Date;
}
```

**Example**:
```typescript
const result = await window.electron.calculateMarketValue('appr_123456');
if (result.success) {
  console.log('Market Value:', result.marketAnalysis.calculatedMarketValue);
  console.log('Confidence:', result.marketAnalysis.confidenceLevel);
}
```

### getMarketAnalysis

Get cached market analysis for an appraisal.

**Signature**:
```typescript
getMarketAnalysis(appraisalId: string): Promise<MarketAnalysis | undefined>
```

## Geolocation

### geocodeLocation

Convert location string to coordinates.

**Signature**:
```typescript
geocodeLocation(location: string): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }>
```

**Parameters**:
- `location`: Location string in "City, ST" format

**Returns**:
```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

**Example**:
```typescript
const result = await window.electron.geocodeLocation('Atlanta, GA');
if (result.success) {
  console.log('Coordinates:', result.coordinates);
}
```

### calculateDistance

Calculate distance between two coordinates.

**Signature**:
```typescript
calculateDistance(coord1: Coordinates, coord2: Coordinates): Promise<number>
```

**Returns**: Distance in miles

**Example**:
```typescript
const distance = await window.electron.calculateDistance(
  { latitude: 33.7490, longitude: -84.3880 },
  { latitude: 34.0522, longitude: -84.3880 }
);
console.log(`Distance: ${distance} miles`);
```

## Report Generation

### exportMarketAnalysis

Generate a professional appraisal report.

**Signature**:
```typescript
exportMarketAnalysis(appraisalId: string, options: ReportOptions): Promise<{ success: boolean; filePath?: string; error?: string }>
```

**Options**:
```typescript
interface ReportOptions {
  includeSummary: boolean;
  includeDetailedCalculations: boolean;
  includeComparablesList: boolean;
  includeMethodology: boolean;
  format: 'pdf' | 'html';
  appraiserName?: string;
  appraiserCredentials?: string;
  companyName?: string;
  companyLogoPath?: string;
  selectedComparables?: string[];
  customNotes?: string;
}
```

**Example**:
```typescript
const result = await window.electron.exportMarketAnalysis('appr_123456', {
  includeSummary: true,
  includeDetailedCalculations: true,
  includeComparablesList: true,
  includeMethodology: true,
  format: 'pdf',
  appraiserName: 'John Doe',
  appraiserCredentials: 'ASA, ISA',
  companyName: 'Acme Appraisals'
});

if (result.success) {
  console.log('Report saved to:', result.filePath);
}
```

### getReportHistory

Get history of generated reports.

**Signature**:
```typescript
getReportHistory(): Promise<ReportHistoryRecord[]>
```

**Returns**:
```typescript
interface ReportHistoryRecord {
  id: string;
  appraisalId: string;
  filePath: string;
  generatedAt: Date;
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
    vin: string;
  };
  options: ReportOptions;
  metadata: {
    comparableCount: number;
    calculatedMarketValue: number;
    insuranceValue?: number;
    fileSize?: number;
  };
}
```

### addReportToHistory

Add a report to history.

**Signature**:
```typescript
addReportToHistory(report: ReportHistoryRecord): Promise<{ success: boolean; error?: string }>
```

### deleteReportFromHistory

Delete a report from history.

**Signature**:
```typescript
deleteReportFromHistory(id: string): Promise<{ success: boolean; error?: string }>
```

### openReportFile

Open a report file in the default application.

**Signature**:
```typescript
openReportFile(filePath: string): Promise<{ success: boolean; error?: string }>
```

## Export Operations

### exportToCSV

Export appraisals to CSV file.

**Signature**:
```typescript
exportToCSV(appraisalIds: string[]): Promise<{ success: boolean; filePath?: string; error?: string }>
```

**Example**:
```typescript
const result = await window.electron.exportToCSV(['appr_123456', 'appr_789012']);
if (result.success) {
  console.log('Exported to:', result.filePath);
}
```

### exportToJSON

Export appraisals to JSON file.

**Signature**:
```typescript
exportToJSON(appraisalIds: string[]): Promise<{ success: boolean; filePath?: string; error?: string }>
```

## Settings

### getSettings

Get application settings.

**Signature**:
```typescript
getSettings(): Promise<AppSettings>
```

**Returns**:
```typescript
interface AppSettings {
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
  reportDefaults?: {
    appraiserName: string;
    appraiserCredentials: string;
    companyName: string;
    companyLogoPath: string;
    includeDetailedCalculations: boolean;
    includeQualityScoreBreakdown: boolean;
  };
}
```

### updateSettings

Update application settings.

**Signature**:
```typescript
updateSettings(settings: Partial<AppSettings>): Promise<boolean>
```

**Example**:
```typescript
await window.electron.updateSettings({
  ocrQuality: 'accurate',
  reportDefaults: {
    appraiserName: 'John Doe',
    companyName: 'Acme Appraisals'
  }
});
```

### resetSettings

Reset settings to defaults.

**Signature**:
```typescript
resetSettings(): Promise<boolean>
```

### validateSettings

Validate current settings.

**Signature**:
```typescript
validateSettings(): Promise<{ valid: boolean; errors: string[] }>
```

## System

### checkAssetsAvailable

Check if OCR assets are available.

**Signature**:
```typescript
checkAssetsAvailable(): Promise<boolean>
```

**Example**:
```typescript
const available = await window.electron.checkAssetsAvailable();
if (!available) {
  console.warn('OCR assets not available');
}
```

### getSystemInfo

Get system information.

**Signature**:
```typescript
getSystemInfo(): Promise<SystemInfo>
```

**Returns**:
```typescript
interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  nodeVersion: string;
}
```

### getAppVersion

Get application version.

**Signature**:
```typescript
getAppVersion(): Promise<string>
```

### getSystemDiagnostics

Get system diagnostics information.

**Signature**:
```typescript
getSystemDiagnostics(): Promise<any>
```

### getSystemRecommendations

Get system recommendations.

**Signature**:
```typescript
getSystemRecommendations(): Promise<string[]>
```

### checkFeatureAvailability

Check if a feature is available.

**Signature**:
```typescript
checkFeatureAvailability(featureName: string): Promise<boolean>
```

### exportDiagnostics

Export system diagnostics to file.

**Signature**:
```typescript
exportDiagnostics(): Promise<{ success: boolean; path?: string; error?: string }>
```

## Validation

### validateVehicleData

Validate extracted vehicle data.

**Signature**:
```typescript
validateVehicleData(data: Partial<ExtractedVehicleData>): Promise<FieldValidation>
```

**Returns**:
```typescript
interface FieldValidation {
  vin?: ValidationResult;
  year?: ValidationResult;
  make?: ValidationResult;
  model?: ValidationResult;
  mileage?: ValidationResult;
}

interface ValidationResult {
  field: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  confidence: number;
}
```

### validateComparable

Validate comparable vehicle data.

**Signature**:
```typescript
validateComparable(comparable: Partial<ComparableVehicle>): Promise<ComparableValidationResult>
```

**Returns**:
```typescript
interface ComparableValidationResult {
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
```

## Error Handling

### Error Log Management

#### getErrorLog

Get error log entries.

**Signature**:
```typescript
getErrorLog(): Promise<Array<{
  timestamp: string;
  operation: string;
  userAction: string;
  errorMessage: string;
  category: string;
}>>
```

#### clearErrorLog

Clear error log.

**Signature**:
```typescript
clearErrorLog(): Promise<boolean>
```

#### exportErrorLog

Export error log to file.

**Signature**:
```typescript
exportErrorLog(): Promise<{ success: boolean; path?: string; error?: string }>
```

### Event Listeners

#### onProcessingProgress

Listen for PDF processing progress.

**Signature**:
```typescript
onProcessingProgress(callback: (data: { progress: number; message: string }) => void): () => void
```

**Returns**: Cleanup function

**Example**:
```typescript
const cleanup = window.electron.onProcessingProgress((data) => {
  console.log(`Progress: ${data.progress}%`);
  console.log(`Message: ${data.message}`);
});

// Later, cleanup
cleanup();
```

#### onProcessingComplete

Listen for processing completion.

**Signature**:
```typescript
onProcessingComplete(callback: (data: { success: boolean; data?: unknown; error?: string }) => void): () => void
```

#### onProcessingError

Listen for processing errors.

**Signature**:
```typescript
onProcessingError(callback: (error: { message: string; stack?: string; type?: string }) => void): () => void
```

#### onStorageError

Listen for storage errors.

**Signature**:
```typescript
onStorageError(callback: (error: { message: string; stack?: string; type?: string }) => void): () => void
```

### Dialog APIs

#### showErrorDialog

Show error dialog to user.

**Signature**:
```typescript
showErrorDialog(title: string, message: string): Promise<void>
```

#### showSaveDialog

Show save file dialog.

**Signature**:
```typescript
showSaveDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue>
```

#### showOpenDialog

Show open file dialog.

**Signature**:
```typescript
showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>
```

## Storage Management

### backupStorage

Create backup of all data.

**Signature**:
```typescript
backupStorage(): Promise<boolean>
```

### restoreStorage

Restore data from backup.

**Signature**:
```typescript
restoreStorage(): Promise<boolean>
```

### verifyStorageIntegrity

Verify storage data integrity.

**Signature**:
```typescript
verifyStorageIntegrity(): Promise<{ valid: boolean; errors: string[] }>
```

### findDuplicates

Find duplicate appraisals by VIN.

**Signature**:
```typescript
findDuplicates(vin: string): Promise<AppraisalRecord[]>
```

### hasDuplicate

Check if VIN already exists.

**Signature**:
```typescript
hasDuplicate(vin: string, excludeId?: string): Promise<boolean>
```

## Performance

### getPerformanceMetrics

Get performance metrics.

**Signature**:
```typescript
getPerformanceMetrics(): Promise<any>
```

### resetPerformanceMetrics

Reset performance metrics.

**Signature**:
```typescript
resetPerformanceMetrics(): Promise<boolean>
```

## Response Format

All IPC handlers follow a consistent response format:

**Success Response**:
```typescript
{
  success: true,
  data: <result>
}
```

**Error Response**:
```typescript
{
  success: false,
  error: <error message>,
  code?: <error code>
}
```

## Error Codes

Common error codes returned by APIs:

- `VALIDATION_ERROR`: Input validation failed
- `STORAGE_ERROR`: File system operation failed
- `PROCESSING_ERROR`: PDF processing failed
- `GEOCODING_ERROR`: Location geocoding failed
- `CALCULATION_ERROR`: Market value calculation failed
- `NETWORK_ERROR`: Network operation failed
- `PERMISSION_ERROR`: File permission denied
- `NOT_FOUND`: Resource not found
- `DUPLICATE`: Duplicate resource exists

## Usage Examples

### Complete Workflow Example

```typescript
// 1. Process PDF
const fileBuffer = await file.arrayBuffer();
const processResult = await window.electron.processPDF(new Uint8Array(fileBuffer));

if (!processResult.success) {
  console.error('Processing failed:', processResult.errors);
  return;
}

const appraisalId = processResult.appraisalId;

// 2. Add comparables
const comparable1 = {
  id: generateId(),
  appraisalId,
  source: 'AutoTrader',
  year: 2018,
  make: 'Toyota',
  model: 'Camry',
  mileage: 45000,
  location: 'Atlanta, GA',
  listPrice: 19200,
  condition: 'Good',
  equipment: ['Navigation'],
  // ... other fields
};

await window.electron.saveComparable(comparable1);

// 3. Calculate market value
const marketResult = await window.electron.calculateMarketValue(appraisalId);

if (marketResult.success) {
  console.log('Market Value:', marketResult.marketAnalysis.calculatedMarketValue);
}

// 4. Generate report
const reportResult = await window.electron.exportMarketAnalysis(appraisalId, {
  includeSummary: true,
  includeDetailedCalculations: true,
  includeComparablesList: true,
  includeMethodology: true,
  format: 'pdf',
  appraiserName: 'John Doe'
});

if (reportResult.success) {
  console.log('Report generated:', reportResult.filePath);
}
```

---

For more information, see the [Developer Guide](./DEVELOPER_GUIDE.md) and [Architecture Guide](./ARCHITECTURE.md).
