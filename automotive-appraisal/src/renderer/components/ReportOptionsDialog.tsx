import { useState, useEffect } from 'react';
import { ComparableVehicle, ExtractedVehicleData, ReportValidationResult } from '../../types';
import { announceToScreenReader } from '../utils/accessibility';
import { useAppStore } from '../store';
import { InlineValidationError } from './ValidationError';

/**
 * ReportOptionsDialog Component
 * 
 * A modal dialog for configuring and generating professional appraisal reports.
 * Allows users to customize report content, enter appraiser information, and select
 * which comparable vehicles to include in the report.
 * 
 * @example
 * ```tsx
 * const [isDialogOpen, setIsDialogOpen] = useState(false);
 * const [isGenerating, setIsGenerating] = useState(false);
 * 
 * const handleGenerateReport = async (options: ReportOptions) => {
 *   setIsGenerating(true);
 *   try {
 *     const result = await window.electron.generateAppraisalReport(appraisalId, options);
 *     // Handle success
 *   } catch (error) {
 *     // Handle error
 *   } finally {
 *     setIsGenerating(false);
 *     setIsDialogOpen(false);
 *   }
 * };
 * 
 * return (
 *   <>
 *     <button onClick={() => setIsDialogOpen(true)}>Generate Report</button>
 *     <ReportOptionsDialog
 *       isOpen={isDialogOpen}
 *       onClose={() => setIsDialogOpen(false)}
 *       onGenerate={handleGenerateReport}
 *       lossVehicle={currentAppraisal}
 *       comparables={comparableVehicles}
 *       isGenerating={isGenerating}
 *     />
 *   </>
 * );
 * ```
 */

export interface ReportOptions {
  includeDetailedCalculations: boolean;
  includeQualityScoreBreakdown: boolean;
  appraiserName: string;
  appraiserCredentials: string;
  companyName: string;
  companyLogo?: string;
  customNotes?: string;
  selectedComparables?: string[]; // IDs of comparables to include
  rememberSettings?: boolean; // Whether to save these settings as defaults
  generatePDF?: boolean; // Whether to also generate a PDF version
}

interface ReportOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: ReportOptions) => void;
  lossVehicle: ExtractedVehicleData | null;
  comparables: ComparableVehicle[];
  isGenerating?: boolean;
  generationProgress?: {
    stage: string;
    percentage: number;
  } | null;
}

interface ValidationErrors {
  appraiserName?: string;
  selectedComparables?: string;
}

export function ReportOptionsDialog({
  isOpen,
  onClose,
  onGenerate,
  lossVehicle,
  comparables,
  isGenerating = false,
  generationProgress = null
}: ReportOptionsDialogProps) {
  // Store access
  const validateForReport = useAppStore(state => state.validateForReport);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  
  // Form state
  const [includeDetailedCalculations, setIncludeDetailedCalculations] = useState(true);
  const [includeQualityScoreBreakdown, setIncludeQualityScoreBreakdown] = useState(true);
  const [appraiserName, setAppraiserName] = useState('');
  const [appraiserCredentials, setAppraiserCredentials] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined);
  const [customNotes, setCustomNotes] = useState('');
  const [selectedComparables, setSelectedComparables] = useState<string[]>([]);
  const [rememberSettings, setRememberSettings] = useState(false);
  const [generatePDF, setGeneratePDF] = useState(false);
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [reportValidation, setReportValidation] = useState<ReportValidationResult | null>(null);

  // Initialize selected comparables and validate when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load default values from settings
      const reportDefaults = settings.reportDefaults;
      if (reportDefaults) {
        setIncludeDetailedCalculations(reportDefaults.includeDetailedCalculations ?? true);
        setIncludeQualityScoreBreakdown(reportDefaults.includeQualityScoreBreakdown ?? true);
        setAppraiserName(reportDefaults.appraiserName || '');
        setAppraiserCredentials(reportDefaults.appraiserCredentials || '');
        setCompanyName(reportDefaults.companyName || '');
        setCompanyLogo(reportDefaults.companyLogoPath || undefined);
      }
      
      if (comparables.length > 0) {
        // Default to all comparables selected
        setSelectedComparables(comparables.map(c => c.id));
      }
      
      // Validate data for report generation
      const validation = validateForReport();
      setReportValidation(validation);
      
      // Announce validation results to screen readers
      if (!validation.isValid) {
        announceToScreenReader(
          `Report validation found ${validation.errors.length} ${validation.errors.length === 1 ? 'error' : 'errors'}. Please review and fix them before generating the report.`,
          'assertive'
        );
      }
    }
  }, [isOpen, comparables, validateForReport, settings.reportDefaults]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTouched(new Set());
      setValidationErrors({});
      setRememberSettings(false);
      setCustomNotes('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isGenerating, onClose]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Validate appraiser name (required)
    if (!appraiserName.trim()) {
      errors.appraiserName = 'Appraiser name is required';
    }

    // Validate at least 3 comparables selected
    if (selectedComparables.length < 3) {
      errors.selectedComparables = `At least 3 comparables must be selected (currently ${selectedComparables.length} selected)`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field blur
  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all required fields as touched
    setTouched(new Set(['appraiserName', 'selectedComparables']));

    // Check report validation first
    if (reportValidation && !reportValidation.isValid) {
      announceToScreenReader(
        `Cannot generate report: ${reportValidation.errors.length} data validation ${reportValidation.errors.length === 1 ? 'error' : 'errors'} must be fixed first.`,
        'assertive'
      );
      return;
    }

    // Validate form
    if (!validateForm()) {
      const errorCount = Object.keys(validationErrors).length;
      announceToScreenReader(
        `Form has ${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}. Please fix them before generating the report.`,
        'assertive'
      );
      return;
    }

    // Save settings if "Remember" is checked
    if (rememberSettings) {
      try {
        await updateSettings({
          reportDefaults: {
            appraiserName: appraiserName.trim(),
            appraiserCredentials: appraiserCredentials.trim(),
            companyName: companyName.trim(),
            companyLogoPath: companyLogo || '',
            includeDetailedCalculations,
            includeQualityScoreBreakdown
          }
        });
      } catch (error) {
        console.error('Failed to save report settings:', error);
        // Continue with report generation even if settings save fails
      }
    }

    // Generate report with options
    const options: ReportOptions = {
      includeDetailedCalculations,
      includeQualityScoreBreakdown,
      appraiserName: appraiserName.trim(),
      appraiserCredentials: appraiserCredentials.trim(),
      companyName: companyName.trim(),
      companyLogo,
      customNotes: customNotes.trim() || undefined,
      selectedComparables,
      rememberSettings,
      generatePDF
    };

    announceToScreenReader('Generating appraisal report', 'polite');
    onGenerate(options);
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isFormValid = !validationErrors.appraiserName && !validationErrors.selectedComparables;
  const hasDataValidationErrors = reportValidation && !reportValidation.isValid;
  const canGenerateReport = isFormValid && !hasDataValidationErrors;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              Generate Appraisal Report
            </h3>
            <button
              onClick={handleCancel}
              disabled={isGenerating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {lossVehicle && (
            <p className="text-sm text-gray-600 mt-2">
              {lossVehicle.year} {lossVehicle.make} {lossVehicle.model} • VIN: {lossVehicle.vin}
            </p>
          )}
        </div>
        
        {/* Data Validation Errors */}
        {reportValidation && !reportValidation.isValid && (
          <div className="px-6 pt-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-2">
                    Data Validation Errors ({reportValidation.errors.length})
                  </h4>
                  <p className="text-sm text-red-800 mb-3">
                    The following issues must be resolved before generating a report:
                  </p>
                  <ul className="space-y-2">
                    {reportValidation.errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        <div className="flex items-start">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-200 text-red-800 text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-red-900">{error.message}</p>
                            {error.suggestedAction && (
                              <p className="text-red-700 mt-1 text-xs">
                                <span className="font-semibold">Action:</span> {error.suggestedAction}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Data Validation Warnings */}
        {reportValidation && reportValidation.warnings.length > 0 && (
          <div className="px-6 pt-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                    Recommendations ({reportValidation.warnings.length})
                  </h4>
                  <ul className="space-y-2">
                    {reportValidation.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        <div className="flex items-start">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                            !
                          </span>
                          <div className="flex-1">
                            <p className="text-yellow-900">{warning.message}</p>
                            {warning.suggestedAction && (
                              <p className="text-yellow-700 mt-1 text-xs">
                                <span className="font-semibold">Suggestion:</span> {warning.suggestedAction}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {/* Report Content Options */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">Report Content</h4>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeDetailedCalculations}
                  onChange={(e) => setIncludeDetailedCalculations(e.target.checked)}
                  disabled={isGenerating}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    Include detailed calculations
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Show step-by-step calculation formulas and adjustments for each comparable
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeQualityScoreBreakdown}
                  onChange={(e) => setIncludeQualityScoreBreakdown(e.target.checked)}
                  disabled={isGenerating}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    Include quality score breakdown
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Show detailed quality score factors for each comparable vehicle
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={generatePDF}
                  onChange={(e) => setGeneratePDF(e.target.checked)}
                  disabled={isGenerating}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    Also generate PDF version
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create a PDF copy alongside the Word document (requires additional software)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Appraiser Information */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">Appraiser Information</h4>
            <div className="space-y-4">
              {/* Appraiser Name (Required) */}
              <div>
                <label htmlFor="appraiser-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Appraiser Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="appraiser-name"
                  type="text"
                  value={appraiserName}
                  onChange={(e) => setAppraiserName(e.target.value)}
                  onBlur={() => handleBlur('appraiserName')}
                  disabled={isGenerating}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    touched.has('appraiserName') && validationErrors.appraiserName
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300'
                  }`}
                  aria-invalid={touched.has('appraiserName') && !!validationErrors.appraiserName}
                  aria-describedby={touched.has('appraiserName') && validationErrors.appraiserName ? 'appraiser-name-error' : undefined}
                />
                {touched.has('appraiserName') && validationErrors.appraiserName && (
                  <p id="appraiser-name-error" className="mt-1 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {validationErrors.appraiserName}
                  </p>
                )}
              </div>

              {/* Appraiser Credentials */}
              <div>
                <label htmlFor="appraiser-credentials" className="block text-sm font-medium text-gray-700 mb-1">
                  Appraiser Credentials
                </label>
                <input
                  id="appraiser-credentials"
                  type="text"
                  value={appraiserCredentials}
                  onChange={(e) => setAppraiserCredentials(e.target.value)}
                  disabled={isGenerating}
                  placeholder="ASA, ISA, or other certifications"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Professional certifications or credentials
                </p>
              </div>

              {/* Company Name */}
              <div>
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isGenerating}
                  placeholder="ABC Appraisal Services"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Your company or business name
                </p>
              </div>

              {/* Company Logo */}
              <div>
                <label htmlFor="company-logo" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={companyLogo || ''}
                    readOnly
                    placeholder="No logo selected"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const result = await window.electron.showOpenDialog({
                          properties: ['openFile'],
                          filters: [
                            { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
                          ]
                        });
                        if (!result.canceled && result.filePaths.length > 0) {
                          const filePath = result.filePaths[0];
                          // Validate file type
                          const ext = filePath.toLowerCase().split('.').pop();
                          if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
                            setCompanyLogo(filePath);
                          } else {
                            console.error('Invalid file type. Please select a PNG or JPG file.');
                          }
                        }
                      } catch (error) {
                        console.error('Failed to select logo:', error);
                      }
                    }}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Browse
                  </button>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogo(undefined)}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Optional: PNG or JPG format, will be displayed on report cover page
                </p>
                {companyLogo && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{companyLogo.split(/[\\/]/).pop()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label htmlFor="custom-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Notes
            </label>
            <textarea
              id="custom-notes"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              disabled={isGenerating}
              rows={4}
              placeholder="Add any additional notes or comments to include in the report..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Additional context or observations to include in the report
            </p>
          </div>

          {/* Comparable Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold text-gray-900">
                Select Comparables to Include
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComparables(comparables.map(c => c.id))}
                  disabled={isGenerating}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedComparables([])}
                  disabled={isGenerating}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Choose which comparable vehicles to include in the report (minimum 3 required)
            </p>

            {/* Warning if fewer than 3 selected */}
            {selectedComparables.length < 3 && touched.has('selectedComparables') && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Insufficient Comparables Selected
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    You need to select at least 3 comparables. Currently {selectedComparables.length} selected.
                  </p>
                </div>
              </div>
            )}

            {/* Comparables list */}
            {comparables.length === 0 ? (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-600">
                  No comparable vehicles available
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                {comparables.map((comparable, index) => {
                  const isSelected = selectedComparables.includes(comparable.id);
                  
                  return (
                    <label
                      key={comparable.id}
                      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedComparables(prev => [...prev, comparable.id]);
                          } else {
                            setSelectedComparables(prev => prev.filter(id => id !== comparable.id));
                          }
                          setTouched(prev => new Set(prev).add('selectedComparables'));
                        }}
                        disabled={isGenerating}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {comparable.year} {comparable.make} {comparable.model}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                              <div className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">
                                  ${comparable.listPrice.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="truncate">{comparable.location}</span>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                <span>{comparable.mileage.toLocaleString()} mi</span>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                <span>Quality: {comparable.qualityScore.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selection summary */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {selectedComparables.length} of {comparables.length} comparables selected
              </span>
              {selectedComparables.length >= 3 && (
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium">Minimum requirement met</span>
                </div>
              )}
            </div>
          </div>

          {/* Remember Settings Option */}
          <div className="pt-4 border-t border-gray-200">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberSettings}
                onChange={(e) => setRememberSettings(e.target.checked)}
                disabled={isGenerating}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  Remember these settings for future reports
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Save appraiser information and default options to use automatically next time
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !canGenerateReport}
              title={hasDataValidationErrors ? 'Fix data validation errors before generating report' : ''}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isGenerating || !canGenerateReport
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {generationProgress ? generationProgress.stage : 'Generating Report...'}
                </span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {isGenerating && generationProgress && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{generationProgress.stage}</span>
                <span className="font-medium">{generationProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress.percentage}%` }}
                  role="progressbar"
                  aria-valuenow={generationProgress.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Report generation progress: ${generationProgress.percentage}%`}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
