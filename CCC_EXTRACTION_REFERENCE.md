# CCC One Report Extraction - Quick Reference

## Field Mappings

### From CCC One Report Text → Extracted Data

| Field | Pattern | Example Input | Extracted Output | Notes |
|-------|---------|---------------|------------------|-------|
| **VIN** | `\b[A-HJ-NPR-Z0-9]{17}\b` | `VIN YV4902RK6F2702888` | `YV4902RK6F2702888` | Standard 17-character VIN |
| **Year** | `Year\s+(\d{4})` | `Year 2015` | `2015` | May span multiple lines in OCR |
| **Make** | `^Make\s+([A-Za-z\-]+?)` | `Make Volvo` or `Make Mercedes-Benz } ) oo` | `Volvo` or `Mercedes-Benz` | Removes OCR garbage |
| **Model** | `^Model\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9]+)?(?:\s+[A-Za-z0-9]+)?)` | `Model XG60 Vehicle Information` | `XC60` (after cleaning) | Max 3 words, OCR corrected |
| **Mileage** | `^Odometer\s+(\d{1,3}(?:,\d{3})*)` | `Odometer 88,959` | `88959` | Commas removed |
| **Location** | `^Location\s+([A-Z][A-Z\s,\.\-0-9]+?)(?:\s+(?:are\|clot\|Vehicles)\|\s*$)` | `Location ALEDO, TX 76008-1527 are required` | `ALEDO, TX 76008-1527` | Stops at OCR artifacts |
| **Market Value** | `^Adjusted Vehicle Value\s+\$\s*([0-9,]+\.\d{2})` | `Adjusted Vehicle Value $ 12,053.00` | `12053.00` | NOT Base Vehicle Value |
| **Settlement Value** | `^Total\s+\$\s*([0-9,]+\s*\.\s*\d{2})` | `Total $ 12,197.81` or `Total $ 9,251 .08` | `12197.81` or `9251.08` | Handles OCR spaces |

## Common OCR Corrections

### Model Names
- `XG60` → `XC60` (Volvo)
- `XG90` → `XC90` (Volvo)
- `XG40` → `XC40` (Volvo)
- `8` → `8 Series` (BMW)
- `Model` → `Model 3` (Tesla)

### Text Cleanup
- **Model**: Remove " Vehicle Information", " Vehicle", " Section"
- **Make**: Remove trailing `}`, `)`, `(`, `o`
- **Location**: Stop at "are", "clot", "Vehicles"
- **Money**: Remove all spaces and commas

## CCC One vs Mitchell Reports

| Feature | CCC One | Mitchell |
|---------|---------|----------|
| **Format** | Line-by-line fields | Paragraph-style |
| **Market Value Label** | "Adjusted Vehicle Value" | "Market Value" |
| **Settlement Value Label** | "Total" | "Settlement Value" |
| **VIN Location** | "VEHICLE DETAILS" section | Near "Ext Color" |
| **Detection** | Contains "CCC ONE" or "CCOSONE" | Default fallback |

## Important Notes

### Market Value Confusion
CCC One reports show **TWO** values:
1. **Base Vehicle Value**: Initial value before adjustments (NOT used)
2. **Adjusted Vehicle Value**: Value after condition adjustment ✅ **THIS IS THE MARKET VALUE**

Example:
```
Base Vehicle Value        $ 11,604.00  ← Don't use this
Condition Adjustment      + $    449.00
Adjusted Vehicle Value    $ 12,053.00  ← Use this as Market Value
```

### Settlement Value
The "Total" field at the end of VALUATION SUMMARY:
```
Value before Deductible   $ 12,697.81
Deductible*               - $   500.00
Total                     $ 12,197.81  ← This is Settlement Value
```

## Testing

All test scripts in `automotive-appraisal/`:
- `test-ccc-reports.js` - Test single Volvo report
- `test-all-ccc-reports.js` - Test all CCC reports
- `test-ccc-simple.js` - Test with pre-extracted OCR text
- `debug-ccc-text.js` - Debug OCR output
- `debug-ccc-failures.js` - Debug specific failing reports

## Confidence Indicators

### High Confidence (90%+)
- All fields extracted
- VIN is 17 characters
- Year between 1990-2025
- Make matches known manufacturers
- Values are reasonable

### Medium Confidence (60-90%)
- Most fields extracted
- Minor OCR corrections needed
- Some fields may need cleanup

### Low Confidence (<60%)
- Multiple missing fields
- OCR quality poor
- May not be a valid report
