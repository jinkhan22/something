# Ghostscript Bundling Fix - EPIPE Error Resolution

## Problem Summary

When the packaged Electron app tried to upload and parse a PDF report, it failed with:

```
Upload Failed
PDF processing failed: Failed to convert PDF page to image. 
The PDF may be corrupted or in an unsupported format.
Suggestion: Technical details: write EPIPE
```

## Root Cause

The **EPIPE (Broken Pipe)** error occurred because:

1. **GraphicsMagick requires Ghostscript to process PDFs**
   - GraphicsMagick uses Ghostscript as a delegate to convert PDF pages to images
   - When converting a PDF, GraphicsMagick spawns a Ghostscript subprocess and pipes PDF data to it

2. **Ghostscript was not bundled with the app**
   - The `bundle-graphicsmagick.sh` script only bundled the `gm` binary and its dependencies
   - It did not include the `gs` (Ghostscript) binary
   - When GraphicsMagick tried to spawn Ghostscript, it failed because the binary was not found

3. **The pipe broke (EPIPE)**
   - GraphicsMagick attempted to write PDF data to Ghostscript's stdin
   - Since Ghostscript couldn't be spawned, the pipe broke
   - This resulted in the EPIPE error

## Solution

### 1. Updated Bundle Script

Modified `/scripts/bundle-graphicsmagick.sh` to:

- **Locate and copy Ghostscript binary** (`gs`)
- **Extract Ghostscript's dependencies** using `otool`
- **Combine dependencies** from both GraphicsMagick and Ghostscript
- **Rewrite library paths** for the `gs` binary to use `@rpath`
- **Set executable permissions** on the `gs` binary

**Key Changes:**

```bash
# Locate and copy Ghostscript binary (required for PDF processing)
echo "🔍 Locating Ghostscript binary..."
GS_PATH=""
if command -v gs &> /dev/null; then
  GS_PATH=$(which gs)
  echo "   Found Ghostscript: $GS_PATH"
  echo "📦 Copying gs binary..."
  cp "$GS_PATH" "$BIN_DIR/"
  chmod +x "$BIN_DIR/gs"
else
  echo "⚠️  Warning: Ghostscript (gs) not found"
  echo "   PDF processing will not work without Ghostscript"
  echo "   Install with: brew install ghostscript"
fi

# Add Ghostscript dependencies if it exists
if [[ -n "$GS_PATH" && -f "$BIN_DIR/gs" ]]; then
  echo "🔍 Extracting Ghostscript dependencies..."
  GS_DEPENDENCIES=$(otool -L "$BIN_DIR/gs" | tail -n +2 | awk '{print $1}' | grep -v "^/usr/lib" | grep -v "^/System")
  DEPENDENCIES=$(echo -e "$DEPENDENCIES\n$GS_DEPENDENCIES" | sort -u)
fi
```

### 2. Updated Forge Configuration

Modified `forge.config.ts` to verify Ghostscript in the `postPackageHook`:

```typescript
const gsBinPath = path.join(gmPath, 'bin', 'gs');

// Verify and set permissions on Ghostscript binary if present
if (fs.existsSync(gsBinPath)) {
  console.log('✅ Ghostscript binary found:', gsBinPath);
  try {
    fs.chmodSync(gsBinPath, 0o755);
    console.log('✅ Set executable permissions (755) on gs binary');
  } catch (chmodError) {
    console.error('⚠️  Failed to set executable permissions on gs binary:', chmodError);
  }
} else {
  console.warn('⚠️  Ghostscript binary not found in bundle - PDF processing may fail');
  console.warn('   Expected location:', gsBinPath);
}
```

### 3. Updated GraphicsMagick Service

Modified `src/main/services/graphicsMagickService.ts` to expose Ghostscript path:

```typescript
export interface GraphicsMagickConfig {
  binPath: string;
  gsBinPath: string;  // Added
  libPath: string;
  isProduction: boolean;
}

static getConfig(): GraphicsMagickConfig {
  // ...
  if (isProduction) {
    const resourcesPath = process.resourcesPath;
    const gmPath = path.join(resourcesPath, 'graphicsmagick-bundle');

    this.config = {
      binPath: path.join(gmPath, 'bin', 'gm'),
      gsBinPath: path.join(gmPath, 'bin', 'gs'),  // Added
      libPath: path.join(gmPath, 'lib'),
      isProduction: true
    };
  } else {
    this.config = {
      binPath: 'gm',
      gsBinPath: 'gs',  // Added
      libPath: '',
      isProduction: false
    };
  }
  // ...
}

static getGhostscriptPath(): string {
  return this.getConfig().gsBinPath;
}
```

### 4. Updated OCR Extractor

Modified `src/main/services/ocrExtractorProcess.ts` to ensure Ghostscript is in PATH:

```typescript
// Verify GraphicsMagick is available
let gmPath: string;
let gmLibPath: string;
let gsBinDir: string = ''; // Directory containing Ghostscript binary
let useSystemFallback = false;

try {
  await GraphicsMagickService.verifyGraphicsMagick();
  gmPath = GraphicsMagickService.getGraphicsMagickPath();
  gmLibPath = GraphicsMagickService.getLibraryPath();
  
  // Get Ghostscript path - this will be the full path to the gs binary
  const gsPath = GraphicsMagickService.getGhostscriptPath();
  // Extract the directory containing the gs binary
  gsBinDir = path.dirname(gsPath);
  
  console.log('✅ Using GraphicsMagick:', gmPath);
  console.log('✅ Using Ghostscript:', gsPath);
} catch (bundledError) {
  // Fallback logic...
}

// Later, when setting up PATH:
// If using bundled GraphicsMagick, add its bin directory to PATH
// This ensures GraphicsMagick can find the bundled Ghostscript binary
if (!useSystemFallback && gsBinDir) {
  process.env.PATH = `${gsBinDir}${pathSeparator}${originalPath}`;
  console.log('📍 Added bundled Ghostscript to PATH:', gsBinDir);
} else {
  // For system fallback, add common Ghostscript paths
  const commonGsPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
  ];
  const additionalPaths = commonGsPaths.filter(p => !originalPath.includes(p)).join(pathSeparator);
  if (additionalPaths) {
    process.env.PATH = `${originalPath}${pathSeparator}${additionalPaths}`;
    console.log('📍 Added Ghostscript paths to PATH:', additionalPaths);
  }
}
```

## How It Works Now

1. **Bundle Creation** (`bundle-graphicsmagick.sh`):
   - Locates and copies both `gm` and `gs` binaries
   - Extracts and bundles all shared library dependencies from both
   - Rewrites library paths to use `@rpath` for relocatability
   - Creates a self-contained bundle at `graphicsmagick-bundle/`

2. **Packaging** (`forge.config.ts`):
   - Copies the bundle to `Resources/graphicsmagick-bundle/`
   - Verifies both binaries exist
   - Sets executable permissions (755) on both binaries
   - Validates library dependencies

3. **Runtime** (`ocrExtractorProcess.ts`):
   - Gets paths to both GraphicsMagick and Ghostscript
   - Adds Ghostscript's bin directory to PATH before PDF conversion
   - GraphicsMagick spawns Ghostscript subprocess successfully
   - PDF pages are converted to images for OCR processing

## Bundle Structure

```
Resources/
└── graphicsmagick-bundle/
    ├── bin/
    │   ├── gm           (GraphicsMagick binary)
    │   └── gs           (Ghostscript binary) ✅ NEW
    └── lib/
        ├── libGraphicsMagick.3.dylib
        ├── libarchive.13.dylib      ✅ NEW (gs dependency)
        ├── libfontconfig.1.dylib    ✅ NEW (gs dependency)
        ├── libjbig2dec.0.dylib      ✅ NEW (gs dependency)
        ├── libjpeg.8.dylib          ✅ NEW (gs dependency)
        ├── libleptonica.6.dylib     ✅ NEW (gs dependency)
        ├── libtesseract.5.dylib     ✅ NEW (gs dependency)
        ├── libopenjp2.7.dylib       ✅ NEW (gs dependency)
        ├── ... and more (22 libraries total)
        └── (shared dependencies for both gm and gs)
```

## Testing Steps

1. **Rebuild the bundle:**
   ```bash
   cd /Users/jin/Desktop/report_parser
   ./scripts/bundle-graphicsmagick.sh
   ```

2. **Package the app:**
   ```bash
   cd automotive-appraisal
   npm run package
   ```

3. **Verify bundle contents:**
   ```bash
   ls -lh "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/"
   # Should show both gm and gs
   ```

4. **Install and test:**
   - Install the packaged app
   - Upload a PDF report
   - Verify it converts and processes successfully
   - No EPIPE error should occur

## Expected Console Output

When processing a PDF in the packaged app, you should now see:

```
✅ Using GraphicsMagick: /Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm
✅ Using Ghostscript: /Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs
📍 Added bundled Ghostscript to PATH: /Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin
📍 Configuring pdf2pic to use bundled GraphicsMagick
   Binary path: /Applications/.../graphicsmagick-bundle/bin/gm
   Library path: /Applications/.../graphicsmagick-bundle/lib
Converting PDF pages to images...
✅ Page 1 processed successfully
```

## Why This Fixes the EPIPE Error

1. **Ghostscript is now available**: The `gs` binary is bundled in the app
2. **PATH is configured correctly**: Ghostscript's bin directory is added to PATH
3. **GraphicsMagick can spawn Ghostscript**: When GraphicsMagick tries to convert a PDF, it successfully spawns the bundled Ghostscript subprocess
4. **Pipe connection succeeds**: GraphicsMagick can write PDF data to Ghostscript's stdin without the pipe breaking
5. **PDF conversion completes**: Ghostscript converts PDF pages to images, which are then processed by Tesseract OCR

## Files Modified

1. `/scripts/bundle-graphicsmagick.sh` - Bundle Ghostscript with GraphicsMagick
2. `/automotive-appraisal/forge.config.ts` - Verify Ghostscript binary in postPackage hook
3. `/automotive-appraisal/src/main/services/graphicsMagickService.ts` - Expose Ghostscript path
4. `/automotive-appraisal/src/main/services/ocrExtractorProcess.ts` - Add Ghostscript to PATH

## Build Requirements

To build the app with Ghostscript bundling, ensure you have Ghostscript installed on your build system:

```bash
# macOS
brew install ghostscript

# Verify installation
which gs
gs --version
```

If Ghostscript is not installed, the bundling script will warn you but continue (PDF processing won't work in the packaged app).

## Troubleshooting

### If PDF processing still fails after the fix:

1. **Verify Ghostscript is bundled:**
   ```bash
   # Navigate to the packaged app
   cd "out/Automotive Appraisal Reporter-darwin-x64/"
   
   # Check for gs binary
   ls -la "Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs"
   
   # Verify it's executable
   file "Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs"
   ```

2. **Check the console logs:**
   - Open Console.app on macOS
   - Filter for "Automotive Appraisal Reporter"
   - Look for Ghostscript-related messages

3. **Rebuild the bundle:**
   ```bash
   rm -rf graphicsmagick-bundle/
   ./scripts/bundle-graphicsmagick.sh
   cd automotive-appraisal
   npm run package
   ```

4. **Verify Ghostscript works independently:**
   ```bash
   # Test the bundled Ghostscript
   cd "out/Automotive Appraisal Reporter-darwin-x64/"
   "./Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gs" --version
   ```

## Related Documentation

- `TESSERACT_WORKER_THREAD_FIX.md` - Tesseract.js module resolution fix
- `TESSERACT_OCR_SETUP.md` - Tesseract OCR implementation details
- `README.md` - GraphicsMagick bundling overview

---

**Fix completed:** October 26, 2025
**Issue:** EPIPE error when processing PDFs in packaged app
**Resolution:** Bundle Ghostscript with GraphicsMagick and configure PATH
