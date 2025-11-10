import { extractTextWithOCRProcess } from '../src/main/services/ocrExtractorProcess';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Helper function for cache key generation (if needed for tests)
function generateCacheKey(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

describe('OCR Extractor (Process-based)', () => {
  const samplePDFPath = path.join(__dirname, '../../valuation_report_samples/valuation -  BARSANO (1).pdf');
  
  describe('extractTextWithOCRProcess', () => {
    it('should extract text from a valid PDF using separate process', async () => {
      // Load sample PDF
      const buffer = await fs.readFile(samplePDFPath);
      
      // Extract text with progress tracking
      const progressUpdates: Array<{ progress: number; message?: string }> = [];
      
      const text = await extractTextWithOCRProcess(buffer, (progress, message) => {
        progressUpdates.push({ progress, message });
      });
      
      // Verify text was extracted
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(100);
      
      // Verify key content is present (this should work with clean OCR)
      expect(text).toContain('Loss vehicle');
      expect(text).toContain('BMW');
      expect(text).toContain('M3');
      
      // Verify progress updates were sent
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].progress).toBeGreaterThanOrEqual(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    }, 60000); // 60 second timeout for OCR processing
    
    it('should handle progress callbacks correctly', async () => {
      const buffer = await fs.readFile(samplePDFPath);
      
      const progressValues: number[] = [];
      
      await extractTextWithOCRProcess(buffer, (progress) => {
        progressValues.push(progress);
      });
      
      // Progress should be monotonically increasing
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
      
      // Should start at or near 0 and end at 100
      expect(progressValues[0]).toBeLessThan(20);
      expect(progressValues[progressValues.length - 1]).toBe(100);
    }, 60000);
    
    it('should throw error for invalid PDF', async () => {
      const invalidBuffer = Buffer.from('This is not a PDF file');
      
      await expect(
        extractTextWithOCRProcess(invalidBuffer)
      ).rejects.toThrow();
    });
    
    it('should throw error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      await expect(
        extractTextWithOCRProcess(emptyBuffer)
      ).rejects.toThrow();
    });
    
    it('should handle multi-page PDFs', async () => {
      const buffer = await fs.readFile(samplePDFPath);
      
      const text = await extractTextWithOCRProcess(buffer);
      
      // Multi-page PDFs should have page breaks
      if (text.includes('PAGE BREAK')) {
        expect(text.split('PAGE BREAK').length).toBeGreaterThan(1);
      }
      
      // Text should be substantial for multi-page documents
      expect(text.length).toBeGreaterThan(500);
    }, 60000);
  });
  
  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same buffer', () => {
      const buffer = Buffer.from('test content');
      
      const key1 = generateCacheKey(buffer);
      const key2 = generateCacheKey(buffer);
      
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(32); // MD5 hash length
    });
    
    it('should generate different cache keys for different buffers', () => {
      const buffer1 = Buffer.from('test content 1');
      const buffer2 = Buffer.from('test content 2');
      
      const key1 = generateCacheKey(buffer1);
      const key2 = generateCacheKey(buffer2);
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('Memory and Cleanup', () => {
    it('should not leak memory on multiple extractions', async () => {
      const buffer = await fs.readFile(samplePDFPath);
      
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple times
      for (let i = 0; i < 3; i++) {
        await extractTextWithOCRProcess(buffer);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      // Memory should not grow significantly
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024); // MB
      
      // Allow up to 50MB growth (OCR workers may retain some memory)
      expect(memoryGrowth).toBeLessThan(50);
    }, 180000); // 3 minute timeout for multiple runs
  });
});
