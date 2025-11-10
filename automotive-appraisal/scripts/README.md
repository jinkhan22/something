# Build and Setup Scripts

This directory contains build and setup scripts for the Automotive Appraisal application.

## setup-tesseract-assets.js

This script automatically copies the Tesseract OCR language data file (`eng.traineddata`) to the appropriate location in `node_modules` for development mode.

### What it does

1. Copies `eng.traineddata` from the project root to `node_modules/tesseract.js-core/`
2. Verifies the file was copied successfully
3. Displays file size information

### When it runs

- Automatically runs after `npm install` via the `postinstall` script
- Can be run manually with: `node scripts/setup-tesseract-assets.js`

### Why it's needed

The Electron app needs access to Tesseract OCR assets to process PDFs:
- **Development mode**: Assets are loaded from `node_modules/tesseract.js-core/`
- **Production mode**: Assets are bundled in the `tesseract-assets` directory

Without this script, developers would see an "OCR Assets Missing" error when starting the app in development mode.

### Troubleshooting

If you see an "OCR Assets Missing" error:

1. Make sure `eng.traineddata` exists in the project root
2. Run `npm install` again to trigger the postinstall script
3. Or manually run: `node scripts/setup-tesseract-assets.js`
4. Restart the Electron app

The file should be about 4.96 MB in size.

## bundle-graphicsmagick.sh

This script creates a self-contained GraphicsMagick bundle for macOS using @loader_path-based library references.

### What it does

1. **Detects Architecture**: Identifies system architecture (Intel x86_64 or Apple Silicon arm64)
2. **Locates Binaries**: Finds GraphicsMagick and Ghostscript binaries on the build system
3. **Extracts Dependencies**: Uses `otool -L` to identify all required dynamic libraries
4. **Copies Files**: Copies binaries and libraries to bundle structure
5. **Rewrites Paths**: Uses `install_name_tool` to rewrite library paths to use @loader_path
6. **Creates Configuration**: Generates `delegates.mgk.template` for Ghostscript integration
7. **Validates Bundle**: Verifies all references use @loader_path and no absolute paths remain

### When it runs

- Automatically runs during `npm run package` via the Electron Forge postPackage hook
- Can be run manually with: `npm run bundle:gm` or `./scripts/bundle-graphicsmagick.sh`

### Why @loader_path is used

The script uses `@loader_path` instead of environment variables like `DYLD_LIBRARY_PATH` because:

**DYLD_LIBRARY_PATH doesn't work:**
- ❌ Stripped by macOS System Integrity Protection (SIP) in spawned child processes
- ❌ Unreliable in production environments
- ❌ Causes "Library not loaded" errors on end-user machines

**@loader_path works reliably:**
- ✅ Embedded in the binary at build time
- ✅ Not affected by SIP
- ✅ No environment variables required
- ✅ Works regardless of installation location
- ✅ Creates a truly self-contained bundle

### How @loader_path works

The script rewrites three types of library references:

**1. Binary → Library references:**
```bash
# Before:
/opt/homebrew/lib/libGraphicsMagick.3.dylib

# After:
@loader_path/../lib/libGraphicsMagick.3.dylib
```

**2. Library install names (IDs):**
```bash
# Before:
/opt/homebrew/lib/libGraphicsMagick.3.dylib

# After:
@loader_path/libGraphicsMagick.3.dylib
```

**3. Inter-library dependencies:**
```bash
# Before (in libGraphicsMagick.3.dylib):
/opt/homebrew/lib/liblcms2.dylib

# After:
@loader_path/liblcms2.dylib
```

### Bundle structure

The script creates the following structure:

```
graphicsmagick-bundle/
├── bin/
│   ├── gm                    # GraphicsMagick binary
│   └── gs                    # Ghostscript binary (if available)
├── lib/
│   ├── libGraphicsMagick.3.dylib
│   ├── liblcms2.dylib
│   ├── libfreetype.dylib
│   ├── libltdl.dylib
│   └── [other dependencies]
└── config/
    └── delegates.mgk.template # Ghostscript configuration template
```

### Validation

The script performs comprehensive validation:

1. **Checks for @loader_path references** in binaries
2. **Detects absolute paths** to bundled libraries (these will fail on end-user machines)
3. **Verifies library install names** use @loader_path
4. **Checks inter-library dependencies** use @loader_path
5. **Tests binary execution** to ensure it works

If validation fails, the script exits with an error and detailed diagnostic information.

You can run the standalone verification script at any time with:

```bash
npm run verify:gm
```

### Troubleshooting

**GraphicsMagick not found:**
```bash
# Install GraphicsMagick
brew install graphicsmagick

# Or specify custom path
GM_PATH_OVERRIDE=/custom/path/gm ./scripts/bundle-graphicsmagick.sh
```

**Library dependency errors:**
```bash
# Check dependencies
otool -L $(which gm)

# Ensure all dependencies are available
brew list graphicsmagick
```

**Validation failures:**
```bash
# Check for absolute paths
otool -L graphicsmagick-bundle/bin/gm | grep -v @loader_path | grep -v /usr/lib | grep -v /System

# Should return empty (no absolute paths to bundled libs)
```

**Architecture mismatches:**
```bash
# Check system architecture
uname -m

# Check binary architecture
file graphicsmagick-bundle/bin/gm

# Both should match (x86_64 or arm64)
```

> ℹ️ To generate an arm64 bundle while working on an Intel Mac, trigger the `macOS Apple Silicon Build` GitHub Action or run the bundling script on any Apple Silicon machine. The bundle always targets the architecture of the host it runs on.

### Developer notes

**Modifying the script:**

When modifying the bundle script, always:
1. Use `@loader_path` (not `@rpath` or `@executable_path`)
2. Rewrite all three types of references (binary→lib, lib IDs, lib→lib)
3. Validate thoroughly with `otool -L`
4. Test on a clean system without GraphicsMagick installed

**Testing changes:**
```bash
# Clean and rebuild
rm -rf graphicsmagick-bundle/
./scripts/bundle-graphicsmagick.sh

# Verify
npm run verify:gm

# Test execution
./graphicsmagick-bundle/bin/gm version
```

## verify-bundle.js

This script verifies the integrity of the GraphicsMagick bundle.

### What it does

1. **Checks binary existence** and executable permissions
2. **Verifies library directory** and required libraries
3. **Checks @loader_path references** in binaries
4. **Detects absolute paths** to bundled libraries
5. **Tests binary execution** to ensure it works

### When it runs

- Can be run manually with: `npm run verify:gm` or `node scripts/verify-bundle.js`
- Automatically runs during packaging via the Electron Forge postPackage hook

### Exit codes

- **0**: Bundle is valid and ready for distribution
- **1**: Bundle has issues that need to be fixed

### What it checks

**Binary checks:**
- Binary file exists
- Binary is executable
- Binary uses @loader_path references
- No absolute paths to bundled libraries

**Library checks:**
- Library directory exists
- Required libraries are present
- Libraries are readable

**Execution test:**
- Binary can be executed
- Binary outputs version information

### Troubleshooting

If verification fails, check the error messages for specific issues:

**"Binary not found":**
- Run the bundle script: `npm run bundle:gm`

**"Binary does not use @loader_path references":**
- The bundle script didn't rewrite paths correctly
- Rebuild the bundle: `rm -rf graphicsmagick-bundle/ && npm run bundle:gm`

**"Found absolute path to bundled library":**
- Critical issue - bundle will fail on end-user machines
- Rebuild the bundle and check for errors in the bundle script

**"Binary execution failed":**
- Library loading issue
- Check Console.app for dyld errors
- Verify all required libraries are present

## verify-graphicsmagick-bundle.js

Legacy verification script. Use `verify-bundle.js` instead.

## test-architecture-compatibility.sh

This script tests GraphicsMagick bundle compatibility across different macOS architectures.

### What it does

1. **Detects system architecture** (Intel x86_64 or Apple Silicon arm64)
2. **Verifies bundle structure** and file permissions
3. **Checks binary architecture** matches system architecture
4. **Checks library architecture** matches system architecture
5. **Tests library loading** and dependency resolution
6. **Tests PDF conversion** functionality

### When it runs

- Run manually before distributing builds: `./scripts/test-architecture-compatibility.sh`
- Should be run on both Intel and Apple Silicon Macs

### What it tests

**Architecture checks:**
- System architecture detection
- Binary architecture matches system
- Library architecture matches system

**Bundle checks:**
- Bundle directory structure
- Binary existence and permissions
- Library existence

**Functionality checks:**
- Binary execution
- Library loading
- PDF to PNG conversion

### Exit codes

- **0**: All tests passed
- **1**: One or more tests failed

### Troubleshooting

**Architecture mismatch:**
- Build on the correct architecture
- Intel builds only work on Intel Macs
- ARM64 builds only work on Apple Silicon Macs

**Library loading failures:**
- Check @loader_path references: `otool -L graphicsmagick-bundle/bin/gm`
- Verify all libraries are present: `ls -la graphicsmagick-bundle/lib/`

**PDF conversion failures:**
- Check if Ghostscript is bundled: `ls -la graphicsmagick-bundle/bin/gs`
- Test Ghostscript separately: `./graphicsmagick-bundle/bin/gs --version`
