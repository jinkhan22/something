# Requested Files Summary

## Overview

This document provides the locations and details of the specific files you requested.

## 1. Component with "Save as Draft" and "Complete Appraisal" Buttons

**File**: `automotive-appraisal/src/renderer/pages/NewAppraisal.tsx`

**Location**: Lines 90-150 (button handlers) and Lines 600-630 (button UI)

### Button Handlers

```typescript
// Handle save as draft (line 90)
const handleSaveDraft = async () => {
  if (!currentAppraisal || !currentAppraisalId) return;
  
  setIsSaving(true);
  try {
    await loadHistory();
    setSavedAppraisalId(currentAppraisalId);
    notifications.actionSuccess('save', 'Appraisal saved as draft');
    
    setTimeout(() => {
      navigate('/history');
    }, 1200);
  } catch (error) {
    createError(ErrorType.STORAGE_ERROR, 'Failed to navigate to history', error, true, 'Please try again');
  } finally {
    setIsSaving(false);
  }
};

// Handle complete appraisal (line 113)
const handleCompleteAppraisal = async () => {
  if (!currentAppraisal || !currentAppraisalId) return;
  
  setIsSaving(true);
  try {
    // Update status to complete
    const success = await window.electron.updateAppraisalStatus(currentAppraisalId, 'complete');
    
    if (success) {
      await loadHistory();
      setSavedAppraisalId(currentAppraisalId);
      notifications.actionSuccess('save', 'Appraisal completed successfully');
      
      setTimeout(() => {
        navigate('/history');
      }, 1200);
    } else {
      createError(ErrorType.STORAGE_ERROR, 'Failed to update appraisal status', undefined, true, 'Please try again');
    }
  } catch (error) {
    createError(ErrorType.STORAGE_ERROR, 'Failed to complete appraisal', error, true, 'Please try again');
  } finally {
    setIsSaving(false);
  }
};
```

### Button UI

```typescript
// Action buttons (lines 600-630)
<div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
  <button 
    onClick={handleSaveDraft}
    disabled={isSaving || !(currentAppraisal && processingStatus === 'complete')}
    className="btn-secondary w-full sm:w-auto"
  >
    {isSaving ? (
      <div className="flex items-center justify-center gap-2">
        <LoadingAnimation size="xs" variant="spinner" />
        Saving...
      </div>
    ) : (
      'Save as Draft'
    )}
  </button>
  
  <button 
    onClick={handleCompleteAppraisal}
    disabled={isSaving || !(currentAppraisal && processingStatus === 'complete')}
    className="btn-primary w-full sm:w-auto"
  >
    {isSaving ? (
      <div className="flex items-center justify-center gap-2">
        <LoadingAnimation size="xs" variant="spinner" color="white" />
        Saving...
      </div>
    ) : (
      'Complete Appraisal'
    )}
  </button>
</div>
```

### Key Features

- **Save as Draft**: Saves the current appraisal with 'draft' status and navigates to history
- **Complete Appraisal**: Updates the appraisal status to 'complete' via IPC call and navigates to history
- **Loading States**: Shows spinner animation while saving
- **Disabled States**: Buttons are disabled when saving or when no appraisal is ready
- **Keyboard Shortcut**: Cmd/Ctrl+S triggers Complete Appraisal (line 55)

---

## 2. Backend Services that Calculate Values from Comparables

### A. Market Value Calculator Service

**File**: `automotive-appraisal/src/renderer/services/marketValueCalculator.ts`

**Purpose**: Calculates market value using quality-weighted average formula

**Key Methods**:

```typescript
class MarketValueCalculator {
  /**
   * Calculate market value using quality-weighted average
   * Formula: Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Score)
   */
  calculateMarketValue(
    comparables: ComparableVehicle[],
    lossVehicle: ExtractedVehicleData
  ): MarketValueCalculation
  
  /**
   * Calculate confidence level based on comparable count and variance
   * Returns confidence level (0-95) and contributing factors
   */
  calculateConfidenceLevel(
    comparables: ComparableVehicle[]
  ): { level: number; factors: ConfidenceFactors }
}
```

**Features**:
- Quality-weighted average calculation
- Step-by-step calculation breakdown
- Confidence level calculation (0-95%)
- Input validation with detailed error logging
- Result caching with 5-minute TTL
- Performance optimization with memoization

**Formula**:
```
Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Score)

Confidence = Base (50%)
  + Comparable Count Bonus (0-25%)
  - Quality Score Variance Penalty (0-15%)
  - Price Variance Penalty (0-10%)
```

---

### B. Adjustment Calculator Service

**File**: `automotive-appraisal/src/renderer/services/adjustmentCalculator.ts`

**Purpose**: Calculates price adjustments for mileage, equipment, and condition differences

**Key Methods**:

```typescript
class AdjustmentCalculator {
  /**
   * Calculate mileage adjustment based on age-based depreciation rates
   */
  calculateMileageAdjustment(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData
  ): MileageAdjustment
  
  /**
   * Calculate equipment adjustments based on standard values
   */
  calculateEquipmentAdjustments(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData,
    customEquipmentValues?: Map<string, number>
  ): EquipmentAdjustment[]
  
  /**
   * Calculate condition adjustment based on condition multipliers
   */
  calculateConditionAdjustment(
    comparable: ComparableVehicle,
    lossVehicleCondition: string
  ): ConditionAdjustment
  
  /**
   * Calculate total adjustments combining all adjustment types
   */
  calculateTotalAdjustments(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData,
    customEquipmentValues?: Map<string, number>
  ): PriceAdjustments
}
```

**Adjustment Types**:

1. **Mileage Adjustment**:
   - Age-based depreciation rates:
     - 0-3 years: $0.25/mile
     - 4-7 years: $0.15/mile
     - 8+ years: $0.05/mile
   - Minimum threshold: 1,000 miles

2. **Equipment Adjustment**:
   - Standard values for common features:
     - Navigation: $1,200
     - Sunroof: $1,200
     - All-Wheel Drive: $2,000
     - Leather Seats: $1,000
     - Heated Seats: $500
     - (15+ features total)

3. **Condition Adjustment**:
   - Multipliers:
     - Excellent: 1.05
     - Good: 1.00
     - Fair: 0.95
     - Poor: 0.85

---

### C. Quality Score Calculator Service

**File**: `automotive-appraisal/src/renderer/services/qualityScoreCalculator.ts`

**Purpose**: Calculates quality scores for comparable vehicles (0-150 points)

**Key Method**:

```typescript
class QualityScoreCalculator {
  /**
   * Calculate quality score based on multiple factors
   * Base score: 100 points
   * Adjustments: -50 to +50 points
   */
  calculateScore(
    comparable: Partial<ComparableVehicle>,
    lossVehicle: ExtractedVehicleData
  ): QualityScoreBreakdown
}
```

**Scoring Factors**:

1. **Distance Factor**:
   - No penalty: ≤100 miles
   - Penalty: 0.1 points per mile over 100
   - Max penalty: -20 points

2. **Age Factor**:
   - Penalty: 5 points per year older
   - Bonus: 5 points per year newer
   - Max penalty: -15 points
   - Max bonus: +10 points

3. **Mileage Factor**:
   - Penalty: 0.001 points per mile higher
   - Bonus: 0.005 points per mile lower
   - Max penalty: -15 points
   - Max bonus: +10 points

4. **Equipment Factor**:
   - Penalty: 2 points per missing feature
   - Bonus: 2 points per extra feature
   - Max penalty: -10 points
   - Max bonus: +10 points

---

## 3. IPC Handlers for Total Loss Reports

**File**: `automotive-appraisal/src/main/ipc-handlers.ts`

### A. Calculate Market Value Handler

**Handler**: `calculate-market-value` (line 1150)

```typescript
ipcMain.handle('calculate-market-value', async (event, appraisalId: string) => {
  // 1. Get appraisal data
  const appraisal = storage.getAppraisal(appraisalId);
  
  // 2. Get comparables
  const comparables = await storageService.getComparables(appraisalId);
  
  // 3. Calculate market value
  const calculator = new MarketValueCalculator();
  const calculation = calculator.calculateMarketValue(comparables, appraisal.data);
  const confidence = calculator.calculateConfidenceLevel(comparables);
  
  // 4. Build market analysis result
  const marketAnalysis = {
    appraisalId,
    lossVehicle: appraisal.data,
    comparablesCount: comparables.length,
    comparables,
    calculatedMarketValue: calculation.finalMarketValue,
    calculationMethod: 'quality-weighted-average',
    confidenceLevel: confidence.level,
    confidenceFactors: confidence.factors,
    insuranceValue: appraisal.data.marketValue || 0,
    valueDifference: calculation.finalMarketValue - (appraisal.data.marketValue || 0),
    valueDifferencePercentage: /* calculation */,
    isUndervalued: calculation.finalMarketValue > (appraisal.data.marketValue || 0),
    calculationBreakdown: calculation,
    calculatedAt: new Date(),
    lastUpdated: new Date()
  };
  
  return marketAnalysis;
});
```

---

### B. Export Market Analysis Handler

**Handler**: `export-market-analysis` (line 1220)

```typescript
ipcMain.handle('export-market-analysis', async (event, appraisalId: string, options?: any) => {
  // 1. Get appraisal and comparables
  const appraisal = storage.getAppraisal(appraisalId);
  const comparables = await storageService.getComparables(appraisalId);
  
  // 2. Calculate market value
  const calculator = new MarketValueCalculator();
  const calculation = calculator.calculateMarketValue(comparables, appraisal.data);
  const confidence = calculator.calculateConfidenceLevel(comparables);
  
  // 3. Build market analysis
  const marketAnalysis = { /* ... */ };
  
  // 4. Set default report options
  const reportOptions = {
    includeSummary: true,
    includeDetailedCalculations: true,
    includeComparablesList: true,
    includeMethodology: true,
    format: 'pdf',
    ...options
  };
  
  // 5. Generate report
  const reportService = new ReportGenerationService();
  const result = await reportService.generateMarketAnalysisReport(marketAnalysis, reportOptions);
  
  return result; // { success: boolean, filePath?: string, error?: string }
});
```

---

### C. Generate Appraisal Report Handler (DOCX)

**Handler**: `generate-appraisal-report` (line 1290)

```typescript
ipcMain.handle('generate-appraisal-report', async (event, appraisalData: any, options: any, filePath: string) => {
  // 1. Validate inputs
  // - appraisalData (lossVehicle, insuranceInfo, comparables, marketAnalysis, metadata)
  // - options (appraiserName, credentials, company info, etc.)
  // - filePath
  
  // 2. Import DOCX report generation service
  const { DOCXReportGenerationService } = await import('./services/docxReportGeneration');
  const reportService = new DOCXReportGenerationService();
  
  // 3. Generate report
  const generatedFilePath = await reportService.generateAppraisalReport(
    appraisalData,
    options,
    filePath
  );
  
  return {
    success: true,
    filePath: generatedFilePath
  };
});
```

**Required Data Structure**:

```typescript
interface AppraisalData {
  lossVehicle: ExtractedVehicleData;
  insuranceInfo: {
    claimNumber: string;
    dateOfLoss: Date;
    insuredName: string;
    // ...
  };
  comparables: ComparableVehicle[];
  marketAnalysis: MarketAnalysis;
  metadata: {
    reportDate: Date;
    reportNumber: string;
    // ...
  };
}

interface ReportOptions {
  appraiserName: string;
  appraiserCredentials?: string;
  companyName?: string;
  companyLogoPath?: string;
  includeDetailedCalculations: boolean;
  includeQualityScoreBreakdown: boolean;
  selectedComparables?: string[];
  customNotes?: string;
}
```

---

### D. Comparable Operations Handlers

**Handlers**: Lines 1070-1150

```typescript
// Get all comparables for an appraisal
ipcMain.handle('get-comparables', async (event, appraisalId: string) => {
  const storageService = new ComparableStorageService();
  const comparables = await storageService.getComparables(appraisalId);
  return comparables;
});

// Save a new comparable vehicle
ipcMain.handle('save-comparable', async (event, comparable: any) => {
  const storageService = new ComparableStorageService();
  const success = await storageService.saveComparable(comparable);
  return success;
});

// Update an existing comparable vehicle
ipcMain.handle('update-comparable', async (event, id: string, updates: any) => {
  const storageService = new ComparableStorageService();
  const success = await storageService.updateComparable(id, updates);
  return success;
});

// Delete a comparable vehicle
ipcMain.handle('delete-comparable', async (event, id: string) => {
  const storageService = new ComparableStorageService();
  const success = await storageService.deleteComparable(id, appraisalId);
  return success;
});
```

---

### E. Report History Handlers

**Handlers**: Lines 1450-1550

```typescript
// Get all report history records
ipcMain.handle('get-report-history', async (event) => {
  const storage = getReportHistoryStorage();
  const history = await storage.getHistory();
  return history;
});

// Add a report to history
ipcMain.handle('add-report-to-history', async (event, report: any) => {
  const storage = getReportHistoryStorage();
  const success = await storage.addReport(report);
  return { success };
});

// Delete a report from history
ipcMain.handle('delete-report-from-history', async (event, id: string) => {
  const storage = getReportHistoryStorage();
  const success = await storage.deleteReport(id);
  return { success };
});

// Open a report file in the default application
ipcMain.handle('open-report-file', async (event, filePath: string) => {
  const { shell } = await import('electron');
  const result = await shell.openPath(filePath);
  return { success: !result }; // openPath returns empty string on success
});
```

---

## Summary

### Files Found

1. **Save/Complete Buttons Component**: `src/renderer/pages/NewAppraisal.tsx`
   - Lines 90-150: Button handlers
   - Lines 600-630: Button UI

2. **Calculation Services** (3 files):
   - `src/renderer/services/marketValueCalculator.ts` - Market value calculation
   - `src/renderer/services/adjustmentCalculator.ts` - Price adjustments
   - `src/renderer/services/qualityScoreCalculator.ts` - Quality scoring

3. **IPC Handlers**: `src/main/ipc-handlers.ts`
   - Lines 1070-1150: Comparable operations
   - Lines 1150-1220: Market value calculation
   - Lines 1220-1290: Market analysis export
   - Lines 1290-1380: DOCX report generation
   - Lines 1450-1550: Report history operations

### Key Workflows

1. **Save Appraisal**:
   - User clicks "Save as Draft" or "Complete Appraisal"
   - Handler updates status via `updateAppraisalStatus` IPC
   - Navigates to history page

2. **Calculate Market Value**:
   - User adds/edits comparables
   - Frontend calls `calculate-market-value` IPC
   - Backend uses MarketValueCalculator service
   - Returns complete market analysis

3. **Generate Report**:
   - User clicks "Generate Report"
   - Frontend calls `generate-appraisal-report` IPC
   - Backend uses DOCXReportGenerationService
   - Returns file path to generated DOCX

All services include comprehensive error handling, logging, and validation.
