# Requirements Document

## Introduction

This specification defines the requirements for bundling GraphicsMagick binaries with the Automotive Appraisal Reporter Electron application to eliminate external dependencies and enable the app to work on any macOS system without requiring users to install GraphicsMagick separately.

## Glossary

- **GraphicsMagick (GM)**: An image processing system used to convert PDF pages to PNG images for OCR processing
- **Binary**: An executable file (the `gm` command)
- **Dynamic Library**: A shared library file (.dylib on macOS) that the binary depends on
- **Bundle**: The packaged Electron application (.app directory)
- **extraResource**: Files copied to the app's Resources directory during packaging
- **PATH**: Environment variable that tells the system where to find executable files

## Requirements

### Requirement 1: Bundle GraphicsMagick Binary

**User Story:** As a user, I want the app to work immediately after installation without needing to install additional software, so that I can start processing PDFs right away.

#### Acceptance Criteria

1. WHEN THE app is packaged, THE System SHALL include the GraphicsMagick binary in the app bundle
2. WHEN THE app is packaged, THE System SHALL include all required dynamic libraries that GraphicsMagick depends on
3. WHEN THE app launches, THE System SHALL be able to locate and execute the bundled GraphicsMagick binary
4. WHEN THE app processes a PDF, THE System SHALL use the bundled GraphicsMagick binary instead of searching the system PATH

### Requirement 2: Cross-Architecture Support

**User Story:** As a user with either Intel or Apple Silicon Mac, I want the app to work on my system, so that I don't need to worry about compatibility.

#### Acceptance Criteria

1. WHEN THE app is installed on an Intel Mac, THE System SHALL use Intel-compatible GraphicsMagick binaries
2. WHEN THE app is installed on an Apple Silicon Mac, THE System SHALL use ARM64-compatible GraphicsMagick binaries
3. WHEN THE app detects the system architecture, THE System SHALL select the appropriate binary automatically

### Requirement 3: Library Dependency Resolution

**User Story:** As a developer, I want all GraphicsMagick dependencies to be self-contained, so that the app doesn't fail due to missing system libraries.

#### Acceptance Criteria

1. WHEN GraphicsMagick is bundled, THE System SHALL include all required dynamic libraries (libGraphicsMagick, liblcms2, libfreetype, libltdl)
2. WHEN THE bundled binary executes, THE System SHALL resolve library paths to the bundled libraries
3. WHEN A required library is missing from the bundle, THE System SHALL report a clear error during the build process

### Requirement 4: Build Process Integration

**User Story:** As a developer, I want the bundling process to be automated, so that I don't need to manually copy files for each build.

#### Acceptance Criteria

1. WHEN THE developer runs the build command, THE System SHALL automatically copy GraphicsMagick binaries to the bundle
2. WHEN THE developer runs the build command, THE System SHALL automatically copy required libraries to the bundle
3. WHEN THE build process completes, THE System SHALL verify that all required files are present in the bundle
4. WHEN A required file is missing, THE System SHALL fail the build with a descriptive error message

### Requirement 5: Runtime Binary Discovery

**User Story:** As a user, I want the app to automatically find and use the bundled GraphicsMagick, so that PDF processing works without configuration.

#### Acceptance Criteria

1. WHEN THE app starts, THE System SHALL detect whether it is running in development or production mode
2. WHEN THE app is in production mode, THE System SHALL use the bundled GraphicsMagick binary
3. WHEN THE app is in development mode, THE System SHALL use the system-installed GraphicsMagick binary
4. WHEN THE app cannot find GraphicsMagick, THE System SHALL display a clear error message with troubleshooting steps

### Requirement 6: Fallback Mechanism

**User Story:** As a user, I want the app to work even if the bundled GraphicsMagick fails, so that I have options to resolve issues.

#### Acceptance Criteria

1. WHEN THE bundled GraphicsMagick fails to execute, THE System SHALL attempt to use system-installed GraphicsMagick as a fallback
2. WHEN BOTH bundled and system GraphicsMagick fail, THE System SHALL display a comprehensive error message with installation instructions
3. WHEN THE app detects GraphicsMagick issues, THE System SHALL log detailed diagnostic information for troubleshooting

### Requirement 7: Package Size Optimization

**User Story:** As a user, I want the app download to be reasonably sized, so that installation is quick and doesn't consume excessive disk space.

#### Acceptance Criteria

1. WHEN GraphicsMagick is bundled, THE System SHALL only include necessary binaries and libraries
2. WHEN GraphicsMagick is bundled, THE System SHALL exclude unnecessary files (documentation, headers, static libraries)
3. WHEN THE final package is created, THE System SHALL report the total size increase from bundling GraphicsMagick
4. THE bundled GraphicsMagick SHALL add no more than 100MB to the application size

### Requirement 8: Error Handling and Diagnostics

**User Story:** As a user, I want clear error messages if something goes wrong, so that I can understand and fix the problem.

#### Acceptance Criteria

1. WHEN GraphicsMagick fails to execute, THE System SHALL log the exact command that was attempted
2. WHEN GraphicsMagick fails to execute, THE System SHALL log the error output from GraphicsMagick
3. WHEN GraphicsMagick fails to execute, THE System SHALL display a user-friendly error message
4. WHEN THE app is in development mode, THE System SHALL provide additional diagnostic information in the console
