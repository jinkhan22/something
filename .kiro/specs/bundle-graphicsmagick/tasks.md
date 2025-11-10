# Implementation Plan

- [x] 1. Complete bundle creation script
  - Implement script to detect system architecture (Intel vs Apple Silicon)
  - Add logic to locate GraphicsMagick binary on build system
  - Implement dependency extraction using `otool -L`
  - Add code to copy binary and libraries to bundle structure
  - Implement library path rewriting using `install_name_tool` for @rpath references
  - Add bundle validation to verify all required files are present
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2, 4.4_

- [x] 2. Update Electron Forge configuration
  - Add graphicsmagick-bundle to extraResource array in forge.config.ts
  - _Requirements: 1.1, 4.1_

- [x] 3. Enhance postPackage hook
  - Add GraphicsMagick bundle verification to postPackage hook
  - Implement executable permission setting for gm binary
  - Add library existence validation for all required dylibs
  - Implement error reporting for missing bundle components
  - _Requirements: 1.3, 3.3, 4.3, 4.4_

- [x] 4. Create GraphicsMagick service
- [x] 4.1 Implement GraphicsMagickService class with configuration management
  - Create new file src/main/services/graphicsMagickService.ts
  - Implement getConfig() method to detect production vs development mode
  - Implement getGraphicsMagickPath() to return correct binary path
  - Implement getLibraryPath() to return library directory path
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4.2 Implement verification and execution methods
  - Implement verifyGraphicsMagick() to check binary and library existence
  - Add execution test in verifyGraphicsMagick() to ensure binary works
  - Implement execute() method with proper environment variable setup (DYLD_LIBRARY_PATH)
  - Add comprehensive error messages for different failure scenarios
  - _Requirements: 3.2, 5.4, 8.1, 8.2, 8.3, 8.4_

- [x] 5. Integrate GraphicsMagick service into OCR extractor
  - Import GraphicsMagickService in ocrExtractorProcess.ts
  - Add GraphicsMagick verification call before PDF processing
  - Update pdf2pic configuration to use bundled GraphicsMagick path
  - Implement fallback mechanism to try system GraphicsMagick if bundled fails
  - Update error messages to use GraphicsMagickService error handling
  - _Requirements: 1.4, 5.2, 5.3, 6.1, 6.2, 6.3, 8.3_

- [x] 6. Create verification script
  - Create scripts/verify-graphicsmagick-bundle.js
  - Implement binary existence check
  - Implement executable permission verification
  - Add library existence checks for all required dylibs
  - Implement dependency analysis using otool -L
  - Add @rpath reference verification
  - _Requirements: 4.3, 4.4_

- [x] 7. Add package.json scripts
  - Add "bundle:gm" script to run bundle-graphicsmagick.sh
  - Add "verify:gm" script to run verification script
  - Update "prepackage" script to include GraphicsMagick bundling
  - _Requirements: 4.1, 4.2_

- [ ]* 8. Write unit tests for GraphicsMagickService
  - Write tests for getConfig() in both production and development modes
  - Write tests for getGraphicsMagickPath() path resolution
  - Write tests for verifyGraphicsMagick() success and failure cases
  - Write tests for execute() method with environment variables
  - Mock file system and child_process for isolated testing
  - _Requirements: 1.3, 5.1, 5.2, 5.3, 5.4_

- [ ]* 9. Write integration tests
  - Write test for bundle script creating correct directory structure
  - Write test for postPackage hook verification
  - Write test for OCR extractor using bundled GraphicsMagick
  - Write test for fallback mechanism when bundled binary fails
  - _Requirements: 1.4, 4.1, 4.2, 6.1, 6.2_

- [x] 10. Update documentation
  - Update README.md with GraphicsMagick bundling information
  - Add build requirements section documenting need for GraphicsMagick on build system
  - Create troubleshooting section for GraphicsMagick issues
  - Document architecture support (Intel and Apple Silicon)
  - Add developer notes for updating GraphicsMagick version
  - _Requirements: 2.1, 2.2, 5.4, 8.3_

- [x] 11. Fix runtime library path resolution for packaged app
  - Investigate why @rpath resolution fails in packaged app when pdf2pic spawns gm process
  - Update bundle-graphicsmagick.sh script to set install_name for gm binary to use @executable_path/../lib
  - Modify GraphicsMagickService to ensure DYLD_LIBRARY_PATH is properly inherited by child processes
  - Test that pdf2pic can successfully convert PDFs using bundled GraphicsMagick in packaged app
  - Add diagnostic logging to help troubleshoot library loading issues
  - _Requirements: 1.3, 1.4, 3.2, 5.3, 6.1_
