#!/bin/bash

# Script to bundle GraphicsMagick with all its dependencies for macOS
# This creates a self-contained GraphicsMagick installation

set -e

BUNDLE_DIR="graphicsmagick-bundle"
BIN_DIR="$BUNDLE_DIR/bin"
LIB_DIR="$BUNDLE_DIR/lib"

echo "🔧 Creating GraphicsMagick bundle..."

# Detect system architecture
ARCH=$(uname -m)
echo "📱 Detected architecture: $ARCH"

if [[ "$ARCH" != "x86_64" && "$ARCH" != "arm64" ]]; then
  echo "❌ Unsupported architecture: $ARCH"
  echo "   Supported architectures: x86_64 (Intel), arm64 (Apple Silicon)"
  exit 1
fi

# Locate GraphicsMagick binary
echo "🔍 Locating GraphicsMagick binary..."

GM_PATH=""
if [[ -n "$GM_PATH_OVERRIDE" ]]; then
  GM_PATH="$GM_PATH_OVERRIDE"
  echo "   Using override path: $GM_PATH"
elif command -v gm &> /dev/null; then
  GM_PATH=$(which gm)
  echo "   Found in PATH: $GM_PATH"
elif [[ -f "/usr/local/bin/gm" ]]; then
  GM_PATH="/usr/local/bin/gm"
  echo "   Found at: $GM_PATH"
elif [[ -f "/opt/homebrew/bin/gm" ]]; then
  GM_PATH="/opt/homebrew/bin/gm"
  echo "   Found at: $GM_PATH"
else
  echo "❌ GraphicsMagick not found on build system"
  echo ""
  echo "Please install GraphicsMagick before building:"
  echo "  brew install graphicsmagick"
  echo ""
  echo "Or specify the path manually:"
  echo "  GM_PATH_OVERRIDE=/path/to/gm ./scripts/bundle-graphicsmagick.sh"
  exit 1
fi

# Verify the binary exists and is executable
if [[ ! -f "$GM_PATH" ]]; then
  echo "❌ GraphicsMagick binary not found at: $GM_PATH"
  exit 1
fi

if [[ ! -x "$GM_PATH" ]]; then
  echo "❌ GraphicsMagick binary is not executable: $GM_PATH"
  exit 1
fi

echo "✅ Found GraphicsMagick: $GM_PATH"

# Create directories
echo "📁 Creating bundle directories..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BIN_DIR" "$LIB_DIR" "$BUNDLE_DIR/config"

# Copy the gm binary
echo "📦 Copying gm binary..."
cp "$GM_PATH" "$BIN_DIR/gm-real"
chmod +x "$BIN_DIR/gm-real"

# Create enhanced wrapper script with comprehensive library path setup
echo "📝 Creating enhanced gm wrapper script..."
cat > "$BIN_DIR/gm" <<'EOF'
#!/bin/bash
# Wrapper script for GraphicsMagick with comprehensive library path setup

# Get the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(cd "$SCRIPT_DIR/../lib" && pwd)"

# Set library paths for dynamic linker
# DYLD_LIBRARY_PATH: Primary library search path
export DYLD_LIBRARY_PATH="${LIB_DIR}:${DYLD_LIBRARY_PATH}"

# DYLD_FALLBACK_LIBRARY_PATH: Fallback if primary fails
export DYLD_FALLBACK_LIBRARY_PATH="${LIB_DIR}:${DYLD_FALLBACK_LIBRARY_PATH}"

# Add bin directory to PATH for Ghostscript
export PATH="${SCRIPT_DIR}:${PATH}"

# Execute the real GraphicsMagick binary
exec "${SCRIPT_DIR}/gm-real" "$@"
EOF
chmod +x "$BIN_DIR/gm"

# Locate and copy Ghostscript binary (required for PDF processing)
echo "🔍 Locating Ghostscript binary..."
GS_PATH=""
if command -v gs &> /dev/null; then
  GS_PATH=$(which gs)
  echo "   Found Ghostscript: $GS_PATH"
  echo "📦 Copying gs binary..."
  cp "$GS_PATH" "$BIN_DIR/gs-real"
  chmod +x "$BIN_DIR/gs-real"
  
  # Create Ghostscript wrapper script with library path setup
  echo "📝 Creating gs wrapper script..."
  cat > "$BIN_DIR/gs" <<'EOF'
#!/bin/bash
# Wrapper script for Ghostscript with library path setup

# Get the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(cd "$SCRIPT_DIR/../lib" && pwd)"

# Set library paths for dynamic linker
export DYLD_LIBRARY_PATH="${LIB_DIR}:${DYLD_LIBRARY_PATH}"
export DYLD_FALLBACK_LIBRARY_PATH="${LIB_DIR}:${DYLD_FALLBACK_LIBRARY_PATH}"

# Execute the real Ghostscript binary
exec "${SCRIPT_DIR}/gs-real" "$@"
EOF
  chmod +x "$BIN_DIR/gs"
else
  echo "⚠️  Warning: Ghostscript (gs) not found"
  echo "   PDF processing will not work without Ghostscript"
  echo "   Install with: brew install ghostscript"
fi

# Extract dependencies using otool
echo "🔍 Extracting dependencies..."
DEPENDENCIES=$(otool -L "$GM_PATH" | tail -n +2 | awk '{print $1}' | grep -v "^/usr/lib" | grep -v "^/System")

# Add Ghostscript dependencies if it exists
if [[ -n "$GS_PATH" && -f "$BIN_DIR/gs-real" ]]; then
  echo "🔍 Extracting Ghostscript dependencies..."
  GS_DEPENDENCIES=$(otool -L "$BIN_DIR/gs-real" | tail -n +2 | awk '{print $1}' | grep -v "^/usr/lib" | grep -v "^/System")
  DEPENDENCIES=$(echo -e "$DEPENDENCIES\n$GS_DEPENDENCIES" | sort -u)
fi

if [[ -z "$DEPENDENCIES" ]]; then
  echo "⚠️  No external dependencies found (binary may be statically linked)"
else
  echo "   Found dependencies:"
  echo "$DEPENDENCIES" | while read -r dep; do
    echo "     - $dep"
  done
fi

# Copy dependencies to lib directory
echo "📦 Copying dependencies..."
COPIED_LIBS=()

echo "$DEPENDENCIES" | while read -r dep; do
  if [[ -z "$dep" ]]; then
    continue
  fi
  
  # Resolve the actual library path (handle @rpath, @loader_path, etc.)
  ACTUAL_PATH="$dep"
  
  # If it starts with @rpath, try to find it in common locations
  if [[ "$dep" == @rpath* ]]; then
    LIB_NAME=$(basename "$dep" | sed 's/@rpath\///')
    
    # Try common Homebrew locations
    if [[ -f "/usr/local/lib/$LIB_NAME" ]]; then
      ACTUAL_PATH="/usr/local/lib/$LIB_NAME"
    elif [[ -f "/opt/homebrew/lib/$LIB_NAME" ]]; then
      ACTUAL_PATH="/opt/homebrew/lib/$LIB_NAME"
    elif [[ -f "/usr/local/opt/graphicsmagick/lib/$LIB_NAME" ]]; then
      ACTUAL_PATH="/usr/local/opt/graphicsmagick/lib/$LIB_NAME"
    elif [[ -f "/opt/homebrew/opt/graphicsmagick/lib/$LIB_NAME" ]]; then
      ACTUAL_PATH="/opt/homebrew/opt/graphicsmagick/lib/$LIB_NAME"
    else
      echo "⚠️  Could not resolve @rpath library: $dep"
      continue
    fi
  fi
  
  # Handle absolute paths directly
  if [[ "$dep" == /* ]]; then
    ACTUAL_PATH="$dep"
  fi
  
  if [[ -f "$ACTUAL_PATH" ]]; then
    LIB_NAME=$(basename "$ACTUAL_PATH")
    echo "   Copying: $LIB_NAME"
    cp "$ACTUAL_PATH" "$LIB_DIR/"
    COPIED_LIBS+=("$LIB_NAME")
  else
    echo "⚠️  Library not found: $ACTUAL_PATH"
  fi
done

# Recursively copy dependencies of dependencies
echo "🔍 Checking for transitive dependencies..."

# Keep checking until no new dependencies are found
ITERATION=0
MAX_ITERATIONS=10
NEW_DEPS_FOUND=true

while [[ "$NEW_DEPS_FOUND" == true && $ITERATION -lt $MAX_ITERATIONS ]]; do
  NEW_DEPS_FOUND=false
  ITERATION=$((ITERATION + 1))
  
  for lib in "$LIB_DIR"/*.dylib; do
    if [[ ! -f "$lib" ]]; then
      continue
    fi
    
    LIB_DEPS=$(otool -L "$lib" | tail -n +2 | awk '{print $1}' | grep -v "^/usr/lib" | grep -v "^/System")
    
    while IFS= read -r dep; do
      if [[ -z "$dep" ]]; then
        continue
      fi
      
      # Extract library name, handling @rpath and @loader_path prefixes
      LIB_NAME=$(basename "$dep" | sed 's/@rpath\///' | sed 's/@loader_path\///')
      
      # Skip if already copied
      if [[ -f "$LIB_DIR/$LIB_NAME" ]]; then
        continue
      fi
      
      # Resolve path
      ACTUAL_PATH=""
      if [[ "$dep" == @rpath* ]] || [[ "$dep" == @loader_path* ]]; then
        # Try common Homebrew locations
        if [[ -f "/usr/local/lib/$LIB_NAME" ]]; then
          ACTUAL_PATH="/usr/local/lib/$LIB_NAME"
        elif [[ -f "/opt/homebrew/lib/$LIB_NAME" ]]; then
          ACTUAL_PATH="/opt/homebrew/lib/$LIB_NAME"
        fi
      elif [[ "$dep" == /* ]]; then
        ACTUAL_PATH="$dep"
      fi
      
      if [[ -n "$ACTUAL_PATH" && -f "$ACTUAL_PATH" ]]; then
        echo "   Copying transitive dependency: $LIB_NAME (iteration $ITERATION)"
        cp "$ACTUAL_PATH" "$LIB_DIR/"
        NEW_DEPS_FOUND=true
      fi
    done <<< "$LIB_DEPS"
  done
done

if [[ $ITERATION -ge $MAX_ITERATIONS ]]; then
  echo "⚠️  Warning: Reached maximum iterations for transitive dependency resolution"
  echo "   Some dependencies may be missing"
fi

# Rewrite library paths to use @rpath with @executable_path
echo "🔧 Rewriting library paths..."

# Update the binary to use @rpath
echo "   Updating binary: gm-real"
for lib in "$LIB_DIR"/*.dylib; do
  if [[ ! -f "$lib" ]]; then
    continue
  fi
  
  LIB_NAME=$(basename "$lib")
  
  # Get the original path from the binary
  ORIGINAL_PATH=$(otool -L "$BIN_DIR/gm-real" | grep "$LIB_NAME" | awk '{print $1}')
  
  if [[ -n "$ORIGINAL_PATH" ]]; then
    echo "     $LIB_NAME: $ORIGINAL_PATH -> @rpath/$LIB_NAME"
    install_name_tool -change "$ORIGINAL_PATH" "@rpath/$LIB_NAME" "$BIN_DIR/gm-real" 2>/dev/null || true
  fi
done

# Add @rpath to the binary using @executable_path for better reliability
# @executable_path resolves relative to the actual binary, not the loader
install_name_tool -add_rpath "@executable_path/../lib" "$BIN_DIR/gm-real" 2>/dev/null || true

# Update Ghostscript binary if it exists
if [[ -f "$BIN_DIR/gs-real" ]]; then
  echo "   Updating binary: gs-real"
  for lib in "$LIB_DIR"/*.dylib; do
    if [[ ! -f "$lib" ]]; then
      continue
    fi
    
    LIB_NAME=$(basename "$lib")
    
    # Get the original path from the binary
    ORIGINAL_PATH=$(otool -L "$BIN_DIR/gs-real" | grep "$LIB_NAME" | awk '{print $1}')
    
    if [[ -n "$ORIGINAL_PATH" ]]; then
      echo "     $LIB_NAME: $ORIGINAL_PATH -> @rpath/$LIB_NAME"
      install_name_tool -change "$ORIGINAL_PATH" "@rpath/$LIB_NAME" "$BIN_DIR/gs-real" 2>/dev/null || true
    fi
  done
  
  # Add @rpath to the gs-real binary using @executable_path
  install_name_tool -add_rpath "@executable_path/../lib" "$BIN_DIR/gs-real" 2>/dev/null || true
fi

# Update each library to use @rpath for its dependencies
for lib in "$LIB_DIR"/*.dylib; do
  if [[ ! -f "$lib" ]]; then
    continue
  fi
  
  LIB_NAME=$(basename "$lib")
  echo "   Updating library: $LIB_NAME"
  
  # Update the library's ID to use @rpath
  install_name_tool -id "@rpath/$LIB_NAME" "$lib" 2>/dev/null || true
  
  # Update dependencies within this library
  for dep_lib in "$LIB_DIR"/*.dylib; do
    if [[ ! -f "$dep_lib" ]]; then
      continue
    fi
    
    DEP_NAME=$(basename "$dep_lib")
    
    # Get the original path
    ORIGINAL_PATH=$(otool -L "$lib" | grep "$DEP_NAME" | awk '{print $1}')
    
    if [[ -n "$ORIGINAL_PATH" && "$ORIGINAL_PATH" != "@rpath/$DEP_NAME" ]]; then
      echo "     $DEP_NAME: $ORIGINAL_PATH -> @rpath/$DEP_NAME"
      install_name_tool -change "$ORIGINAL_PATH" "@rpath/$DEP_NAME" "$lib" 2>/dev/null || true
    fi
  done
  
  # Add @rpath to the library
  install_name_tool -add_rpath "@loader_path" "$lib" 2>/dev/null || true
done

# Validate bundle
echo "✅ Validating bundle..."

# Check gm wrapper exists
if [[ ! -f "$BIN_DIR/gm" ]]; then
  echo "❌ Validation failed: gm wrapper not found"
  exit 1
fi

# Check gm-real binary exists
if [[ ! -f "$BIN_DIR/gm-real" ]]; then
  echo "❌ Validation failed: gm-real binary not found"
  exit 1
fi

# Check gm binaries are executable
if [[ ! -x "$BIN_DIR/gm" ]]; then
  echo "❌ Validation failed: gm wrapper is not executable"
  exit 1
fi

if [[ ! -x "$BIN_DIR/gm-real" ]]; then
  echo "❌ Validation failed: gm-real binary is not executable"
  exit 1
fi

# Check gs wrapper and binary if they exist
if [[ -f "$BIN_DIR/gs" ]]; then
  if [[ ! -x "$BIN_DIR/gs" ]]; then
    echo "❌ Validation failed: gs wrapper is not executable"
    exit 1
  fi
  
  if [[ ! -f "$BIN_DIR/gs-real" ]]; then
    echo "❌ Validation failed: gs-real binary not found"
    exit 1
  fi
  
  if [[ ! -x "$BIN_DIR/gs-real" ]]; then
    echo "❌ Validation failed: gs-real binary is not executable"
    exit 1
  fi
fi

# Check for required libraries
REQUIRED_LIBS=(
  "libGraphicsMagick"
  "liblcms2"
  "libfreetype"
  "libltdl"
)

MISSING_LIBS=()
for req_lib in "${REQUIRED_LIBS[@]}"; do
  FOUND=false
  for lib in "$LIB_DIR"/*.dylib; do
    if [[ $(basename "$lib") == $req_lib* ]]; then
      FOUND=true
      break
    fi
  done
  
  if [[ "$FOUND" == false ]]; then
    MISSING_LIBS+=("$req_lib")
  fi
done

if [[ ${#MISSING_LIBS[@]} -gt 0 ]]; then
  echo "⚠️  Warning: Some expected libraries not found:"
  for missing in "${MISSING_LIBS[@]}"; do
    echo "     - $missing"
  done
  echo "   The bundle may still work if these are not required."
fi

# Verify @rpath references and library path resolution
echo "🔍 Verifying library path resolution..."

# Check gm-real binary
echo "   Checking gm-real binary:"
RPATH_COUNT=$(otool -L "$BIN_DIR/gm-real" | grep -c "@rpath" || true)
if [[ $RPATH_COUNT -eq 0 ]]; then
  echo "   ⚠️  Warning: No @rpath references found in gm-real binary"
  echo "      Libraries may not load correctly at runtime"
else
  echo "   ✅ Found $RPATH_COUNT @rpath reference(s) in gm-real"
fi

# Verify @executable_path rpath is set
GM_RPATH=$(otool -l "$BIN_DIR/gm-real" | grep -A 2 "LC_RPATH" | grep "path" | grep "@executable_path" || true)
if [[ -n "$GM_RPATH" ]]; then
  echo "   ✅ @executable_path rpath configured correctly"
  echo "      $(echo "$GM_RPATH" | xargs)"
else
  echo "   ❌ ERROR: @executable_path rpath not found in gm-real"
  echo "      Library loading will fail at runtime!"
  exit 1
fi

# Check gs-real binary if it exists
if [[ -f "$BIN_DIR/gs-real" ]]; then
  echo "   Checking gs-real binary:"
  GS_RPATH_COUNT=$(otool -L "$BIN_DIR/gs-real" | grep -c "@rpath" || true)
  if [[ $GS_RPATH_COUNT -eq 0 ]]; then
    echo "   ⚠️  Warning: No @rpath references found in gs-real binary"
  else
    echo "   ✅ Found $GS_RPATH_COUNT @rpath reference(s) in gs-real"
  fi
  
  # Verify @executable_path rpath is set for gs-real
  GS_RPATH=$(otool -l "$BIN_DIR/gs-real" | grep -A 2 "LC_RPATH" | grep "path" | grep "@executable_path" || true)
  if [[ -n "$GS_RPATH" ]]; then
    echo "   ✅ @executable_path rpath configured correctly for gs-real"
    echo "      $(echo "$GS_RPATH" | xargs)"
  else
    echo "   ❌ ERROR: @executable_path rpath not found in gs-real"
    echo "      Library loading will fail at runtime!"
    exit 1
  fi
fi

# Verify all libraries have correct IDs
echo "   Checking library IDs:"
INVALID_LIB_IDS=()
for lib in "$LIB_DIR"/*.dylib; do
  if [[ ! -f "$lib" ]]; then
    continue
  fi
  
  LIB_NAME=$(basename "$lib")
  LIB_ID=$(otool -D "$lib" | tail -n 1)
  
  # Check if ID uses @rpath
  if [[ "$LIB_ID" == "@rpath/$LIB_NAME" ]]; then
    # Valid @rpath ID
    continue
  elif [[ "$LIB_ID" == *"$LIB_NAME" ]]; then
    # ID contains library name but not @rpath - this is a problem
    INVALID_LIB_IDS+=("$LIB_NAME: $LIB_ID")
  fi
done

if [[ ${#INVALID_LIB_IDS[@]} -gt 0 ]]; then
  echo "   ⚠️  Warning: Some libraries have non-@rpath IDs:"
  for invalid in "${INVALID_LIB_IDS[@]}"; do
    echo "      - $invalid"
  done
  echo "      This may cause issues at runtime"
else
  echo "   ✅ All library IDs use @rpath correctly"
fi

# Verify library dependencies use @rpath
echo "   Checking library dependencies:"
NON_RPATH_DEPS=0
for lib in "$LIB_DIR"/*.dylib; do
  if [[ ! -f "$lib" ]]; then
    continue
  fi
  
  LIB_NAME=$(basename "$lib")
  
  # Check for dependencies that should be @rpath but aren't
  DEPS=$(otool -L "$lib" | tail -n +2 | awk '{print $1}')
  while IFS= read -r dep; do
    if [[ -z "$dep" ]]; then
      continue
    fi
    
    DEP_NAME=$(basename "$dep")
    
    # Check if this dependency exists in our lib directory
    if [[ -f "$LIB_DIR/$DEP_NAME" ]]; then
      # It should use @rpath
      if [[ "$dep" != "@rpath/$DEP_NAME" ]]; then
        echo "      ⚠️  $LIB_NAME -> $dep (should be @rpath/$DEP_NAME)"
        NON_RPATH_DEPS=$((NON_RPATH_DEPS + 1))
      fi
    fi
  done <<< "$DEPS"
done

if [[ $NON_RPATH_DEPS -eq 0 ]]; then
  echo "   ✅ All bundled library dependencies use @rpath correctly"
else
  echo "   ⚠️  Found $NON_RPATH_DEPS dependency reference(s) not using @rpath"
  echo "      This may cause issues at runtime"
fi

# Display bundle contents
echo ""
echo "📦 Bundle contents:"
echo "   Binaries:"
echo "     - gm (wrapper)"
echo "     - gm-real (actual binary)"
if [[ -f "$BIN_DIR/gs" ]]; then
  echo "     - gs (wrapper)"
  echo "     - gs-real (actual binary)"
fi
echo "   Libraries:"
for lib in "$LIB_DIR"/*.dylib; do
  if [[ -f "$lib" ]]; then
    echo "     - $(basename "$lib")"
  fi
done

# Calculate bundle size
BUNDLE_SIZE=$(du -sh "$BUNDLE_DIR" | awk '{print $1}')
echo ""
echo "📊 Bundle size: $BUNDLE_SIZE"

echo ""
echo "✅ GraphicsMagick bundle created successfully!"
echo "   Location: $BUNDLE_DIR"
echo "   Architecture: $ARCH"

# Copy and modify delegates configuration
echo "📝 Creating delegates configuration..."
GM_CONFIG_DIR=$(dirname "$GM_PATH")/../lib/GraphicsMagick/config
if [[ -f "$GM_CONFIG_DIR/delegates.mgk" ]]; then
  cp "$GM_CONFIG_DIR/delegates.mgk" "$BUNDLE_DIR/config/"
  # Replace "gs" with placeholder that will be replaced at runtime
  sed -i.bak 's/"gs" /"@GS_BIN_PATH@" /g' "$BUNDLE_DIR/config/delegates.mgk"
  rm "$BUNDLE_DIR/config/delegates.mgk.bak"
  echo "✅ Delegates configuration created with runtime placeholder"
else
  echo "⚠️  Warning: delegates.mgk not found, GraphicsMagick may use default delegates"
fi
