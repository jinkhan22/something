# Cross-Architecture Compatibility Testing Guide

This guide provides step-by-step instructions for testing the Automotive Appraisal Reporter application on both Intel and Apple Silicon Mac architectures.

## Overview

The application must work correctly on both:
- **Intel Macs** (x86_64 architecture)
- **Apple Silicon Macs** (arm64 architecture)

This testing ensures that the GraphicsMagick bundle, wrapper scripts, and library loading work correctly on both platforms.

## Prerequisites

### Required Hardware
- Access to an Intel Mac (x86_64)
- Access to an Apple Silicon Mac (arm64)

### Required Software
- Node.js and npm installed on both machines
- Xcode Command Line Tools installed on both machines
- Git (to clone the repository)

## Testing Process

### Phase 1: Build on Each Architecture

#### On Intel Mac

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd automotive-appraisal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run make
   ```

4. **Verify the build**
   ```bash
   ls -la "out/Automotive Appraisal Reporter-darwin-x64/"
   ```
   
   You should see: `Automotive Appraisal Reporter.app`

#### On Apple Silicon Mac

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd automotive-appraisal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run make
   ```

4. **Verify the build**
   ```bash
   ls -la "out/Automotive Appraisal Reporter-darwin-arm64/"
   ```
   
   You should see: `Automotive Appraisal Reporter.app`

### Phase 2: Automated Testing

#### On Intel Mac

1. **Run the architecture compatibility test**
   ```bash
   cd automotive-appraisal
   chmod +x scripts/test-architecture-compatibility.sh
   ./scripts/test-architecture-compatibility.sh
   ```

2. **Expected output**
   ```
   ✅ Running on Intel Mac (x86_64)
   ✅ Bundle directory exists
   ✅ gm wrapper script exists and is executable
   ✅ Binary architecture matches system architecture
   ✅ All libraries match system architecture
   ✅ gm wrapper executed successfully
   ✅ PDF conversion successful
   ✅ All automated tests passed on x86_64 architecture
   ```

3. **If any test fails**
   - Review the error message
   - Check the bundle structure
   - Verify the build process completed successfully
   - Check Console.app for detailed error messages

#### On Apple Silicon Mac

1. **Run the architecture compatibility test**
   ```bash
   cd automotive-appraisal
   chmod +x scripts/test-architecture-compatibility.sh
   ./scripts/test-architecture-compatibility.sh
   ```

2. **Expected output**
   ```
   ✅ Running on Apple Silicon Mac (arm64)
   ✅ Bundle directory exists
   ✅ gm wrapper script exists and is executable
   ✅ Binary architecture matches system architecture
   ✅ All libraries match system architecture
   ✅ gm wrapper executed successfully
   ✅ PDF conversion successful
   ✅ All automated tests passed on arm64 architecture
   ```

3. **If any test fails**
   - Review the error message
   - Check the bundle structure
   - Verify the build process completed successfully
   - Check Console.app for detailed error messages

### Phase 3: Manual Application Testing

#### On Intel Mac

1. **Launch the application**
   ```bash
   open "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app"
   ```

2. **Test PDF upload and OCR**
   - Click "New Appraisal"
   - Click "Upload PDF" or drag and drop a PDF file
   - Use a test PDF from `valuation_report_samples/`
   - Verify the upload progress indicator appears
   - Wait for OCR processing to complete
   - Verify extracted data appears in the form fields

3. **Verify extracted data**
   - Check that vehicle information is extracted correctly
   - Check that market value is extracted correctly
   - Check that all fields are populated as expected

4. **Check for errors**
   - Open Console.app
   - Filter for "Automotive Appraisal Reporter"
   - Look for any error messages, especially:
     - "dyld: Library not loaded"
     - "EPIPE"
     - "GraphicsMagick"
   - Verify no critical errors appear

5. **Test multiple PDFs**
   - Upload at least 3 different PDFs
   - Verify all process successfully
   - Check for consistent behavior

#### On Apple Silicon Mac

1. **Launch the application**
   ```bash
   open "out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app"
   ```

2. **Test PDF upload and OCR**
   - Click "New Appraisal"
   - Click "Upload PDF" or drag and drop a PDF file
   - Use a test PDF from `valuation_report_samples/`
   - Verify the upload progress indicator appears
   - Wait for OCR processing to complete
   - Verify extracted data appears in the form fields

3. **Verify extracted data**
   - Check that vehicle information is extracted correctly
   - Check that market value is extracted correctly
   - Check that all fields are populated as expected

4. **Check for errors**
   - Open Console.app
   - Filter for "Automotive Appraisal Reporter"
   - Look for any error messages, especially:
     - "dyld: Library not loaded"
     - "EPIPE"
     - "GraphicsMagick"
   - Verify no critical errors appear

5. **Test multiple PDFs**
   - Upload at least 3 different PDFs
   - Verify all process successfully
   - Check for consistent behavior

### Phase 4: Wrapper Script Verification

#### On Both Architectures

1. **Test gm wrapper directly**
   ```bash
   # Intel
   "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version
   
   # Apple Silicon
   "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version
   ```
   
   Expected output:
   ```
   GraphicsMagick 1.3.x ...
   ```

2. **Test gs wrapper directly**
   ```bash
   # Intel
   "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs" --version
   
   # Apple Silicon
   "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs" --version
   ```
   
   Expected output:
   ```
   10.x.x
   ```

3. **Test PDF conversion directly**
   ```bash
   # Intel
   "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" convert -density 150 valuation_report_samples/State-Farm-Valuation-Report.pdf[0] /tmp/test-intel.png
   
   # Apple Silicon
   "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" convert -density 150 valuation_report_samples/State-Farm-Valuation-Report.pdf[0] /tmp/test-arm.png
   ```
   
   Verify the PNG files are created:
   ```bash
   ls -lh /tmp/test-*.png
   file /tmp/test-*.png
   ```

### Phase 5: Library Loading Verification

#### On Both Architectures

1. **Check binary architecture**
   ```bash
   # Intel
   file "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
   
   # Apple Silicon
   file "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
   ```
   
   Expected output:
   - Intel: `Mach-O 64-bit executable x86_64`
   - Apple Silicon: `Mach-O 64-bit executable arm64`

2. **Check library dependencies**
   ```bash
   # Intel
   otool -L "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
   
   # Apple Silicon
   otool -L "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
   ```
   
   Verify:
   - All paths use `@executable_path/../lib` or `@rpath`
   - No absolute paths to `/opt/homebrew` or `/usr/local`

3. **Check library architecture**
   ```bash
   # Intel
   file "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/lib/libGraphicsMagick.3.dylib"
   
   # Apple Silicon
   file "./out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/lib/libGraphicsMagick.3.dylib"
   ```
   
   Expected output:
   - Intel: `Mach-O 64-bit dynamically linked shared library x86_64`
   - Apple Silicon: `Mach-O 64-bit dynamically linked shared library arm64`

## Test Results Documentation

### Intel Mac Results

**System Information:**
- macOS Version: _____________
- Processor: _____________
- Architecture: x86_64

**Automated Tests:**
- [ ] Bundle structure verified
- [ ] Wrapper scripts executable
- [ ] Binary architecture correct
- [ ] Library architecture correct
- [ ] Wrapper execution successful
- [ ] PDF conversion successful

**Manual Tests:**
- [ ] Application launches
- [ ] PDF upload works
- [ ] OCR extraction works
- [ ] Data extraction accurate
- [ ] No errors in Console.app
- [ ] Multiple PDFs tested

**Issues Found:**
_____________________________________________
_____________________________________________

### Apple Silicon Mac Results

**System Information:**
- macOS Version: _____________
- Processor: _____________
- Architecture: arm64

**Automated Tests:**
- [ ] Bundle structure verified
- [ ] Wrapper scripts executable
- [ ] Binary architecture correct
- [ ] Library architecture correct
- [ ] Wrapper execution successful
- [ ] PDF conversion successful

**Manual Tests:**
- [ ] Application launches
- [ ] PDF upload works
- [ ] OCR extraction works
- [ ] Data extraction accurate
- [ ] No errors in Console.app
- [ ] Multiple PDFs tested

**Issues Found:**
_____________________________________________
_____________________________________________

## Troubleshooting

### Common Issues

#### Issue: "Binary architecture mismatch"
**Cause:** Built on wrong architecture or using wrong build output
**Solution:** 
- Verify you're testing the correct build (x64 vs arm64)
- Rebuild on the target architecture

#### Issue: "Library not loaded" errors
**Cause:** Library paths not configured correctly
**Solution:**
- Check wrapper script sets DYLD_LIBRARY_PATH
- Verify install_name_tool was run correctly
- Check otool -L output for absolute paths

#### Issue: "EPIPE" errors during PDF processing
**Cause:** GraphicsMagick process crashing on startup
**Solution:**
- Check Console.app for dyld errors
- Verify all libraries are present in bundle
- Test wrapper script directly

#### Issue: Different behavior on Intel vs Apple Silicon
**Cause:** Architecture-specific library issues
**Solution:**
- Compare otool -L output on both architectures
- Verify library dependencies are satisfied
- Check for Rosetta 2 interference on Apple Silicon

## Success Criteria

The cross-architecture compatibility testing is successful when:

1. ✅ Automated tests pass on both Intel and Apple Silicon
2. ✅ Application launches on both architectures
3. ✅ PDF upload and OCR work on both architectures
4. ✅ No EPIPE errors occur on either architecture
5. ✅ No library loading errors in Console.app
6. ✅ Wrapper scripts execute correctly on both architectures
7. ✅ Binary and library architectures match system architecture
8. ✅ Multiple PDFs process successfully on both architectures

## Reporting Results

After completing all tests, create a summary report:

```markdown
# Cross-Architecture Testing Results

## Test Date
[Date]

## Intel Mac Testing
- System: [macOS version, processor]
- Automated Tests: [PASS/FAIL]
- Manual Tests: [PASS/FAIL]
- Issues: [List any issues]

## Apple Silicon Mac Testing
- System: [macOS version, processor]
- Automated Tests: [PASS/FAIL]
- Manual Tests: [PASS/FAIL]
- Issues: [List any issues]

## Overall Result
[PASS/FAIL]

## Recommendations
[Any recommendations for improvements]
```

## Next Steps

After successful testing:
1. Document any architecture-specific issues found
2. Update the README with architecture compatibility notes
3. Consider adding CI/CD tests for both architectures
4. Plan for regular cross-architecture testing in future releases
