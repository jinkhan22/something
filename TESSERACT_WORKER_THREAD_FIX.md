# Tesseract.js Worker Thread Issue in Packaged Electron App

## Problem Summary

The Electron app uses Tesseract.js for OCR processing, which creates worker threads to perform OCR operations. When the app is packaged for distribution, these worker threads fail with:

```
Error: Cannot find module 'regenerator-runtime/runtime'
Require stack:
- /Applications/Automotive Appraisal Reporter.app/Contents/Resources/tesseract.js/src/worker-script/index.js
- /Applications/Automotive Appraisal Reporter.app/Contents/Resources/tesseract.js/src/worker-script/node/index.js
```

## Root Cause

Worker threads in Node.js/Electron spawn separate processes that use `require()` to load modules. The worker script at `tesseract.js/src/worker-script/index.js` contains:

```javascript
require('regenerator-runtime/runtime');
```

Node's module resolution searches for modules in:
1. Local `node_modules` directory
2. Parent `node_modules` directories
3. Paths specified in `NODE_PATH` environment variable

In the packaged app:
- The worker script is at: `/Applications/.../Resources/tesseract.js/src/worker-script/index.js`
- The `regenerator-runtime` module is at: `/Applications/.../Resources/regenerator-runtime/`
- Node's default module resolution can't find `regenerator-runtime` from the worker script location because there's no `node_modules` folder structure

## Current State

### What's Already Been Tried

1. **Bundling modules as extraResource** ✅ (Done)
   - `tesseract.js`, `tesseract.js-core`, and `regenerator-runtime` are copied to Resources
   - Location: `/Applications/.../Resources/[module-name]/`

2. **Setting NODE_PATH** ⚠️ (Partially working)
   - CODE: `process.env.NODE_PATH = process.resourcesPath;`
   - CODE: `require('module').Module._initPaths();`
   - This updates the main process but worker threads inherit environment at spawn time

3. **ASAR unpacking attempts** ❌ (Failed)
   - Electron Forge + Vite doesn't properly unpack patterns
   - Attempted various glob patterns without success

## Solutions to Try

### Solution 1: Create Symbolic node_modules Structure (RECOMMENDED)

The cleanest solution is to create a `node_modules` folder in Resources that worker threads can resolve from.

**Implementation:**

1. **Update `forge.config.ts`:**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Automotive Appraisal Reporter',
    appBundleId: 'com.automotive-appraisal.reporter',
    appCategoryType: 'public.app-category.business',
    extraResource: [
      '../tesseract-assets',
      './node_modules/tesseract.js',
      './node_modules/tesseract.js-core',
      './node_modules/regenerator-runtime',
    ],
  },
  hooks: {
    postPackage: async (forgeConfig, options) => {
      // Create node_modules structure in Resources
      const resourcesPath = path.join(
        options.outputPaths[0],
        'Automotive Appraisal Reporter.app',
        'Contents',
        'Resources'
      );
      
      const nodeModulesPath = path.join(resourcesPath, 'node_modules');
      
      // Create node_modules directory if it doesn't exist
      if (!fs.existsSync(nodeModulesPath)) {
        fs.mkdirSync(nodeModulesPath);
      }
      
      // Create symlinks or copy modules
      const modules = ['tesseract.js', 'tesseract.js-core', 'regenerator-runtime'];
      
      for (const moduleName of modules) {
        const sourcePath = path.join(resourcesPath, moduleName);
        const targetPath = path.join(nodeModulesPath, moduleName);
        
        if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
          // On macOS, we can use symlinks
          fs.symlinkSync(path.relative(nodeModulesPath, sourcePath), targetPath);
          
          // Alternative: Copy instead of symlink (more compatible but larger)
          // fs.cpSync(sourcePath, targetPath, { recursive: true });
        }
      }
    }
  },
  // ... rest of config
};
```

2. **Update `src/main/services/tesseractAssets.ts`:**

No changes needed - paths should remain as they are pointing to Resources.

**Why this works:**
- Worker threads will look for `node_modules` relative to their script location
- From `/Resources/tesseract.js/src/worker-script/`, Node will search up to `/Resources/`
- It will find `/Resources/node_modules/regenerator-runtime/runtime.js`

---

### Solution 2: Patch Worker Script to Use Absolute Paths

Modify the Tesseract.js worker script to use absolute paths.

**Implementation:**

1. **Create a post-install script** `scripts/patch-tesseract-worker.js`:

```javascript
const fs = require('fs');
const path = require('path');

const workerScriptPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'tesseract.js',
  'src',
  'worker-script',
  'index.js'
);

let content = fs.readFileSync(workerScriptPath, 'utf8');

// Replace relative require with absolute path resolution
const patch = `
// Patched for Electron packaging
try {
  // Try normal require first
  require('regenerator-runtime/runtime');
} catch (e) {
  // Fallback for packaged app
  const path = require('path');
  const resourcesPath = process.resourcesPath || path.join(__dirname, '..', '..', '..', '..');
  const regeneratorPath = path.join(resourcesPath, 'regenerator-runtime', 'runtime.js');
  require(regeneratorPath);
}
`;

content = content.replace(
  "require('regenerator-runtime/runtime');",
  patch
);

fs.writeFileSync(workerScriptPath, content);
console.log('✅ Patched tesseract.js worker script');
```

2. **Add to `package.json`:**

```json
{
  "scripts": {
    "postinstall": "node scripts/patch-tesseract-worker.js",
    "prepackage": "node scripts/patch-tesseract-worker.js",
    "premake": "node scripts/patch-tesseract-worker.js"
  }
}
```

**Pros:**
- Works without modifying packaging
- Reliable fallback mechanism

**Cons:**
- Needs to be reapplied after `npm install`
- Modifies third-party code

---

### Solution 3: Use Tesseract.js Without Worker Threads

Configure Tesseract to run synchronously in the main process instead of spawning workers.

**Implementation:**

Update `src/main/services/ocrExtractorProcess.ts`:

```typescript
import Tesseract from 'tesseract.js';

// Instead of createWorker, use recognize directly
const { data: { text } } = await Tesseract.recognize(
  imagePath,
  'eng',
  {
    langPath: assetPaths.langPath,
    corePath: assetPaths.corePath,
    // No workerPath needed
    logger: m => console.log(m),
  }
);
```

**Pros:**
- Avoids worker thread issues entirely
- Simpler setup

**Cons:**
- Slower performance (single-threaded)
- May block main process during OCR

---

### Solution 4: Bundle regenerator-runtime Inside tesseract.js

Copy `regenerator-runtime` into the `tesseract.js` package.

**Implementation:**

1. **Create hook in `forge.config.ts`:**

```typescript
hooks: {
  postPackage: async (forgeConfig, options) => {
    const resourcesPath = path.join(
      options.outputPaths[0],
      'Automotive Appraisal Reporter.app',
      'Contents',
      'Resources'
    );
    
    const tesseractPath = path.join(resourcesPath, 'tesseract.js');
    const regeneratorSrc = path.join(resourcesPath, 'regenerator-runtime');
    const regeneratorDest = path.join(tesseractPath, 'node_modules', 'regenerator-runtime');
    
    // Create tesseract.js/node_modules if it doesn't exist
    const tesseractNodeModules = path.join(tesseractPath, 'node_modules');
    if (!fs.existsSync(tesseractNodeModules)) {
      fs.mkdirSync(tesseractNodeModules, { recursive: true });
    }
    
    // Copy regenerator-runtime into tesseract.js/node_modules
    if (fs.existsSync(regeneratorSrc)) {
      fs.cpSync(regeneratorSrc, regeneratorDest, { recursive: true });
      console.log('✅ Bundled regenerator-runtime into tesseract.js');
    }
  }
}
```

**Why this works:**
- Worker script at `/Resources/tesseract.js/src/worker-script/index.js`
- Will find `/Resources/tesseract.js/node_modules/regenerator-runtime/`

---

## Recommended Approach

**Use Solution 1 (Create node_modules structure) combined with Solution 4 (Bundle regenerator-runtime)**

This provides a proper module structure that Node.js expects:

```
Resources/
├── app.asar
├── tesseract-assets/
│   └── eng.traineddata
├── tesseract.js/
│   ├── node_modules/           ← Add this
│   │   └── regenerator-runtime/ ← Bundle here
│   └── src/
│       └── worker-script/
│           └── index.js        ← Worker script location
├── tesseract.js-core/
├── regenerator-runtime/
└── node_modules/               ← Also add this (symlinks)
    ├── tesseract.js → ../tesseract.js
    ├── tesseract.js-core → ../tesseract.js-core
    └── regenerator-runtime → ../regenerator-runtime
```

## Testing Steps

After implementing the fix:

1. **Rebuild the app:**
   ```bash
   npm run make
   ```

2. **Verify the structure:**
   ```bash
   # Open the packaged app
   cd "out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app/Contents/Resources"
   
   # Check for node_modules
   ls -la node_modules/
   
   # Check tesseract.js has regenerator-runtime
   ls -la tesseract.js/node_modules/
   ```

3. **Test PDF upload:**
   - Open the packaged app from DMG
   - Upload a PDF report
   - Verify OCR processing completes without errors

4. **Check logs:**
   - Open Console.app on macOS
   - Filter for "Automotive Appraisal Reporter"
   - Look for any module resolution errors

## Debug Information

If issues persist, add logging to see module resolution:

```typescript
// In ocrExtractorProcess.ts, before createWorker
console.log('Resources path:', process.resourcesPath);
console.log('NODE_PATH:', process.env.NODE_PATH);
console.log('Module paths:', require('module').globalPaths);

// Check if regenerator-runtime is accessible
try {
  require.resolve('regenerator-runtime/runtime');
  console.log('✅ regenerator-runtime resolved');
} catch (e) {
  console.log('❌ Cannot resolve regenerator-runtime:', e.message);
}
```

## Additional Notes

### Why Setting NODE_PATH Didn't Work

The current code sets `NODE_PATH` and calls `Module._initPaths()` in the main process:

```typescript
process.env.NODE_PATH = process.resourcesPath;
require('module').Module._initPaths();
```

However:
1. Worker threads are spawned as separate Node processes
2. They inherit the environment **at spawn time**, not dynamically
3. By the time the worker starts, `NODE_PATH` changes in the main process don't affect it
4. The worker needs to set its own `NODE_PATH` or have proper module structure

### Why ASAR Unpacking Didn't Work

Electron Forge with Vite doesn't properly support ASAR unpacking patterns because:
- Vite pre-bundles dependencies
- The unpack glob patterns need to match the bundled output structure
- Standard patterns like `**/tesseract.js/**` don't work with Vite's bundling

### Alternative: Use a Different OCR Library

If Tesseract.js proves too problematic, consider:
- **node-tesseract-ocr**: Native binding, no worker threads
- **tesseract.js** with WebAssembly (browser version) adapted for Electron
- Use a cloud OCR service (Google Vision API, AWS Textract)

## Files to Modify

1. `forge.config.ts` - Add postPackage hook
2. `scripts/patch-tesseract-worker.js` - Create new file (if using Solution 2)
3. `package.json` - Add postinstall script (if using Solution 2)

## Contact

If you need clarification or encounter other issues, the key files to check are:
- `src/main/services/ocrExtractorProcess.ts` - OCR processing logic
- `src/main/services/tesseractAssets.ts` - Path configuration
- `forge.config.ts` - Packaging configuration

Good luck! 🚀
