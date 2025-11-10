 # Implementation Plan

- [x] 1. Enhance GraphicsMagick wrapper script
  - Update scripts/bundle-graphicsmagick.sh to create improved gm wrapper script
  - Add DYLD_LIBRARY_PATH environment variable setup in wrapper
  - Add DYLD_FALLBACK_LIBRARY_PATH environment variable setup in wrapper
  - Add PATH setup to include bin directory for Ghostscript access
  - Rename actual gm binary to gm-real and make wrapper call it
  - Set executable permissions on wrapper script
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Create Ghostscript wrapper script
  - Add Ghostscript wrapper creation to bundle-graphicsmagick.sh
  - Rename actual gs binary to gs-real
  - Create gs wrapper script that sets DYLD_LIBRARY_PATH and DYLD_FALLBACK_LIBRARY_PATH
  - Make gs wrapper call gs-real with all arguments passed through
  - Set executable permissions on gs wrapper
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 3. Improve library path resolution in bundle script
  - Update install_name_tool commands to use @executable_path/../lib for gm-real binary
  - Update install_name_tool commands to use @executable_path/../lib for gs-real binary
  - Verify @rpath references resolve correctly to bundled lib directory
  - Add validation that all library paths are correctly rewritten
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Create GraphicsMagickSpawner service
- [x] 4.1 Implement core spawner functionality
  - Create new file src/main/services/graphicsMagickSpawner.ts
  - Implement getEnvironment() method to set DYLD_LIBRARY_PATH, DYLD_FALLBACK_LIBRARY_PATH, and PATH
  - Implement spawn() method that spawns gm with proper environment variables
  - Add stdout and stderr capture in spawn() method
  - Add timeout handling in spawn() method
  - Add error handling for spawn failures
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 4.2 Implement PDF conversion method
  - Implement convertPdfPageToPng() method in GraphicsMagickSpawner
  - Build GraphicsMagick convert command with density, resize, and page selection arguments
  - Call spawn() method with conversion arguments
  - Verify output PNG file was created after conversion
  - Add error handling for conversion failures with detailed error messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 4.3 Implement test and diagnostic methods
  - Implement test() method to verify GraphicsMagick can execute
  - Add comprehensive logging of environment variables in getEnvironment()
  - Add command logging before spawning processes
  - Add stderr logging during process execution
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3_

- [x] 5. Update OCR extractor to use GraphicsMagickSpawner
  - Import GraphicsMagickSpawner in ocrExtractorProcess.ts
  - Replace pdf2pic converter initialization with GraphicsMagickSpawner setup
  - Replace pdf2pic page conversion calls with GraphicsMagickSpawner.convertPdfPageToPng()
  - Update error handling to detect and explain EPIPE errors specifically
  - Add diagnostic logging for GraphicsMagick execution
  - Remove pdf2pic dependency from the conversion flow (keep as fallback)
  - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

- [x] 6. Enhance error messages for EPIPE errors
  - Add EPIPE error detection in OCR extractor error handling
  - Create detailed error message explaining library loading issues
  - Add troubleshooting steps to EPIPE error message
  - Add suggestion to check Console.app for dyld errors
  - Log full environment variables when EPIPE occurs
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3_

- [x] 7. Update fallback mechanism
  - Enhance system GraphicsMagick fallback to use GraphicsMagickSpawner
  - Add logging when fallback mode is activated
  - Ensure fallback uses system libraries correctly
  - Test that fallback works when bundled GraphicsMagick fails
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Update verification script
  - Add wrapper script execution test to scripts/verify-graphicsmagick-bundle.js
  - Add library loading verification using otool -L on gm-real
  - Add test that wrapper sets environment variables correctly
  - Add validation that @executable_path references resolve correctly
  - Add Ghostscript wrapper verification
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Update postPackage hook in forge.config.ts
  - Add verification that gm wrapper script exists and is executable
  - Add verification that gs wrapper script exists and is executable
  - Add check that gm-real and gs-real binaries exist
  - Update library verification to check for wrapper scripts
  - Add logging of wrapper script permissions
  - _Requirements: 8.1, 8.2_

- [x] 10. Test on packaged application
  - Build and package the application with npm run make
  - Install packaged app on clean system without GraphicsMagick
  - Upload a test PDF and verify conversion works without EPIPE error
  - Check Console.app for any dyld library loading errors
  - Verify all PDF pages convert successfully
  - Test with multi-page PDFs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3_

- [x] 11. Write unit tests for GraphicsMagickSpawner
  - Write tests for getEnvironment() returning correct environment variables
  - Write tests for spawn() executing commands successfully
  - Write tests for spawn() handling timeouts
  - Write tests for spawn() capturing stdout and stderr
  - Write tests for convertPdfPageToPng() creating output files
  - Write tests for test() method verification
  - Mock child_process spawn for isolated testing
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4_

- [x] 12. Write integration tests
  - Write test for wrapper script setting environment variables
  - Write test for PDF conversion using GraphicsMagickSpawner
  - Write test for fallback mechanism when bundled GraphicsMagick fails
  - Write test for error handling when both bundled and system fail
  - Write test for Ghostscript integration
  - _Requirements: 1.4, 7.1, 7.2, 9.1, 9.2, 9.3_

- [x] 13. Update documentation
  - Update README.md with information about EPIPE error fix
  - Document the wrapper script approach
  - Add troubleshooting section for library loading issues
  - Document how to check Console.app for dyld errors
  - Add notes about testing on clean systems
  - _Requirements: 6.4, 8.4_

- [x] 14. Test cross-architecture compatibility
  - Test packaged app on Intel Mac
  - Test packaged app on Apple Silicon Mac
  - Verify wrapper scripts work on both architectures
  - Verify library loading works on both architectures
  - Test PDF conversion on both architectures
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
