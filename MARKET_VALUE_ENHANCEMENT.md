# Market Value Extraction Enhancement

## Issue
After fixing the Base Value vs Market Value issue, the Market Value field was appearing blank for most Mitchell reports in the Electron app. While it worked for a few reports, the majority showed no Market Value.

## Root Cause
The original Market Value patterns were too strict and didn't account for:
1. **Multi-line formats** - Where "Market Value" appears on one line and the dollar amount on the next line
2. **Spacing variations** - OCR can introduce extra spaces or inconsistent spacing
3. **OCR artifacts** - Text like "arket Value" (missing first letter) due to OCR misreads

## Solution

### 1. Enhanced Pattern Matching
Added multiple pattern variations to handle different spacing and formatting:

```typescript
marketValue: [
  /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,  // Standard: "Market Value = $X"
  /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,  // With colon: "Market Value: $X"
  /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,      // No separator: "Market Value $X"
  /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,  // Compact: "MarketValue=$X"
],
```

### 2. Multi-Line Fallback Logic
Added comprehensive fallback logic similar to Settlement Value extraction:

```typescript
// Fallback: look for "Market Value" pattern manually for multi-line cases
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Look for "Market Value" label (may have OCR variations)
  if (line.match(/^(Market Value|arket\s*Value):?\s*$/i)) {
    // Look for the dollar amount in the next few lines
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (nextLine.includes('$')) {
        const dollarMatch = nextLine.match(/\$\s*([0-9,]+\.?\d*)/);
        if (dollarMatch) {
          marketValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
          break;
        }
      }
    }
    if (marketValue > 0) break;
  }
  
  // Also check for inline patterns with variations in spacing
  const inlineMatch = line.match(/Market\s*Value[:\s=]*\$\s*([0-9,]+\.?\d*)/i);
  if (inlineMatch) {
    marketValue = parseFloat(inlineMatch[1].replace(/,/g, ''));
    break;
  }
}
```

## Formats Now Supported

### Format 1: Standard Inline
```
Base Value = $10,066.64
Market Value = $10,062.32
Settlement Value = $10,741.06
```
✅ Extracts: $10,062.32

### Format 2: Multi-Line
```
Base Value
$73,261.27
Market Value
$73,391.27
Settlement Value
$75,800.00
```
✅ Extracts: $73,391.27

### Format 3: Extra Spaces (OCR artifact)
```
Base Value   =   $45,200.00
Market  Value   =   $45,850.00
Settlement Value   =   $47,250.00
```
✅ Extracts: $45,850.00

### Format 4: Colon Separator
```
Base Value: $35,100.00
Market Value: $35,450.00
Settlement Value: $36,200.00
```
✅ Extracts: $35,450.00

### Format 5: No Separator
```
Base Value $28,500.00
Market Value $28,750.00
Settlement Value $29,500.00
```
✅ Extracts: $28,750.00

### Format 6: OCR Label Variations
```
Base Value
$50,000.00
arket Value
$51,200.00
Settlement Value
$52,500.00
```
✅ Extracts: $51,200.00 (handles "arket Value" OCR error)

## Test Results

All 7 Market Value format tests pass:

```
✓ should extract Market Value from standard inline format
✓ should extract Market Value from multi-line format
✓ should extract Market Value with extra spaces
✓ should extract Market Value with colon separator
✓ should extract Market Value without separator
✓ should handle OCR label variations (arket Value)
✓ should never extract Base Value as Market Value
```

## Benefits

1. **Robustness** - Handles various OCR output formats
2. **Reliability** - Multi-line fallback ensures extraction even when patterns fail
3. **Accuracy** - Still correctly avoids Base Value extraction
4. **OCR-Friendly** - Tolerates common OCR artifacts and spacing issues

## Files Modified

- `src/main/services/pdfExtractor.ts`
  - Enhanced `MITCHELL_PATTERNS.marketValue` with multiple pattern variations
  - Added multi-line fallback logic for Market Value extraction

## Testing

Run Market Value format tests:
```bash
npm test -- market-value-formats.test.ts
```

Run all extraction tests:
```bash
npm test -- extraction-logic-fixes
```
