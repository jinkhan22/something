# Design Document: Bundle GraphicsMagick

## Overview

This design outlines the approach for bundling GraphicsMagick binaries and dependencies with the Automotive Appraisal Reporter Electron application. The solution eliminates the need for users to manually install GraphicsMagick, making the application truly self-contained and ready to use immediately after installation.

The design follows the same pattern successfully implemented for Tesseract.js bundling, using Electron Forge's `extraResource` mechanism combined with a `postPackage` hook to create the proper directory structure and resolve dependencies.

## Architecture

### High-Level Architecture

```
Automotive Appraisal Reporter.app/
└── Contents/
    ├── MacOS/
    │   └── Automotive Appraisal Reporter (main executable)
    ├── Resources/
    │   ├── app.asar (application code)
    │   ├── graphicsmagick/
    │   │   ├── bin/
    │   │   │   └── gm (GraphicsMagick binary)
    │   │   └── lib/
    │   │       ├── libGraphicsMagick.dylib
    │   │       ├── liblcms2.dylib
    │   │       ├── libfreetype.dylib
    │   │       └── libltdl.dylib
    │   └── tesseract-assets/ (existing)
```

### Component Interaction Flow

```
PDF Upload
    ↓
ocrExtractorProcess.ts
    ↓
Detect Runtime Environment
    ↓
    ├─→ Development Mode → Use system GraphicsMagick (/usr/local/bin/gm)
    └─→ Production Mode → Use bundled GraphicsMagick (Resources/graphicsmagick/bin/gm)
    ↓
pdf2pic (uses GraphicsMagick)
    ↓
PNG Images
    ↓
Tesseract.js OCR
    ↓
Extracted Text
```

## Components and Interfaces

### 1. Bundle Creation Script

**File:** `scripts/bundle-graphicsmagick.sh`

**Purpose:** Automate the collection of GraphicsMagick binaries and dependencies into a self-contained bundle structure.

**Responsibilities:**
- Locate the GraphicsMagick binary on the build system
- Identify all dynamic library dependencies using `otool -L`
- Copy binary and libraries to bundle structure
- Fix library paths using `install_name_tool` to use relative paths (@rpath)
- Support both Intel (x86_64) and Apple Silicon (arm64) architectures
- Validate bundle completeness

**Interface:**
```bash
# Usage
./scripts/bundle-graphicsmagick.sh

# Output
graphicsmagick-bundle/
├── bin/gm
└── lib/*.dylib
```

**Key Operations:**
1. Detect system architecture (`uname -m`)
2. Locate GraphicsMagick binary (`which gm` or check common paths)
3. Extract dependencies (`otool -L /path/to/gm`)
4. Copy binary and libraries to bundle directories
5. Rewrite library paths to use @rpath
6. Set executable permissions
7. Verify bundle integrity

### 2. Forge Configuration Updates

**File:** `automotive-appraisal/forge.config.ts`

**Purpose:** Configure Electron Forge to include GraphicsMagick bundle in the packaged application.

**Changes Required:**

```typescript
packagerConfig: {
  asar: true,
  extraResource: [
    // Existing resources
    '../tesseract-assets',
    './node_modules/tesseract.js',
    // ... other tesseract modules
    
    // NEW: GraphicsMagick bundle
    '../graphicsmagick-bundle',
  ],
}
```

**Rationale:**
- `extraResource` copies files outside the ASAR archive
- Binaries must be outside ASAR to be executable
- Follows same pattern as Tesseract.js assets

### 3. PostPackage Hook Enhancement

**File:** `automotive-appraisal/forge.config.ts` (postPackage function)

**Purpose:** Set up proper directory structure and library paths after packaging.

**New Responsibilities:**
- Verify GraphicsMagick bundle was copied correctly
- Set executable permissions on `gm` binary
- Validate library dependencies are present
- Create symlinks if needed for library resolution
- Log bundle status for debugging

**Implementation:**

```typescript
async function postPackageHook(
  forgeConfig: ForgeConfig,
  options: { outputPaths: string[]; platform: string; arch: string; }
): Promise<void> {
  // Existing Tesseract.js setup code...
  
  // NEW: GraphicsMagick setup
  const gmPath = path.join(resourcesPath, 'graphicsmagick');
  const gmBinPath = path.join(gmPath, 'bin', 'gm');
  const gmLibPath = path.join(gmPath, 'lib');
  
  // Verify GraphicsMagick bundle exists
  if (!fs.existsSync(gmBinPath)) {
    console.error('❌ GraphicsMagick binary not found:', gmBinPath);
    throw new Error('GraphicsMagick bundle is missing');
  }
  
  // Set executable permissions
  fs.chmodSync(gmBinPath, 0o755);
  console.log('✅ Set executable permissions on gm binary');
  
  // Verify libraries exist
  const requiredLibs = [
    'libGraphicsMagick.dylib',
    'liblcms2.dylib',
    'libfreetype.dylib',
    'libltdl.dylib'
  ];
  
  for (const lib of requiredLibs) {
    const libPath = path.join(gmLibPath, lib);
    if (!fs.existsSync(libPath)) {
      console.error(`❌ Required library not found: ${lib}`);
      throw new Error(`Missing library: ${lib}`);
    }
  }
  
  console.log('✅ GraphicsMagick bundle verified successfully');
}
```

### 4. Runtime Binary Discovery Service

**File:** `automotive-appraisal/src/main/services/graphicsMagickService.ts` (NEW)

**Purpose:** Provide a centralized service for locating and validating the GraphicsMagick binary at runtime.

**Interface:**

```typescript
export interface GraphicsMagickConfig {
  binPath: string;
  libPath: string;
  isProduction: boolean;
}

export class GraphicsMagickService {
  /**
   * Get the path to the GraphicsMagick binary
   * Returns bundled path in production, system path in development
   */
  static getGraphicsMagickPath(): string;
  
  /**
   * Get the library path for GraphicsMagick dependencies
   */
  static getLibraryPath(): string;
  
  /**
   * Verify GraphicsMagick is available and executable
   * Throws error with helpful message if not found
   */
  static async verifyGraphicsMagick(): Promise<void>;
  
  /**
   * Get full configuration for GraphicsMagick
   */
  static getConfig(): GraphicsMagickConfig;
  
  /**
   * Execute GraphicsMagick command with proper environment
   */
  static async execute(args: string[]): Promise<string>;
}
```

**Implementation Details:**

```typescript
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class GraphicsMagickService {
  private static config: GraphicsMagickConfig | null = null;
  
  static getConfig(): GraphicsMagickConfig {
    if (this.config) return this.config;
    
    const isProduction = app.isPackaged;
    
    if (isProduction) {
      // Use bundled GraphicsMagick
      const resourcesPath = process.resourcesPath;
      const gmPath = path.join(resourcesPath, 'graphicsmagick');
      
      this.config = {
        binPath: path.join(gmPath, 'bin', 'gm'),
        libPath: path.join(gmPath, 'lib'),
        isProduction: true
      };
    } else {
      // Use system GraphicsMagick in development
      this.config = {
        binPath: 'gm', // Rely on PATH
        libPath: '', // System libraries
        isProduction: false
      };
    }
    
    return this.config;
  }
  
  static getGraphicsMagickPath(): string {
    return this.getConfig().binPath;
  }
  
  static getLibraryPath(): string {
    return this.getConfig().libPath;
  }
  
  static async verifyGraphicsMagick(): Promise<void> {
    const config = this.getConfig();
    
    if (config.isProduction) {
      // Verify bundled binary exists
      if (!fs.existsSync(config.binPath)) {
        throw new Error(
          'GraphicsMagick binary is missing from the application bundle. ' +
          'Please reinstall the application.'
        );
      }
      
      // Verify libraries exist
      const requiredLibs = [
        'libGraphicsMagick.dylib',
        'liblcms2.dylib',
        'libfreetype.dylib',
        'libltdl.dylib'
      ];
      
      for (const lib of requiredLibs) {
        const libPath = path.join(config.libPath, lib);
        if (!fs.existsSync(libPath)) {
          throw new Error(
            `GraphicsMagick library ${lib} is missing. ` +
            'Please reinstall the application.'
          );
        }
      }
    }
    
    // Test execution
    try {
      await this.execute(['version']);
    } catch (error) {
      if (config.isProduction) {
        throw new Error(
          'GraphicsMagick failed to execute. The application bundle may be corrupted. ' +
          'Please reinstall the application.'
        );
      } else {
        throw new Error(
          'GraphicsMagick is not installed on your system.\n\n' +
          'Please install GraphicsMagick:\n' +
          '• macOS: brew install graphicsmagick\n' +
          '• Windows: Download from http://www.graphicsmagick.org/download.html\n' +
          '• Linux: sudo apt-get install graphicsmagick'
        );
      }
    }
  }
  
  static async execute(args: string[]): Promise<string> {
    const config = this.getConfig();
    const env = { ...process.env };
    
    if (config.isProduction && config.libPath) {
      // Set DYLD_LIBRARY_PATH for bundled libraries
      env.DYLD_LIBRARY_PATH = config.libPath;
    }
    
    const { stdout } = await execFileAsync(config.binPath, args, { env });
    return stdout;
  }
}
```

### 5. OCR Extractor Integration

**File:** `automotive-appraisal/src/main/services/ocrExtractorProcess.ts`

**Purpose:** Update OCR extractor to use the GraphicsMagick service instead of relying on PATH.

**Changes Required:**

```typescript
import { GraphicsMagickService } from './graphicsMagickService';

export async function extractTextWithOCRProcess(
  pdfBuffer: Buffer,
  onProgress?: OCRProgressCallback
): Promise<string> {
  // Verify GraphicsMagick is available
  try {
    await GraphicsMagickService.verifyGraphicsMagick();
  } catch (error) {
    throw new Error(
      `PDF processing requires GraphicsMagick.\n\n${error.message}`
    );
  }
  
  // ... existing code ...
  
  // Configure pdf2pic to use bundled GraphicsMagick
  const gmPath = GraphicsMagickService.getGraphicsMagickPath();
  const converter = fromPath(inputPath, {
    density: 300,
    saveFilename: 'page',
    savePath: tempDir,
    format: 'png',
    width: 2480,
    height: 3508,
    // NEW: Specify GraphicsMagick path
    gm: {
      path: gmPath
    }
  });
  
  // ... rest of existing code ...
}
```

## Data Models

### GraphicsMagick Bundle Structure

```typescript
interface GraphicsMagickBundle {
  bin: {
    gm: ExecutableFile;
  };
  lib: {
    libGraphicsMagick: DynamicLibrary;
    liblcms2: DynamicLibrary;
    libfreetype: DynamicLibrary;
    libltdl: DynamicLibrary;
  };
}

interface ExecutableFile {
  path: string;
  permissions: number; // 0o755
  architecture: 'x86_64' | 'arm64';
}

interface DynamicLibrary {
  path: string;
  dependencies: string[];
  rpathReferences: string[];
}
```

### Configuration Model

```typescript
interface GraphicsMagickConfig {
  binPath: string;        // Path to gm binary
  libPath: string;        // Path to lib directory
  isProduction: boolean;  // Runtime environment
}
```

## Error Handling

### Error Categories

1. **Build-Time Errors**
   - GraphicsMagick not found on build system
   - Missing dependencies
   - Bundle creation script failures
   - Permission issues

2. **Package-Time Errors**
   - Bundle not copied to Resources
   - Missing libraries in bundle
   - Permission setting failures

3. **Runtime Errors**
   - Binary not found in bundle
   - Library loading failures
   - Execution failures
   - Architecture mismatches

### Error Messages

**Build-Time:**
```
❌ GraphicsMagick not found on build system
Please install GraphicsMagick before building:
  brew install graphicsmagick

Or specify the path manually:
  GM_PATH=/path/to/gm ./scripts/bundle-graphicsmagick.sh
```

**Runtime (Production):**
```
❌ GraphicsMagick binary is missing from the application bundle.

This indicates a packaging issue. Please try:
1. Reinstalling the application
2. Downloading a fresh copy from the official source
3. Contacting support if the issue persists

Technical details: Binary not found at expected path
```

**Runtime (Development):**
```
❌ GraphicsMagick is not installed on your system.

PDF processing requires GraphicsMagick to convert pages to images.

Installation instructions:
• macOS: brew install graphicsmagick
• Windows: Download from http://www.graphicsmagick.org/download.html
• Linux: sudo apt-get install graphicsmagick (Ubuntu/Debian)

After installation, restart the application and try again.
```

### Error Recovery Strategy

```typescript
async function extractTextWithOCRProcess(
  pdfBuffer: Buffer,
  onProgress?: OCRProgressCallback
): Promise<string> {
  try {
    // Try bundled GraphicsMagick first
    await GraphicsMagickService.verifyGraphicsMagick();
    return await performOCR(pdfBuffer, onProgress);
  } catch (bundledError) {
    console.warn('Bundled GraphicsMagick failed:', bundledError);
    
    // Fallback: Try system GraphicsMagick
    try {
      console.log('Attempting fallback to system GraphicsMagick...');
      const systemGmPath = await findSystemGraphicsMagick();
      return await performOCR(pdfBuffer, onProgress, systemGmPath);
    } catch (systemError) {
      // Both failed - provide comprehensive error
      throw new Error(
        'PDF processing failed. GraphicsMagick is not available.\n\n' +
        'Bundled GraphicsMagick: ' + bundledError.message + '\n' +
        'System GraphicsMagick: ' + systemError.message + '\n\n' +
        'Please reinstall the application or install GraphicsMagick manually.'
      );
    }
  }
}
```

## Testing Strategy

### Unit Tests

**File:** `automotive-appraisal/tests/graphicsMagickService.test.ts`

Test cases:
- `getConfig()` returns correct paths in production mode
- `getConfig()` returns system paths in development mode
- `verifyGraphicsMagick()` succeeds when binary exists
- `verifyGraphicsMagick()` throws error when binary missing
- `verifyGraphicsMagick()` throws error when libraries missing
- `execute()` runs commands successfully
- `execute()` sets DYLD_LIBRARY_PATH in production

### Integration Tests

**File:** `automotive-appraisal/tests/graphicsmagick-integration.test.ts`

Test cases:
- Bundle script creates correct directory structure
- Bundle script copies all required files
- Bundle script sets correct permissions
- PostPackage hook verifies bundle successfully
- OCR extractor uses bundled GraphicsMagick
- PDF conversion works with bundled binary
- Fallback to system GraphicsMagick works

### Manual Testing

**Packaged App Testing:**
1. Build application with `npm run make`
2. Install on clean macOS system (no GraphicsMagick installed)
3. Upload a PDF and verify OCR processing works
4. Check console logs for GraphicsMagick path being used
5. Verify no errors about missing GraphicsMagick

**Development Testing:**
1. Run application in development mode
2. Verify it uses system GraphicsMagick
3. Temporarily rename system `gm` binary
4. Verify error message is helpful
5. Restore system `gm` binary

**Architecture Testing:**
1. Build on Intel Mac, test on Intel Mac
2. Build on Apple Silicon Mac, test on Apple Silicon Mac
3. Verify correct architecture binary is used
4. Test universal binary if created

### Verification Script

**File:** `automotive-appraisal/scripts/verify-graphicsmagick-bundle.js`

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function verifyBundle(appPath) {
  const resourcesPath = path.join(appPath, 'Contents', 'Resources');
  const gmPath = path.join(resourcesPath, 'graphicsmagick');
  const binPath = path.join(gmPath, 'bin', 'gm');
  const libPath = path.join(gmPath, 'lib');
  
  console.log('🔍 Verifying GraphicsMagick bundle...\n');
  
  // Check binary exists
  if (!fs.existsSync(binPath)) {
    console.error('❌ Binary not found:', binPath);
    process.exit(1);
  }
  console.log('✅ Binary found:', binPath);
  
  // Check binary is executable
  const stats = fs.statSync(binPath);
  const isExecutable = (stats.mode & 0o111) !== 0;
  if (!isExecutable) {
    console.error('❌ Binary is not executable');
    process.exit(1);
  }
  console.log('✅ Binary is executable');
  
  // Check libraries
  const requiredLibs = [
    'libGraphicsMagick.dylib',
    'liblcms2.dylib',
    'libfreetype.dylib',
    'libltdl.dylib'
  ];
  
  for (const lib of requiredLibs) {
    const libFilePath = path.join(libPath, lib);
    if (!fs.existsSync(libFilePath)) {
      console.error(`❌ Library not found: ${lib}`);
      process.exit(1);
    }
    console.log(`✅ Library found: ${lib}`);
  }
  
  // Check binary dependencies
  try {
    const output = execSync(`otool -L "${binPath}"`, { encoding: 'utf-8' });
    console.log('\n📋 Binary dependencies:');
    console.log(output);
    
    // Verify @rpath references
    if (!output.includes('@rpath')) {
      console.warn('⚠️  No @rpath references found. Libraries may not load correctly.');
    }
  } catch (error) {
    console.error('❌ Failed to check dependencies:', error.message);
    process.exit(1);
  }
  
  console.log('\n✅ GraphicsMagick bundle verification complete!');
}

// Usage: node verify-graphicsmagick-bundle.js "/path/to/App.app"
const appPath = process.argv[2];
if (!appPath) {
  console.error('Usage: node verify-graphicsmagick-bundle.js "/path/to/App.app"');
  process.exit(1);
}

verifyBundle(appPath);
```

## Implementation Phases

### Phase 1: Bundle Creation
- Complete bundle-graphicsmagick.sh script
- Test script on both Intel and Apple Silicon Macs
- Verify bundle structure and dependencies
- Document any architecture-specific issues

### Phase 2: Forge Configuration
- Update forge.config.ts with extraResource
- Enhance postPackage hook
- Test packaging process
- Verify bundle is copied correctly

### Phase 3: Runtime Service
- Create GraphicsMagickService
- Implement path detection logic
- Add verification methods
- Write unit tests

### Phase 4: Integration
- Update ocrExtractorProcess.ts
- Configure pdf2pic to use bundled binary
- Implement fallback mechanism
- Test end-to-end PDF processing

### Phase 5: Testing & Validation
- Run all unit tests
- Run integration tests
- Perform manual testing on packaged app
- Test on clean systems without GraphicsMagick
- Verify error messages are helpful

### Phase 6: Documentation
- Update README with bundling information
- Document build requirements
- Add troubleshooting guide
- Create developer notes for maintenance

## Security Considerations

1. **Binary Verification**
   - Only bundle binaries from trusted sources (Homebrew)
   - Verify checksums if available
   - Document source of binaries

2. **Library Path Security**
   - Use @rpath for relative library references
   - Avoid absolute paths that could be hijacked
   - Set restrictive permissions on bundle directory

3. **Execution Safety**
   - Validate binary exists before execution
   - Use execFile instead of exec to prevent shell injection
   - Sanitize any user input passed to GraphicsMagick

4. **Code Signing**
   - Ensure bundled binaries don't break code signing
   - Test notarization with bundled binaries
   - Document any signing requirements

## Performance Considerations

1. **Bundle Size**
   - GraphicsMagick binary: ~2-3 MB
   - Required libraries: ~5-10 MB
   - Total overhead: ~10-15 MB (acceptable)

2. **Startup Time**
   - Verification adds <100ms to startup
   - Lazy initialization recommended
   - Cache configuration after first check

3. **Runtime Performance**
   - Bundled binary should perform identically to system binary
   - No performance degradation expected
   - Library loading from bundle is fast on modern systems

## Maintenance and Updates

1. **Updating GraphicsMagick**
   - Re-run bundle script with new version
   - Test thoroughly before releasing
   - Document version in bundle metadata

2. **Dependency Changes**
   - Monitor GraphicsMagick dependency changes
   - Update required libraries list if needed
   - Test on multiple macOS versions

3. **Architecture Support**
   - Currently supports x86_64 and arm64
   - Universal binary support possible
   - Document architecture requirements

## Alternative Approaches Considered

### 1. System Installation Requirement
**Rejected:** Poor user experience, installation friction

### 2. Download on First Run
**Rejected:** Requires internet connection, complex error handling

### 3. Use ImageMagick Instead
**Rejected:** Larger binary size, more dependencies

### 4. Pure JavaScript PDF Rendering
**Rejected:** Poor quality for OCR, performance issues

### 5. Bundling with npm Package
**Rejected:** No reliable npm package for GraphicsMagick binaries

## Conclusion

This design provides a robust, maintainable solution for bundling GraphicsMagick with the Electron application. It follows established patterns from the Tesseract.js bundling implementation, provides comprehensive error handling, and ensures a smooth user experience across different environments and architectures.
