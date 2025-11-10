# Automotive Appraisal Application

A professional desktop application for processing automotive PDF valuation reports and performing comprehensive market value analysis. Built with Electron, React, and TypeScript.

## Overview

This application helps automotive appraisers and insurance professionals:
- Extract vehicle data from PDF valuation reports (CCC One and Mitchell formats)
- Analyze comparable vehicles to determine accurate market values
- Generate professional appraisal reports in DOCX format
- Manage appraisal history and report generation

## Key Features

### PDF Processing & Data Extraction
- **Drag & Drop Interface**: Simple PDF upload with visual feedback
- **OCR-Based Extraction**: Uses Tesseract.js for 99% accuracy
- **Multi-Format Support**: CCC One and Mitchell valuation reports
- **Offline Operation**: All OCR assets bundled, no internet required
- **Confidence Scoring**: Real-time extraction confidence metrics

### Market Value Analysis
- **Comparable Vehicle Management**: Add, edit, and track comparable vehicles
- **Quality-Weighted Calculations**: Industry-standard market value formulas
- **Automatic Adjustments**: Mileage, equipment, and condition adjustments
- **Distance Calculations**: Geographic distance from loss vehicle
- **Confidence Metrics**: 0-95% confidence based on comparable quality

### Professional Report Generation
- **DOCX Export**: Generate Microsoft Word-compatible reports
- **Customizable Branding**: Company logo, appraiser credentials
- **Comprehensive Sections**: Executive summary, comparables, adjustments, conclusions
- **Report History**: Track all generated reports with metadata
- **Flexible Options**: Include/exclude detailed calculations and breakdowns

### Data Management
- **Auto-Save**: Automatic draft saving during processing
- **History Tracking**: Complete appraisal history with search
- **Export Options**: CSV and JSON export capabilities
- **Data Validation**: Real-time validation with helpful error messages

## System Requirements

### For End Users (Packaged Application)
- **macOS**: 10.13 (High Sierra) or later
  - Supports both Intel (x86_64) and Apple Silicon (arm64) architectures
- **Windows**: Windows 10 or later (64-bit)
- **Linux**: Ubuntu 18.04+ or equivalent

**No additional software installation required** - GraphicsMagick and Tesseract OCR are bundled with the application.

### For Development
- **Node.js**: v16 or higher
- **npm** or **yarn**: Package manager
- **GraphicsMagick**: Required on build system for bundling
  - **macOS**: `brew install graphicsmagick`
  - **Windows**: Download from [graphicsmagick.org](http://www.graphicsmagick.org/download.html)
  - **Linux (Ubuntu/Debian)**: `sudo apt-get install graphicsmagick`
  - **Linux (Fedora/RHEL)**: `sudo yum install GraphicsMagick`

**Note**: GraphicsMagick must be installed on the build system to create the bundle, but end users do not need to install it separately.

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd automotive-appraisal

# Install dependencies
npm install

# Start the application
npm start
```

The application will:
1. Verify system requirements
2. Check OCR assets availability
3. Launch the Electron desktop app
4. Open DevTools (in development mode)

### Building for Production

#### Build Requirements

Before building the application, ensure the following are installed on your build system:

1. **GraphicsMagick**: Required for creating the bundled binary
   ```bash
   # macOS
   brew install graphicsmagick
   
   # Verify installation
   gm version
   ```

2. **Node.js dependencies**:
   ```bash
   npm install
   ```

The build process will automatically:
- Bundle GraphicsMagick binaries and dependencies
- Package Tesseract OCR assets
- Create a self-contained application

#### Package the Application

Create a packaged version of the application for your platform:

```bash
npm run package
```

This command:
- Compiles TypeScript and bundles the application
- Creates a platform-specific executable
- **Bundles GraphicsMagick** binary and required libraries
- Packages all resources including Tesseract OCR assets
- Generates an architecture-specific GraphicsMagick bundle via `npm run bundle:gm`
- Sets up the correct module structure for worker threads
- Outputs to `out/[app-name]-[platform]-[arch]/`

To double-check the GraphicsMagick bundle, run:

```bash
npm run verify:gm
```

This script confirms every binary and library in `graphicsmagick-bundle/` is using `@loader_path` references and matches the host architecture.

**Architecture Support:**
- **Intel Macs (x86_64)**: Bundles Intel-compatible GraphicsMagick
- **Apple Silicon Macs (arm64)**: Bundles ARM64-compatible GraphicsMagick
- The build system automatically detects and bundles the correct architecture

#### Verify Package Structure

After packaging, verify that the module structure and bundled dependencies are correct:

```bash
npm run verify:package
```

This verification script checks:
- Resources/node_modules directory exists
- Required modules (tesseract.js, tesseract.js-core, regenerator-runtime) are properly linked
- regenerator-runtime is bundled in tesseract.js/node_modules
- Tesseract assets (eng.traineddata) are present

**Verify GraphicsMagick Bundle:**

```bash
npm run verify:gm
```

This verification script checks:
- GraphicsMagick binary exists and is executable
- All required dynamic libraries are present (libGraphicsMagick, liblcms2, libfreetype, libltdl)
- Library dependencies are correctly resolved with @rpath references
- Binary architecture matches the build system

The scripts will output detailed reports showing which checks passed or failed.

#### Create DMG Installer (macOS)

Build a distributable DMG file for macOS:

```bash
npm run make
```

This command:
- Runs the package step automatically
- Creates a DMG disk image in `out/make/`
- Includes the app bundle with all dependencies
- Configures the installer window with app icon and Applications folder shortcut

The DMG file will be named: `Auto-Appraisal-Reporter-[version].dmg`

##### Building Apple Silicon packages from an Intel Mac

When working on Intel hardware, you can still produce an arm64 build by offloading packaging to GitHub Actions:

1. Push your changes to GitHub.
2. Open the **macOS Apple Silicon Build** workflow (`.github/workflows/macos-arm64-build.yml`) and click **Run workflow**.
3. (Optional) Disable unit tests by setting the *Run unit tests before packaging* input to `false`.
4. The workflow installs dependencies, runs `npm run bundle:gm`, and executes `npm run make -- --platform=darwin --arch=arm64` on a macOS-14 runner.
5. Download the generated arm64 artifacts from the workflow run summary. They include both the `out/make` directory and the raw `.app` bundle.

Because the bundling script always targets the host architecture, the CI runner guarantees that Apple Silicon binaries are created even if your local machine is Intel-based.

#### Troubleshooting Packaging Issues

**Issue: GraphicsMagick not found during build**

Solution:
1. Verify GraphicsMagick is installed on your build system:
   ```bash
   which gm
   gm version
   ```
2. Install GraphicsMagick if missing:
   ```bash
   # macOS
   brew install graphicsmagick
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install graphicsmagick
   ```
3. If installed in a non-standard location, the bundle script will attempt to find it automatically
4. Check the console output during `npm run package` for GraphicsMagick bundling messages

**Issue: GraphicsMagick bundle verification fails**

Solution:
1. Run the verification script to see specific issues:
   ```bash
   npm run verify:gm
   ```
2. Check that the bundle was created:
   ```bash
   ls -la graphicsmagick-bundle/
   ```
3. If bundle is missing or incomplete, manually create it:
   ```bash
   npm run bundle:gm
   ```
4. Verify the bundle structure:
   ```bash
   # Should contain bin/gm and lib/*.dylib
   tree graphicsmagick-bundle/
   ```

**Issue: PDF processing fails in packaged app with "GraphicsMagick not found" error**

Solution:
1. Verify the GraphicsMagick bundle was included in the package:
   ```bash
   # Navigate to packaged app
   cd out/Automotive\ Appraisal\ Reporter-darwin-arm64/
   
   # Check for GraphicsMagick bundle
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/graphicsmagick/
   
   # Verify binary exists and is executable
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/graphicsmagick/bin/gm
   
   # Check libraries
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/graphicsmagick/lib/
   ```
2. If bundle is missing, rebuild with clean state:
   ```bash
   rm -rf out/ graphicsmagick-bundle/
   npm run bundle:gm
   npm run package
   ```
3. Check console logs in the packaged app for detailed error messages

**Issue: Architecture mismatch (Intel vs Apple Silicon)**

Solution:
1. The bundle script automatically detects your system architecture
2. Verify your system architecture:
   ```bash
   uname -m
   # x86_64 = Intel
   # arm64 = Apple Silicon
   ```
3. The bundled GraphicsMagick must match the build system architecture
4. For universal binaries, you need to build on both architectures separately
5. Check the GraphicsMagick binary architecture:
   ```bash
   file graphicsmagick-bundle/bin/gm
   ```

**Issue: Library loading errors (dyld: Library not loaded)**

Solution:
1. Verify all required libraries are present:
   ```bash
   npm run verify:gm
   ```
2. Check library dependencies:
   ```bash
   otool -L graphicsmagick-bundle/bin/gm
   ```
3. Ensure @rpath references are correct (should see @rpath/libGraphicsMagick.dylib)
4. If library paths are incorrect, rebuild the bundle:
   ```bash
   rm -rf graphicsmagick-bundle/
   npm run bundle:gm
   ```

**Issue: OCR fails in packaged app with "Cannot find module 'regenerator-runtime'" error**

Solution:
1. Verify the postPackage hook ran successfully during build (check console output)
2. Run `npm run verify:package` to check the module structure
3. Manually inspect the package structure:
   ```bash
   # Navigate to packaged app
   cd out/Automotive\ Appraisal\ Reporter-darwin-arm64/
   
   # Check Resources directory
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/
   
   # Verify node_modules exists
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/node_modules/
   
   # Verify regenerator-runtime in tesseract.js
   ls -la Automotive\ Appraisal\ Reporter.app/Contents/Resources/tesseract.js/node_modules/
   ```
4. If structure is incorrect, try cleaning and rebuilding:
   ```bash
   rm -rf out/
   npm run package
   ```

**Issue: DMG creation fails**

Solution:
1. Ensure you're on macOS (DMG is macOS-only)
2. Check that packaging completed successfully first
3. Verify disk space is available (DMG creation requires ~500MB)
4. Try removing old build artifacts:
   ```bash
   rm -rf out/make/
   npm run make
   ```

**Issue: "App is damaged and can't be opened" on installation**

Solution:
This occurs because the app is not code-signed. Users can bypass this with:
```bash
xattr -cr /Applications/Automotive\ Appraisal\ Reporter.app
```

Or right-click the app, select "Open", and click "Open" in the security dialog.

For production distribution, consider code-signing the application with an Apple Developer certificate.

**Issue: Verification script reports missing modules**

Solution:
1. Check that extraResource declarations in `forge.config.ts` are correct
2. Verify node_modules contains the required packages:
   ```bash
   ls -la node_modules/ | grep -E "tesseract|regenerator"
   ```
3. Reinstall dependencies if needed:
   ```bash
   rm -rf node_modules/
   npm install
   npm run package
   ```

**Issue: Slow packaging or build hangs**

Solution:
1. Close other applications to free up system resources
2. Disable antivirus temporarily (it may scan files during packaging)
3. Check console output for specific errors
4. Try packaging with verbose logging:
   ```bash
   DEBUG=electron-forge:* npm run package
   ```

## Project Structure

```
automotive-appraisal/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # Application entry point
│   │   ├── ipc-handlers.ts     # IPC communication handlers
│   │   └── services/           # Backend services
│   │       ├── pdfExtractor.ts         # PDF processing & OCR
│   │       ├── graphicsMagickService.ts # GraphicsMagick binary management
│   │       ├── storage.ts              # Data persistence
│   │       ├── comparableStorage.ts    # Comparable vehicle storage
│   │       ├── geolocationService.ts   # Distance calculations
│   │       ├── reportGeneration.ts     # DOCX report generation
│   │       ├── csvExporter.ts          # CSV export
│   │       ├── dataValidator.ts        # Data validation
│   │       ├── equipmentValuation.ts   # Equipment pricing
│   │       ├── errorHandler.ts         # Error management
│   │       ├── errorLogger.ts          # Error logging
│   │       ├── performanceOptimizer.ts # Performance monitoring
│   │       ├── settingsService.ts      # Settings management
│   │       ├── systemChecker.ts        # System diagnostics
│   │       └── tesseractAssets.ts      # OCR asset management
│   │
│   ├── renderer/               # React frontend
│   │   ├── App.tsx            # Main application component
│   │   ├── store.ts           # Zustand state management
│   │   ├── pages/             # Application pages
│   │   │   ├── Dashboard.tsx          # Main dashboard
│   │   │   ├── NewAppraisal.tsx       # PDF upload & processing
│   │   │   ├── AppraisalDetail.tsx    # Appraisal details & comparables
│   │   │   ├── History.tsx            # Appraisal history
│   │   │   └── Settings.tsx           # Application settings
│   │   │
│   │   ├── components/        # Reusable UI components
│   │   │   ├── PDFUploader.tsx              # PDF upload component
│   │   │   ├── DataDisplay.tsx              # Extracted data display
│   │   │   ├── ComparableVehicleForm.tsx    # Add/edit comparables
│   │   │   ├── ComparableVehicleList.tsx    # Comparables list
│   │   │   ├── MarketValueCalculator.tsx    # Market value display
│   │   │   ├── CalculationBreakdownView.tsx # Calculation details
│   │   │   ├── ReportOptionsDialog.tsx      # Report generation options
│   │   │   ├── ReportHistory.tsx            # Report history list
│   │   │   ├── ErrorBoundary.tsx            # Error boundaries
│   │   │   └── ...                          # Other components
│   │   │
│   │   ├── services/          # Frontend services
│   │   │   ├── marketValueCalculator.ts     # Market value calculations
│   │   │   ├── adjustmentCalculator.ts      # Price adjustments
│   │   │   ├── qualityScoreCalculator.ts    # Quality scoring
│   │   │   ├── comparableValidation.ts      # Data validation
│   │   │   └── errorMessageMapper.ts        # Error message mapping
│   │   │
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useDebounce.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useNavigationGuard.ts
│   │   │   └── useNotifications.ts
│   │   │
│   │   ├── utils/             # Utility functions
│   │   │   ├── formValidation.ts
│   │   │   ├── performanceOptimization.ts
│   │   │   ├── errorRecovery.ts
│   │   │   └── notifications.tsx
│   │   │
│   │   └── styles/            # CSS styles
│   │       ├── globals.css
│   │       ├── components.css
│   │       └── tailwind.css
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts          # All application types
│   │
│   ├── preload.ts            # Electron preload script
│   └── renderer.ts           # Renderer process entry
│
├── tests/                     # Test files
│   ├── *.test.ts             # Unit tests
│   ├── *.test.tsx            # Component tests
│   └── setup.ts              # Test configuration
│
├── scripts/                   # Build and setup scripts
│   ├── setup-tesseract-assets.js
│   ├── bundle-graphicsmagick.sh
│   ├── verify-graphicsmagick-bundle.js
│   └── verify-package-structure.js
│
├── tesseract-assets/         # OCR language data
│   └── eng.traineddata
│
├── graphicsmagick-bundle/    # GraphicsMagick binaries (created during build)
│   ├── bin/
│   │   └── gm
│   └── lib/
│       ├── libGraphicsMagick.dylib
│       ├── liblcms2.dylib
│       ├── libfreetype.dylib
│       └── libltdl.dylib
│
├── forge.config.ts           # Electron Forge configuration
├── vite.*.config.ts          # Vite build configurations
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json              # Project dependencies

```

## GraphicsMagick Bundling

### Overview

The application bundles GraphicsMagick binaries and dependencies to provide a seamless user experience without requiring manual installation of external dependencies. This approach ensures:

- **Zero Configuration**: Users can start processing PDFs immediately after installation
- **Cross-Architecture Support**: Works on both Intel and Apple Silicon Macs
- **Offline Operation**: No internet connection required for PDF processing
- **Consistent Behavior**: Same GraphicsMagick version across all installations

### How It Works

#### Development Mode
When running `npm start`, the application uses the system-installed GraphicsMagick from your PATH. This allows for faster development without rebuilding bundles.

#### Production Mode
When packaged with `npm run package`, the application includes:

```
Automotive Appraisal Reporter.app/
└── Contents/
    └── Resources/
        └── graphicsmagick-bundle/
            ├── bin/
            │   ├── gm                    # Wrapper script (sets environment)
            │   ├── gm-real               # Actual GraphicsMagick binary
            │   ├── gs                    # Ghostscript wrapper script
            │   └── gs-real               # Actual Ghostscript binary
            ├── lib/
            │   ├── libGraphicsMagick.3.dylib
            │   ├── liblcms2.dylib
            │   ├── libfreetype.dylib
            │   ├── libltdl.dylib
            │   ├── libtesseract.dylib
            │   └── [other dependencies]
            └── config/
                └── delegates.mgk         # GraphicsMagick configuration
```

The application automatically detects the runtime environment and uses the appropriate GraphicsMagick installation.

#### Wrapper Script Architecture

To solve dynamic library loading issues (EPIPE errors), the application uses a **wrapper script approach**:

**The Problem:**
- macOS System Integrity Protection (SIP) strips `DYLD_LIBRARY_PATH` from child processes
- When `pdf2pic` spawns GraphicsMagick, the binary cannot find its bundled libraries
- This causes the process to crash immediately with an EPIPE error

**The Solution:**
1. **Wrapper Scripts**: Shell scripts (`gm` and `gs`) that set up the environment before calling the real binaries
2. **Custom Spawner**: `GraphicsMagickSpawner` service that bypasses `pdf2pic` and spawns processes with explicit environment setup
3. **Absolute Library Paths**: Using `@executable_path/../lib` references so libraries can be found without environment variables

**How the Wrapper Works:**

```bash
# The gm wrapper script does three things:

1. Sets DYLD_LIBRARY_PATH to the bundled lib directory
   export DYLD_LIBRARY_PATH="${LIB_DIR}:${DYLD_LIBRARY_PATH}"

2. Sets DYLD_FALLBACK_LIBRARY_PATH as a backup
   export DYLD_FALLBACK_LIBRARY_PATH="${LIB_DIR}:${DYLD_FALLBACK_LIBRARY_PATH}"

3. Adds bin directory to PATH for Ghostscript access
   export PATH="${SCRIPT_DIR}:${PATH}"

4. Executes the real binary with all arguments
   exec "${SCRIPT_DIR}/gm-real" "$@"
```

**How the Spawner Works:**

The `GraphicsMagickSpawner` service provides:
- Direct process spawning with environment variable injection
- Timeout handling to prevent hanging processes
- Comprehensive error messages with diagnostic information
- Fallback to system GraphicsMagick if bundled version fails

**Benefits:**
- ✅ Eliminates EPIPE errors caused by library loading failures
- ✅ Works on both Intel and Apple Silicon Macs
- ✅ No user configuration required
- ✅ Provides detailed error messages for troubleshooting
- ✅ Automatic fallback to system GraphicsMagick if available

### Bundle Creation Process

The bundling process is automated through npm scripts:

```bash
# Create GraphicsMagick bundle (runs automatically during package)
npm run bundle:gm

# Verify bundle integrity
npm run verify:gm
```

**What happens during bundling:**

1. **Architecture Detection**: Detects system architecture (Intel x86_64 or Apple Silicon arm64)
2. **Binary Location**: Finds GraphicsMagick and Ghostscript binaries on the build system
3. **Dependency Extraction**: Uses `otool -L` to identify required dynamic libraries
4. **Library Copying**: Copies binaries and all dependencies to bundle structure
5. **Binary Renaming**: Renames `gm` to `gm-real` and `gs` to `gs-real`
6. **Wrapper Creation**: Creates wrapper scripts (`gm` and `gs`) that set environment variables
7. **Path Rewriting**: Updates library paths using `install_name_tool` to use `@executable_path/../lib` references
8. **Permission Setting**: Sets executable permissions on binaries and wrapper scripts
9. **Configuration Setup**: Configures GraphicsMagick delegates for Ghostscript integration
10. **Validation**: Verifies all required files are present and correctly configured

**EPIPE Error Prevention:**

The bundling process includes specific steps to prevent EPIPE errors:
- **Wrapper Scripts**: Ensure environment variables are set before binary execution
- **Absolute Paths**: Use `@executable_path` instead of `@rpath` for more reliable library resolution
- **Fallback Paths**: Set both `DYLD_LIBRARY_PATH` and `DYLD_FALLBACK_LIBRARY_PATH`
- **Ghostscript Integration**: Ensure Ghostscript can also find its libraries when called by GraphicsMagick

### Architecture Support

#### Intel Macs (x86_64)
- Bundles Intel-compatible GraphicsMagick binary
- Includes x86_64 dynamic libraries
- Works on all Intel Macs running macOS 10.13+

#### Apple Silicon Macs (arm64)
- Bundles ARM64-native GraphicsMagick binary
- Includes arm64 dynamic libraries
- Provides native performance on M1/M2/M3 Macs

**Important**: The bundled binary architecture must match the build system architecture. To create a universal application:
1. Build on an Intel Mac to create an Intel package
2. Build on an Apple Silicon Mac to create an ARM64 package
3. Distribute the appropriate package for each architecture

#### Testing Cross-Architecture Compatibility

To ensure the application works correctly on both Intel and Apple Silicon Macs, use the automated testing script:

```bash
# Run on both Intel and Apple Silicon Macs
cd automotive-appraisal
chmod +x scripts/test-architecture-compatibility.sh
./scripts/test-architecture-compatibility.sh
```

**What the script tests:**
- ✅ System architecture detection (x86_64 vs arm64)
- ✅ Bundle structure verification
- ✅ Wrapper script existence and permissions
- ✅ Binary architecture matches system architecture
- ✅ Library architecture matches system architecture
- ✅ Wrapper script execution
- ✅ Library loading and dependency resolution
- ✅ PDF to PNG conversion functionality
- ✅ Environment variable setup

**Manual Testing Checklist:**

After automated tests pass, perform manual testing:

1. **Launch the packaged application**
2. **Upload a test PDF** from `valuation_report_samples/`
3. **Verify OCR extraction** completes without errors
4. **Check Console.app** for any dyld or library loading errors
5. **Test multiple PDFs** to ensure consistent behavior

For detailed testing procedures, see [CROSS_ARCHITECTURE_TESTING_GUIDE.md](./CROSS_ARCHITECTURE_TESTING_GUIDE.md).

**Common Architecture Issues:**

- **Binary architecture mismatch**: Ensure you're testing the correct build (x64 vs arm64)
- **Library not loaded errors**: Verify wrapper scripts set DYLD_LIBRARY_PATH correctly
- **EPIPE errors**: Check that all libraries are present and have correct architecture
- **Different behavior on architectures**: Compare `otool -L` output on both platforms

### Developer Notes

#### Updating GraphicsMagick Version

To update the bundled GraphicsMagick version:

1. **Update GraphicsMagick on your build system:**
   ```bash
   brew upgrade graphicsmagick
   ```

2. **Verify the new version:**
   ```bash
   gm version
   ```

3. **Rebuild the bundle:**
   ```bash
   rm -rf graphicsmagick-bundle/
   npm run bundle:gm
   ```

4. **Test the bundle:**
   ```bash
   npm run verify:gm
   ```

5. **Package and test the application:**
   ```bash
   npm run package
   # Test PDF processing in the packaged app
   ```

6. **Update documentation** if there are any breaking changes or new features

#### Adding New Library Dependencies

If a future version of GraphicsMagick requires additional libraries:

1. **Update the bundle script** (`scripts/bundle-graphicsmagick.sh`):
   - The script automatically detects dependencies using `otool -L`
   - No changes needed unless you want to exclude specific libraries

2. **Update the verification script** (`scripts/verify-graphicsmagick-bundle.js`):
   ```javascript
   const requiredLibs = [
     'libGraphicsMagick.dylib',
     'liblcms2.dylib',
     'libfreetype.dylib',
     'libltdl.dylib',
     'newLibrary.dylib'  // Add new library here
   ];
   ```

3. **Update the postPackage hook** in `forge.config.ts`:
   ```typescript
   const requiredLibs = [
     'libGraphicsMagick.dylib',
     'liblcms2.dylib',
     'libfreetype.dylib',
     'libltdl.dylib',
     'newLibrary.dylib'  // Add new library here
   ];
   ```

4. **Update GraphicsMagickService** (`src/main/services/graphicsMagickService.ts`):
   ```typescript
   const requiredLibs = [
     'libGraphicsMagick.dylib',
     'liblcms2.dylib',
     'libfreetype.dylib',
     'libltdl.dylib',
     'newLibrary.dylib'  // Add new library here
   ];
   ```

#### Troubleshooting Bundle Creation

**Bundle script fails to find GraphicsMagick:**
- Ensure GraphicsMagick is installed: `brew install graphicsmagick`
- Check PATH: `which gm`
- Manually specify path: `GM_PATH=/custom/path/gm npm run bundle:gm`

**Library dependency errors:**
- Run `otool -L /path/to/gm` to see all dependencies
- Ensure all dependencies are available on the build system
- Check for missing libraries: `brew list graphicsmagick`

**Permission errors:**
- Ensure you have write permissions in the project directory
- Check file permissions: `ls -la graphicsmagick-bundle/`
- Manually set permissions: `chmod +x graphicsmagick-bundle/bin/gm`

**Architecture mismatches:**
- Verify build system architecture: `uname -m`
- Check binary architecture: `file graphicsmagick-bundle/bin/gm`
- Ensure GraphicsMagick was installed for the correct architecture

#### Testing Bundle Changes

After making changes to the bundling process:

1. **Clean previous builds:**
   ```bash
   rm -rf out/ graphicsmagick-bundle/
   ```

2. **Create fresh bundle:**
   ```bash
   npm run bundle:gm
   ```

3. **Verify bundle:**
   ```bash
   npm run verify:gm
   ```

4. **Package application:**
   ```bash
   npm run package
   ```

5. **Test in packaged app:**
   - Navigate to the packaged app
   - Launch the application
   - Upload a PDF and verify OCR processing works
   - Check console logs for any GraphicsMagick errors

6. **Test on clean system:**
   - Test on a Mac without GraphicsMagick installed
   - Verify PDF processing works without system dependencies

#### Bundle Size Considerations

The GraphicsMagick bundle adds approximately 10-15 MB to the application size:
- Binary: ~2-3 MB
- Libraries: ~8-12 MB

This is acceptable for a desktop application and provides significant value by eliminating user installation requirements.

To minimize bundle size:
- Only include required libraries (automatically handled by the bundle script)
- Exclude unnecessary files (documentation, headers, static libraries)
- Consider compression for distribution (DMG, ZIP)

## Technology Stack

### Core Technologies
- **Electron 28**: Cross-platform desktop application framework
- **React 19**: UI library with hooks and modern patterns
- **TypeScript 5**: Type-safe development
- **Vite 5**: Fast build tool and dev server

### UI & Styling
- **Ant Design 5**: Professional UI component library
- **TailwindCSS 4**: Utility-first CSS framework
- **Heroicons**: Beautiful hand-crafted SVG icons

### State Management & Data
- **Zustand 5**: Lightweight state management
- **Electron Store**: Persistent settings storage

### PDF Processing & OCR
- **Tesseract.js 6**: Google's OCR engine for text extraction
- **pdf2pic 3**: PDF to image conversion
- **Sharp**: High-performance image processing

### Document Generation
- **docx 8**: Microsoft Word document generation
- **file-saver 2**: Client-side file saving

### Development & Testing
- **Jest 30**: Testing framework
- **Testing Library**: React component testing
- **ESLint**: Code linting
- **ts-jest**: TypeScript support for Jest

## Architecture

### Main Process (Backend)

The main process handles:
- PDF processing and OCR extraction
- File system operations and data persistence
- IPC communication with renderer
- System diagnostics and asset verification
- Report generation and export

**Key Services:**
- `pdfExtractor`: Converts PDFs to images and extracts text via OCR
- `graphicsMagickService`: Manages GraphicsMagick binary and library paths
- `storage`: Manages appraisal data persistence
- `comparableStorage`: Handles comparable vehicle data
- `geolocationService`: Geocoding and distance calculations
- `reportGeneration`: Creates DOCX reports
- `dataValidator`: Validates extracted and user-entered data

### Renderer Process (Frontend)

The renderer process provides:
- React-based user interface
- Real-time data validation
- Market value calculations
- State management with Zustand
- Error boundaries and recovery

**Key Components:**
- Pages: Dashboard, NewAppraisal, AppraisalDetail, History, Settings
- Forms: PDF upload, comparable vehicle entry
- Displays: Extracted data, market analysis, calculation breakdowns
- Dialogs: Report options, confirmations, error messages

### IPC Communication

Communication between main and renderer processes uses Electron's IPC:

```typescript
// Renderer → Main
const result = await window.electron.processPDF(buffer);
const comparables = await window.electron.getComparables(appraisalId);

// Main → Renderer (events)
window.electron.onProcessingProgress((data) => {
  console.log(`Progress: ${data.progress}%`);
});
```

### State Management

Zustand store manages application state:

```typescript
interface AppState {
  // Data
  appraisals: AppraisalRecord[];
  currentAppraisal: AppraisalRecord | null;
  comparables: ComparableVehicle[];
  marketAnalysis: MarketAnalysis | null;
  
  // UI State
  processingStatus: ProcessingStatus;
  isCalculating: boolean;
  
  // Actions
  loadAppraisals: () => Promise<void>;
  processNewPDF: (file: File) => Promise<void>;
  addComparable: (comparable: ComparableVehicle) => Promise<void>;
  calculateMarketValue: () => Promise<void>;
}
```

## Development Guide

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Style

The project uses ESLint with TypeScript rules:

```bash
# Lint code
npm run lint
```

### Adding New Features

1. **Define Types**: Add TypeScript interfaces in `src/types/index.ts`
2. **Create Service**: Implement business logic in `src/main/services/` or `src/renderer/services/`
3. **Add IPC Handlers**: Register handlers in `src/main/ipc-handlers.ts`
4. **Update Preload**: Expose APIs in `src/preload.ts`
5. **Create UI Components**: Build React components in `src/renderer/components/`
6. **Write Tests**: Add test coverage in `tests/`

### Performance Considerations

- **Debounce Calculations**: Use debouncing for expensive operations
- **Lazy Loading**: Load heavy components on demand
- **Memoization**: Cache calculation results
- **Virtual Scrolling**: For large lists of comparables
- **Image Optimization**: Compress images before OCR processing

## Configuration

### Application Settings

Settings are managed through the Settings page and stored persistently:

```typescript
interface AppSettings {
  autoOCRFallback: boolean;
  ocrQuality: 'fast' | 'balanced' | 'accurate';
  confidenceThresholds: {
    warning: number;
    error: number;
  };
  reportDefaults: {
    appraiserName: string;
    appraiserCredentials: string;
    companyName: string;
    companyLogoPath: string;
  };
}
```

### OCR Configuration

OCR processing can be tuned for speed vs. accuracy:

- **Fast**: Lower DPI (150), faster processing
- **Balanced**: Medium DPI (300), good accuracy
- **Accurate**: High DPI (600), best accuracy, slower

### Build Configuration

Electron Forge configuration in `forge.config.ts`:

- **Packager**: ASAR packaging with Tesseract assets
- **Makers**: Platform-specific installers (ZIP, Squirrel, Deb, RPM)
- **Fuses**: Security settings and optimizations

## Troubleshooting

### Common Issues

**PDF Upload Disabled**
- Cause: OCR assets missing or failed to load
- Solution: Reinstall application or verify `tesseract-assets/` directory

**PDF Processing Fails with "GraphicsMagick not found" Error**
- Cause: GraphicsMagick bundle is missing or corrupted
- Solution: 
  1. Reinstall the application from a fresh download
  2. If the issue persists, check the application logs for detailed error messages
  3. On macOS, ensure you haven't moved the app to a restricted location
  4. Try removing quarantine attributes: `xattr -cr /Applications/Automotive\ Appraisal\ Reporter.app`

**PDF Processing Fails with EPIPE Error (write EPIPE)**
- Cause: GraphicsMagick child process crashes immediately due to library loading failures
- This is the most common issue in packaged applications and indicates that the GraphicsMagick binary cannot find its required dynamic libraries
- Solution: See the detailed "EPIPE Error Troubleshooting" section below

**PDF Processing Fails with Library Loading Errors**
- Cause: Dynamic library dependencies are missing or incompatible
- Solution:
  1. Verify you're running the correct version for your Mac architecture (Intel vs Apple Silicon)
  2. Reinstall the application
  3. Check Console.app for detailed error messages about missing libraries
  4. Contact support with the error details if the issue persists

**Low Extraction Confidence**
- Cause: Poor PDF quality or non-standard format
- Solution: Try different OCR quality setting or manual data entry

**Market Value Not Calculating**
- Cause: Insufficient comparables (need at least 1)
- Solution: Add more comparable vehicles

**Report Generation Fails**
- Cause: Missing required fields or invalid data
- Solution: Check validation errors and complete all required fields

**Application Won't Open on macOS (Security Warning)**
- Cause: Application is not code-signed by Apple
- Solution:
  1. Right-click the application and select "Open"
  2. Click "Open" in the security dialog
  3. Or use Terminal: `xattr -cr /Applications/Automotive\ Appraisal\ Reporter.app`
  4. The application will open normally after the first time

### EPIPE Error Troubleshooting

The EPIPE error ("write EPIPE" or "broken pipe") occurs when the GraphicsMagick child process crashes immediately after being spawned, typically due to dynamic library loading failures. This section provides comprehensive troubleshooting steps.

#### Understanding the EPIPE Error

**What is EPIPE?**
- EPIPE stands for "Error PIPE" - a broken pipe error
- Occurs when a process tries to write to a pipe whose read end has been closed
- In this application, it means GraphicsMagick crashed before it could process the PDF

**Why does it happen?**
The GraphicsMagick binary requires several dynamic libraries (.dylib files on macOS) to run:
- `libGraphicsMagick.3.dylib` - Core GraphicsMagick functionality
- `liblcms2.dylib` - Color management
- `libfreetype.dylib` - Font rendering
- `libltdl.dylib` - Dynamic loading
- `libtesseract.dylib` - OCR capabilities
- And several others

When the binary cannot find these libraries, it crashes immediately, causing the EPIPE error.

#### The Wrapper Script Solution

To solve library loading issues, the application uses a **wrapper script approach**:

**How it works:**

1. **Wrapper Script** (`gm`): A shell script that sets up the environment
   - Sets `DYLD_LIBRARY_PATH` to point to bundled libraries
   - Sets `DYLD_FALLBACK_LIBRARY_PATH` as a backup
   - Adds the bin directory to `PATH` for Ghostscript access
   - Calls the real binary (`gm-real`)

2. **Real Binary** (`gm-real`): The actual GraphicsMagick executable
   - Uses `@executable_path/../lib` references to find libraries
   - Loads libraries from the bundled lib directory
   - Processes PDF files and generates images

3. **Custom Spawner**: The application uses `GraphicsMagickSpawner` service
   - Bypasses the standard `pdf2pic` spawning mechanism
   - Explicitly sets environment variables before spawning
   - Provides better error messages and diagnostics

**Wrapper Script Structure:**

```bash
#!/bin/bash
# Get the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(cd "$SCRIPT_DIR/../lib" && pwd)"

# Set library paths for dynamic linker
export DYLD_LIBRARY_PATH="${LIB_DIR}:${DYLD_LIBRARY_PATH}"
export DYLD_FALLBACK_LIBRARY_PATH="${LIB_DIR}:${DYLD_FALLBACK_LIBRARY_PATH}"

# Add bin directory to PATH for Ghostscript
export PATH="${SCRIPT_DIR}:${PATH}"

# Execute the real GraphicsMagick binary
exec "${SCRIPT_DIR}/gm-real" "$@"
```

#### Checking Console.app for dyld Errors

macOS logs detailed error messages to Console.app when dynamic libraries fail to load. Here's how to check:

**Step 1: Open Console.app**
```bash
# Open Console.app from Terminal
open -a Console

# Or find it in Applications > Utilities > Console
```

**Step 2: Filter for your application**
1. In Console.app, click on your Mac name in the sidebar
2. In the search box (top right), enter: `Automotive Appraisal Reporter`
3. Try to process a PDF in the application
4. Watch for new log entries in Console.app

**Step 3: Look for dyld error messages**

Common error patterns to look for:

```
dyld: Library not loaded: @rpath/libGraphicsMagick.3.dylib
  Referenced from: /path/to/gm-real
  Reason: image not found
```

This indicates the binary cannot find a specific library.

```
dyld: Symbol not found: _some_symbol
  Referenced from: /path/to/libGraphicsMagick.3.dylib
  Expected in: /path/to/another.dylib
```

This indicates a library dependency issue or version mismatch.

**Step 4: Interpret the errors**

- **"Library not loaded"**: The library file is missing or in the wrong location
- **"image not found"**: The library path is incorrect or the file doesn't exist
- **"Symbol not found"**: Version mismatch between libraries
- **"code signature invalid"**: The binary or library has been modified

#### Diagnostic Steps

**1. Verify Bundle Structure**

Check that all required files are present:

```bash
# Navigate to the packaged app
cd "/Applications/Automotive Appraisal Reporter.app"

# Check GraphicsMagick bundle structure
ls -la Contents/Resources/graphicsmagick-bundle/

# Should show:
# bin/
# lib/
# config/

# Check binaries
ls -la Contents/Resources/graphicsmagick-bundle/bin/

# Should show:
# gm (wrapper script)
# gm-real (actual binary)
# gs (Ghostscript wrapper)
# gs-real (Ghostscript binary)

# Check libraries
ls -la Contents/Resources/graphicsmagick-bundle/lib/

# Should show multiple .dylib files including:
# libGraphicsMagick.3.dylib
# liblcms2.dylib
# libfreetype.dylib
# libltdl.dylib
# libtesseract.dylib
```

**2. Test Wrapper Script Directly**

Test if the wrapper script can execute:

```bash
# Test GraphicsMagick version
"/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" version

# Should output GraphicsMagick version information
# If it fails, check the error message
```

**3. Check Library Dependencies**

Verify library paths are correctly set:

```bash
# Check what libraries the binary expects
otool -L "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"

# Should show @executable_path/../lib/ or @rpath references
# Example output:
# @rpath/libGraphicsMagick.3.dylib
# @rpath/liblcms2.dylib
# /usr/lib/libSystem.B.dylib
```

**4. Test PDF Conversion**

Test the conversion process directly:

```bash
# Create a test conversion (requires a test PDF)
"/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm" convert \
  -density 300 \
  /path/to/test.pdf[0] \
  /tmp/test-output.png

# Check if output was created
ls -la /tmp/test-output.png
```

**5. Check Application Logs**

The application logs detailed information about GraphicsMagick execution:

```bash
# Run the application from Terminal to see logs
"/Applications/Automotive Appraisal Reporter.app/Contents/MacOS/Automotive Appraisal Reporter"

# Look for lines like:
# 🔧 GraphicsMagick environment setup:
#    DYLD_LIBRARY_PATH: /path/to/lib
#    DYLD_FALLBACK_LIBRARY_PATH: /path/to/lib
#    PATH (first entry): /path/to/bin
```

#### Common Solutions

**Solution 1: Reinstall the Application**

The simplest solution is often to reinstall:

```bash
# Remove the application
rm -rf "/Applications/Automotive Appraisal Reporter.app"

# Download and install a fresh copy
# Then test PDF processing
```

**Solution 2: Remove Quarantine Attributes**

macOS may quarantine downloaded applications, which can interfere with library loading:

```bash
# Remove quarantine attributes
xattr -cr "/Applications/Automotive Appraisal Reporter.app"

# Verify attributes were removed
xattr -l "/Applications/Automotive Appraisal Reporter.app"

# Should show no com.apple.quarantine attribute
```

**Solution 3: Verify Architecture Match**

Ensure you're running the correct version for your Mac:

```bash
# Check your Mac's architecture
uname -m
# x86_64 = Intel Mac
# arm64 = Apple Silicon (M1/M2/M3)

# Check the binary architecture
file "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"

# Should match your Mac's architecture
```

**Solution 4: Check for System Restrictions**

Some system locations have restrictions that prevent library loading:

```bash
# Move the app to /Applications if it's elsewhere
mv "/path/to/Automotive Appraisal Reporter.app" /Applications/

# Ensure proper permissions
chmod -R 755 "/Applications/Automotive Appraisal Reporter.app"
```

**Solution 5: Use System GraphicsMagick (Fallback)**

If the bundled GraphicsMagick fails, the application will attempt to use system-installed GraphicsMagick:

```bash
# Install GraphicsMagick system-wide
brew install graphicsmagick

# Verify installation
which gm
gm version

# The application will automatically detect and use it
```

#### Testing on Clean Systems

When testing the packaged application, it's important to test on a "clean" system without development dependencies:

**What is a clean system?**
- A Mac without Homebrew installed
- No GraphicsMagick in the system PATH
- No development tools or libraries
- Represents a typical end-user environment

**How to test on a clean system:**

1. **Use a separate Mac** (ideal)
   - Test on a colleague's Mac
   - Use a virtual machine
   - Test on a fresh macOS installation

2. **Temporarily hide development tools** (alternative)
   ```bash
   # Temporarily rename Homebrew
   sudo mv /opt/homebrew /opt/homebrew.bak
   
   # Test the application
   # ...
   
   # Restore Homebrew
   sudo mv /opt/homebrew.bak /opt/homebrew
   ```

3. **Use a different user account** (alternative)
   - Create a new user account on your Mac
   - Log in as that user
   - Install and test the application
   - This user won't have your development PATH

**What to test:**
- Application launches without errors
- PDF upload works
- PDF processing completes successfully
- All pages of multi-page PDFs are processed
- No EPIPE errors occur
- No "GraphicsMagick not found" errors

**Expected behavior on clean system:**
- Application should work without any manual setup
- No need to install GraphicsMagick separately
- No need to set environment variables
- PDF processing should work immediately

#### Advanced Troubleshooting

**Enable Verbose Logging**

Set environment variables for detailed logging:

```bash
# Run with verbose dyld logging
DYLD_PRINT_LIBRARIES=1 \
DYLD_PRINT_LIBRARIES_POST_LAUNCH=1 \
"/Applications/Automotive Appraisal Reporter.app/Contents/MacOS/Automotive Appraisal Reporter"

# This will print every library that gets loaded
```

**Check for Library Conflicts**

Sometimes system libraries conflict with bundled libraries:

```bash
# Check for conflicting libraries in system paths
ls -la /usr/local/lib/ | grep -E "GraphicsMagick|lcms|freetype"
ls -la /opt/homebrew/lib/ | grep -E "GraphicsMagick|lcms|freetype"

# If found, these might interfere with bundled libraries
```

**Verify Code Signing**

Code signing issues can prevent library loading:

```bash
# Check code signature
codesign -vv "/Applications/Automotive Appraisal Reporter.app"

# Check binary signature
codesign -vv "/Applications/Automotive Appraisal Reporter.app/Contents/Resources/graphicsmagick-bundle/bin/gm-real"

# If signature is invalid, the app may need to be re-signed
```

**Test with Different PDFs**

Some PDFs may trigger different code paths:

```bash
# Test with various PDF types:
# - Single page vs multi-page
# - Different PDF versions (1.4, 1.5, 1.6, 1.7)
# - Scanned images vs text-based PDFs
# - Different file sizes
```

#### When to Contact Support

Contact support if:
- You've tried all troubleshooting steps above
- The error persists after reinstalling
- Console.app shows library loading errors you can't resolve
- The application works on some Macs but not others
- You're seeing errors not covered in this guide

**Information to provide:**
1. macOS version (`sw_vers`)
2. Mac architecture (`uname -m`)
3. Error messages from Console.app
4. Output of diagnostic commands above
5. Application logs from Terminal
6. Steps to reproduce the issue

### Debug Mode

Enable detailed logging:

```bash
# Set environment variable
export DEBUG=automotive-appraisal:*

# Run application
npm start
```

### Asset Verification

Verify OCR assets are properly installed:

```bash
# Check asset files
ls -la tesseract-assets/

# Run asset verification test
npm test -- startup-asset-verification
```

## Data Storage

### File Structure

Application data is stored in the user's home directory:

```
~/Library/Application Support/automotive-appraisal/  (macOS)
%APPDATA%/automotive-appraisal/                      (Windows)
~/.config/automotive-appraisal/                      (Linux)

├── appraisals/
│   ├── {appraisalId}/
│   │   ├── appraisal.json
│   │   ├── comparables.json
│   │   └── market-analysis.json
│   └── ...
├── reports/
│   └── {reportId}.docx
├── settings.json
└── error-log.json
```

### Data Format

**appraisal.json**:
```json
{
  "id": "appr_123456",
  "createdAt": "2024-01-15T10:00:00Z",
  "status": "complete",
  "data": {
    "vin": "1HGBH41JXMN109186",
    "year": 2018,
    "make": "Toyota",
    "model": "Camry",
    "mileage": 45000,
    "extractionConfidence": 95
  }
}
```

## API Reference

### Main Process APIs

See `src/types/index.ts` for complete API documentation.

**Key APIs:**
- `processPDF(buffer)`: Process PDF and extract vehicle data
- `getAppraisals()`: Retrieve all appraisals
- `saveComparable(comparable)`: Save comparable vehicle
- `calculateMarketValue(appraisalId)`: Calculate market value
- `exportMarketAnalysis(appraisalId, options)`: Generate report

### Calculation Formulas

**Quality Score:**
```
Quality Score = Base Score (100)
  - Distance Penalty (0-20 points)
  - Age Penalty (0-15 points)
  + Age Bonus (0-10 points)
  - Mileage Penalty (0-15 points)
  + Mileage Bonus (0-10 points)
  - Equipment Penalty (0-10 points)
  + Equipment Bonus (0-10 points)
```

**Market Value:**
```
Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Score)
```

**Confidence Level:**
```
Confidence = Base (50%)
  + Comparable Count Bonus (0-25%)
  - Quality Score Variance Penalty (0-15%)
  - Price Variance Penalty (0-10%)
```

## Contributing

### Development Workflow

1. Create a feature branch
2. Make changes with tests
3. Run linting and tests
4. Submit pull request

### Code Standards

- Use TypeScript strict mode
- Write tests for new features
- Follow existing code patterns
- Document complex logic
- Use meaningful variable names

### Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guide

---

**Version**: 1.0.0  
**Last Updated**: 2024
