# Tesseract Assets

This directory contains the Tesseract OCR language training data files that are bundled with the application to enable offline operation.

## Files

- `eng.traineddata` (4.1MB) - English language training data from tessdata_fast

## Source

Downloaded from: https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata

## Purpose

These assets are bundled with the Electron application so that OCR functionality works without requiring internet connectivity. The application loads these files from the local bundle instead of downloading them from a CDN at runtime.

## Verification

- File size: 4,113,088 bytes (~3.9MB)
- MD5 hash: d1be414fbb296b3ad777bfca655e194e
- Version: tessdata_fast (optimized for speed)

## Notes

The tessdata_fast version is used instead of the full tessdata version because:
- Smaller file size (better for bundle size)
- Faster processing (optimized for speed)
- Sufficient accuracy for vehicle appraisal document processing
