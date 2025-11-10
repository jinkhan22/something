import React, { useState, memo } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  PencilIcon, 
  DocumentArrowDownIcon, 
  XMarkIcon, 
  CheckIcon,
  EyeIcon,
  DocumentTextIcon,
  CameraIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Tooltip, Badge, Spin } from 'antd';
import { useAppStore } from '../store';
import { ExtractedVehicleData } from '../../types';
import { useNotifications } from '../hooks/useNotifications';
import {
  validateVIN,
  validateYear,
  validateMileage,
  validatePrice,
  validateLocation,
  validateMakeModel,
  ValidationResult
} from '../utils/formValidation';
import { announceToScreenReader } from '../utils/accessibility';

const DataDisplayComponent = () => {
  const { currentAppraisal, setAppraisal, extractionMethod, ocrConfidence, settings } = useAppStore();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const notifications = useNotifications();
  
  if (!currentAppraisal) return null;
  
  const handleEdit = (fieldKey: string, currentValue: string | number | undefined) => {
    setEditingField(fieldKey);
    setEditValue(currentValue?.toString() || '');
    setValidationError(null);
  };
  
  const validateField = (fieldKey: string, value: string): ValidationResult => {
    // Field-specific validation using enhanced validators
    if (fieldKey === 'vin') {
      return validateVIN(value);
    }
    
    if (fieldKey === 'year') {
      return validateYear(value);
    }
    
    if (fieldKey === 'make') {
      return validateMakeModel(value, 'Make');
    }
    
    if (fieldKey === 'model') {
      return validateMakeModel(value, 'Model');
    }
    
    if (fieldKey === 'mileage') {
      return validateMileage(value, { year: currentAppraisal.year });
    }
    
    if (fieldKey === 'location') {
      return validateLocation(value);
    }
    
    if (fieldKey === 'marketValue') {
      return validatePrice(value, { fieldName: 'Market Value' });
    }
    
    if (fieldKey === 'settlementValue') {
      return validatePrice(value, { fieldName: 'Settlement Value' });
    }
    
    // Generic validation for other fields
    if (!value.trim()) {
      return { 
        valid: false, 
        error: 'This field cannot be empty',
        suggestion: 'Enter a value',
        severity: 'error'
      };
    }
    
    return { valid: true };
  };
  
  const handleSave = (fieldKey: keyof ExtractedVehicleData) => {
    if (!currentAppraisal) return;
    
    // Validate the field
    const validation = validateField(fieldKey, editValue);
    if (!validation.valid) {
      const errorMessage = validation.error || 'Invalid value';
      const fullMessage = validation.suggestion 
        ? `${errorMessage}. ${validation.suggestion}` 
        : errorMessage;
      setValidationError(fullMessage);
      announceToScreenReader(fullMessage, 'assertive');
      return;
    }
    
    // Show warning but allow save
    if (validation.severity === 'warning' && validation.error) {
      announceToScreenReader(`Warning: ${validation.error}`, 'polite');
    }
    
    let updatedValue: string | number = editValue;
    
    // Type conversion based on field
    if (fieldKey === 'year' || fieldKey === 'mileage' || fieldKey === 'marketValue' || fieldKey === 'settlementValue') {
      const numValue = parseFloat(editValue.replace(/[$,]/g, ''));
      updatedValue = numValue;
    }
    
    const updatedAppraisal = {
      ...currentAppraisal,
      [fieldKey]: updatedValue
    };
    
    setAppraisal(updatedAppraisal);
    setEditingField(null);
    setValidationError(null);
    announceToScreenReader(`${fieldKey} updated successfully`, 'polite');
    notifications.actionSuccess('update', `${fieldKey} updated successfully`);
  };
  
  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
    setValidationError(null);
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const data = {
        vin: currentAppraisal.vin,
        year: currentAppraisal.year,
        make: currentAppraisal.make,
        model: currentAppraisal.model,
        mileage: currentAppraisal.mileage,
        location: currentAppraisal.location,
        marketValue: currentAppraisal.marketValue,
        settlementValue: currentAppraisal.settlementValue,
        reportType: currentAppraisal.reportType,
        extractionMethod: currentAppraisal.extractionMethod || extractionMethod,
        extractionConfidence: currentAppraisal.extractionConfidence,
        ocrConfidence: currentAppraisal.ocrConfidence || ocrConfidence
      };
      
      // Use default export format from settings
      const format = settings.defaultExportFormat;
      let content: string;
      let mimeType: string;
      let extension: string;
      
      if (format === 'json') {
        // Create JSON content
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        // Create CSV content (default)
        const headers = Object.keys(data).join(',');
        const values = Object.values(data).map(v => 
          typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(',');
        content = `${headers}\n${values}`;
        mimeType = 'text/csv';
        extension = 'csv';
      }
      
      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appraisal_${currentAppraisal.vin}_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      notifications.actionSuccess('export', `Data exported as ${extension.toUpperCase()}`);
    } catch (error) {
      notifications.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const getFieldConfidence = (fieldKey: string): number | undefined => {
    return currentAppraisal.fieldConfidences?.[fieldKey];
  };
  
  const getConfidenceColor = (confidence: number | undefined): string => {
    if (confidence === undefined) return 'text-gray-400';
    // Use settings thresholds for color coding
    if (confidence >= settings.confidenceThresholds.warning) return 'text-green-600';
    if (confidence >= settings.confidenceThresholds.error) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getConfidenceBgColor = (confidence: number | undefined): string => {
    if (confidence === undefined) return 'bg-gray-100';
    // Use settings thresholds for background color
    if (confidence >= settings.confidenceThresholds.warning) return 'bg-green-100';
    if (confidence >= settings.confidenceThresholds.error) return 'bg-yellow-100';
    return 'bg-red-100';
  };
  
  const getExtractionMethodBadge = () => {
    const method = currentAppraisal.extractionMethod || extractionMethod;
    
    if (method === 'standard') {
      return (
        <Badge 
          count={
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <DocumentTextIcon className="w-3 h-3" />
              Standard
            </span>
          }
        />
      );
    }
    
    if (method === 'ocr') {
      return (
        <Badge 
          count={
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              <CameraIcon className="w-3 h-3" />
              OCR
            </span>
          }
        />
      );
    }
    
    if (method === 'hybrid') {
      return (
        <Badge 
          count={
            <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              <SparklesIcon className="w-3 h-3" />
              Hybrid
            </span>
          }
        />
      );
    }
    
    return null;
  };

  const fieldGroups = [
    {
      title: 'Vehicle Identification',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      fields: [
        { label: 'VIN', key: 'vin', value: currentAppraisal.vin, required: true, editable: true },
        { label: 'Year', key: 'year', value: currentAppraisal.year?.toString(), required: true, editable: true },
        { label: 'Make', key: 'make', value: currentAppraisal.make, required: true, editable: true },
        { label: 'Model', key: 'model', value: currentAppraisal.model, required: true, editable: true },
      ]
    },
    {
      title: 'Vehicle Details',
      icon: <EyeIcon className="w-5 h-5" />,
      fields: [
        { label: 'Mileage', key: 'mileage', value: currentAppraisal.mileage?.toLocaleString(), required: true, editable: true },
        { label: 'Location', key: 'location', value: currentAppraisal.location, required: false, editable: true },
        { label: 'Report Type', key: 'reportType', value: currentAppraisal.reportType, required: false, editable: false },
      ]
    },
    {
      title: 'Valuation',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      fields: [
        { label: 'Market Value', key: 'marketValue', value: currentAppraisal.marketValue ? `$${currentAppraisal.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined, required: false, editable: true },
        { label: 'Settlement Value', key: 'settlementValue', value: currentAppraisal.settlementValue ? `$${currentAppraisal.settlementValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined, required: false, editable: true },
      ]
    }
  ];
  
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">Extracted Vehicle Data</h2>
                {getExtractionMethodBadge()}
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Overall Confidence:</span>
                  <ConfidenceIndicator score={currentAppraisal.extractionConfidence} />
                </div>
                
                {(extractionMethod === 'ocr' || extractionMethod === 'hybrid') && ocrConfidence > 0 && (
                  <Tooltip title="OCR processing confidence level">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-yellow-200">
                      <CameraIcon className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">OCR: {ocrConfidence}%</span>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
            
            <Tooltip title={`Export data as ${settings.defaultExportFormat.toUpperCase()}`}>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Spin size="small" className="text-white" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Export {settings.defaultExportFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Field Groups */}
      {fieldGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="text-gray-600">{group.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{group.title}</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-3">
            {group.fields.map(field => {
              const fieldConfidence = getFieldConfidence(field.key);
              const isEditing = editingField === field.key;
              const hasLowConfidence = fieldConfidence !== undefined && fieldConfidence < settings.confidenceThresholds.error;
              const isMissingRequired = field.required && !field.value;
              
              return (
                <div 
                  key={field.label} 
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    isEditing 
                      ? 'border-blue-300 bg-blue-50 shadow-md' 
                      : hasLowConfidence 
                        ? 'border-red-200 bg-red-50 hover:border-red-300' 
                        : isMissingRequired
                          ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {field.label}
                        </span>
                        
                        {/* Field confidence badge */}
                        {fieldConfidence !== undefined && (
                          <Tooltip title={`Field confidence: ${fieldConfidence}%`}>
                            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${getConfidenceBgColor(fieldConfidence)} ${getConfidenceColor(fieldConfidence)}`}>
                              {fieldConfidence}%
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className={`w-full px-3 py-2 pr-10 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                validationError 
                                  ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                                  : 'border-blue-300 bg-white focus:ring-blue-500'
                              }`}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(field.key as keyof ExtractedVehicleData);
                                if (e.key === 'Escape') handleCancel();
                              }}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              aria-label={`Edit ${field.label}`}
                              aria-invalid={validationError ? 'true' : 'false'}
                              aria-describedby={validationError ? `${field.key}-error` : undefined}
                            />
                            {validationError && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          
                          {validationError && (
                            <div 
                              id={`${field.key}-error`}
                              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                              role="alert"
                              aria-live="polite"
                            >
                              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-800">
                                  {validationError.split('. ')[0]}
                                </p>
                                {validationError.includes('. ') && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {validationError.split('. ').slice(1).join('. ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleSave(field.key as keyof ExtractedVehicleData)}
                              disabled={!!validationError}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Save changes"
                            >
                              <CheckIcon className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                              aria-label="Cancel editing"
                            >
                              <XMarkIcon className="w-4 h-4" />
                              Cancel
                            </button>
                            <span className="text-xs text-gray-500 ml-2" aria-live="polite">
                              Press Enter to save, Esc to cancel
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={`text-base font-medium flex-1 ${
                            field.value ? 'text-gray-900' : 'text-gray-400 italic'
                          }`}>
                            {field.value || 'Not available'}
                          </span>
                          
                          {field.editable && (
                            <Tooltip title="Click to edit this field">
                              <button
                                onClick={() => handleEdit(field.key, field.value)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Status indicators */}
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {/* Validation status */}
                        {field.required && (
                          field.value ? 
                            <Tooltip title="Field validated">
                              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                            </Tooltip> :
                            <Tooltip title="Required field missing">
                              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                            </Tooltip>
                        )}
                        
                        {/* Low confidence warning */}
                        {hasLowConfidence && (
                          <Tooltip title="Low confidence - please verify this field">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Extraction Method Info Card */}
      {extractionMethod && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                extractionMethod === 'standard' ? 'bg-blue-100' :
                extractionMethod === 'ocr' ? 'bg-yellow-100' :
                'bg-purple-100'
              }`}>
                {extractionMethod === 'standard' && <DocumentTextIcon className="w-6 h-6 text-blue-600" />}
                {extractionMethod === 'ocr' && <CameraIcon className="w-6 h-6 text-yellow-600" />}
                {extractionMethod === 'hybrid' && <SparklesIcon className="w-6 h-6 text-purple-600" />}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Extraction Method</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {extractionMethod === 'standard' && 'Standard text extraction was used for this document. This method provides the highest accuracy for text-based PDFs.'}
                  {extractionMethod === 'ocr' && 'Optical Character Recognition (OCR) was used to extract text from images. Please verify the accuracy of extracted data, especially for fields with low confidence scores.'}
                  {extractionMethod === 'hybrid' && 'A combination of standard extraction and OCR was used for this document. Some pages used text extraction while others required OCR processing.'}
                </p>
                
                {(extractionMethod === 'ocr' || extractionMethod === 'hybrid') && ocrConfidence > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">OCR Confidence:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            ocrConfidence >= 80 ? 'bg-green-500' : 
                            ocrConfidence >= 60 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${ocrConfidence}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${
                        ocrConfidence >= 80 ? 'text-green-600' : 
                        ocrConfidence >= 60 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {ocrConfidence}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConfidenceIndicatorProps {
  score: number;
}

function ConfidenceIndicator({ score }: ConfidenceIndicatorProps) {
  const { settings } = useAppStore();
  
  const getColor = () => {
    if (score >= settings.confidenceThresholds.warning) return 'bg-green-500';
    if (score >= settings.confidenceThresholds.error) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getTextColor = () => {
    if (score >= settings.confidenceThresholds.warning) return 'text-green-700';
    if (score >= settings.confidenceThresholds.error) return 'text-yellow-700';
    return 'text-red-700';
  };
  
  const getBgColor = () => {
    if (score >= settings.confidenceThresholds.warning) return 'bg-green-100';
    if (score >= settings.confidenceThresholds.error) return 'bg-yellow-100';
    return 'bg-red-100';
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div 
          className={`h-full ${getColor()} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-sm font-bold px-2 py-1 rounded-lg ${getBgColor()} ${getTextColor()}`}>
        {score}%
      </span>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const DataDisplay = memo(DataDisplayComponent);
