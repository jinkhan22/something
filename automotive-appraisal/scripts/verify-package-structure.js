#!/usr/bin/env node

/**
 * Package Structure Verification Script
 * 
 * Verifies that the packaged Electron app has the correct directory structure
 * for Tesseract.js worker threads to resolve dependencies.
 * 
 * Usage: node scripts/verify-package-structure.js <path-to-app>
 * Example: node scripts/verify-package-structure.js out/Automotive\ Appraisal\ Reporter-darwin-arm64/Automotive\ Appraisal\ Reporter.app
 */

const fs = require('fs');
const path = require('path');

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
    console.log(`\nUsage: node scripts/verify-package-structure.js <path-to-app>`);
    console.log(`Example: node scripts/verify-package-structure.js "out/Automotive Appraisal Reporter-darwin-arm64/Automotive Appraisal Reporter.app"`);
    process.exit(1);
  }
  
  return args[0];
}

/**
 * Check if a path exists and return verification result
 * @param {string} checkPath - Path to check
 * @param {string} name - Name of the check
 * @param {string} [type] - Expected type: 'file', 'directory', 'symlink', or undefined for any
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
    
    if (type === 'symlink' && !stats.isSymbolicLink()) {
      check.message = 'Exists but is not a symlink (may be a directory copy)';
      // This is acceptable - we allow either symlink or directory
      check.passed = true;
      return check;
    }
    
    // If we get here, the path exists and matches the expected type (or no type specified)
    check.passed = true;
    
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(checkPath);
      check.message = `Symlink → ${target}`;
    } else if (stats.isDirectory()) {
      check.message = 'Directory';
    } else if (stats.isFile()) {
      check.message = 'File';
    }
    
  } catch (error) {
    check.message = `Error: ${error.message}`;
  }
  
  return check;
}

/**
 * Verify the package structure
 * @param {string} appPath - Path to the app bundle
 * @returns {VerificationResult}
 */
function verifyPackageStructure(appPath) {
  console.log(`${colors.blue}${colors.bold}Verifying package structure...${colors.reset}\n`);
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
  
  const checks = [];
  
  // Check 1: Resources/node_modules directory exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules'),
    'Resources/node_modules directory',
    'directory'
  ));
  
  // Check 2: Resources/node_modules/tesseract.js exists (symlink or directory)
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'tesseract.js'),
    'Resources/node_modules/tesseract.js',
    undefined // Accept either symlink or directory
  ));
  
  // Check 3: Resources/node_modules/tesseract.js-core exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'tesseract.js-core'),
    'Resources/node_modules/tesseract.js-core',
    undefined
  ));
  
  // Check 4: Resources/node_modules/regenerator-runtime exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'regenerator-runtime'),
    'Resources/node_modules/regenerator-runtime',
    undefined
  ));
  
  // Check 5: Resources/node_modules/is-url exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'is-url'),
    'Resources/node_modules/is-url',
    undefined
  ));
  
  // Check 6: Resources/node_modules/bmp-js exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'bmp-js'),
    'Resources/node_modules/bmp-js',
    undefined
  ));
  
  // Check 7: Resources/node_modules/idb-keyval exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'idb-keyval'),
    'Resources/node_modules/idb-keyval',
    undefined
  ));
  
  // Check 8: Resources/node_modules/node-fetch exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'node-fetch'),
    'Resources/node_modules/node-fetch',
    undefined
  ));
  
  // Check 9: Resources/node_modules/wasm-feature-detect exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'wasm-feature-detect'),
    'Resources/node_modules/wasm-feature-detect',
    undefined
  ));
  
  // Check 10: Resources/node_modules/zlibjs exists
  checks.push(checkPath(
    path.join(resourcesPath, 'node_modules', 'zlibjs'),
    'Resources/node_modules/zlibjs',
    undefined
  ));
  
  // Check 11: Resources/tesseract.js/node_modules/regenerator-runtime exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'regenerator-runtime'),
    'Resources/tesseract.js/node_modules/regenerator-runtime',
    'directory'
  ));
  
  // Check 12: Resources/tesseract.js/node_modules/is-url exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'is-url'),
    'Resources/tesseract.js/node_modules/is-url',
    'directory'
  ));
  
  // Check 13: Resources/tesseract.js/node_modules/bmp-js exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'bmp-js'),
    'Resources/tesseract.js/node_modules/bmp-js',
    'directory'
  ));
  
  // Check 14: Resources/tesseract.js/node_modules/idb-keyval exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'idb-keyval'),
    'Resources/tesseract.js/node_modules/idb-keyval',
    'directory'
  ));
  
  // Check 15: Resources/tesseract.js/node_modules/node-fetch exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'node-fetch'),
    'Resources/tesseract.js/node_modules/node-fetch',
    'directory'
  ));
  
  // Check 16: Resources/tesseract.js/node_modules/wasm-feature-detect exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'wasm-feature-detect'),
    'Resources/tesseract.js/node_modules/wasm-feature-detect',
    'directory'
  ));
  
  // Check 17: Resources/tesseract.js/node_modules/zlibjs exists as directory
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract.js', 'node_modules', 'zlibjs'),
    'Resources/tesseract.js/node_modules/zlibjs',
    'directory'
  ));
  
  // Check 18: Resources/tesseract-assets/eng.traineddata exists
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract-assets', 'eng.traineddata'),
    'Resources/tesseract-assets/eng.traineddata',
    'file'
  ));
  
  // Check 19: Resources/tesseract-assets/eng.traineddata.gz exists
  checks.push(checkPath(
    path.join(resourcesPath, 'tesseract-assets', 'eng.traineddata.gz'),
    'Resources/tesseract-assets/eng.traineddata.gz',
    'file'
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
    console.log(`${colors.green}${colors.bold}✅ All checks passed! Package structure is correct.${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some checks failed. Package structure needs correction.${colors.reset}`);
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
    
    const result = verifyPackageStructure(appPath);
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
