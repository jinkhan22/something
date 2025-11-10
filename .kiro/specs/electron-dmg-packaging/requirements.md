# Requirements Document

## Introduction

This specification addresses the critical issue preventing the Automotive Appraisal Reporter Electron application from functioning correctly when packaged as a DMG for macOS distribution. The core problem involves Tesseract.js worker threads failing to resolve the `regenerator-runtime` module in the packaged application, causing OCR functionality to fail. The goal is to fix the module resolution issues and create a distributable DMG that users can install on any MacBook.

## Glossary

- **Electron App**: The Automotive Appraisal Reporter desktop application built with Electron framework
- **Tesseract.js**: JavaScript OCR library that uses worker threads for text extraction from images
- **Worker Thread**: A separate Node.js process spawned to perform OCR operations
- **ASAR**: Electron's archive format for packaging application files
- **DMG**: macOS disk image file format used for software distribution
- **Resources Path**: The directory in packaged Electron apps containing application resources (`/Applications/[App].app/Contents/Resources`)
- **Module Resolution**: Node.js process of locating and loading required modules
- **Forge**: Electron Forge, the build and packaging toolchain used by the application
- **regenerator-runtime**: JavaScript runtime library required by Tesseract.js worker scripts

## Requirements

### Requirement 1

**User Story:** As a developer, I want the packaged Electron app to correctly resolve all module dependencies for Tesseract.js worker threads, so that OCR functionality works in the distributed application.

#### Acceptance Criteria

1. WHEN the Electron app is packaged as a DMG, THE Electron App SHALL include a proper node_modules directory structure in the Resources path that allows worker threads to resolve dependencies
2. WHEN a worker thread attempts to load regenerator-runtime, THE Electron App SHALL provide the module at a location discoverable by Node.js module resolution
3. WHEN the postPackage hook executes during build, THE Forge build system SHALL create a node_modules directory in the Resources path containing tesseract.js, tesseract.js-core, and regenerator-runtime
4. WHEN the postPackage hook executes, THE Forge build system SHALL copy regenerator-runtime into tesseract.js/node_modules directory to ensure local resolution from worker scripts
5. THE Forge configuration SHALL maintain existing extraResource declarations for tesseract-assets, tesseract.js, tesseract.js-core, and regenerator-runtime

### Requirement 2

**User Story:** As a developer, I want the build process to automatically create the correct directory structure, so that I don't need to manually fix the packaged application after each build.

#### Acceptance Criteria

1. WHEN the package command runs, THE Forge build system SHALL execute a postPackage hook that creates the required directory structure
2. WHEN the postPackage hook creates directories, THE Forge build system SHALL verify the output path exists before attempting file operations
3. WHEN copying modules, THE postPackage hook SHALL check for source file existence before attempting copy operations
4. THE postPackage hook SHALL log success messages for each completed operation to aid debugging
5. IF any file operation fails, THEN THE postPackage hook SHALL log error details without halting the build process

### Requirement 3

**User Story:** As a developer, I want to verify that the packaged application has the correct structure, so that I can confirm the fix is working before distribution.

#### Acceptance Criteria

1. THE packaged application SHALL contain a node_modules directory at Resources/node_modules
2. THE Resources/node_modules directory SHALL contain symlinks or copies of tesseract.js, tesseract.js-core, and regenerator-runtime
3. THE Resources/tesseract.js/node_modules directory SHALL contain a copy of regenerator-runtime
4. WHEN inspecting the packaged app structure, THE developer SHALL be able to verify all required modules are present using standard file system commands
5. THE tesseract-assets directory SHALL remain in Resources with the eng.traineddata file

### Requirement 4

**User Story:** As a developer, I want to test the OCR functionality in the packaged application, so that I can confirm worker threads can successfully load all dependencies.

#### Acceptance Criteria

1. WHEN a user uploads a PDF to the packaged application, THE Electron App SHALL successfully spawn Tesseract worker threads without module resolution errors
2. WHEN OCR processing executes, THE Electron App SHALL extract text from PDF images without throwing "Cannot find module" errors
3. WHEN OCR processing completes, THE Electron App SHALL display extracted data in the user interface
4. THE Electron App SHALL log OCR processing status to the console for debugging purposes
5. IF module resolution fails, THEN THE Electron App SHALL provide clear error messages indicating which module cannot be resolved

### Requirement 5

**User Story:** As a developer, I want to build a DMG installer for macOS, so that users can easily install the application on their MacBooks.

#### Acceptance Criteria

1. WHEN the make command executes, THE Forge build system SHALL generate a DMG file in the out/make directory
2. THE DMG file SHALL contain the Automotive Appraisal Reporter.app bundle with all required resources
3. WHEN a user opens the DMG, THE macOS Finder SHALL display an installer window with the application icon and Applications folder shortcut
4. WHEN a user drags the app to Applications, THE macOS system SHALL copy the complete application bundle
5. THE DMG file SHALL be named with the application name and version number for easy identification

### Requirement 6

**User Story:** As an end user, I want to install the application from the DMG on any MacBook, so that I can use the Automotive Appraisal Reporter without technical issues.

#### Acceptance Criteria

1. WHEN a user downloads the DMG file, THE macOS system SHALL allow the user to open it without security warnings for unsigned applications (with appropriate Gatekeeper bypass instructions)
2. WHEN a user installs the application, THE Electron App SHALL launch successfully from the Applications folder
3. WHEN the application launches, THE Electron App SHALL initialize all services including OCR capabilities without errors
4. WHEN a user uploads a PDF report, THE Electron App SHALL process the document and extract data using OCR
5. THE Electron App SHALL function identically to the development version in terms of features and performance

### Requirement 7

**User Story:** As a developer, I want comprehensive logging during the packaging process, so that I can troubleshoot any issues that arise during builds.

#### Acceptance Criteria

1. WHEN the postPackage hook executes, THE Forge build system SHALL log the Resources path being used
2. WHEN creating directories, THE postPackage hook SHALL log each directory creation operation
3. WHEN copying or symlinking modules, THE postPackage hook SHALL log the source and destination paths
4. WHEN operations complete successfully, THE postPackage hook SHALL log success indicators with checkmark symbols
5. IF any operation fails, THEN THE postPackage hook SHALL log the error message and stack trace

### Requirement 8

**User Story:** As a developer, I want the fix to be maintainable and not require patching third-party code, so that npm install operations don't break the solution.

#### Acceptance Criteria

1. THE solution SHALL NOT modify files within node_modules directories
2. THE solution SHALL NOT require postinstall scripts that patch Tesseract.js source code
3. THE solution SHALL rely only on Forge configuration and build hooks
4. WHEN npm install runs, THE solution SHALL remain functional without requiring additional steps
5. THE solution SHALL be documented in code comments explaining the directory structure requirements
