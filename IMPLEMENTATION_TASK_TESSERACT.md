# Implementation Task: Replace pdf-parse with Tesseract OCR

## Objective

Replace the current `pdf-parse` library with **Tesseract.js OCR** for all PDF text extraction in the automotive appraisal application. This will provide accurate, consistent text extraction from Mitchell and CCC One valuation reports, eliminating the need for complex OCR corruption workarounds.

## Current Implementation Issues

The existing `pdf-parse` library fails on many PDFs:
- **Data Loss**: Missing 16.8% of text (3,209 characters) in BARSANO file
- **Text Corruption**: "Loss vehicle: 2022 BMW M3" becomes "i l : 3"
- **Wrong Data**: Extracts year as 2025 instead of 2022
- **Requires Workarounds**: BMW M-series handler, VIN decoding fallback, multi-line pattern matching

Reference files:
- Current implementation: `src/main/services/pdfExtractor.ts`
- Accurate text sample: `../text_from_valuation-BARSANO.txt`

## Requirements

### 1. Install Dependencies

```bash
npm install tesseract.js pdf2pic sharp
npm uninstall pdf-parse
```

**Packages:**
- `tesseract.js`: OCR engine (Google's Tesseract in JavaScript)
- `pdf2pic`: Converts PDF pages to PNG images for OCR
- `sharp`: Image processing (faster, better quality)

### 2. Create OCR Service

**File:** `src/main/services/ocrExtractor.ts`

**Requirements:**
- Convert each PDF page to high-resolution PNG (300 DPI minimum)
- Run Tesseract OCR on each page
- Combine all pages into single text string
- Add progress callbacks for UI updates
- Handle errors gracefully
- Clean up temporary files

**Key Features:**
```typescript
export async function extractTextWithOCR(
  pdfBuffer: Buffer,
  onProgress?: (progress: number, message: string) => void
): Promise<string>
```

**Progress Updates:**
```
"Converting PDF to images..."     (0-20%)
"Processing page 1 of 11..."      (20-30%)
"Processing page 2 of 11..."      (30-40%)
...
"Finalizing extraction..."        (90-100%)
```

**Error Handling:**
- Invalid PDF format
- Corrupted images
- Out of memory
- Missing Tesseract worker

### 3. Update PDF Extractor

**File:** `src/main/services/pdfExtractor.ts`

**Changes Required:**

1. **Remove pdf-parse:**
```typescript
// DELETE THIS:
const pdfParse = require('pdf-parse');
const data = await pdfParse(buffer);
const text = data.text;
```

2. **Use Tesseract Instead:**
```typescript
import { extractTextWithOCR } from './ocrExtractor';

export async function extractVehicleData(
  buffer: Buffer,
  onProgress?: (progress: number, message: string) => void
): Promise<ExtractedVehicleData> {
  // Extract text using OCR
  const text = await extractTextWithOCR(buffer, onProgress);
  
  // Continue with existing extraction logic...
}
```

3. **Simplify Pattern Matching:**

Since OCR provides clean text, **remove these workarounds:**

❌ **DELETE:**
- BMW M-series special handler (lines ~560-570)
- Multi-line settlement value fallback (lines ~650-680)
- OCR corruption pattern library (`vehicleInfoOCR`)
- Manufacturer OCR variants map
- Complex VIN fallback logic for corrupted text

✅ **REPLACE WITH SIMPLE PATTERNS:**
```typescript
// Clean extraction with accurate OCR text
const vehicleMatch = text.match(/Loss vehicle:\s*(\d{4})\s+([A-Za-z-]+(?:\s+[A-Za-z-]+)?)\s+([\w\s-]+?)\s*\|/i);

if (vehicleMatch) {
  year = parseInt(vehicleMatch[1]);      // 2022
  make = vehicleMatch[2].trim();         // BMW, Land Rover, etc.
  model = vehicleMatch[3].trim();        // M3, XC90, Range Rover Sport, etc.
}

// Simple settlement value extraction
const settlementMatch = text.match(/Settlement Value:?\s*\$\s*([0-9,]+\.?\d{0,2})/i);
if (settlementMatch) {
  settlementValue = parseFloat(settlementMatch[1].replace(/,/g, ''));
}
```

### 4. Update IPC Handlers

**File:** `src/main/ipc-handlers.ts`

**Add progress reporting:**
```typescript
ipcMain.handle('process-pdf', async (event, buffer: Uint8Array) => {
  try {
    const result = await extractVehicleData(
      Buffer.from(buffer),
      (progress, message) => {
        // Send progress updates to renderer
        event.sender.send('processing-progress', { progress, message });
      }
    );
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### 5. Update Renderer UI

**File:** `src/renderer/components/PDFUploader.tsx` (or similar)

**Add progress indicator:**
```typescript
const [ocrProgress, setOcrProgress] = useState(0);
const [ocrMessage, setOcrMessage] = useState('');

useEffect(() => {
  // Listen for OCR progress updates
  window.electron.onProcessingProgress((data) => {
    setOcrProgress(data.progress);
    setOcrMessage(data.message);
  });
}, []);

// In your UI:
{ocrProgress > 0 && ocrProgress < 100 && (
  <div className="ocr-progress">
    <div className="progress-bar" style={{ width: `${ocrProgress}%` }} />
    <span>{ocrMessage}</span>
  </div>
)}
```

### 6. Update Type Definitions

**File:** `src/types/index.ts`

**Add progress callback type:**
```typescript
export type OCRProgressCallback = (progress: number, message: string) => void;

// Update extractVehicleData signature
export interface PDFExtractorService {
  extractVehicleData(
    buffer: Buffer,
    onProgress?: OCRProgressCallback
  ): Promise<ExtractedVehicleData>;
}
```

## Implementation Details

### OCR Configuration

**Optimal Settings:**
```typescript
// pdf2pic options
{
  density: 300,        // 300 DPI for quality
  format: 'png',       // PNG for best quality
  width: 2400,         // High resolution
  height: 3000,        // Letter size at 300 DPI
  preserveAspectRatio: true
}

// Tesseract options
{
  lang: 'eng',         // English language
  tessedit_pageseg_mode: 1,  // Auto page segmentation with OSD
  tessedit_char_whitelist: '',  // Allow all characters
}
```

### Performance Optimization

**Parallel Processing:**
```typescript
// Process multiple pages concurrently (limit to 3 at a time)
const pagePromises = [];
for (let i = 0; i < totalPages; i++) {
  if (pagePromises.length >= 3) {
    await Promise.race(pagePromises);
  }
  pagePromises.push(processPage(i));
}
```

**Caching:**
```typescript
// Cache OCR results to avoid re-processing
const cacheKey = crypto.createHash('md5').update(buffer).digest('hex');
const cached = await getCachedOCR(cacheKey);
if (cached) return cached;

const result = await extractTextWithOCR(buffer);
await cacheOCR(cacheKey, result);
```

### Memory Management

**Stream Processing:**
```typescript
// Don't load all pages in memory at once
for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
  const page = await converter(pageNum);
  const text = await ocrPage(page.path);
  fullText += text;
  
  // Clean up immediately
  await fs.unlink(page.path);
  
  // Allow garbage collection
  if (pageNum % 3 === 0) {
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

## Testing Requirements

### Unit Tests

**File:** `tests/ocrExtractor.test.ts`

Test cases:
1. ✅ Extract text from clean PDF
2. ✅ Extract text from scanned PDF
3. ✅ Handle multi-page PDFs
4. ✅ Progress callback fires correctly
5. ✅ Error handling for invalid PDFs
6. ✅ Cleanup temporary files
7. ✅ Memory doesn't leak on multiple files

### Integration Tests

**File:** `tests/pdfExtractor.integration.test.ts`

Test all 6 sample PDFs:
1. `14 santa fe eval.pdf` → Extract: 2014 Hyundai Santa Fe Sport
2. `25-439600069-ValuationReport.pdf` → Extract: 2018 Volvo XC90
3. `25-679137965_8-7-2025_Total Loss_Valuation.pdf` → Extract: 2020 Ford Super Duty F-250
4. `valuation - BARSANO (1).pdf` → Extract: 2022 BMW M3 ✨ (Previously failed)
5. `Valution Report.pdf` → Extract: 2019 Land Rover Range Rover Sport
6. `VR-1-VEHICLE EVALUAT gION_1 (2).pdf` → Extract: 2014 Toyota Corolla

**Success Criteria:**
- ✅ 100% extraction accuracy on all files
- ✅ All confidence scores ≥ 95%
- ✅ No missing models (was 5/6, should be 6/6)
- ✅ Processing time < 30 seconds per file

### Manual Testing

**File:** Run Electron app and test:
1. Upload each sample PDF
2. Verify extracted data matches expected values
3. Check progress indicator updates smoothly
4. Confirm no crashes or memory leaks
5. Test with 10+ files in sequence

## Expected Results

### BARSANO File (Previously Failed)

**Before (pdf-parse):**
```javascript
{
  vin: 'WBS33AY09NFL79043',
  year: 2025,              // ❌ WRONG (should be 2022)
  make: 'BMW',
  model: '',               // ❌ MISSING
  mileage: 31837,
  marketValue: 73391.27,
  settlementValue: 0,      // ❌ MISSING
  confidence: 85           // ⚠️ LOW
}
```

**After (Tesseract):**
```javascript
{
  vin: 'WBS33AY09NFL79043',
  year: 2022,              // ✅ CORRECT
  make: 'BMW',             // ✅ CORRECT
  model: 'M3',             // ✅ FOUND
  mileage: 31837,          // ✅ CORRECT
  marketValue: 73391.27,   // ✅ CORRECT
  settlementValue: 72641.27, // ✅ FOUND
  confidence: 100          // ✅ PERFECT
}
```

### Code Simplification

**Lines of code removed:**
- ~200 lines of OCR corruption workarounds
- ~100 lines of BMW M-series special logic
- ~150 lines of VIN fallback complexity

**Net reduction:** ~450 lines of complex code replaced with ~150 lines of simple OCR

**Maintainability:** 🚀 Much easier to understand and debug

## Performance Expectations

| Metric | pdf-parse | Tesseract | Change |
|--------|-----------|-----------|--------|
| Speed per file | < 1s | 15-25s | 🐌 Slower |
| Accuracy | 70-85% | 95-99% | ✅ Better |
| Code complexity | High | Low | ✅ Simpler |
| Maintenance | Hard | Easy | ✅ Easier |

**Trade-off:** Slower processing for **much higher accuracy** and **simpler code**.

For financial documents, accuracy is critical → Tesseract is the right choice.

## Migration Checklist

- [ ] Install dependencies (`tesseract.js`, `pdf2pic`, `sharp`)
- [ ] Create `ocrExtractor.ts` service
- [ ] Update `pdfExtractor.ts` to use OCR
- [ ] Remove pdf-parse import and usage
- [ ] Delete OCR corruption workarounds
- [ ] Simplify pattern matching logic
- [ ] Add progress reporting to IPC handlers
- [ ] Update UI with progress indicator
- [ ] Update type definitions
- [ ] Write unit tests for OCR service
- [ ] Write integration tests for all samples
- [ ] Run manual testing on Electron app
- [ ] Update documentation
- [ ] Remove `pdf-parse` from `package.json`
- [ ] Test performance with 10+ files
- [ ] Deploy to production

## Documentation Updates

**Files to update:**
1. `README.md` - Update installation instructions
2. `SYSTEM_ANALYSIS.md` - Update extraction method description
3. `BMW_M3_FIX_DOCUMENTATION.md` - Mark as obsolete (issue fixed by OCR)
4. Create new: `TESSERACT_OCR_SETUP.md` - Setup and configuration guide

## Deliverables

1. ✅ Working OCR extraction service
2. ✅ Updated PDF extractor using Tesseract
3. ✅ Progress reporting in UI
4. ✅ All tests passing (6/6 sample files)
5. ✅ Performance benchmarks documented
6. ✅ Updated documentation
7. ✅ Clean git history with clear commits

## Timeline Estimate

- **Day 1**: Install dependencies, create OCR service (4 hours)
- **Day 2**: Update pdfExtractor, remove workarounds (4 hours)
- **Day 3**: Add progress UI, write tests (4 hours)
- **Day 4**: Integration testing, bug fixes (4 hours)
- **Day 5**: Documentation, cleanup, deployment (2 hours)

**Total:** ~18 hours of development time

## Success Metrics

**Must achieve:**
- ✅ 100% extraction accuracy on all 6 sample files
- ✅ BARSANO file extracts Model: "M3" correctly
- ✅ All confidence scores ≥ 95%
- ✅ No crashes or memory leaks
- ✅ Code reduced by ~300 lines
- ✅ Tests pass 100%

**Nice to have:**
- ⚡ Processing time < 20s per file
- 🎨 Smooth progress animation
- 💾 OCR result caching
- 📊 Extraction quality metrics

## Questions to Answer

Before starting implementation:

1. **Caching**: Should we cache OCR results? Where to store?
2. **Progress UI**: Modal dialog or inline progress bar?
3. **Error handling**: Retry logic if OCR fails?
4. **Batch processing**: Support multiple files at once?
5. **Language**: Only English or multi-language support?
6. **Quality threshold**: Minimum confidence score to accept?

## References

- Tesseract.js docs: https://github.com/naptha/tesseract.js
- pdf2pic docs: https://github.com/yakovmeister/pdf2image
- Current implementation: `src/main/services/pdfExtractor.ts`
- Test data: `../valuation_report_samples/`
- Accurate text sample: `../text_from_valuation-BARSANO.txt`

---

**Priority:** HIGH - Fixes critical data extraction issues

**Complexity:** MEDIUM - Straightforward library swap + cleanup

**Impact:** HIGH - Improves accuracy from 85% → 99%, simplifies codebase

**Status:** Ready to implement ✅
