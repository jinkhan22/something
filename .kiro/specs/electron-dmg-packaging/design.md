# Design Document

## Overview

This design addresses the Tesseract.js worker thread module resolution failure in packaged Electron applications by implementing a dual-strategy approach: creating a proper node_modules directory structure in the Resources path and bundling regenerator-runtime directly within the tesseract.js package directory. The solution leverages Electron Forge's postPackage hook to automatically configure the correct directory structure during the build process, ensuring worker threads can resolve dependencies using Node.js's standard module resolution algorithm.

## Architecture

### Current State Analysis

The application currently uses:
- **Electron Forge** with Vite plugin for building and packaging
- **ASAR packaging** enabled with extraResource declarations
- **Tesseract.js 6.0.1** for OCR processing with worker threads
- **pdf2pic** for PDF to image conversion
- **MakerDMG** for macOS distribution

**Current extraResource Configuration:**
```
Resources/
├── app.asar (main application code)
├── tesseract-assets/
│   └── eng.traineddata
├── tesseract.js/
├── tesseract.js-core/
└── regenerator-runtime/
```

**Problem:** Worker threads spawned at `Resources/tesseract.js/src/worker-script/node/index.js` cannot resolve `regenerator-runtime` because Node.js module resolution searches for `node_modules` directories, which don't exist in the current structure.

### Proposed Architecture

Implement a two-tier module resolution strategy:

1. **Primary Strategy**: Create a `node_modules` directory in Resources with symlinks to existing modules
2. **Fallback Strategy**: Bundle `regenerator-runtime` directly inside `tesseract.js/node_modules`

**Target Directory Structure:**
```
Resources/
├── app.asar
├── tesseract-assets/
│   └── eng.traineddata
├── tesseract.js/
│   ├── node_modules/              ← NEW: Local fallback
│   │   └── regenerator-runtime/   ← Copied here
│   └── src/
│       └── worker-script/
│           └── node/
│               └── index.js       ← Worker script location
├── tesseract.js-core/
├── regenerator-runtime/
└── node_modules/                  ← NEW: Global resolution
    ├── tesseract.js → ../tesseract.js
    ├── tesseract.js-core → ../tesseract.js-core
    └── regenerator-runtime → ../regenerator-runtime
```

### Module Resolution Flow

When a worker thread executes `require('regenerator-runtime/runtime')`:

1. Node.js searches for `node_modules` starting from the worker script directory
2. Searches up the directory tree: 
   - `tesseract.js/src/worker-script/node/node_modules` (not found)
   - `tesseract.js/src/worker-script/node_modules` (not found)
   - `tesseract.js/src/node_modules` (not found)
   - `tesseract.js/node_modules` ✅ **FOUND** (fallback strategy)
3. If step 2 fails, continues searching:
   - `Resources/node_modules` ✅ **FOUND** (primary strategy)
4. Loads `regenerator-runtime/runtime.js` from the discovered location

## Components and Interfaces

### 1. Forge Configuration Enhancement

**File:** `automotive-appraisal/forge.config.ts`

**Changes:**
- Add `postPackage` hook to the configuration
- Implement directory creation and file operations
- Add comprehensive logging for debugging

**Interface:**
```typescript
interface PostPackageHookContext {
  forgeConfig: ForgeConfig;
  options: {
    outputPaths: string[];
    platform: string;
    arch: string;
  };
}

async function postPackageHook(
  forgeConfig: ForgeConfig,
  options: PostPackageHookContext['options']
): Promise<void>
```

**Responsibilities:**
- Determine the correct Resources path based on platform
- Create `Resources/node_modules` directory
- Create symlinks for tesseract.js, tesseract.js-core, and regenerator-runtime
- Create `Resources/tesseract.js/node_modules` directory
- Copy regenerator-runtime into tesseract.js/node_modules
- Log all operations for debugging
- Handle errors gracefully without failing the build

### 2. Directory Structure Manager

**Embedded in postPackage hook**

**Functions:**

```typescript
function getResourcesPath(outputPath: string, platform: string): string
function createNodeModulesStructure(resourcesPath: string): Promise<void>
function createSymlink(target: string, linkPath: string): Promise<void>
function copyDirectory(source: string, destination: string): Promise<void>
function verifyStructure(resourcesPath: string): Promise<boolean>
```

**Logic Flow:**
1. Validate output path exists
2. Determine Resources directory location (macOS: `.app/Contents/Resources`)
3. Create `node_modules` directory if it doesn't exist
4. For each module (tesseract.js, tesseract.js-core, regenerator-runtime):
   - Verify source exists in Resources
   - Create symlink in `Resources/node_modules`
   - Log operation
5. Create `tesseract.js/node_modules` directory
6. Copy entire `regenerator-runtime` directory into `tesseract.js/node_modules`
7. Verify all operations completed successfully

### 3. Build Verification Script

**File:** `automotive-appraisal/scripts/verify-package-structure.js` (new)

**Purpose:** Standalone script to verify the packaged app has correct structure

**Interface:**
```typescript
function verifyPackageStructure(appPath: string): Promise<VerificationResult>

interface VerificationResult {
  success: boolean;
  checks: {
    name: string;
    passed: boolean;
    path: string;
    message?: string;
  }[];
}
```

**Checks:**
- Resources/node_modules exists
- Resources/node_modules/tesseract.js exists (symlink or directory)
- Resources/node_modules/tesseract.js-core exists
- Resources/node_modules/regenerator-runtime exists
- Resources/tesseract.js/node_modules/regenerator-runtime exists (directory)
- Resources/tesseract-assets/eng.traineddata exists

### 4. OCR Service Enhancement

**File:** `automotive-appraisal/src/main/services/ocrExtractorProcess.ts`

**Changes:**
- Add debug logging for module resolution
- Add try-catch around worker creation with detailed error messages
- Log NODE_PATH and module search paths
- Verify regenerator-runtime is resolvable before creating worker

**New Function:**
```typescript
async function debugModuleResolution(): Promise<void> {
  console.log('=== Module Resolution Debug ===');
  console.log('Resources path:', process.resourcesPath);
  console.log('NODE_PATH:', process.env.NODE_PATH);
  console.log('Module paths:', require('module').globalPaths);
  
  try {
    const resolvedPath = require.resolve('regenerator-runtime/runtime');
    console.log('✅ regenerator-runtime resolved:', resolvedPath);
  } catch (e) {
    console.log('❌ Cannot resolve regenerator-runtime:', e.message);
  }
}
```

## Data Models

### Build Configuration

```typescript
interface BuildConfiguration {
  packagerConfig: {
    asar: boolean;
    name: string;
    appBundleId: string;
    appCategoryType: string;
    extraResource: string[];
  };
  hooks?: {
    postPackage?: (
      forgeConfig: ForgeConfig,
      options: PackageOptions
    ) => Promise<void>;
  };
}
```

### Package Structure

```typescript
interface PackageStructure {
  resourcesPath: string;
  nodeModules: {
    path: string;
    modules: ModuleLink[];
  };
  tesseractNodeModules: {
    path: string;
    modules: ModuleCopy[];
  };
  assets: {
    tesseractAssets: string;
    trainedData: string;
  };
}

interface ModuleLink {
  name: string;
  target: string;
  linkPath: string;
  type: 'symlink' | 'directory';
}

interface ModuleCopy {
  name: string;
  source: string;
  destination: string;
}
```

## Error Handling

### Build-Time Errors

**Scenario 1: Output path doesn't exist**
- **Detection:** Check `fs.existsSync(outputPath)` before operations
- **Handling:** Log error and skip postPackage operations
- **Recovery:** Build continues, but manual fix required

**Scenario 2: Source module missing**
- **Detection:** Check `fs.existsSync(sourcePath)` before copy/symlink
- **Handling:** Log warning with missing module name
- **Recovery:** Continue with other modules, log summary at end

**Scenario 3: Permission errors during symlink creation**
- **Detection:** Catch EACCES or EPERM errors
- **Handling:** Fall back to copying directory instead of symlinking
- **Recovery:** Use `fs.cpSync()` with recursive option

**Scenario 4: Disk space issues**
- **Detection:** Catch ENOSPC errors
- **Handling:** Log error with disk space message
- **Recovery:** Fail build with clear error message

### Runtime Errors

**Scenario 1: Worker thread cannot find regenerator-runtime**
- **Detection:** Catch module resolution errors in worker creation
- **Handling:** Log detailed error with module paths
- **User Message:** "OCR processing failed. Please reinstall the application."
- **Recovery:** Prevent OCR operations, allow app to continue

**Scenario 2: Tesseract assets missing**
- **Detection:** `verifyTesseractAssets()` throws error
- **Handling:** Show user-friendly error dialog
- **User Message:** "OCR assets are missing. Please reinstall the application."
- **Recovery:** Disable PDF upload functionality

**Scenario 3: Worker thread crashes**
- **Detection:** Worker process exit event
- **Handling:** Log crash details, attempt to recreate worker
- **Recovery:** Retry OCR operation once, then fail gracefully

## Testing Strategy

### Unit Tests

**Test Suite 1: PostPackage Hook**
- Test directory creation logic
- Test symlink creation with mocked fs operations
- Test error handling for missing sources
- Test path resolution for different platforms
- Test logging output

**Test Suite 2: Module Resolution**
- Mock worker thread environment
- Test require.resolve() with different NODE_PATH values
- Test module search path configuration
- Verify regenerator-runtime is discoverable

### Integration Tests

**Test Suite 3: Build Process**
- Run `npm run package` and verify output structure
- Check for node_modules directory in Resources
- Verify symlinks point to correct targets
- Verify regenerator-runtime copy in tesseract.js/node_modules
- Run verification script on packaged app

**Test Suite 4: OCR Functionality**
- Launch packaged app
- Upload test PDF
- Verify OCR worker spawns successfully
- Verify text extraction completes
- Check console logs for module resolution errors

### End-to-End Tests

**Test Suite 5: DMG Installation**
- Build DMG with `npm run make`
- Mount DMG and verify contents
- Install app to Applications folder
- Launch app and test full workflow
- Upload PDF and verify extraction
- Check system logs for errors

### Manual Testing Checklist

1. **Build Verification:**
   - [ ] Run `npm run package`
   - [ ] Navigate to output directory
   - [ ] Verify Resources/node_modules exists
   - [ ] Verify symlinks are created
   - [ ] Verify regenerator-runtime copy exists

2. **DMG Creation:**
   - [ ] Run `npm run make`
   - [ ] Verify DMG file created in out/make
   - [ ] Mount DMG and check contents
   - [ ] Verify app icon and Applications shortcut

3. **Installation:**
   - [ ] Drag app to Applications
   - [ ] Launch app from Applications
   - [ ] Check for startup errors in Console.app

4. **OCR Testing:**
   - [ ] Upload a CCC valuation report
   - [ ] Upload a Mitchell valuation report
   - [ ] Verify data extraction works
   - [ ] Check for worker thread errors

5. **Performance:**
   - [ ] Measure OCR processing time
   - [ ] Compare with development version
   - [ ] Check memory usage during OCR

## Implementation Phases

### Phase 1: Forge Configuration Update
- Modify `forge.config.ts` to add postPackage hook
- Implement directory creation logic
- Implement symlink creation logic
- Add comprehensive logging

### Phase 2: Regenerator-Runtime Bundling
- Implement copy logic for regenerator-runtime
- Create tesseract.js/node_modules directory
- Verify copy operation completes successfully

### Phase 3: Verification Script
- Create standalone verification script
- Implement all structure checks
- Add detailed reporting

### Phase 4: OCR Service Enhancement
- Add debug logging to ocrExtractorProcess.ts
- Improve error messages
- Add module resolution verification

### Phase 5: Testing
- Run unit tests for new code
- Perform integration testing with packaged app
- Execute manual testing checklist
- Test DMG installation on clean macOS system

### Phase 6: Documentation
- Update README with build instructions
- Document troubleshooting steps
- Add comments to postPackage hook
- Create developer guide for packaging

## Performance Considerations

### Build Time Impact
- **Symlink creation:** Negligible (<1 second)
- **Directory copy:** ~5-10 seconds for regenerator-runtime
- **Total overhead:** <15 seconds added to build time

### Runtime Impact
- **Module resolution:** No performance impact (standard Node.js resolution)
- **Symlinks vs copies:** Symlinks have zero overhead, copies use ~2MB additional disk space
- **Worker thread startup:** No change from current implementation

### Disk Space
- **Symlinks:** 0 bytes (just pointers)
- **Regenerator-runtime copy:** ~500KB
- **Total additional space:** <1MB

## Security Considerations

### Symlink Security
- Symlinks point to locations within the same Resources directory
- No external or system paths are referenced
- macOS Gatekeeper validates entire app bundle including symlinks

### Code Signing
- Symlinks are included in code signature
- Directory structure changes don't affect signature validity
- DMG notarization includes all Resources content

### User Permissions
- No elevated permissions required for installation
- Standard drag-to-Applications installation
- No system modifications needed

## Alternative Approaches Considered

### Alternative 1: Patch Tesseract.js Worker Script
**Pros:** Direct fix at the source of the problem
**Cons:** Requires postinstall script, breaks on npm install, modifies third-party code
**Decision:** Rejected due to maintainability concerns

### Alternative 2: Disable ASAR Packaging
**Pros:** Simplifies module resolution
**Cons:** Larger app size, slower startup, security concerns
**Decision:** Rejected to maintain current packaging benefits

### Alternative 3: Use Tesseract Without Workers
**Pros:** Avoids worker thread issues entirely
**Cons:** Significantly slower OCR, blocks main process
**Decision:** Rejected due to performance requirements

### Alternative 4: Bundle Everything in ASAR
**Pros:** Single file distribution
**Cons:** Worker threads can't load from ASAR, requires unpacking
**Decision:** Rejected as it doesn't solve the core issue

## Dependencies

### Build Dependencies
- `@electron-forge/cli`: ^7.9.0
- `@electron-forge/maker-dmg`: ^7.10.2
- `@electron-forge/plugin-vite`: ^7.9.0

### Runtime Dependencies
- `tesseract.js`: ^6.0.1
- `regenerator-runtime`: (transitive dependency)
- `pdf2pic`: ^3.2.0

### System Requirements
- **macOS:** 10.13 or later
- **Node.js:** 18.x or later (for building)
- **Disk Space:** 500MB for build, 200MB for installed app

## Rollback Plan

If the solution doesn't work:

1. **Immediate Rollback:**
   - Remove postPackage hook from forge.config.ts
   - Revert to previous packaging configuration
   - Document the failure for future reference

2. **Alternative Solution:**
   - Implement Solution 2 from TESSERACT_WORKER_THREAD_FIX.md (patch worker script)
   - Use postinstall script to apply patch
   - Accept the maintenance overhead

3. **Last Resort:**
   - Switch to synchronous Tesseract processing (Solution 3)
   - Accept performance degradation
   - Plan migration to alternative OCR library

## Success Criteria

The implementation is successful when:

1. ✅ `npm run package` completes without errors
2. ✅ Packaged app contains correct directory structure
3. ✅ Verification script passes all checks
4. ✅ DMG builds successfully with `npm run make`
5. ✅ App installs from DMG without issues
6. ✅ OCR processing works in packaged app
7. ✅ No "Cannot find module" errors in console
8. ✅ Performance matches development version
9. ✅ Manual testing checklist completed
10. ✅ App works on clean macOS system without development tools
