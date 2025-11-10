# Requirements Document

## Introduction

This specification defines the requirements for fixing the EPIPE error that occurs when the packaged Automotive Appraisal Reporter application attempts to process PDFs using the bundled GraphicsMagick binary. The error "write EPIPE" indicates that the GraphicsMagick child process is failing to execute properly, likely due to dynamic library loading issues when spawned by the pdf2pic library.

## Glossary

- **EPIPE Error**: A "broken pipe" error that occurs when a process tries to write to a pipe whose read end has been closed, typically indicating the child process crashed or failed to start
- **pdf2pic**: An npm library that wraps GraphicsMagick to convert PDF pages to images
- **Child Process**: A separate process spawned by the main application to execute GraphicsMagick commands
- **Dynamic Library Loading**: The process by which an executable loads shared libraries (.dylib files) at runtime
- **DYLD_LIBRARY_PATH**: An environment variable that tells the dynamic linker where to find shared libraries
- **Wrapper Script**: A shell script that sets up the environment before executing the actual binary
- **install_name_tool**: A macOS utility for modifying dynamic library references in binaries

## Requirements

### Requirement 1: Reliable Child Process Execution

**User Story:** As a user, I want PDF processing to work reliably in the packaged app, so that I can extract text from PDFs without errors.

#### Acceptance Criteria

1. WHEN THE app spawns GraphicsMagick as a child process, THE System SHALL ensure all required dynamic libraries are accessible
2. WHEN pdf2pic calls the GraphicsMagick binary, THE System SHALL execute without EPIPE errors
3. WHEN THE GraphicsMagick process starts, THE System SHALL successfully load all required .dylib files
4. WHEN A PDF is uploaded, THE System SHALL convert PDF pages to images without process failures

### Requirement 2: Environment Variable Propagation

**User Story:** As a developer, I want environment variables to be properly passed to child processes, so that the bundled libraries are found at runtime.

#### Acceptance Criteria

1. WHEN THE app spawns GraphicsMagick, THE System SHALL ensure DYLD_LIBRARY_PATH is set correctly
2. WHEN macOS security restrictions prevent DYLD_LIBRARY_PATH propagation, THE System SHALL use an alternative approach
3. WHEN THE wrapper script executes, THE System SHALL set library paths before calling the real binary
4. WHEN THE child process inherits environment variables, THE System SHALL include all necessary library paths

### Requirement 3: Wrapper Script Implementation

**User Story:** As a developer, I want a wrapper script that handles library path setup, so that the binary can find its dependencies regardless of how it's spawned.

#### Acceptance Criteria

1. WHEN THE bundle is created, THE System SHALL generate a wrapper script for the gm binary
2. WHEN THE wrapper script executes, THE System SHALL set DYLD_LIBRARY_PATH to the bundled lib directory
3. WHEN THE wrapper script calls the real binary, THE System SHALL pass all command-line arguments unchanged
4. WHEN pdf2pic calls the wrapper, THE System SHALL execute the real binary with proper environment

### Requirement 4: Library Path Resolution

**User Story:** As a user, I want the bundled GraphicsMagick to work without system library dependencies, so that the app is truly self-contained.

#### Acceptance Criteria

1. WHEN THE bundled binary loads, THE System SHALL resolve all library paths to the bundled lib directory
2. WHEN THE binary uses @rpath references, THE System SHALL resolve them to @executable_path/../lib
3. WHEN A library depends on another library, THE System SHALL resolve transitive dependencies correctly
4. WHEN THE app is moved to a different location, THE System SHALL still find all libraries using relative paths

### Requirement 5: pdf2pic Integration

**User Story:** As a developer, I want pdf2pic to use the wrapper script instead of the raw binary, so that library paths are set correctly.

#### Acceptance Criteria

1. WHEN THE OCR extractor configures pdf2pic, THE System SHALL point to the wrapper script
2. WHEN pdf2pic spawns the GraphicsMagick process, THE System SHALL use the wrapper that sets environment variables
3. WHEN THE wrapper is called with arguments, THE System SHALL pass them to the real binary correctly
4. WHEN THE conversion completes, THE System SHALL return results to pdf2pic without errors

### Requirement 6: Diagnostic Logging

**User Story:** As a developer, I want detailed logging when GraphicsMagick fails, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. WHEN GraphicsMagick fails to execute, THE System SHALL log the exact command attempted
2. WHEN GraphicsMagick fails to execute, THE System SHALL log the environment variables set
3. WHEN GraphicsMagick fails to execute, THE System SHALL log the stderr output from the process
4. WHEN library loading fails, THE System SHALL log which libraries could not be found

### Requirement 7: Fallback Mechanism Enhancement

**User Story:** As a user, I want the app to try alternative approaches if the bundled GraphicsMagick fails, so that I have the best chance of success.

#### Acceptance Criteria

1. WHEN THE bundled GraphicsMagick fails with EPIPE, THE System SHALL attempt to use system GraphicsMagick
2. WHEN THE system GraphicsMagick is available, THE System SHALL use it as a fallback
3. WHEN BOTH bundled and system GraphicsMagick fail, THE System SHALL provide a clear error message
4. WHEN THE fallback succeeds, THE System SHALL log that fallback mode was used

### Requirement 8: Verification and Testing

**User Story:** As a developer, I want to verify the bundle works before packaging, so that I catch issues early.

#### Acceptance Criteria

1. WHEN THE bundle is created, THE System SHALL test that the wrapper script executes successfully
2. WHEN THE bundle is created, THE System SHALL verify all library dependencies are resolved
3. WHEN THE verification runs, THE System SHALL test actual PDF conversion with the bundled binary
4. WHEN verification fails, THE System SHALL report specific issues found

### Requirement 9: Ghostscript Integration

**User Story:** As a user, I want GraphicsMagick to successfully use Ghostscript for PDF processing, so that PDF conversion works correctly.

#### Acceptance Criteria

1. WHEN GraphicsMagick processes a PDF, THE System SHALL locate the bundled Ghostscript binary
2. WHEN GraphicsMagick spawns Ghostscript, THE System SHALL ensure Ghostscript can find its libraries
3. WHEN THE delegates configuration is used, THE System SHALL point to the correct Ghostscript path
4. WHEN Ghostscript executes, THE System SHALL not encounter library loading errors

### Requirement 10: Cross-Platform Compatibility

**User Story:** As a developer, I want the solution to work on both Intel and Apple Silicon Macs, so that all users can process PDFs.

#### Acceptance Criteria

1. WHEN THE app runs on Intel Mac, THE System SHALL use Intel-compatible binaries and libraries
2. WHEN THE app runs on Apple Silicon Mac, THE System SHALL use ARM64-compatible binaries and libraries
3. WHEN THE wrapper script executes, THE System SHALL work correctly on both architectures
4. WHEN library paths are resolved, THE System SHALL use architecture-appropriate paths
