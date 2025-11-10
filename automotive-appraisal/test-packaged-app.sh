#!/bin/bash

# Test script for packaged Automotive Appraisal Reporter application
# This script tests the GraphicsMagick EPIPE fix in the packaged app

set -e

echo "========================================="
echo "Packaged Application Testing Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find the packaged app
APP_PATH="out/Automotive Appraisal Reporter-darwin-x64/Automotive Appraisal Reporter.app"

if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ Packaged app not found at: $APP_PATH${NC}"
    echo "Please run 'npm run make' first"
    exit 1
fi

echo -e "${GREEN}✅ Found packaged app at: $APP_PATH${NC}"
echo ""

# Test 1: Verify GraphicsMagick bundle structure
echo "Test 1: Verifying GraphicsMagick bundle structure..."
GM_BUNDLE="$APP_PATH/Contents/Resources/graphicsmagick-bundle"

if [ ! -d "$GM_BUNDLE" ]; then
    echo -e "${RED}❌ GraphicsMagick bundle not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GraphicsMagick bundle found${NC}"

# Test 2: Verify wrapper scripts exist
echo ""
echo "Test 2: Verifying wrapper scripts..."
GM_WRAPPER="$GM_BUNDLE/bin/gm"
GM_REAL="$GM_BUNDLE/bin/gm-real"
GS_WRAPPER="$GM_BUNDLE/bin/gs"
GS_REAL="$GM_BUNDLE/bin/gs-real"

for file in "$GM_WRAPPER" "$GM_REAL" "$GS_WRAPPER" "$GS_REAL"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing: $file${NC}"
        exit 1
    fi
    if [ ! -x "$file" ]; then
        echo -e "${RED}❌ Not executable: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All wrapper scripts and binaries found and executable${NC}"

# Test 3: Verify wrapper script content
echo ""
echo "Test 3: Verifying wrapper script sets environment variables..."
if grep -q "DYLD_LIBRARY_PATH" "$GM_WRAPPER"; then
    echo -e "${GREEN}✅ GM wrapper sets DYLD_LIBRARY_PATH${NC}"
else
    echo -e "${RED}❌ GM wrapper does not set DYLD_LIBRARY_PATH${NC}"
    exit 1
fi

if grep -q "DYLD_FALLBACK_LIBRARY_PATH" "$GM_WRAPPER"; then
    echo -e "${GREEN}✅ GM wrapper sets DYLD_FALLBACK_LIBRARY_PATH${NC}"
else
    echo -e "${RED}❌ GM wrapper does not set DYLD_FALLBACK_LIBRARY_PATH${NC}"
    exit 1
fi

# Test 4: Verify libraries exist
echo ""
echo "Test 4: Verifying bundled libraries..."
LIB_DIR="$GM_BUNDLE/lib"

REQUIRED_LIBS=(
    "libGraphicsMagick.3.dylib"
    "libfreetype.6.dylib"
    "libjpeg.8.dylib"
    "libpng16.16.dylib"
    "libtiff.6.dylib"
)

for lib in "${REQUIRED_LIBS[@]}"; do
    if [ ! -f "$LIB_DIR/$lib" ]; then
        echo -e "${RED}❌ Missing library: $lib${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required libraries found${NC}"

# Test 5: Test GraphicsMagick execution
echo ""
echo "Test 5: Testing GraphicsMagick execution..."
if "$GM_WRAPPER" version > /dev/null 2>&1; then
    VERSION=$("$GM_WRAPPER" version | head -n 1)
    echo -e "${GREEN}✅ GraphicsMagick executes successfully${NC}"
    echo "   Version: $VERSION"
else
    echo -e "${RED}❌ GraphicsMagick failed to execute${NC}"
    echo "   Trying to get error details..."
    "$GM_WRAPPER" version 2>&1 || true
    exit 1
fi

# Test 6: Test PDF conversion (if test PDF available)
echo ""
echo "Test 6: Testing PDF conversion..."

# Use a test PDF from the samples
TEST_PDF="../valuation_report_samples/State-Farm-Valuation-Report.pdf"
OUTPUT_PNG="/tmp/test-gm-conversion-$$.png"

if [ -f "$TEST_PDF" ]; then
    echo "   Using test PDF: $TEST_PDF"
    
    if "$GM_WRAPPER" convert -density 150 "$TEST_PDF[0]" "$OUTPUT_PNG" 2>&1; then
        if [ -f "$OUTPUT_PNG" ]; then
            FILE_SIZE=$(stat -f%z "$OUTPUT_PNG" 2>/dev/null || stat -c%s "$OUTPUT_PNG" 2>/dev/null)
            echo -e "${GREEN}✅ PDF conversion successful${NC}"
            echo "   Output: $OUTPUT_PNG"
            echo "   Size: $FILE_SIZE bytes"
            rm -f "$OUTPUT_PNG"
        else
            echo -e "${RED}❌ PDF conversion failed: output file not created${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ PDF conversion command failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping PDF conversion test (test PDF not found)${NC}"
fi

# Test 7: Check library dependencies
echo ""
echo "Test 7: Checking library dependencies..."
echo "   Checking gm-real dependencies..."
DEPS=$(otool -L "$GM_REAL" | grep -v ":" | grep -v "^$" | awk '{print $1}')

echo "   Dependencies found:"
echo "$DEPS" | while read -r dep; do
    echo "      - $dep"
done

# Check if dependencies use @executable_path or @rpath
if echo "$DEPS" | grep -q "@executable_path\|@rpath"; then
    echo -e "${GREEN}✅ Binary uses relative library paths${NC}"
else
    echo -e "${YELLOW}⚠️  Binary may not use relative library paths${NC}"
fi

# Test 8: Verify GraphicsMagickSpawner service exists
echo ""
echo "Test 8: Verifying GraphicsMagickSpawner service..."
SPAWNER_FILE="$APP_PATH/Contents/Resources/.vite/build/main.js"

if [ -f "$SPAWNER_FILE" ]; then
    if grep -q "GraphicsMagickSpawner" "$SPAWNER_FILE"; then
        echo -e "${GREEN}✅ GraphicsMagickSpawner found in main bundle${NC}"
    else
        echo -e "${YELLOW}⚠️  GraphicsMagickSpawner not found in main bundle (may be minified)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Main bundle not found at expected location${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}✅ All automated tests passed!${NC}"
echo ""
echo "Manual Testing Steps:"
echo "1. Install the DMG: out/make/Auto-Appraisal-Reporter.dmg"
echo "2. Open the installed application"
echo "3. Upload a test PDF from: ../valuation_report_samples/"
echo "4. Verify PDF processing completes without EPIPE errors"
echo "5. Check Console.app for any dyld library loading errors"
echo "6. Test with multi-page PDFs"
echo ""
echo "To check Console.app for errors:"
echo "  1. Open Console.app"
echo "  2. Filter for 'Automotive Appraisal Reporter'"
echo "  3. Look for 'dyld' or 'Library not loaded' messages"
echo ""
