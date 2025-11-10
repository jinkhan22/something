# Manual Testing Guide for Packaged Application

## Quick Start

### 1. Install the Application
```bash
# Open the DMG
open out/make/Auto-Appraisal-Reporter.dmg

# Drag the app to Applications folder
# Then launch from Applications
```

### 2. Set Up Console Monitoring
```bash
# Open Console.app
open -a Console

# Or from Applications > Utilities > Console
```

In Console.app:
1. Click the search field (top right)
2. Type: `Automotive Appraisal Reporter`
3. Press Enter
4. Click "Start" to begin streaming logs

### 3. Test PDF Upload

#### Test 1: Single-Page PDF
1. Launch Automotive Appraisal Reporter
2. Click "New Appraisal"
3. Upload: `valuation_report_samples/State-Farm-Valuation-Report.pdf`
4. Watch Console.app for errors
5. Verify processing completes successfully

**Expected Result**: ✅ PDF processes without EPIPE errors

#### Test 2: Multi-Page PDF
1. Click "New Appraisal" again
2. Upload: `valuation_report_samples/14 santa fe eval.pdf`
3. Monitor Console.app
4. Verify all pages process

**Expected Result**: ✅ All pages convert successfully

#### Test 3: Complex Multi-Page PDF
1. Click "New Appraisal"
2. Upload: `valuation_report_samples/Allstate CCC Valuation XC60 Volvo 2015.pdf`
3. Monitor for any errors
4. Check extracted data

**Expected Result**: ✅ Complete extraction without errors

## What to Look For

### ✅ Success Indicators
- Progress bar shows conversion progress
- No error dialogs appear
- All pages convert (check page count)
- Extracted data displays correctly
- Console.app shows normal log messages

### ❌ Failure Indicators
- Error dialog with "EPIPE" message
- Console.app shows "Library not loaded"
- Console.app shows "dyld" errors
- PDF processing hangs
- Incomplete page conversion
- Application crashes

## Console.app Error Examples

### Good (Normal Operation)
```
🔧 GraphicsMagick environment setup:
   DYLD_LIBRARY_PATH: /path/to/lib
   DYLD_FALLBACK_LIBRARY_PATH: /path/to/lib
🔄 Converting PDF page 1 to PNG...
✅ Successfully converted page 1 to PNG
```

### Bad (EPIPE Error - Should NOT Occur)
```
❌ Error: write EPIPE
❌ GraphicsMagick process failed to start
dyld: Library not loaded: libGraphicsMagick.3.dylib
```

## Testing Checklist

### Pre-Testing
- [ ] DMG installed successfully
- [ ] Application launches without errors
- [ ] Console.app is open and filtering logs
- [ ] Test PDFs are accessible

### Single-Page PDF Test
- [ ] Upload State-Farm-Valuation-Report.pdf
- [ ] No EPIPE errors in console
- [ ] PDF processes successfully
- [ ] Extracted data is correct

### Multi-Page PDF Test (3-5 pages)
- [ ] Upload 14 santa fe eval.pdf
- [ ] All pages convert successfully
- [ ] No EPIPE errors
- [ ] No dyld errors in Console.app
- [ ] Processing completes in reasonable time

### Complex Multi-Page PDF Test (10+ pages)
- [ ] Upload Allstate CCC Valuation XC60 Volvo 2015.pdf
- [ ] All pages process
- [ ] No memory issues
- [ ] No EPIPE errors
- [ ] Complete data extraction

### Error Monitoring
- [ ] No "Library not loaded" messages
- [ ] No "dyld" error messages
- [ ] No "EPIPE" errors
- [ ] No "broken pipe" errors
- [ ] No GraphicsMagick spawn failures

## Troubleshooting

### If EPIPE Error Occurs
1. **Check Console.app** for detailed error messages
2. **Look for dyld errors** indicating library loading issues
3. **Verify bundle structure**:
   ```bash
   ls -la "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle"
   ```
4. **Test GraphicsMagick directly**:
   ```bash
   "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version
   ```

### If Library Not Loaded Error
1. Check that wrapper scripts exist and are executable
2. Verify libraries are in the bundle
3. Check library dependencies:
   ```bash
   otool -L "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
   ```

## Reporting Results

### Success Report Template
```
✅ TESTING SUCCESSFUL

System: macOS [version]
Date: [date]
Tester: [name]

Tests Completed:
- Single-page PDF: ✅ PASSED
- Multi-page PDF (3-5 pages): ✅ PASSED
- Complex PDF (10+ pages): ✅ PASSED
- Console.app monitoring: ✅ NO ERRORS

Notes:
[Any observations]
```

### Failure Report Template
```
❌ TESTING FAILED

System: macOS [version]
Date: [date]
Tester: [name]

Failed Test: [test name]
Error Type: [EPIPE / Library Loading / Other]

Console.app Output:
[Paste relevant error messages]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
...

Screenshots:
[Attach screenshots]
```

## Advanced Testing

### Test on Clean System
1. Use a Mac without GraphicsMagick installed
2. Verify application works without system dependencies
3. Test that bundled libraries are sufficient

### Test Architecture Compatibility
- Test on Intel Mac (if available)
- Test on Apple Silicon Mac (if available)
- Verify wrapper scripts work on both architectures

### Stress Testing
1. Upload multiple PDFs in sequence
2. Test with very large PDFs (50+ pages)
3. Monitor memory usage
4. Check for resource leaks

## Quick Commands Reference

### Check if GraphicsMagick is installed system-wide
```bash
which gm
# Should return nothing if not installed
```

### Test bundled GraphicsMagick directly
```bash
"/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version
```

### View wrapper script content
```bash
cat "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm"
```

### Check library dependencies
```bash
otool -L "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
```

### Monitor Console.app from command line
```bash
log stream --predicate 'process == "Automotive Appraisal Reporter"' --level debug
```

## Success Criteria

The packaged application test is considered **SUCCESSFUL** if:

1. ✅ Application installs and launches without errors
2. ✅ Single-page PDFs process without EPIPE errors
3. ✅ Multi-page PDFs process completely
4. ✅ No dyld library loading errors in Console.app
5. ✅ All PDF pages convert to images successfully
6. ✅ OCR extraction completes for all pages
7. ✅ No crashes or hangs during processing
8. ✅ Works on system without GraphicsMagick installed

## Contact

If you encounter any issues during testing, please document:
- Exact error messages
- Console.app logs
- Steps to reproduce
- System information (macOS version, architecture)
- Screenshots of errors

---

**Ready to test? Follow the Quick Start section above!**
