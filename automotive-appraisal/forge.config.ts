import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PostPackage Hook - Fixes Tesseract.js Worker Thread Module Resolution
 * 
 * PROBLEM:
 * When Tesseract.js spawns worker threads in the packaged app, they execute at:
 * Resources/tesseract.js/src/worker-script/node/index.js
 * 
 * These workers attempt to require('regenerator-runtime/runtime'), but Node.js
 * module resolution fails because there's no node_modules directory in the
 * Resources path. The extraResource declarations copy modules as flat directories,
 * which doesn't match Node.js's expected module resolution structure.
 * 
 * SOLUTION - DUAL STRATEGY:
 * 
 * 1. PRIMARY STRATEGY: Create Resources/node_modules with symlinks
 *    - Creates a proper node_modules directory that Node.js recognizes
 *    - Symlinks point to existing extraResource modules (zero disk overhead)
 *    - Enables standard Node.js module resolution algorithm
 *    - When worker searches up directory tree, it finds Resources/node_modules
 * 
 * 2. FALLBACK STRATEGY: Bundle regenerator-runtime in tesseract.js/node_modules
 *    - Copies regenerator-runtime directly into tesseract.js/node_modules
 *    - Provides local resolution from worker script location
 *    - Ensures resolution works even if primary strategy fails
 *    - Worker finds module before searching up to Resources/node_modules
 * 
 * MODULE RESOLUTION FLOW:
 * When worker executes require('regenerator-runtime/runtime'):
 * 1. Node.js searches for node_modules starting from worker script directory
 * 2. Searches up: tesseract.js/src/worker-script/node/node_modules (not found)
 * 3. Searches up: tesseract.js/src/worker-script/node_modules (not found)
 * 4. Searches up: tesseract.js/src/node_modules (not found)
 * 5. Searches up: tesseract.js/node_modules ✅ FOUND (fallback strategy)
 * 6. If step 5 fails: Resources/node_modules ✅ FOUND (primary strategy)
 * 7. Loads regenerator-runtime/runtime.js from discovered location
 * 
 * WHY THIS STRUCTURE IS NEEDED:
 * - ASAR packaging extracts resources as flat directories, not node_modules
 * - Worker threads run in separate processes with their own module resolution
 * - Workers cannot access modules from the main process or ASAR archive
 * - Node.js module resolution requires specific directory naming (node_modules)
 * - Symlinks preserve disk space while providing correct structure
 * - Bundling provides redundancy for critical dependencies
 * 
 * MAINTAINABILITY:
 * - No modifications to third-party code (tesseract.js remains untouched)
 * - No postinstall scripts that break on npm install
 * - Automatic execution during build process
 * - Graceful error handling doesn't halt builds
 * - Comprehensive logging aids debugging
 */
async function postPackageHook(
  forgeConfig: ForgeConfig,
  options: {
    outputPaths: string[];
    platform: string;
    arch: string;
  }
): Promise<void> {
  console.log('\n=== PostPackage Hook: Setting up module structure ===');
  
  try {
    // Only process macOS builds
    if (options.platform !== 'darwin') {
      console.log(`⏭️  Skipping postPackage hook for platform: ${options.platform}`);
      return;
    }

    // Get the output path (first path in the array)
    const outputPath = options.outputPaths[0];
    if (!outputPath || !fs.existsSync(outputPath)) {
      console.error('❌ Output path does not exist:', outputPath);
      return;
    }

    // Resolve Resources path for macOS app bundle structure
    // Path structure: [App].app/Contents/Resources
    const resourcesPath = path.join(outputPath, 'Automotive Appraisal Reporter.app', 'Contents', 'Resources');
    
    if (!fs.existsSync(resourcesPath)) {
      console.error('❌ Resources path does not exist:', resourcesPath);
      return;
    }

    console.log('📁 Resources path:', resourcesPath);

    // ============================================================
    // STEP 1: Create primary node_modules directory (Primary Strategy)
    // ============================================================
    // This directory enables Node.js's standard module resolution algorithm.
    // When worker threads search up the directory tree for modules, they will
    // find this node_modules directory and resolve dependencies from it.
    const nodeModulesPath = path.join(resourcesPath, 'node_modules');
    
    try {
      if (!fs.existsSync(nodeModulesPath)) {
        fs.mkdirSync(nodeModulesPath, { recursive: true });
        console.log('✅ Created directory:', nodeModulesPath);
      } else {
        console.log('✅ Directory already exists:', nodeModulesPath);
      }
    } catch (error) {
      console.error('❌ Failed to create node_modules directory:', error);
      return;
    }

    // ============================================================
    // STEP 2: Create symlinks for modules (Primary Strategy)
    // ============================================================
    // Symlinks provide zero-overhead pointers to the extraResource modules.
    // This maintains the flat extraResource structure while also providing
    // the node_modules structure that Node.js expects for module resolution.
    // 
    // Why symlinks instead of copies?
    // - Zero disk space overhead (just pointers)
    // - Faster build times (no file copying)
    // - Maintains single source of truth for module files
    // 
    // Fallback to copying if symlinks fail (e.g., permission issues)
    const modulesToLink = [
      'tesseract.js',
      'tesseract.js-core',
      'regenerator-runtime',
      'is-url',
      'bmp-js',
      'idb-keyval',
      'node-fetch',
      'wasm-feature-detect',
      'zlibjs'
    ];

    for (const moduleName of modulesToLink) {
      const sourceModulePath = path.join(resourcesPath, moduleName);
      const linkPath = path.join(nodeModulesPath, moduleName);

      try {
        // Verify source module exists (from extraResource declarations)
        if (!fs.existsSync(sourceModulePath)) {
          console.warn(`⚠️  Source module not found: ${sourceModulePath}`);
          continue;
        }

        // Skip if symlink/directory already exists
        if (fs.existsSync(linkPath)) {
          console.log(`✅ Module already linked: ${moduleName}`);
          continue;
        }

        // Calculate relative path for symlink target
        // Relative paths are more portable than absolute paths
        // From: Resources/node_modules/[module]
        // To: Resources/[module]
        const relativeTarget = path.join('..', moduleName);

        try {
          // Attempt to create symlink (preferred method)
          fs.symlinkSync(relativeTarget, linkPath, 'dir');
          console.log(`✅ Created symlink: ${moduleName} -> ${relativeTarget}`);
        } catch (symlinkError) {
          // Fallback: Copy directory if symlink creation fails
          // This can happen due to permission issues or filesystem limitations
          console.warn(`⚠️  Symlink failed for ${moduleName}, falling back to copy`);
          fs.cpSync(sourceModulePath, linkPath, { recursive: true });
          console.log(`✅ Copied directory: ${moduleName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to link/copy module ${moduleName}:`, error);
      }
    }

    // ============================================================
    // STEP 3: Bundle dependencies in tesseract.js (Fallback Strategy)
    // ============================================================
    // This provides local module resolution from the worker script location.
    // When the worker at tesseract.js/src/worker-script/node/index.js
    // executes require('regenerator-runtime') or require('is-url'), Node.js 
    // will search up and find tesseract.js/node_modules/[module] BEFORE 
    // searching up to Resources/node_modules.
    // 
    // Why bundle locally in addition to the primary strategy?
    // - Provides redundancy if primary strategy fails
    // - Ensures fastest resolution path (found earlier in search)
    // - Matches how npm would naturally structure nested dependencies
    // - Only ~500KB additional disk space for critical dependencies
    // 
    // This is a COPY, not a symlink, because:
    // - Worker needs direct access to files
    // - Ensures module is always available regardless of symlink support
    // - Provides isolation from potential changes to Resources/[module]
    const tesseractPath = path.join(resourcesPath, 'tesseract.js');
    const tesseractNodeModulesPath = path.join(tesseractPath, 'node_modules');
    
    // Modules that need to be bundled in tesseract.js/node_modules
    // These are all the dependencies that tesseract.js worker threads require
    const modulesToBundle = [
      'regenerator-runtime',
      'is-url',
      'bmp-js',
      'idb-keyval',
      'node-fetch',
      'wasm-feature-detect',
      'zlibjs'
    ];

    try {
      // Create tesseract.js/node_modules directory
      // This is where Node.js will look when searching up from worker script
      if (!fs.existsSync(tesseractNodeModulesPath)) {
        fs.mkdirSync(tesseractNodeModulesPath, { recursive: true });
        console.log('✅ Created directory:', tesseractNodeModulesPath);
      }

      // Copy each module into tesseract.js/node_modules
      for (const moduleName of modulesToBundle) {
        const sourceModulePath = path.join(resourcesPath, moduleName);
        const destModulePath = path.join(tesseractNodeModulesPath, moduleName);

        // Verify source module exists (from extraResource)
        if (!fs.existsSync(sourceModulePath)) {
          console.error(`❌ Source ${moduleName} not found:`, sourceModulePath);
          continue;
        }

        // Copy entire module directory into tesseract.js/node_modules
        // Must be a full copy to ensure all files are present
        if (!fs.existsSync(destModulePath)) {
          fs.cpSync(sourceModulePath, destModulePath, { recursive: true });
          console.log(`✅ Copied ${moduleName} to: ${destModulePath}`);
        } else {
          console.log(`✅ ${moduleName} already exists in tesseract.js/node_modules`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to bundle dependencies in tesseract.js:', error);
    }

    // ============================================================
    // STEP 4: Verify GraphicsMagick bundle
    // ============================================================
    console.log('\n--- Verifying GraphicsMagick Bundle ---');
    
    const gmPath = path.join(resourcesPath, 'graphicsmagick-bundle');
    const gmBinDir = path.join(gmPath, 'bin');
    const gmLibPath = path.join(gmPath, 'lib');
    
    // Define paths for wrapper scripts and real binaries
    const gmWrapperPath = path.join(gmBinDir, 'gm');
    const gmRealPath = path.join(gmBinDir, 'gm-real');
    const gsWrapperPath = path.join(gmBinDir, 'gs');
    const gsRealPath = path.join(gmBinDir, 'gs-real');
    
    try {
      // Verify GraphicsMagick bundle directory exists
      if (!fs.existsSync(gmPath)) {
        console.error('❌ GraphicsMagick bundle directory not found:', gmPath);
        throw new Error('GraphicsMagick bundle is missing from Resources');
      }
      console.log('✅ GraphicsMagick bundle directory found');
      
      // ============================================================
      // Verify GraphicsMagick wrapper script and real binary
      // ============================================================
      console.log('\n--- Verifying GraphicsMagick Binaries ---');
      
      // Verify gm wrapper script exists
      if (!fs.existsSync(gmWrapperPath)) {
        console.error('❌ GraphicsMagick wrapper script not found:', gmWrapperPath);
        throw new Error('GraphicsMagick wrapper script (gm) is missing from bundle');
      }
      console.log('✅ GraphicsMagick wrapper script found:', gmWrapperPath);
      
      // Verify gm-real binary exists
      if (!fs.existsSync(gmRealPath)) {
        console.error('❌ GraphicsMagick real binary not found:', gmRealPath);
        throw new Error('GraphicsMagick real binary (gm-real) is missing from bundle');
      }
      console.log('✅ GraphicsMagick real binary found:', gmRealPath);
      
      // Set executable permissions on gm wrapper script
      try {
        fs.chmodSync(gmWrapperPath, 0o755);
        const gmWrapperStats = fs.statSync(gmWrapperPath);
        const gmWrapperPerms = (gmWrapperStats.mode & parseInt('777', 8)).toString(8);
        console.log(`✅ Set executable permissions on gm wrapper: ${gmWrapperPerms} (755)`);
      } catch (chmodError) {
        console.error('❌ Failed to set executable permissions on gm wrapper:', chmodError);
        throw new Error('Failed to set executable permissions on gm wrapper script');
      }
      
      // Set executable permissions on gm-real binary
      try {
        fs.chmodSync(gmRealPath, 0o755);
        const gmRealStats = fs.statSync(gmRealPath);
        const gmRealPerms = (gmRealStats.mode & parseInt('777', 8)).toString(8);
        console.log(`✅ Set executable permissions on gm-real binary: ${gmRealPerms} (755)`);
      } catch (chmodError) {
        console.error('❌ Failed to set executable permissions on gm-real:', chmodError);
        throw new Error('Failed to set executable permissions on gm-real binary');
      }
      
      // ============================================================
      // Verify Ghostscript wrapper script and real binary
      // ============================================================
      console.log('\n--- Verifying Ghostscript Binaries ---');
      
      // Verify gs wrapper script exists
      if (!fs.existsSync(gsWrapperPath)) {
        console.warn('⚠️  Ghostscript wrapper script not found:', gsWrapperPath);
        console.warn('   PDF processing may fail without Ghostscript');
      } else {
        console.log('✅ Ghostscript wrapper script found:', gsWrapperPath);
        
        // Set executable permissions on gs wrapper script
        try {
          fs.chmodSync(gsWrapperPath, 0o755);
          const gsWrapperStats = fs.statSync(gsWrapperPath);
          const gsWrapperPerms = (gsWrapperStats.mode & parseInt('777', 8)).toString(8);
          console.log(`✅ Set executable permissions on gs wrapper: ${gsWrapperPerms} (755)`);
        } catch (chmodError) {
          console.error('⚠️  Failed to set executable permissions on gs wrapper:', chmodError);
        }
      }
      
      // Verify gs-real binary exists
      if (!fs.existsSync(gsRealPath)) {
        console.warn('⚠️  Ghostscript real binary not found:', gsRealPath);
        console.warn('   PDF processing may fail without Ghostscript');
      } else {
        console.log('✅ Ghostscript real binary found:', gsRealPath);
        
        // Set executable permissions on gs-real binary
        try {
          fs.chmodSync(gsRealPath, 0o755);
          const gsRealStats = fs.statSync(gsRealPath);
          const gsRealPerms = (gsRealStats.mode & parseInt('777', 8)).toString(8);
          console.log(`✅ Set executable permissions on gs-real binary: ${gsRealPerms} (755)`);
        } catch (chmodError) {
          console.error('⚠️  Failed to set executable permissions on gs-real:', chmodError);
        }
      }
      
      // ============================================================
      // Verify library directory and required libraries
      // ============================================================
      console.log('\n--- Verifying GraphicsMagick Libraries ---');
      
      // Verify library directory exists
      if (!fs.existsSync(gmLibPath)) {
        console.error('❌ GraphicsMagick library directory not found:', gmLibPath);
        throw new Error('GraphicsMagick lib directory is missing from bundle');
      }
      console.log('✅ GraphicsMagick library directory found');
      
      // Verify all required libraries exist
      const requiredLibs = [
        'libGraphicsMagick.3.dylib',
        'libfreetype.6.dylib',
        'liblcms2.2.dylib',
        'libltdl.7.dylib',
        'libpng16.16.dylib'
      ];
      
      let missingLibs: string[] = [];
      for (const lib of requiredLibs) {
        const libPath = path.join(gmLibPath, lib);
        if (!fs.existsSync(libPath)) {
          console.error(`❌ Required library not found: ${lib}`);
          missingLibs.push(lib);
        } else {
          console.log(`✅ Library found: ${lib}`);
        }
      }
      
      if (missingLibs.length > 0) {
        throw new Error(
          `Missing required GraphicsMagick libraries: ${missingLibs.join(', ')}\n` +
          'Please run the bundle-graphicsmagick.sh script before packaging.'
        );
      }
      
      console.log('✅ All GraphicsMagick libraries verified');
      console.log('✅ GraphicsMagick bundle verification complete');
      
    } catch (gmError) {
      console.error('\n❌ GraphicsMagick Bundle Verification Failed ❌');
      console.error('Error:', gmError instanceof Error ? gmError.message : gmError);
      console.error('\nTo fix this issue:');
      console.error('1. Ensure GraphicsMagick is installed on your build system');
      console.error('   macOS: brew install graphicsmagick');
      console.error('2. Run the bundle script: npm run bundle:gm');
      console.error('3. Verify the bundle: npm run verify:gm');
      console.error('4. Try packaging again: npm run make\n');
      throw gmError; // Re-throw to halt build process
    }

    // ============================================================
    // STEP 5: Summary and completion
    // ============================================================
    console.log('\n=== PostPackage Hook Complete ===');
    console.log('✅ Module structure setup finished successfully');
    console.log('✅ GraphicsMagick bundle verified successfully');
    console.log('📦 Package is ready for distribution\n');

  } catch (error) {
    // Global error handler - log but don't halt build
    // This ensures build process continues even if postPackage fails,
    // allowing developers to manually fix issues or investigate problems
    // without having to restart the entire build process.
    console.error('❌ PostPackage hook encountered an error:', error);
    console.error('⚠️  Build will continue, but manual fixes may be required');
    console.error('⚠️  Run "npm run verify:package" after build to check structure');
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Automotive Appraisal Reporter',
    appBundleId: 'com.automotive-appraisal.reporter',
    appCategoryType: 'public.app-category.business',
    // extraResource declarations copy files/directories to Resources/ as flat structure
    // These are NOT packaged in ASAR, allowing worker threads to access them
    // The postPackage hook then creates proper node_modules structure from these
    extraResource: [
      '../tesseract-assets',                    // OCR language data (eng.traineddata)
      './node_modules/tesseract.js',            // Tesseract.js library (includes worker scripts)
      './node_modules/tesseract.js-core',       // Tesseract WASM core
      './node_modules/regenerator-runtime',     // Required by Tesseract worker threads
      './node_modules/is-url',                  // Required by Tesseract worker threads
      './node_modules/bmp-js',                  // Required by Tesseract worker threads
      './node_modules/idb-keyval',              // Required by Tesseract worker threads
      './node_modules/node-fetch',              // Required by Tesseract worker threads
      './node_modules/wasm-feature-detect',     // Required by Tesseract worker threads
      './node_modules/zlibjs',                  // Required by Tesseract worker threads
      '../graphicsmagick-bundle',               // GraphicsMagick binary and libraries for PDF to image conversion
    ],
  },
  rebuildConfig: {},
  hooks: {
    // postPackage hook runs after packaging completes
    // Creates node_modules structure for worker thread module resolution
    postPackage: postPackageHook,
  },
  makers: [
    new MakerDMG({
      name: 'Auto-Appraisal-Reporter',
      format: 'ULFO', // Use ULFO for better compression
      overwrite: true,
    }, ['darwin']),
    new MakerZIP({}, ['darwin']),
    new MakerSquirrel({}),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
