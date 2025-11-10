# Cross-Architecture Testing Quick Reference

## Quick Start

### Run Automated Tests

```bash
# From the automotive-appraisal directory
npm run test:arch
```

### Expected Output

```
✅ Running on [Intel Mac (x86_64) | Apple Silicon Mac (arm64)]
✅ Bundle directory exists
✅ Wrapper scripts executable
✅ Binary architecture matches system
✅ Library architecture matches system
✅ Wrapper execution successful
✅ PDF conversion successful
✅ All automated tests passed
```

## What Gets Tested

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| **Architecture Detection** | Identifies system architecture | Correctly identifies x86_64 or arm64 |
| **Bundle Structure** | Verifies all required files exist | All directories and files present |
| **Wrapper Scripts** | Checks gm and gs wrappers | Scripts exist and are executable |
| **Binary Architecture** | Verifies binary matches system | gm-real and gs-real match system arch |
| **Library Architecture** | Checks all .dylib files | All libraries match system arch |
| **Wrapper Execution** | Tests wrapper scripts run | gm and gs execute successfully |
| **Library Loading** | Verifies library dependencies | No absolute paths, @executable_path used |
| **PDF Conversion** | Tests actual PDF processing | PDF converts to PNG successfully |

## Manual Testing Checklist

After automated tests pass:

- [ ] Launch the packaged application
- [ ] Upload a test PDF
- [ ] Verify OCR extraction completes
- [ ] Check extracted data is correct
- [ ] Test with multiple PDFs
- [ ] Check Console.app for errors

## Common Issues

### Issue: "No packaged app found"
**Solution:** Run `npm run make` first to create the packaged app

### Issue: "Binary architecture mismatch"
**Solution:** Ensure you're testing the correct build (x64 vs arm64)

### Issue: "Library not loaded" errors
**Solution:** Verify wrapper scripts set DYLD_LIBRARY_PATH correctly

### Issue: "EPIPE" errors
**Solution:** Check that all libraries are present and have correct architecture

## Test on Both Architectures

| Architecture | Build Command | Test Command | Expected Build Path |
|--------------|---------------|--------------|---------------------|
| **Intel (x86_64)** | `npm run make` | `npm run test:arch` | `out/...-darwin-x64/` |
| **Apple Silicon (arm64)** | `npm run make` | `npm run test:arch` | `out/...-darwin-arm64/` |

## Documentation

- **Detailed Guide:** `CROSS_ARCHITECTURE_TESTING_GUIDE.md`
- **Test Results Template:** `CROSS_ARCHITECTURE_TEST_RESULTS.md`
- **Completion Summary:** `TASK_14_COMPLETION_SUMMARY.md`
- **Test Script:** `scripts/test-architecture-compatibility.sh`

## Success Criteria

✅ All automated tests pass on both Intel and Apple Silicon  
✅ Application launches on both architectures  
✅ PDF upload and OCR work on both architectures  
✅ No EPIPE errors occur on either architecture  
✅ No library loading errors in Console.app  
✅ Wrapper scripts execute correctly on both architectures  
✅ Binary and library architectures match system architecture  
✅ Multiple PDFs process successfully on both architectures  

## Quick Commands

```bash
# Run architecture test
npm run test:arch

# Build and package
npm run make

# Verify GraphicsMagick bundle
npm run verify:gm

# Verify package structure
npm run verify:package

# Test wrapper directly
"./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version

# Check binary architecture
file "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"

# Check library dependencies
otool -L "./out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"
```

## Report Issues

When reporting architecture-specific issues, include:

1. System architecture (x86_64 or arm64)
2. macOS version
3. Output from `npm run test:arch`
4. Console.app logs
5. Steps to reproduce

---

**For detailed instructions, see:** `CROSS_ARCHITECTURE_TESTING_GUIDE.md`
