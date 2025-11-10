import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { AppSettings } from '../../types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  autoOCRFallback: true,
  ocrQuality: 'balanced',
  confidenceThresholds: {
    warning: 60,
    error: 40
  },
  defaultExportFormat: 'csv',
  defaultSaveLocation: '',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: 'en-US',
  reportDefaults: {
    appraiserName: '',
    appraiserCredentials: '',
    companyName: '',
    companyLogoPath: '',
    includeDetailedCalculations: true,
    includeQualityScoreBreakdown: true
  }
};

class SettingsService {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from disk or return defaults
   */
  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Merge with defaults to ensure all fields exist
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          confidenceThresholds: {
            ...DEFAULT_SETTINGS.confidenceThresholds,
            ...(parsed.confidenceThresholds || {})
          },
          reportDefaults: {
            ...DEFAULT_SETTINGS.reportDefaults,
            ...(parsed.reportDefaults || {})
          }
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to disk
   */
  private saveSettings(): boolean {
    try {
      const data = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(this.settingsPath, data, 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Update settings (partial update)
   */
  updateSettings(updates: Partial<AppSettings>): boolean {
    try {
      // Validate settings before applying
      if (updates.ocrQuality && !['fast', 'balanced', 'accurate'].includes(updates.ocrQuality)) {
        throw new Error('Invalid OCR quality setting');
      }

      if (updates.defaultExportFormat && !['csv', 'json'].includes(updates.defaultExportFormat)) {
        throw new Error('Invalid export format setting');
      }

      if (updates.confidenceThresholds) {
        const { warning, error } = updates.confidenceThresholds;
        if (warning !== undefined && (warning < 0 || warning > 100)) {
          throw new Error('Warning threshold must be between 0 and 100');
        }
        if (error !== undefined && (error < 0 || error > 100)) {
          throw new Error('Error threshold must be between 0 and 100');
        }
        if (warning !== undefined && error !== undefined && error >= warning) {
          throw new Error('Error threshold must be less than warning threshold');
        }
      }

      // Apply updates
      this.settings = {
        ...this.settings,
        ...updates,
        confidenceThresholds: {
          ...this.settings.confidenceThresholds,
          ...(updates.confidenceThresholds || {})
        },
        reportDefaults: {
          ...this.settings.reportDefaults,
          ...(updates.reportDefaults || {})
        }
      };

      return this.saveSettings();
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): boolean {
    this.settings = { ...DEFAULT_SETTINGS };
    return this.saveSettings();
  }

  /**
   * Get a specific setting value
   */
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  /**
   * Get report defaults with fallback to empty values
   * This ensures report generation always has valid defaults
   */
  getReportDefaults(): NonNullable<AppSettings['reportDefaults']> {
    return {
      appraiserName: this.settings.reportDefaults?.appraiserName || '',
      appraiserCredentials: this.settings.reportDefaults?.appraiserCredentials || '',
      companyName: this.settings.reportDefaults?.companyName || '',
      companyLogoPath: this.settings.reportDefaults?.companyLogoPath || '',
      includeDetailedCalculations: this.settings.reportDefaults?.includeDetailedCalculations ?? true,
      includeQualityScoreBreakdown: this.settings.reportDefaults?.includeQualityScoreBreakdown ?? true
    };
  }

  /**
   * Update report defaults
   * Convenience method for updating just the report branding settings
   */
  updateReportDefaults(updates: Partial<NonNullable<AppSettings['reportDefaults']>>): boolean {
    const currentDefaults = this.getReportDefaults();
    return this.updateSettings({
      reportDefaults: {
        ...currentDefaults,
        ...updates
      }
    });
  }

  /**
   * Validate settings structure
   */
  validateSettings(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.settings.ocrQuality || !['fast', 'balanced', 'accurate'].includes(this.settings.ocrQuality)) {
      errors.push('Invalid OCR quality setting');
    }

    if (!this.settings.defaultExportFormat || !['csv', 'json'].includes(this.settings.defaultExportFormat)) {
      errors.push('Invalid export format setting');
    }

    if (!this.settings.confidenceThresholds) {
      errors.push('Missing confidence thresholds');
    } else {
      const { warning, error } = this.settings.confidenceThresholds;
      if (warning < 0 || warning > 100) {
        errors.push('Warning threshold must be between 0 and 100');
      }
      if (error < 0 || error > 100) {
        errors.push('Error threshold must be between 0 and 100');
      }
      if (error >= warning) {
        errors.push('Error threshold must be less than warning threshold');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
