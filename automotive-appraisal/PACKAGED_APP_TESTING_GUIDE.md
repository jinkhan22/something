# Packaged Application Testing Guide

## Overview
This guide provides step-by-step instructions for testing the packaged Automotive Appraisal Reporter application to verify OCR functionality works correctly after packaging.

## Prerequisites
- Packaged application built successfully (completed in task 5.1)
- Package structure verified (all checks passed)
- Sample PDF files available in `../valuation_report_samples/`

## Test Environment
- **App Location**: `out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app`
- **Test PDFs Available**:
  - CCC Reports: `Allstate CCC Valuation XC60 Volvo 2015.pdf`, `25-439600069-ValuationReport.pdf`
  - Mitchell Reports: `VR-1-VEHICLE EVALUAT gION_1 (2).pdf`, `VR-1-VEHICLE EVALUATION_1_08142025.pdf`
  - State Farm: `State-Farm-Valuation-Report.pdf`
  - Multi-page: `14 santa fe eval.pdf`, `TL Valuation.pdf`

---

## Task 5.2: Test OCR Functionality in Packaged App

### Step 1: Launch the Packaged Application
```bash
open "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app"
```

**Expected Result**: Application launches without errors

### Step 2: Open Developer Console
- Once the app is running, press `Cmd + Option + I` to open Developer Tools
- Navigate to the Console tab
- Keep this open to monitor for any module resolution errors

### Step 3: Upload a CCC Valuation Report
1. Click on "New Appraisal" or navigate to the PDF upload section
2. Select and upload: `../valuation_report_samples/Allstate CCC Valuation XC60 Volvo 2015.pdf`
3. Wait for OCR processing to complete

**What to Check**:
- [ ] No "Cannot find module 'regenerator-runtime'" errors in console
- [ ] No worker thread spawn errors
- [ ] OCR processing progress indicator appears
- [ ] Processing completes without crashes

### Step 4: Verify Extracted Data
Once OCR processing completes, check the displayed data:

**Expected Extractions** (for CCC reports):
- [ ] Vehicle Make (e.g., "VOLVO")
- [ ] Vehicle Model (e.g., "XC60")
- [ ] Vehicle Year (e.g., "2015")
- [ ] VIN number
- [ ] Mileage
- [ ] Market Value/Settlement Amount
- [ ] Condition rating

### Step 5: Review Console Logs
In the Developer Console, look for:

**Success Indicators**:
```
=== Module Resolution Debug ===
Resources path: /Applications/Automotive Appraisal Reporter.app/Contents/Resources
✅ regenerator-runtime resolved: [path]
```

**OCR Processing Logs**:
```
Starting OCR processing...
Processing page 1...
Worker created successfully
Text extraction complete
```

**Error Indicators to Watch For**:
- ❌ `Cannot find module 'regenerator-runtime'`
- ❌ `Error: Cannot find module 'regenerator-runtime/runtime'`
- ❌ `Worker thread failed to spawn`
- ❌ `Module resolution failed`

### Step 6: Test Multiple Uploads
Upload 2-3 more PDFs to ensure consistent behavior:
1. Upload another CCC report
2. Upload a Mitchell report
3. Verify each processes successfully

---

## Task 5.3: Test with Multiple PDF Types

### Test Case 1: Mitchell Valuation Report
**File**: `../valuation_report_samples/VR-1-VEHICLE EVALUATION_1_08142025.pdf`

**Steps**:
1. Upload the Mitchell report
2. Wait for OCR processing
3. Verify extracted data displays correctly

**Expected Data**:
- [ ] Vehicle information extracted
- [ ] Market value displayed
- [ ] No console errors

### Test Case 2: State Farm Report
**File**: `../valuation_report_samples/State-Farm-Valuation-Report.pdf`

**Steps**:
1. Upload the State Farm report
2. Wait for OCR processing
3. Verify extracted data displays correctly

**Expected Data**:
- [ ] Vehicle information extracted
- [ ] Settlement amount displayed
- [ ] No console errors

### Test Case 3: Multi-Page PDF
**File**: `../valuation_report_samples/14 santa fe eval.pdf`

**Steps**:
1. Upload the multi-page PDF
2. Monitor console for page-by-page processing logs
3. Verify all pages are processed

**Expected Console Output**:
```
Processing page 1...
Processing page 2...
Processing page 3...
...
Text extraction complete
```

**Verification**:
- [ ] All pages processed without errors
- [ ] Complete data extracted from all pages
- [ ] No memory issues or crashes
- [ ] Processing time is reasonable

### Test Case 4: Additional CCC Report
**File**: `../valuation_report_samples/25-439600069-ValuationReport.pdf`

**Steps**:
1. Upload another CCC report
2. Verify consistent extraction quality
3. Compare results with previous CCC report

**Verification**:
- [ ] Extraction quality consistent
- [ ] All required fields populated
- [ ] No degradation in performance

---

## Success Criteria

### All Tests Must Pass:
1. ✅ Application launches without errors
2. ✅ No "Cannot find module" errors in console
3. ✅ OCR worker threads spawn successfully
4. ✅ Text extraction completes for all PDF types
5. ✅ Extracted data displays correctly in UI
6. ✅ No crashes or memory issues
7. ✅ Multi-page PDFs process completely
8. ✅ Performance is acceptable (similar to development version)

### Console Log Verification:
- ✅ Module resolution debug shows regenerator-runtime is found
- ✅ Worker creation succeeds
- ✅ Page-by-page processing logs appear
- ✅ No error stack traces related to module loading

---

## Troubleshooting

### If "Cannot find module" errors appear:
1. Check the package structure again:
   ```bash
   npm run verify:package
   ```
2. Verify symlinks are intact:
   ```bash
   ls -la "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/node_modules"
   ```
3. Check regenerator-runtime bundled copy:
   ```bash
   ls -la "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/tesseract.js/node_modules/regenerator-runtime"
   ```

### If OCR processing hangs:
1. Check Console.app for system-level errors
2. Verify Tesseract assets are present:
   ```bash
   ls -la "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/tesseract-assets/"
   ```
3. Check available memory and CPU usage

### If data extraction is incomplete:
1. This may be a PDF-specific issue, not packaging-related
2. Test with a known-good PDF (e.g., Allstate CCC report)
3. Compare results with development version

---

## Reporting Results

After completing all tests, document:

1. **Test Results Summary**:
   - Number of PDFs tested: ___
   - Successful extractions: ___
   - Failed extractions: ___
   - Console errors encountered: ___

2. **Performance Notes**:
   - Average processing time per page: ___
   - Memory usage: ___
   - Any performance differences from dev version: ___

3. **Issues Found**:
   - List any errors or unexpected behavior
   - Include console error messages
   - Note which PDFs caused issues

4. **Screenshots**:
   - Capture successful extraction results
   - Capture any error messages
   - Include console logs showing module resolution

---

## Next Steps

Once all tests pass:
- ✅ Mark task 5.2 as complete
- ✅ Mark task 5.3 as complete
- ✅ Mark task 5 as complete
- ➡️ Proceed to task 6: Build and test DMG installer

If tests fail:
- Review error messages
- Check package structure
- Verify postPackage hook executed correctly
- Rebuild package if necessary
