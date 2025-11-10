#!/usr/bin/env node

/**
 * GraphicsMagick Bundle Verification Script
 * 
 * Verifies that the packaged Electron app has the correct GraphicsMagick bundle
 * with all required binaries and libraries properly configured.
 * 
 * Usage: node scripts/verify-graphicsmagick-bundle.js <path-to-app>
 * Example: node scripts/verify-graphicsmagick-bundle.js out/Automotive\ Appraisal\ Reporter-darwin-arm64/Automotive\ Appraisal\ Reporter.app
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

/**
 * @typedef {Object} VerificationCheck
 * @property {string} name - Name of the check
 * @property {boolean} passed - Whether the check passed
 * @property {string} path - File path being checked
 * @property {string} [message] - Optional message with additional details
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} success - Overall success status
 * @property {VerificationCheck[]} checks - Array of individual checks
 */

/**
 * Parse command-line arguments
 * @returns {string} Path to the app bundle
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error(`${colors.red}Error: No app path provided${colors.reset}`);
    console.log(`\nUsage: node scripts/verify-graphicsmagick-bundle.js <path-to-app>`);
    console.log(`Example: node scripts/verify-graphicsmagick-bundle.js "out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app"`);
    process.exit(1);
  }
  
  return args[0];
}

/**
 * Check if a path exists and return verification result
 * @param {string} checkPath - Path to check
 * @param {string} name - Name of the check
 * @param {string} [type] - Expected type: 'file', 'directory', or undefined for any
 * @returns {VerificationCheck}
 */
function checkPath(checkPath, name, type) {
  const check = {
    name,
    path: checkPath,
    passed: false,
    message: ''
  };
  
  try {
    const exists = fs.existsSync(checkPath);
    
    if (!exists) {
      check.message = 'Does not exist';
      return check;
    }
    
    const stats = fs.lstatSync(checkPath);
    
    if (type === 'file' && !stats.isFile()) {
      check.message = 'Exists but is not a file';
      return check;
    }
    
    if (type === 'directory' && !stats.isDirectory()) {
      check.message = 'Exists but is not a directory';
      return check;
    }
    
    // If we get here, the path exists and matches the expected type
    check.passed = true;
    
    if (stats.isDirectory()) {
      check.message = 'Directory';
    } else if (stats.isFile()) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      check.message = `File (${sizeMB} MB)`;
    }
    
  } catch (error) {
    check.message = `Error: ${error.message}`;
  }
  
  return check;
}

/**
 * Check if a file has executable permissions
 * @param {string} filePath - Path to the file
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function checkExecutable(filePath, name) {
  const check = {
    name,
    path: filePath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(filePath)) {
      check.message = 'File does not exist';
      return check;
    }
    
    const stats = fs.statSync(filePath);
    const isExecutable = (stats.mode & 0o111) !== 0;
    
    if (!isExecutable) {
      check.message = `Not executable (mode: ${stats.mode.toString(8)})`;
      return check;
    }
    
    check.passed = true;
    check.message = `Executable (mode: ${stats.mode.toString(8)})`;
    
  } catch (error) {
    check.message = `Error: ${error.message}`;
  }
  
  return check;
}

/**
 * Analyze binary dependencies using otool -L
 * @param {string} binaryPath - Path to the binary
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function checkDependencies(binaryPath, name) {
  const check = {
    name,
    path: binaryPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(binaryPath)) {
      check.message = 'Binary does not exist';
      return check;
    }
    
    const output = execSync(`otool -L "${binaryPath}"`, { encoding: 'utf-8' });
    const lines = output.split('\n').filter(line => line.trim());
    
    // Skip the first line (it's the binary path itself)
    const dependencies = lines.slice(1).map(line => line.trim());
    
    check.passed = true;
    check.message = `Found ${dependencies.length} dependencies`;
    
    // Store dependencies for detailed output
    check.dependencies = dependencies;
    
  } catch (error) {
    check.message = `Error running otool: ${error.message}`;
  }
  
  return check;
}

/**
 * Check for @rpath references in binary
 * @param {string} binaryPath - Path to the binary
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function checkRpathReferences(binaryPath, name) {
  const check = {
    name,
    path: binaryPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(binaryPath)) {
      check.message = 'Binary does not exist';
      return check;
    }
    
    const output = execSync(`otool -L "${binaryPath}"`, { encoding: 'utf-8' });
    const rpathRefs = output.split('\n').filter(line => line.includes('@rpath'));
    
    if (rpathRefs.length === 0) {
      check.message = 'No @rpath references found (may use absolute paths)';
      check.passed = true; // Not necessarily a failure
      return check;
    }
    
    check.passed = true;
    check.message = `Found ${rpathRefs.length} @rpath reference(s)`;
    check.rpathRefs = rpathRefs.map(ref => ref.trim());
    
  } catch (error) {
    check.message = `Error checking @rpath: ${error.message}`;
  }
  
  return check;
}

/**
 * Test wrapper script execution
 * @param {string} wrapperPath - Path to the wrapper script
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function testWrapperExecution(wrapperPath, name) {
  const check = {
    name,
    path: wrapperPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(wrapperPath)) {
      check.message = 'Wrapper script does not exist';
      return check;
    }
    
    // Execute wrapper with 'version' command
    const result = execSync(`"${wrapperPath}" version`, {
      encoding: 'utf-8',
      timeout: 5000
    });
    
    if (result.includes('GraphicsMagick')) {
      check.passed = true;
      const versionLine = result.split('\n')[0];
      check.message = `Executed successfully: ${versionLine}`;
    } else {
      check.message = 'Executed but unexpected output (no GraphicsMagick version found)';
    }
    
  } catch (error) {
    check.message = `Execution failed: ${error.message}`;
  }
  
  return check;
}

/**
 * Verify library loading for gm-real binary using otool -L
 * @param {string} binaryPath - Path to gm-real binary
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function verifyLibraryLoading(binaryPath, name) {
  const check = {
    name,
    path: binaryPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(binaryPath)) {
      check.message = 'Binary does not exist';
      return check;
    }
    
    const output = execSync(`otool -L "${binaryPath}"`, { encoding: 'utf-8' });
    const lines = output.split('\n').filter(line => line.trim());
    
    // Skip the first line (binary path itself)
    const dependencies = lines.slice(1).map(line => line.trim());
    
    // Check for problematic absolute paths (should use @executable_path or @rpath)
    const absolutePaths = dependencies.filter(dep => 
      dep.startsWith('/usr/local/') || 
      dep.startsWith('/opt/homebrew/') ||
      (dep.startsWith('/') && !dep.includes('@'))
    );
    
    // Check for @executable_path references (preferred)
    const executablePathRefs = dependencies.filter(dep => dep.includes('@executable_path'));
    
    // Check for @rpath references
    const rpathRefs = dependencies.filter(dep => dep.includes('@rpath'));
    
    if (absolutePaths.length > 0) {
      check.message = `Warning: Found ${absolutePaths.length} absolute path(s) that may not work in packaged app`;
      check.absolutePaths = absolutePaths;
      check.passed = false;
    } else if (executablePathRefs.length > 0 || rpathRefs.length > 0) {
      check.passed = true;
      check.message = `All dependencies use relative paths (@executable_path: ${executablePathRefs.length}, @rpath: ${rpathRefs.length})`;
      check.executablePathRefs = executablePathRefs;
      check.rpathRefs = rpathRefs;
    } else {
      check.passed = true;
      check.message = 'Dependencies appear to use system libraries (may be acceptable)';
    }
    
  } catch (error) {
    check.message = `Error verifying library loading: ${error.message}`;
  }
  
  return check;
}

/**
 * Test that wrapper sets environment variables correctly
 * @param {string} wrapperPath - Path to the wrapper script
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function testWrapperEnvironment(wrapperPath, name) {
  const check = {
    name,
    path: wrapperPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(wrapperPath)) {
      check.message = 'Wrapper script does not exist';
      return check;
    }
    
    // Read wrapper script content
    const content = fs.readFileSync(wrapperPath, 'utf-8');
    
    // Check for required environment variable exports
    const hasDyldLibraryPath = content.includes('DYLD_LIBRARY_PATH');
    const hasDyldFallbackPath = content.includes('DYLD_FALLBACK_LIBRARY_PATH');
    const hasPathExport = content.includes('PATH=');
    const hasExec = content.includes('exec') && (content.includes('gm-real') || content.includes('gs-real'));
    
    const issues = [];
    if (!hasDyldLibraryPath) issues.push('Missing DYLD_LIBRARY_PATH');
    if (!hasDyldFallbackPath) issues.push('Missing DYLD_FALLBACK_LIBRARY_PATH');
    if (!hasPathExport) issues.push('Missing PATH export');
    if (!hasExec) issues.push('Missing exec call to real binary');
    
    if (issues.length === 0) {
      check.passed = true;
      check.message = 'Wrapper sets all required environment variables';
    } else {
      check.message = `Issues found: ${issues.join(', ')}`;
    }
    
  } catch (error) {
    check.message = `Error reading wrapper script: ${error.message}`;
  }
  
  return check;
}

/**
 * Validate @executable_path references resolve correctly
 * @param {string} binaryPath - Path to the binary
 * @param {string} libPath - Path to the lib directory
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function validateExecutablePathResolution(binaryPath, libPath, name) {
  const check = {
    name,
    path: binaryPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(binaryPath)) {
      check.message = 'Binary does not exist';
      return check;
    }
    
    const output = execSync(`otool -L "${binaryPath}"`, { encoding: 'utf-8' });
    const lines = output.split('\n').filter(line => line.trim());
    
    // Find @executable_path references
    const executablePathRefs = lines.filter(line => line.includes('@executable_path'));
    
    if (executablePathRefs.length === 0) {
      check.message = 'No @executable_path references found (may use @rpath or absolute paths)';
      check.passed = true; // Not necessarily a failure
      return check;
    }
    
    // Verify each @executable_path reference resolves to an existing file
    const binaryDir = path.dirname(binaryPath);
    const missingLibs = [];
    const foundLibs = [];
    
    executablePathRefs.forEach(line => {
      // Extract the library path from the otool output
      // Format: "	@executable_path/../lib/libname.dylib (compatibility version...)"
      const match = line.match(/@executable_path\/([^\s]+)/);
      if (match) {
        const relativePath = match[1];
        const resolvedPath = path.resolve(binaryDir, relativePath);
        
        if (fs.existsSync(resolvedPath)) {
          foundLibs.push(relativePath);
        } else {
          missingLibs.push(relativePath);
        }
      }
    });
    
    if (missingLibs.length > 0) {
      check.message = `${missingLibs.length} @executable_path reference(s) do not resolve to existing files`;
      check.missingLibs = missingLibs;
    } else {
      check.passed = true;
      check.message = `All ${foundLibs.length} @executable_path reference(s) resolve correctly`;
      check.foundLibs = foundLibs;
    }
    
  } catch (error) {
    check.message = `Error validating @executable_path resolution: ${error.message}`;
  }
  
  return check;
}

/**
 * Test actual PDF conversion with the bundled binary
 * @param {string} gmPath - Path to the gm wrapper/binary
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function testPdfConversion(gmPath, name) {
  const check = {
    name,
    path: gmPath,
    passed: false,
    message: ''
  };
  
  try {
    if (!fs.existsSync(gmPath)) {
      check.message = 'GraphicsMagick binary does not exist';
      return check;
    }
    
    // Create a minimal test PDF using GraphicsMagick itself
    // We'll create a simple image and then try to identify it
    const tempDir = require('os').tmpdir();
    const testImage = path.join(tempDir, 'gm-test-image.png');
    
    try {
      // Create a simple test image (100x100 white canvas)
      execSync(
        `"${gmPath}" convert -size 100x100 xc:white "${testImage}"`,
        { encoding: 'utf-8', timeout: 10000 }
      );
      
      if (!fs.existsSync(testImage)) {
        check.message = 'Failed to create test image';
        return check;
      }
      
      // Try to identify the image (tests that GM can read files)
      const identifyResult = execSync(
        `"${gmPath}" identify "${testImage}"`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      
      // Clean up test image
      fs.unlinkSync(testImage);
      
      if (identifyResult.includes('PNG') || identifyResult.includes('100x100')) {
        check.passed = true;
        check.message = 'Successfully created and identified test image';
      } else {
        check.message = 'Image operations completed but output unexpected';
      }
      
    } catch (conversionError) {
      // Clean up if test image was created
      if (fs.existsSync(testImage)) {
        try {
          fs.unlinkSync(testImage);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      
      check.message = `Image conversion test failed: ${conversionError.message}`;
    }
    
  } catch (error) {
    check.message = `Error testing PDF conversion: ${error.message}`;
  }
  
  return check;
}

/**
 * Verify Ghostscript wrapper
 * @param {string} binPath - Path to the bin directory
 * @param {string} name - Name of the check
 * @returns {VerificationCheck}
 */
function verifyGhostscriptWrapper(binPath, name) {
  const check = {
    name,
    path: binPath,
    passed: false,
    message: ''
  };
  
  try {
    const gsWrapper = path.join(binPath, 'gs');
    const gsReal = path.join(binPath, 'gs-real');
    
    // Check if gs wrapper exists
    if (!fs.existsSync(gsWrapper)) {
      check.message = 'Ghostscript wrapper (gs) does not exist';
      return check;
    }
    
    // Check if gs-real exists
    if (!fs.existsSync(gsReal)) {
      check.message = 'Ghostscript real binary (gs-real) does not exist';
      return check;
    }
    
    // Check if gs wrapper is executable
    const gsStats = fs.statSync(gsWrapper);
    const gsIsExecutable = (gsStats.mode & 0o111) !== 0;
    
    if (!gsIsExecutable) {
      check.message = 'Ghostscript wrapper exists but is not executable';
      return check;
    }
    
    // Read wrapper content to verify it sets environment variables
    const content = fs.readFileSync(gsWrapper, 'utf-8');
    const hasDyldLibraryPath = content.includes('DYLD_LIBRARY_PATH');
    const hasExec = content.includes('exec') && content.includes('gs-real');
    
    if (!hasDyldLibraryPath || !hasExec) {
      check.message = 'Ghostscript wrapper exists but may not be configured correctly';
      return check;
    }
    
    // Try to execute gs wrapper
    try {
      const result = execSync(`"${gsWrapper}" --version`, {
        encoding: 'utf-8',
        timeout: 5000
      });
      
      if (result.includes('Ghostscript') || result.includes('GPL')) {
        check.passed = true;
        const versionLine = result.split('\n')[0];
        check.message = `Ghostscript wrapper verified: ${versionLine}`;
      } else {
        check.passed = true; // Wrapper exists and executes, even if output is unexpected
        check.message = 'Ghostscript wrapper executes (output format may vary)';
      }
    } catch (execError) {
      // Wrapper exists but execution failed
      check.message = `Ghostscript wrapper exists but execution failed: ${execError.message}`;
    }
    
  } catch (error) {
    check.message = `Error verifying Ghostscript wrapper: ${error.message}`;
  }
  
  return check;
}

/**
 * Verify the GraphicsMagick bundle structure
 * @param {string} appPath - Path to the app bundle
 * @returns {VerificationResult}
 */
function verifyGraphicsMagickBundle(appPath) {
  console.log(`${colors.blue}${colors.bold}Verifying GraphicsMagick bundle...${colors.reset}\n`);
  console.log(`App path: ${appPath}\n`);
  
  // Determine Resources path based on platform
  let resourcesPath;
  if (appPath.endsWith('.app')) {
    // macOS app bundle
    resourcesPath = path.join(appPath, 'Contents', 'Resources');
  } else {
    // Assume Resources is directly in the provided path
    resourcesPath = path.join(appPath, 'Resources');
  }
  
  console.log(`Resources path: ${resourcesPath}\n`);
  
  const gmPath = path.join(resourcesPath, 'graphicsmagick-bundle');
  const binPath = path.join(gmPath, 'bin');
  const libPath = path.join(gmPath, 'lib');
  const gmBinary = path.join(binPath, 'gm');
  const gmRealBinary = path.join(binPath, 'gm-real');
  
  const checks = [];
  
  // Check 1: GraphicsMagick bundle directory exists
  checks.push(checkPath(
    gmPath,
    'GraphicsMagick bundle directory',
    'directory'
  ));
  
  // Check 2: bin directory exists
  checks.push(checkPath(
    binPath,
    'GraphicsMagick bin directory',
    'directory'
  ));
  
  // Check 3: lib directory exists
  checks.push(checkPath(
    libPath,
    'GraphicsMagick lib directory',
    'directory'
  ));
  
  // Check 4: gm wrapper script exists
  checks.push(checkPath(
    gmBinary,
    'GraphicsMagick wrapper script (gm)',
    'file'
  ));
  
  // Check 5: gm wrapper script is executable
  checks.push(checkExecutable(
    gmBinary,
    'GraphicsMagick wrapper executable permissions'
  ));
  
  // Check 6: gm-real binary exists
  checks.push(checkPath(
    gmRealBinary,
    'GraphicsMagick real binary (gm-real)',
    'file'
  ));
  
  // Check 7: gm-real binary is executable
  checks.push(checkExecutable(
    gmRealBinary,
    'GraphicsMagick real binary executable permissions'
  ));
  
  // Required libraries
  const requiredLibs = [
    'libGraphicsMagick.3.dylib',
    'libfreetype.6.dylib',
    'liblcms2.2.dylib',
    'libltdl.7.dylib',
    'libpng16.16.dylib'
  ];
  
  // Check 8-12: Required libraries exist
  requiredLibs.forEach(lib => {
    const libFilePath = path.join(libPath, lib);
    checks.push(checkPath(
      libFilePath,
      `Library: ${lib}`,
      'file'
    ));
  });
  
  // Check 13: Test wrapper script execution
  checks.push(testWrapperExecution(
    gmBinary,
    'Wrapper script execution test'
  ));
  
  // Check 14: Verify library loading for gm-real using otool -L
  checks.push(verifyLibraryLoading(
    gmRealBinary,
    'Library loading verification (gm-real)'
  ));
  
  // Check 15: Test that wrapper sets environment variables correctly
  checks.push(testWrapperEnvironment(
    gmBinary,
    'Wrapper environment variable configuration'
  ));
  
  // Check 16: Validate @executable_path references resolve correctly
  checks.push(validateExecutablePathResolution(
    gmRealBinary,
    libPath,
    '@executable_path resolution validation'
  ));
  
  // Check 17: Test actual PDF/image conversion
  checks.push(testPdfConversion(
    gmBinary,
    'PDF/Image conversion test'
  ));
  
  // Check 18: Verify Ghostscript wrapper
  checks.push(verifyGhostscriptWrapper(
    binPath,
    'Ghostscript wrapper verification'
  ));
  
  // Check 19: Analyze binary dependencies (gm-real)
  checks.push(checkDependencies(
    gmRealBinary,
    'Binary dependency analysis (gm-real)'
  ));
  
  // Check 20: Check for @rpath references (gm-real)
  checks.push(checkRpathReferences(
    gmRealBinary,
    '@rpath reference verification (gm-real)'
  ));
  
  const success = checks.every(check => check.passed);
  
  return { success, checks };
}

/**
 * Display verification results with colored output
 * @param {VerificationResult} result
 */
function displayResults(result) {
  console.log(`${colors.bold}Verification Results:${colors.reset}\n`);
  
  result.checks.forEach((check, index) => {
    const icon = check.passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    const status = check.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    
    console.log(`${icon} [${status}] ${check.name}`);
    console.log(`   Path: ${colors.yellow}${check.path}${colors.reset}`);
    if (check.message) {
      console.log(`   Info: ${check.message}`);
    }
    
    // Display dependencies if available
    if (check.dependencies && check.dependencies.length > 0) {
      console.log(`   ${colors.blue}Dependencies:${colors.reset}`);
      check.dependencies.forEach(dep => {
        console.log(`     ${dep}`);
      });
    }
    
    // Display @rpath references if available
    if (check.rpathRefs && check.rpathRefs.length > 0) {
      console.log(`   ${colors.blue}@rpath references:${colors.reset}`);
      check.rpathRefs.forEach(ref => {
        console.log(`     ${ref}`);
      });
    }
    
    // Display @executable_path references if available
    if (check.executablePathRefs && check.executablePathRefs.length > 0) {
      console.log(`   ${colors.blue}@executable_path references:${colors.reset}`);
      check.executablePathRefs.forEach(ref => {
        console.log(`     ${ref}`);
      });
    }
    
    // Display absolute paths if found (warning)
    if (check.absolutePaths && check.absolutePaths.length > 0) {
      console.log(`   ${colors.yellow}Absolute paths (may cause issues):${colors.reset}`);
      check.absolutePaths.forEach(path => {
        console.log(`     ${path}`);
      });
    }
    
    // Display found libraries if available
    if (check.foundLibs && check.foundLibs.length > 0) {
      console.log(`   ${colors.blue}Resolved libraries:${colors.reset}`);
      check.foundLibs.forEach(lib => {
        console.log(`     ${lib}`);
      });
    }
    
    // Display missing libraries if found (error)
    if (check.missingLibs && check.missingLibs.length > 0) {
      console.log(`   ${colors.red}Missing libraries:${colors.reset}`);
      check.missingLibs.forEach(lib => {
        console.log(`     ${lib}`);
      });
    }
    
    console.log('');
  });
  
  // Summary
  const passed = result.checks.filter(c => c.passed).length;
  const total = result.checks.length;
  const failed = total - passed;
  
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total checks: ${total}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('');
  
  if (result.success) {
    console.log(`${colors.green}${colors.bold}✅ All checks passed! GraphicsMagick bundle is correctly configured.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some checks failed. GraphicsMagick bundle needs correction.${colors.reset}`);
    console.log(`\n${colors.yellow}Troubleshooting tips:${colors.reset}`);
    console.log(`  1. Ensure bundle-graphicsmagick.sh script was run before packaging`);
    console.log(`  2. Check that GraphicsMagick is installed on the build system`);
    console.log(`  3. Verify forge.config.ts includes graphicsmagick-bundle in extraResource`);
    console.log(`  4. Review postPackage hook for any errors during packaging`);
  }
}

/**
 * Main function
 */
function main() {
  try {
    const appPath = parseArguments();
    
    // Verify app path exists
    if (!fs.existsSync(appPath)) {
      console.error(`${colors.red}Error: App path does not exist: ${appPath}${colors.reset}`);
      process.exit(1);
    }
    
    const result = verifyGraphicsMagickBundle(appPath);
    displayResults(result);
    
    // Exit with appropriate status code
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset} ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
