# Architecture Guide

## System Overview

The Automotive Appraisal Application is built using Electron's multi-process architecture, separating concerns between the main process (Node.js backend) and renderer process (React frontend).

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
│                                                              │
│  ┌────────────────────────┐    ┌──────────────────────────┐ │
│  │   Main Process         │    │   Renderer Process       │ │
│  │   (Node.js)            │◄──►│   (React + TypeScript)   │ │
│  │                        │IPC │                          │ │
│  │  - PDF Processing      │    │  - User Interface        │ │
│  │  - File System         │    │  - State Management      │ │
│  │  - OCR Engine          │    │  - Calculations          │ │
│  │  - Data Storage        │    │  - Validation            │ │
│  │  - Report Generation   │    │  - Error Handling        │ │
│  └────────────────────────┘    └──────────────────────────┘ │
│              │                              │                │
│              ▼                              ▼                │
│  ┌────────────────────────┐    ┌──────────────────────────┐ │
│  │   File System          │    │   Browser APIs           │ │
│  │   - Appraisals         │    │   - DOM                  │ │
│  │   - Reports            │    │   - Events               │ │
│  │   - Settings           │    │   - Storage              │ │
│  │   - OCR Assets         │    │   - Notifications        │ │
│  └────────────────────────┘    └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Main Process Architecture

### Entry Point: `src/main.ts`

The main process initializes the application:

1. **Startup Sequence**:
   - Verify system requirements
   - Check OCR assets availability
   - Create browser window
   - Setup IPC handlers
   - Load renderer process

2. **Window Management**:
   - Creates main browser window (1400x900)
   - Configures security (context isolation, no node integration)
   - Loads preload script for secure IPC
   - Opens DevTools in development mode

3. **Asset Verification**:
   - Verifies Tesseract OCR assets on startup
   - Shows error dialog if assets missing
   - Disables PDF upload if OCR unavailable

### IPC Handlers: `src/main/ipc-handlers.ts`

Central hub for all inter-process communication:

```typescript
// Handler registration pattern
ipcMain.handle('channel-name', async (event, ...args) => {
  try {
    const result = await service.method(...args);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Handler Categories**:
- PDF Processing: `processPDF`, `processPDFWithOCR`
- Storage: `getAppraisals`, `updateAppraisal`, `deleteAppraisal`
- Comparables: `saveComparable`, `getComparables`, `deleteComparable`
- Market Analysis: `calculateMarketValue`, `getMarketAnalysis`
- Reports: `exportMarketAnalysis`, `getReportHistory`
- Settings: `getSettings`, `updateSettings`
- System: `checkAssetsAvailable`, `getSystemInfo`

### Services Layer

#### PDF Extraction Service

**File**: `src/main/services/pdfExtractor.ts`

Handles PDF processing with OCR:

```typescript
class PDFExtractor {
  async extractFromPDF(buffer: Buffer): Promise<ExtractionResult>
  private convertPDFToImages(buffer: Buffer): Promise<Buffer[]>
  private performOCR(images: Buffer[]): Promise<string>
  private parseVehicleData(text: string): ExtractedVehicleData
}
```

**Process Flow**:
1. Convert PDF pages to high-resolution images (300 DPI)
2. Run Tesseract OCR on each page
3. Combine text from all pages
4. Parse vehicle data using regex patterns
5. Calculate confidence scores
6. Return structured data

**Pattern Matching**:
- VIN: 17-character alphanumeric
- Year: 4-digit number (1990-2025)
- Make/Model: Text extraction with validation
- Mileage: Number with "miles" context
- Values: Currency amounts with $ symbol

#### Storage Service

**File**: `src/main/services/storage.ts`

Manages appraisal data persistence:

```typescript
class StorageService {
  async saveAppraisal(data: ExtractedVehicleData): Promise<string>
  async getAppraisals(): Promise<AppraisalRecord[]>
  async getAppraisal(id: string): Promise<AppraisalRecord>
  async updateAppraisal(id: string, data: Partial<ExtractedVehicleData>): Promise<boolean>
  async deleteAppraisal(id: string): Promise<boolean>
}
```

**Storage Structure**:
```
userData/
├── appraisals/
│   ├── appr_123456/
│   │   ├── appraisal.json
│   │   ├── comparables.json
│   │   └── market-analysis.json
│   └── appr_789012/
│       └── ...
├── reports/
│   └── report_*.docx
└── settings.json
```

#### Comparable Storage Service

**File**: `src/main/services/comparableStorage.ts`

Manages comparable vehicle data:

```typescript
class ComparableStorageService {
  async saveComparable(comparable: ComparableVehicle): Promise<boolean>
  async updateComparable(id: string, updates: Partial<ComparableVehicle>): Promise<boolean>
  async deleteComparable(id: string): Promise<boolean>
  async getComparables(appraisalId: string): Promise<ComparableVehicle[]>
}
```

**Data Validation**:
- Required fields: source, year, make, model, mileage, location, price
- Year range: 1900 to current year + 1
- Mileage: 0 to 500,000 miles
- Price: $500 to $500,000
- Location: "City, ST" format

#### Geolocation Service

**File**: `src/main/services/geolocationService.ts`

Handles geocoding and distance calculations:

```typescript
class GeolocationService {
  async geocodeLocation(location: string): Promise<Coordinates>
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number
  private haversineDistance(lat1, lon1, lat2, lon2): number
}
```

**Features**:
- Geocoding with caching (30-day expiration)
- Haversine formula for distance calculation
- Fallback coordinates for common locations
- Error handling with retry logic

#### Report Generation Service

**File**: `src/main/services/reportGeneration.ts`

Creates professional DOCX reports:

```typescript
class ReportGenerationService {
  async generateReport(
    marketAnalysis: MarketAnalysis,
    options: ReportOptions
  ): Promise<string>
  
  private createCoverPage(): Paragraph[]
  private createExecutiveSummary(): Paragraph[]
  private createComparablesSection(): Table
  private createAdjustmentsSection(): Paragraph[]
  private createConclusionSection(): Paragraph[]
}
```

**Report Sections**:
1. Cover Page: Title, date, appraiser info, company branding
2. Executive Summary: Vehicle details, market value, confidence
3. Loss Vehicle Details: Complete vehicle information
4. Comparable Vehicles: Table with all comparables
5. Adjustments: Detailed adjustment calculations
6. Market Value Calculation: Step-by-step breakdown
7. Conclusion: Final market value and recommendations

#### Data Validator Service

**File**: `src/main/services/dataValidator.ts`

Validates extracted and user-entered data:

```typescript
class DataValidator {
  validateVehicleData(data: Partial<ExtractedVehicleData>): FieldValidation
  validateVIN(vin: string): ValidationResult
  validateYear(year: number): ValidationResult
  validateMileage(mileage: number, year: number): ValidationResult
}
```

**Validation Rules**:
- VIN: 17 characters, alphanumeric, no I/O/Q
- Year: 1900 to current year + 1
- Mileage: Reasonable for vehicle age (max 30k/year)
- Make/Model: Non-empty strings
- Location: Valid city, state format

#### Equipment Valuation Service

**File**: `src/main/services/equipmentValuation.ts`

Manages equipment feature pricing:

```typescript
const EQUIPMENT_VALUES = {
  'Navigation': 1200,
  'Sunroof': 1200,
  'Premium Audio': 800,
  'Sport Package': 1500,
  'Leather Seats': 1000,
  'Heated Seats': 500,
  'Backup Camera': 400,
  'All-Wheel Drive': 2000,
  // ... more features
};
```

#### Error Handler Service

**File**: `src/main/services/errorHandler.ts`

Centralized error handling and logging:

```typescript
class ErrorHandler {
  handleError(error: Error, context: string): AppError
  logError(error: AppError): void
  getRecoveryAction(errorType: ErrorType): string
}
```

#### System Checker Service

**File**: `src/main/services/systemChecker.ts`

Validates system requirements:

```typescript
class SystemChecker {
  static async validateStartup(): Promise<ValidationResult>
  static async getRecommendations(): Promise<string[]>
  static async checkFeatureAvailability(feature: string): Promise<boolean>
}
```

## Renderer Process Architecture

### Entry Point: `src/renderer/App.tsx`

Main React application component:

```typescript
function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewAppraisal />} />
          <Route path="/appraisal/:id" element={<AppraisalDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
```

### State Management: `src/renderer/store.ts`

Zustand store for global state:

```typescript
interface AppState {
  // Data State
  appraisals: AppraisalRecord[];
  currentAppraisal: AppraisalRecord | null;
  comparables: ComparableVehicle[];
  marketAnalysis: MarketAnalysis | null;
  settings: AppSettings;
  
  // UI State
  processingStatus: ProcessingStatus;
  isCalculating: boolean;
  selectedComparableId: string | null;
  
  // Actions
  loadAppraisals: () => Promise<void>;
  setCurrentAppraisal: (id: string) => Promise<void>;
  processNewPDF: (file: File) => Promise<void>;
  addComparable: (comparable: ComparableVehicle) => Promise<void>;
  updateComparable: (id: string, updates: Partial<ComparableVehicle>) => Promise<void>;
  deleteComparable: (id: string) => Promise<void>;
  calculateMarketValue: () => Promise<void>;
  generateReport: (options: ReportOptions) => Promise<void>;
}
```

**State Update Pattern**:
```typescript
// Optimistic update with rollback
const addComparable = async (comparable: ComparableVehicle) => {
  const previousState = get().comparables;
  
  // Optimistic update
  set({ comparables: [...previousState, comparable] });
  
  try {
    // Persist to main process
    const result = await window.electron.saveComparable(comparable);
    
    if (!result.success) {
      // Rollback on failure
      set({ comparables: previousState });
      throw new Error(result.error);
    }
    
    // Recalculate market value
    await get().calculateMarketValue();
  } catch (error) {
    set({ comparables: previousState });
    throw error;
  }
};
```

### Pages

#### Dashboard (`src/renderer/pages/Dashboard.tsx`)

Main landing page showing:
- Recent appraisals
- Quick actions (New Appraisal, View History)
- Statistics summary
- System status

#### New Appraisal (`src/renderer/pages/NewAppraisal.tsx`)

PDF upload and processing:
- Drag & drop PDF upload
- Processing progress indicator
- Extracted data display
- Confidence score visualization
- Edit extracted data
- Save as draft or complete

#### Appraisal Detail (`src/renderer/pages/AppraisalDetail.tsx`)

Complete appraisal management:
- Vehicle information display
- Comparable vehicles list
- Add/edit/delete comparables
- Market value calculator
- Calculation breakdown
- Report generation

#### History (`src/renderer/pages/History.tsx`)

Appraisal history management:
- Searchable appraisal list
- Filter by date, make, model, VIN
- Sort by various fields
- Delete appraisals
- Export to CSV/JSON

#### Settings (`src/renderer/pages/Settings.tsx`)

Application configuration:
- OCR quality settings
- Confidence thresholds
- Report defaults (appraiser info, branding)
- Export preferences
- System diagnostics

### Components

#### PDFUploader (`src/renderer/components/PDFUploader.tsx`)

Handles PDF file upload:
- Drag & drop zone
- File validation (type, size)
- Upload progress
- Error handling
- Asset availability check

#### DataDisplay (`src/renderer/components/DataDisplay.tsx`)

Displays extracted vehicle data:
- Formatted data fields
- Confidence indicators
- Edit mode
- Validation errors
- Field-level confidence scores

#### ComparableVehicleForm (`src/renderer/components/ComparableVehicleForm.tsx`)

Add/edit comparable vehicles:
- Form fields with validation
- Real-time quality score preview
- Equipment selection
- Location geocoding
- Distance calculation
- Price adjustment preview

#### ComparableVehicleList (`src/renderer/components/ComparableVehicleList.tsx`)

List of comparable vehicles:
- Sortable table
- Quality score badges
- Adjusted price display
- Edit/delete actions
- Pagination for large lists

#### MarketValueCalculator (`src/renderer/components/MarketValueCalculator.tsx`)

Market value display and analysis:
- Calculated market value
- Confidence level
- Insurance comparison
- Generate report button
- View calculation breakdown

#### CalculationBreakdownView (`src/renderer/components/CalculationBreakdownView.tsx`)

Detailed calculation steps:
- Step-by-step breakdown
- Formula explanations
- Comparable contributions
- Adjustment details
- Quality score factors

#### ReportOptionsDialog (`src/renderer/components/ReportOptionsDialog.tsx`)

Report generation options:
- Appraiser information
- Company branding
- Comparable selection
- Include/exclude sections
- Custom notes
- Save location

#### ErrorBoundary (`src/renderer/components/ErrorBoundary.tsx`)

Error boundary components:
- Catch React errors
- Display error UI
- Recovery actions
- Error reporting
- Fallback UI

### Services (Frontend)

#### Market Value Calculator

**File**: `src/renderer/services/marketValueCalculator.ts`

Calculates market value using quality-weighted average:

```typescript
class MarketValueCalculator {
  calculateMarketValue(
    comparables: ComparableVehicle[],
    lossVehicle: ExtractedVehicleData
  ): MarketValueCalculation {
    // 1. Calculate adjusted prices for each comparable
    // 2. Apply quality score weights
    // 3. Calculate weighted average
    // 4. Determine confidence level
    // 5. Generate calculation breakdown
  }
}
```

**Formula**:
```
Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Score)
```

#### Adjustment Calculator

**File**: `src/renderer/services/adjustmentCalculator.ts`

Calculates price adjustments:

```typescript
class AdjustmentCalculator {
  calculateMileageAdjustment(comparable, lossVehicle): MileageAdjustment
  calculateEquipmentAdjustments(comparable, lossVehicle): EquipmentAdjustment[]
  calculateConditionAdjustment(comparable, lossVehicle): ConditionAdjustment
  calculateTotalAdjustments(comparable, lossVehicle): PriceAdjustments
}
```

**Mileage Adjustment**:
```
Adjustment = Mileage Difference × Depreciation Rate
Depreciation Rate = 0.25 (0-3 years), 0.15 (4-7 years), 0.05 (8+ years)
```

**Equipment Adjustment**:
```
Adjustment = Σ(Missing Equipment Values) - Σ(Extra Equipment Values)
```

**Condition Adjustment**:
```
Adjustment = Base Price × (Condition Multiplier - 1.0)
Multipliers: Excellent (1.05), Good (1.00), Fair (0.95), Poor (0.85)
```

#### Quality Score Calculator

**File**: `src/renderer/services/qualityScoreCalculator.ts`

Calculates comparable quality scores:

```typescript
class QualityScoreCalculator {
  calculateScore(
    comparable: ComparableVehicle,
    lossVehicle: ExtractedVehicleData
  ): QualityScoreBreakdown {
    // Start with base score of 100
    // Apply penalties and bonuses
    // Return detailed breakdown
  }
}
```

**Scoring Factors**:
- Distance: -0.1 per mile over 100 (max -20)
- Age: -5 per year difference (max -15), +5 if newer (max +10)
- Mileage: -0.001 per mile difference (max -15), +5 if lower (max +10)
- Equipment: -2 per missing feature (max -10), +2 per extra (max +10)

#### Comparable Validation

**File**: `src/renderer/services/comparableValidation.ts`

Validates comparable data:

```typescript
class ComparableValidationService {
  validateComparable(comparable: Partial<ComparableVehicle>): ValidationResult
  detectPriceOutliers(prices: number[]): number[]
  checkMileageReasonableness(mileage: number, age: number): boolean
}
```

### Hooks

#### useDebounce

Debounces rapid value changes:

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

#### useKeyboardShortcuts

Registers keyboard shortcuts:

```typescript
function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
      shortcuts[key]?.();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

#### useNavigationGuard

Prevents navigation with unsaved changes:

```typescript
function useNavigationGuard(hasUnsavedChanges: boolean) {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
```

## Data Flow

### PDF Processing Flow

```
User Drops PDF
    ↓
PDFUploader Component
    ↓
Read File as ArrayBuffer
    ↓
IPC: processPDF(buffer)
    ↓
Main Process: pdfExtractor.extractFromPDF()
    ↓
Convert PDF to Images (pdf2pic)
    ↓
Run OCR on Images (Tesseract)
    ↓
Parse Vehicle Data (regex patterns)
    ↓
Validate Data (dataValidator)
    ↓
Save to Storage (storage.saveAppraisal())
    ↓
Return Result to Renderer
    ↓
Update Zustand Store
    ↓
Navigate to Appraisal Detail
```

### Market Value Calculation Flow

```
User Adds/Edits Comparable
    ↓
ComparableVehicleForm
    ↓
Validate Input (comparableValidation)
    ↓
IPC: saveComparable(comparable)
    ↓
Main Process: comparableStorage.saveComparable()
    ↓
Geocode Location (geolocationService)
    ↓
Calculate Distance
    ↓
Save to File System
    ↓
Return to Renderer
    ↓
Update Zustand Store (add comparable)
    ↓
Trigger Market Value Calculation
    ↓
Calculate Quality Scores (qualityScoreCalculator)
    ↓
Calculate Adjustments (adjustmentCalculator)
    ↓
Calculate Market Value (marketValueCalculator)
    ↓
Update UI with Results
```

### Report Generation Flow

```
User Clicks Generate Report
    ↓
ReportOptionsDialog Opens
    ↓
User Configures Options
    ↓
IPC: exportMarketAnalysis(appraisalId, options)
    ↓
Main Process: reportGeneration.generateReport()
    ↓
Create DOCX Document (docx library)
    ↓
Add Cover Page
    ↓
Add Executive Summary
    ↓
Add Loss Vehicle Details
    ↓
Add Comparables Table
    ↓
Add Adjustments Section
    ↓
Add Market Value Calculation
    ↓
Add Conclusion
    ↓
Save to File System
    ↓
Add to Report History
    ↓
Return File Path
    ↓
Open Report in Default Application
    ↓
Show Success Notification
```

## Security Considerations

### Context Isolation

Renderer process runs in isolated context:
- No direct access to Node.js APIs
- All communication through IPC
- Preload script exposes safe APIs

### Input Validation

All user input is validated:
- Client-side validation for UX
- Server-side validation for security
- Sanitization of file paths
- Type checking with TypeScript

### File System Access

Restricted file system access:
- Only read/write to userData directory
- No arbitrary file system access from renderer
- Path traversal prevention
- File type validation

### Error Handling

Comprehensive error handling:
- Try-catch blocks around all async operations
- Error boundaries in React components
- User-friendly error messages
- Detailed error logging

## Performance Optimizations

### OCR Processing

- Image preprocessing for better accuracy
- Parallel page processing
- Progress reporting
- Cancellation support

### State Management

- Selective re-renders with Zustand
- Memoization of expensive calculations
- Debouncing of user input
- Lazy loading of components

### Data Storage

- JSON file-based storage (fast for small datasets)
- Caching of geocoding results
- Indexed appraisal lookup
- Batch operations where possible

### UI Rendering

- Virtual scrolling for large lists
- Code splitting with React.lazy
- Optimized re-renders
- CSS-in-JS with Tailwind

## Testing Strategy

### Unit Tests

Test individual functions and services:
- Calculator services
- Validation functions
- Data transformations
- Utility functions

### Component Tests

Test React components in isolation:
- Render tests
- User interaction tests
- State management tests
- Error boundary tests

### Integration Tests

Test component interactions:
- Form submission flows
- Data persistence
- IPC communication
- State updates

### End-to-End Tests

Test complete user workflows:
- PDF upload and processing
- Comparable management
- Market value calculation
- Report generation

## Deployment

### Build Process

1. **Development Build**:
   ```bash
   npm start
   ```
   - Vite dev server
   - Hot module replacement
   - DevTools enabled

2. **Production Build**:
   ```bash
   npm run package
   ```
   - Minified code
   - Optimized assets
   - ASAR packaging

3. **Installer Creation**:
   ```bash
   npm run make
   ```
   - Platform-specific installers
   - Code signing (if configured)
   - Auto-update support (if configured)

### Distribution

- **macOS**: ZIP archive or DMG
- **Windows**: Squirrel installer or portable EXE
- **Linux**: Deb or RPM packages

### Updates

Future update mechanism:
- Electron auto-updater
- Check for updates on startup
- Download and install in background
- Notify user when ready

## Future Enhancements

### Planned Features

1. **Database Migration**: SQLite for better performance
2. **Cloud Sync**: Optional cloud backup
3. **Batch Processing**: Process multiple PDFs
4. **API Integrations**: VIN decoder, market data APIs
5. **Advanced Analytics**: Market trends, price predictions
6. **Mobile Companion**: View reports on mobile
7. **Digital Signatures**: Sign reports electronically
8. **Template System**: Customizable report templates

### Scalability Considerations

- Database migration for large datasets
- Pagination for large lists
- Background processing for heavy operations
- Worker threads for CPU-intensive tasks
- Streaming for large file operations

---

This architecture is designed to be maintainable, testable, and extensible while providing a smooth user experience and reliable data processing.
