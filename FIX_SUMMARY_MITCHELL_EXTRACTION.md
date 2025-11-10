# Fix Summary: Mitchell Report Extraction Issues

## Problem Statement

The Tesseract OCR extraction for Mitchell reports had two critical issues:

### Issue 1: Incorrect Market Value Extraction
When Base Value was higher than Market Value in a Mitchell report, the system was extracting the Base Value instead of the Market Value.

**Example**:
```
Base Value = $10,066.64
Market Value = $10,062.32
```
- **Expected**: Extract $10,062.32 (Market Value)
- **Actual**: Extracted $10,066.64 (Base Value) ❌

### Issue 2: Incorrect Make Extraction
The Make field was sometimes including parts of the Model name.

**Examples**:
| Vehicle | Expected Make | Actual Make | Issue |
|---------|---------------|-------------|-------|
| 2014 Hyundai Santa Fe Sport | Hyundai | Hyundai Santa | ❌ Included "Santa" |
| 2020 Ford Super Duty F-250 | Ford | Ford Super | ❌ Included "Super" |
| 2022 BMW M3 | BMW | BMW | ✅ Correct |
| 2019 Land Rover Range Rover Sport | Land Rover | Land | ❌ Only got "Land" |

## Solution Implemented

### Fix 1: Market Value Pattern
**File**: `src/main/services/pdfExtractor.ts`

Removed the Base Value pattern from the market value extraction patterns:

```typescript
// BEFORE (wrong)
marketValue: [
  /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
  /Base Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i  // ❌ This was wrong!
],

// AFTER (correct)
marketValue: [
  /Market Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
  /Market Value:?\s*\$\s*([0-9,]+\.?\d*)/i   // ✅ Only Market Value patterns
],
```

### Fix 2: Make Extraction Using Manufacturer List
**File**: `src/main/services/pdfExtractor.ts`

Rewrote the `extractVehicleInfo()` function to use the existing `VEHICLE_MANUFACTURERS` list for accurate Make/Model separation:

```typescript
function extractVehicleInfo(text: string): { year: number; make: string; model: string } | null {
  const lossVehicleMatch = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
  
  if (!lossVehicleMatch) return null;
  
  const year = parseInt(lossVehicleMatch[1]);
  const vehicleText = lossVehicleMatch[2].trim();
  
  let make = '';
  let model = '';
  
  // Match against manufacturer list (sorted longest first for multi-word manufacturers)
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
      make = manufacturer;
      model = vehicleText.substring(manufacturer.length).trim();
      break;
    }
  }
  
  // Fallback if no manufacturer match
  if (!make) {
    const words = vehicleText.split(/\s+/);
    make = words[0];
    model = words.slice(1).join(' ');
  }
  
  return { year, make, model };
}
```

## Test Results

All tests pass successfully:

```bash
✓ should extract Make as "Hyundai" not "Hyundai Santa"
✓ should extract Make as "Ford" not "Ford Super"
✓ should extract Make as "BMW" correctly
✓ should extract Make as "Land Rover" correctly
✓ should extract Market Value, not Base Value, when Base Value is higher
✓ should extract correct Market Value from BMW M3 report
✓ should extract correct Market Value from Ford report
```

## Verification Examples

### Example 1: Hyundai Santa Fe
```
Input:  Loss vehicle: 2014 Hyundai Santa Fe Sport | ...
Before: Make="Hyundai Santa", Model="Fe Sport" ❌
After:  Make="Hyundai", Model="Santa Fe Sport" ✅
```

### Example 2: Ford Super Duty
```
Input:  Loss vehicle: 2020 Ford Super Duty F-250 | ...
Before: Make="Ford Super", Model="Duty F-250" ❌
After:  Make="Ford", Model="Super Duty F-250" ✅
```

### Example 3: Land Rover
```
Input:  Loss vehicle: 2019 Land Rover Range Rover Sport | ...
Before: Make="Land", Model="Rover Range Rover Sport" ❌
After:  Make="Land Rover", Model="Range Rover Sport" ✅
```

### Example 4: Market Value
```
Text Content:
  Base Value = $10,066.64
  Market Value = $10,062.32
  
Before: Extracted $10,066.64 ❌
After:  Extracted $10,062.32 ✅
```

## Files Modified

1. **src/main/services/pdfExtractor.ts**
   - Updated `MITCHELL_PATTERNS.marketValue` to remove Base Value pattern
   - Rewrote `extractVehicleInfo()` function

2. **src/main/services/ocrExtractorProcess.ts**
   - Added dynamic Electron import for test compatibility

3. **tests/setup.ts**
   - Added `getAppPath` to Electron mock

4. **tests/extraction-logic-fixes.test.ts** (NEW)
   - Comprehensive unit tests validating both fixes

5. **tests/mitchell-extraction-fixes.test.ts** (NEW)
   - Integration tests for PDF processing (when PDFs available)

## Impact

✅ **Market Value**: Always extracts the correct Market Value, never Base Value  
✅ **Make/Model Separation**: Accurate separation for all manufacturer names  
✅ **Multi-word Manufacturers**: Correctly handles "Land Rover", "Alfa Romeo", etc.  
✅ **Data Quality**: Improved accuracy for database storage and reporting  
✅ **Backward Compatible**: No breaking changes, automatic for all future extractions

## Usage

The fixes are automatically applied to all PDF extractions. No code changes needed in the application code. Simply process Mitchell reports as usual and the extraction will now be accurate.

## Testing

Run the extraction tests:
```bash
npm test -- extraction-logic-fixes
```

Or test with actual PDF files (when available):
```bash
npm test -- mitchell-extraction-fixes
```

## Documentation

See `MITCHELL_EXTRACTION_FIXES.md` for detailed technical documentation.
