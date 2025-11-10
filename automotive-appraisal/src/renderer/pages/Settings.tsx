import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ErrorType, AppSettings as AppSettingsType } from '../../types';

export function Settings() {
  const { 
    settings: storeSettings, 
    updateSettings: updateStoreSettings,
    theme, 
    setTheme, 
    createError,
    loadSettings
  } = useAppStore();
  
  const [localSettings, setLocalSettings] = useState<AppSettingsType>(storeSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from IPC on mount
  useEffect(() => {
    const loadInitialSettings = async () => {
      setIsLoading(true);
      try {
        await loadSettings();
      } catch (error) {
        console.error('Failed to load settings:', error);
        createError(ErrorType.STORAGE_ERROR, 'Failed to load settings', error, true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialSettings();
  }, [loadSettings, createError]);

  // Sync local settings with store settings
  useEffect(() => {
    setLocalSettings(storeSettings);
  }, [storeSettings]);

  // Handle setting change
  const handleChange = <K extends keyof AppSettingsType>(
    key: K,
    value: AppSettingsType[K]
  ) => {
    setLocalSettings(prev => {
      // Ensure reportDefaults exists when updating it
      if (key === 'reportDefaults' && value) {
        return {
          ...prev,
          reportDefaults: {
            appraiserName: '',
            appraiserCredentials: '',
            companyName: '',
            companyLogoPath: '',
            includeDetailedCalculations: true,
            includeQualityScoreBreakdown: true,
            ...prev.reportDefaults,
            ...value
          }
        };
      }
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Handle nested confidence threshold changes
  const handleConfidenceThresholdChange = (key: 'warning' | 'error', value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      confidenceThresholds: {
        ...prev.confidenceThresholds,
        [key]: value
      }
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Validate settings before saving
      const validation = await window.electron.validateSettings();
      if (!validation.valid) {
        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
      }

      // Save via IPC and update store
      await updateStoreSettings(localSettings);

      setHasChanges(false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      createError(ErrorType.STORAGE_ERROR, 'Failed to save settings', error, true, 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setIsSaving(true);
      try {
        await window.electron.resetSettings();
        await loadSettings();
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Failed to reset settings:', error);
        createError(ErrorType.STORAGE_ERROR, 'Failed to reset settings', error, true, 'Please try again');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Get statistics
  const getStatistics = () => {
    try {
      const historyData = localStorage.getItem('automotive-appraisal-storage');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        const history = parsed.state?.appraisalHistory || [];
        return {
          totalAppraisals: history.length,
          storageSize: new Blob([historyData]).size
        };
      }
    } catch (error) {
      console.error('Failed to get statistics:', error);
    }
    return { totalAppraisals: 0, storageSize: 0 };
  };

  const stats = getStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your appraisal preferences
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <p className="text-green-800 font-medium">Settings saved successfully</p>
          </div>
        </div>
      )}

      {/* OCR Settings */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">OCR Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Configure optical character recognition preferences</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Automatic OCR Fallback</p>
              <p className="text-sm text-gray-500">Automatically use OCR when text extraction fails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={localSettings.autoOCRFallback}
                onChange={(e) => handleChange('autoOCRFallback', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OCR Quality
            </label>
            <select 
              value={localSettings.ocrQuality}
              onChange={(e) => handleChange('ocrQuality', e.target.value as AppSettingsType['ocrQuality'])}
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fast">Fast (Lower accuracy, faster processing)</option>
              <option value="balanced">Balanced (Recommended)</option>
              <option value="accurate">Accurate (Higher accuracy, slower processing)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Balance between processing speed and OCR accuracy
            </p>
          </div>
        </div>
      </div>

      {/* Confidence Thresholds */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Confidence Thresholds</h2>
          <p className="text-sm text-gray-500 mt-1">Set minimum confidence levels for data validation</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warning Threshold: {localSettings.confidenceThresholds.warning}%
            </label>
            <input 
              type="range" 
              min="40" 
              max="100" 
              value={localSettings.confidenceThresholds.warning}
              onChange={(e) => handleConfidenceThresholdChange('warning', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>40% (More permissive)</span>
              <span>100% (More strict)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Show warnings when confidence is below this threshold
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Error Threshold: {localSettings.confidenceThresholds.error}%
            </label>
            <input 
              type="range" 
              min="0" 
              max={localSettings.confidenceThresholds.warning - 1}
              value={localSettings.confidenceThresholds.error}
              onChange={(e) => handleConfidenceThresholdChange('error', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (Most permissive)</span>
              <span>{localSettings.confidenceThresholds.warning - 1}% (Must be less than warning)</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Show errors when confidence is below this threshold
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div>
                <p className="text-sm text-blue-900 font-medium">Confidence Levels</p>
                <p className="text-xs text-blue-700 mt-1">
                  • Above {localSettings.confidenceThresholds.warning}%: Green (Good)<br />
                  • {localSettings.confidenceThresholds.error}% - {localSettings.confidenceThresholds.warning}%: Yellow (Warning)<br />
                  • Below {localSettings.confidenceThresholds.error}%: Red (Error)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Export Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Configure default export preferences</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Export Format
            </label>
            <select 
              value={localSettings.defaultExportFormat}
              onChange={(e) => handleChange('defaultExportFormat', e.target.value as AppSettingsType['defaultExportFormat'])}
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="csv">CSV (Comma-Separated Values)</option>
              <option value="json">JSON (JavaScript Object Notation)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the default format for exporting appraisal data
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Save Location
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={localSettings.defaultSaveLocation}
                onChange={(e) => handleChange('defaultSaveLocation', e.target.value)}
                placeholder="Leave empty to prompt each time"
                className="flex-1 rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={async () => {
                  try {
                    const result = await window.electron.showOpenDialog({
                      properties: ['openDirectory']
                    });
                    if (!result.canceled && result.filePaths.length > 0) {
                      handleChange('defaultSaveLocation', result.filePaths[0]);
                    }
                  } catch (error) {
                    console.error('Failed to select directory:', error);
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set a default location for saving exported files
            </p>
          </div>
        </div>
      </div>

      {/* Report Branding Settings */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Report Branding</h2>
          <p className="text-sm text-gray-500 mt-1">Configure default information for appraisal reports</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appraiser Name
            </label>
            <input 
              type="text" 
              value={localSettings.reportDefaults?.appraiserName || ''}
              onChange={(e) => handleChange('reportDefaults', {
                ...localSettings.reportDefaults,
                appraiserName: e.target.value
              })}
              placeholder="John Doe"
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your name as it will appear on generated reports
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appraiser Credentials
            </label>
            <input 
              type="text" 
              value={localSettings.reportDefaults?.appraiserCredentials || ''}
              onChange={(e) => handleChange('reportDefaults', {
                ...localSettings.reportDefaults,
                appraiserCredentials: e.target.value
              })}
              placeholder="ASA, ISA, or other certifications"
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Professional certifications or credentials
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input 
              type="text" 
              value={localSettings.reportDefaults?.companyName || ''}
              onChange={(e) => handleChange('reportDefaults', {
                ...localSettings.reportDefaults,
                companyName: e.target.value
              })}
              placeholder="ABC Appraisal Services"
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your company or business name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={localSettings.reportDefaults?.companyLogoPath || ''}
                readOnly
                placeholder="No logo selected"
                className="flex-1 rounded-lg border-gray-300 px-3 py-2 border bg-gray-50"
              />
              <button
                onClick={async () => {
                  try {
                    const result = await window.electron.showOpenDialog({
                      properties: ['openFile'],
                      filters: [
                        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
                      ]
                    });
                    if (!result.canceled && result.filePaths.length > 0) {
                      handleChange('reportDefaults', {
                        ...localSettings.reportDefaults,
                        companyLogoPath: result.filePaths[0]
                      });
                    }
                  } catch (error) {
                    console.error('Failed to select logo:', error);
                  }
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Browse
              </button>
              {localSettings.reportDefaults?.companyLogoPath && (
                <button
                  onClick={() => handleChange('reportDefaults', {
                    ...localSettings.reportDefaults,
                    companyLogoPath: ''
                  })}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PNG or JPG format, will be displayed on report cover page
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Default Report Options</h3>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localSettings.reportDefaults?.includeDetailedCalculations ?? true}
                  onChange={(e) => handleChange('reportDefaults', {
                    ...localSettings.reportDefaults,
                    includeDetailedCalculations: e.target.checked
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    Include detailed calculations by default
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Show step-by-step calculation formulas and adjustments
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localSettings.reportDefaults?.includeQualityScoreBreakdown ?? true}
                  onChange={(e) => handleChange('reportDefaults', {
                    ...localSettings.reportDefaults,
                    includeQualityScoreBreakdown: e.target.checked
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    Include quality score breakdown by default
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Show detailed quality score factors for each comparable
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Format Settings */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Display Formats</h2>
          <p className="text-sm text-gray-500 mt-1">Customize how data is displayed</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select 
              value={localSettings.dateFormat || 'MM/DD/YYYY'}
              onChange={(e) => handleChange('dateFormat', e.target.value)}
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Example: {new Date().toLocaleDateString('en-US')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number Format
            </label>
            <select 
              value={localSettings.numberFormat || 'en-US'}
              onChange={(e) => handleChange('numberFormat', e.target.value)}
              className="w-full rounded-lg border-gray-300 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en-US">US (1,234.56)</option>
              <option value="de-DE">European (1.234,56)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Example: {(1234.56).toLocaleString(localSettings.numberFormat || 'en-US')}
            </p>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">About</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Application Version</p>
            <p className="text-sm font-medium text-gray-900">1.0.0</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">OCR Engine</p>
            <p className="text-sm font-medium text-gray-900">Tesseract.js</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Supported Formats</p>
            <p className="text-sm font-medium text-gray-900">CCC One, Mitchell</p>
          </div>
        </div>
      </div>

      {/* Save reminder at bottom */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <p className="text-yellow-800 font-medium">You have unsaved changes</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}