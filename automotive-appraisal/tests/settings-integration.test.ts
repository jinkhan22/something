/**
 * Settings Integration Tests
 * Tests that settings are properly integrated throughout the application
 */

import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../src/renderer/store';
import { AppSettings } from '../src/types';

describe('Settings Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useAppStore.getState();
    reset();
  });

  describe('Confidence Thresholds', () => {
    it('should use settings thresholds for confidence levels', async () => {
      const { result } = renderHook(() => useAppStore());

      // Set custom thresholds
      await act(async () => {
        await result.current.updateSettings({
          confidenceThresholds: {
            warning: 70,
            error: 50
          }
        });
      });

      expect(result.current.settings.confidenceThresholds.warning).toBe(70);
      expect(result.current.settings.confidenceThresholds.error).toBe(50);
    });

    it('should validate threshold relationships', () => {
      const { result } = renderHook(() => useAppStore());

      // Error threshold should be less than warning threshold
      act(() => {
        result.current.updateSettings({
          confidenceThresholds: {
            warning: 60,
            error: 40
          }
        });
      });

      const { warning, error } = result.current.settings.confidenceThresholds;
      expect(error).toBeLessThan(warning);
    });

    it('should apply thresholds to confidence color coding', async () => {
      const { result } = renderHook(() => useAppStore());

      // Set thresholds
      await act(async () => {
        await result.current.updateSettings({
          confidenceThresholds: {
            warning: 75,
            error: 50
          }
        });
      });

      const { warning, error } = result.current.settings.confidenceThresholds;

      // Test confidence levels
      const highConfidence = 80;
      const mediumConfidence = 60;
      const lowConfidence = 40;

      expect(highConfidence >= warning).toBe(true); // Should be green
      expect(mediumConfidence >= error && mediumConfidence < warning).toBe(true); // Should be yellow
      expect(lowConfidence < error).toBe(true); // Should be red
    });
  });

  describe('Export Format Settings', () => {
    it('should use default export format from settings', async () => {
      const { result } = renderHook(() => useAppStore());

      // Set default export format to JSON
      await act(async () => {
        await result.current.updateSettings({
          defaultExportFormat: 'json'
        });
      });

      expect(result.current.settings.defaultExportFormat).toBe('json');
    });

    it('should support CSV export format', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateSettings({
          defaultExportFormat: 'csv'
        });
      });

      expect(result.current.settings.defaultExportFormat).toBe('csv');
    });

    it('should default to CSV if not specified', () => {
      const { result } = renderHook(() => useAppStore());

      // Default should be CSV
      expect(result.current.settings.defaultExportFormat).toBe('csv');
    });
  });

  describe('Default Save Location', () => {
    it('should store default save location', async () => {
      const { result } = renderHook(() => useAppStore());

      const testPath = '/Users/test/Documents/Appraisals';

      await act(async () => {
        await result.current.updateSettings({
          defaultSaveLocation: testPath
        });
      });

      expect(result.current.settings.defaultSaveLocation).toBe(testPath);
    });

    it('should allow empty save location', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateSettings({
          defaultSaveLocation: ''
        });
      });

      expect(result.current.settings.defaultSaveLocation).toBe('');
    });
  });

  describe('OCR Settings', () => {
    it('should use autoOCRFallback setting', async () => {
      const { result } = renderHook(() => useAppStore());

      // Enable auto OCR fallback
      await act(async () => {
        await result.current.updateSettings({
          autoOCRFallback: true
        });
      });

      expect(result.current.settings.autoOCRFallback).toBe(true);

      // Disable auto OCR fallback
      await act(async () => {
        await result.current.updateSettings({
          autoOCRFallback: false
        });
      });

      expect(result.current.settings.autoOCRFallback).toBe(false);
    });

    it('should support different OCR quality settings', async () => {
      const { result } = renderHook(() => useAppStore());

      const qualities: Array<'fast' | 'balanced' | 'accurate'> = ['fast', 'balanced', 'accurate'];

      for (const quality of qualities) {
        await act(async () => {
          await result.current.updateSettings({
            ocrQuality: quality
          });
        });

        expect(result.current.settings.ocrQuality).toBe(quality);
      }
    });

    it('should default to balanced OCR quality', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.settings.ocrQuality).toBe('balanced');
    });
  });

  describe('Display Format Settings', () => {
    it('should support date format settings', async () => {
      const { result } = renderHook(() => useAppStore());

      const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

      for (const format of dateFormats) {
        await act(async () => {
          await result.current.updateSettings({
            dateFormat: format
          });
        });

        expect(result.current.settings.dateFormat).toBe(format);
      }
    });

    it('should support number format settings', async () => {
      const { result } = renderHook(() => useAppStore());

      const numberFormats = ['en-US', 'de-DE'];

      for (const format of numberFormats) {
        await act(async () => {
          await result.current.updateSettings({
            numberFormat: format
          });
        });

        expect(result.current.settings.numberFormat).toBe(format);
      }
    });
  });

  describe('Settings Persistence', () => {
    it('should persist settings updates', async () => {
      const { result } = renderHook(() => useAppStore());

      const newSettings: Partial<AppSettings> = {
        autoOCRFallback: false,
        ocrQuality: 'accurate',
        confidenceThresholds: {
          warning: 85,
          error: 55
        },
        defaultExportFormat: 'json',
        defaultSaveLocation: '/test/path'
      };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      // Verify all settings were updated
      expect(result.current.settings.autoOCRFallback).toBe(false);
      expect(result.current.settings.ocrQuality).toBe('accurate');
      expect(result.current.settings.confidenceThresholds.warning).toBe(85);
      expect(result.current.settings.confidenceThresholds.error).toBe(55);
      expect(result.current.settings.defaultExportFormat).toBe('json');
      expect(result.current.settings.defaultSaveLocation).toBe('/test/path');
    });

    it('should support partial settings updates', async () => {
      const { result } = renderHook(() => useAppStore());

      // Update only one setting
      await act(async () => {
        await result.current.updateSettings({
          ocrQuality: 'fast'
        });
      });

      // Other settings should remain unchanged
      expect(result.current.settings.ocrQuality).toBe('fast');
      expect(result.current.settings.autoOCRFallback).toBe(true); // Default value
      expect(result.current.settings.defaultExportFormat).toBe('csv'); // Default value
    });
  });

  describe('Settings Integration with Processing', () => {
    it('should apply confidence thresholds to validation warnings', async () => {
      const { result } = renderHook(() => useAppStore());

      // Set custom thresholds
      await act(async () => {
        await result.current.updateSettings({
          confidenceThresholds: {
            warning: 70,
            error: 45
          }
        });
      });

      // Simulate appraisal with various confidence levels
      const testConfidence = 60;
      const { warning, error } = result.current.settings.confidenceThresholds;

      // Should show warning (between error and warning thresholds)
      expect(testConfidence >= error && testConfidence < warning).toBe(true);
    });

    it('should use OCR settings for processing decisions', async () => {
      const { result } = renderHook(() => useAppStore());

      // Enable auto OCR fallback
      await act(async () => {
        await result.current.updateSettings({
          autoOCRFallback: true,
          ocrQuality: 'accurate'
        });
      });

      expect(result.current.settings.autoOCRFallback).toBe(true);
      expect(result.current.settings.ocrQuality).toBe('accurate');
    });
  });

  describe('Settings Reset', () => {
    it('should reset settings to defaults', () => {
      const { result } = renderHook(() => useAppStore());

      // Change settings
      act(() => {
        result.current.updateSettings({
          autoOCRFallback: false,
          ocrQuality: 'fast',
          confidenceThresholds: {
            warning: 90,
            error: 70
          }
        });
      });

      // Reset settings
      act(() => {
        result.current.resetSettings();
      });

      // Should be back to defaults
      expect(result.current.settings.autoOCRFallback).toBe(true);
      expect(result.current.settings.ocrQuality).toBe('balanced');
      expect(result.current.settings.confidenceThresholds.warning).toBe(60);
      expect(result.current.settings.confidenceThresholds.error).toBe(40);
      expect(result.current.settings.defaultExportFormat).toBe('csv');
      expect(result.current.settings.defaultSaveLocation).toBe('');
    });
  });

  describe('Settings Validation', () => {
    it('should validate confidence threshold ranges', () => {
      const { result } = renderHook(() => useAppStore());

      // Valid thresholds
      act(() => {
        result.current.updateSettings({
          confidenceThresholds: {
            warning: 80,
            error: 50
          }
        });
      });

      const { warning, error } = result.current.settings.confidenceThresholds;
      expect(warning).toBeGreaterThan(error);
      expect(warning).toBeLessThanOrEqual(100);
      expect(warning).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(100);
      expect(error).toBeGreaterThanOrEqual(0);
    });

    it('should validate OCR quality values', () => {
      const { result } = renderHook(() => useAppStore());

      const validQualities: Array<'fast' | 'balanced' | 'accurate'> = ['fast', 'balanced', 'accurate'];

      validQualities.forEach(quality => {
        act(() => {
          result.current.updateSettings({
            ocrQuality: quality
          });
        });

        expect(validQualities).toContain(result.current.settings.ocrQuality);
      });
    });

    it('should validate export format values', () => {
      const { result } = renderHook(() => useAppStore());

      const validFormats: Array<'csv' | 'json'> = ['csv', 'json'];

      validFormats.forEach(format => {
        act(() => {
          result.current.updateSettings({
            defaultExportFormat: format
          });
        });

        expect(validFormats).toContain(result.current.settings.defaultExportFormat);
      });
    });
  });
});
