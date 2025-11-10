import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Progress, Tooltip, Switch } from 'antd';
import { useAppStore } from '../store';

interface OCRStatusIndicatorProps {
  showMethodToggle?: boolean;
}

export function OCRStatusIndicator({ showMethodToggle = false }: OCRStatusIndicatorProps) {
  const { 
    ocrProcessingActive, 
    ocrConfidence, 
    extractionMethod,
    currentAppraisal,
    settings 
  } = useAppStore();
  
  // Don't show if no OCR was used
  if (!ocrProcessingActive && extractionMethod !== 'ocr' && extractionMethod !== 'hybrid') {
    return null;
  }
  
  const getConfidenceLevel = (): 'high' | 'medium' | 'low' => {
    // Use settings thresholds for confidence levels
    if (ocrConfidence >= settings.confidenceThresholds.warning) return 'high';
    if (ocrConfidence >= settings.confidenceThresholds.error) return 'medium';
    return 'low';
  };
  
  const getConfidenceColor = () => {
    const level = getConfidenceLevel();
    if (level === 'high') return 'text-green-600';
    if (level === 'medium') return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getConfidenceBgColor = () => {
    const level = getConfidenceLevel();
    if (level === 'high') return 'bg-green-50 border-green-200';
    if (level === 'medium') return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };
  
  const getConfidenceIcon = () => {
    const level = getConfidenceLevel();
    if (level === 'high') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (level === 'medium') return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
  };
  
  const getGuidanceMessage = (): string => {
    const level = getConfidenceLevel();
    if (level === 'high') {
      return 'OCR extraction quality is high. The data should be accurate, but we recommend a quick verification.';
    }
    if (level === 'medium') {
      return 'OCR extraction quality is moderate. Please carefully verify all extracted fields, especially VIN and numerical values.';
    }
    return 'OCR extraction quality is low. Please thoroughly verify all extracted data and consider re-scanning the document with better quality.';
  };
  
  const getProgressColor = () => {
    const level = getConfidenceLevel();
    if (level === 'high') return { '0%': '#10b981', '100%': '#059669' };
    if (level === 'medium') return { '0%': '#f59e0b', '100%': '#d97706' };
    return { '0%': '#ef4444', '100%': '#dc2626' };
  };
  
  return (
    <div className={`rounded-lg border p-4 ${getConfidenceBgColor()}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getConfidenceIcon()}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                OCR Processing {ocrProcessingActive ? 'Active' : 'Used'}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {extractionMethod === 'ocr' 
                  ? 'Full OCR extraction' 
                  : extractionMethod === 'hybrid' 
                  ? 'Hybrid text + OCR extraction' 
                  : 'OCR-based extraction'}
              </p>
            </div>
          </div>
          
          {ocrProcessingActive && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium animate-pulse">
              Processing...
            </span>
          )}
        </div>
        
        {/* Confidence visualization */}
        {ocrConfidence > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">OCR Confidence Level</span>
              <span className={`text-sm font-bold ${getConfidenceColor()}`}>
                {ocrConfidence}%
              </span>
            </div>
            
            <Progress 
              percent={ocrConfidence} 
              showInfo={false}
              strokeColor={getProgressColor()}
              trailColor="#e5e7eb"
              size="small"
            />
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        )}
        
        {/* Guidance message */}
        <div className="bg-white bg-opacity-60 rounded-md p-3 border border-gray-200">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold mb-1">Verification Guidance</p>
              <p>{getGuidanceMessage()}</p>
            </div>
          </div>
        </div>
        
        {/* Field-specific warnings */}
        {currentAppraisal && currentAppraisal.fieldConfidences && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Fields Requiring Attention:</p>
            <div className="space-y-1">
              {Object.entries(currentAppraisal.fieldConfidences)
                .filter(([, confidence]) => confidence < settings.confidenceThresholds.warning)
                .map(([field, confidence]) => (
                  <div 
                    key={field} 
                    className="flex items-center justify-between text-xs bg-white bg-opacity-60 rounded px-2 py-1"
                  >
                    <span className="text-gray-700 capitalize">{field}</span>
                    <span className={`font-mono font-semibold ${
                      confidence >= settings.confidenceThresholds.error ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {confidence}%
                    </span>
                  </div>
                ))}
              {Object.entries(currentAppraisal.fieldConfidences).every(([, confidence]) => confidence >= settings.confidenceThresholds.warning) && (
                <p className="text-xs text-green-700 italic">All fields have high confidence scores ✓</p>
              )}
            </div>
          </div>
        )}
        
        {/* Method toggle (optional) */}
        {showMethodToggle && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700">Auto OCR Fallback</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically use OCR when standard extraction fails
                </p>
              </div>
              <Tooltip title="Toggle automatic OCR fallback">
                <Switch 
                  defaultChecked={true}
                  size="small"
                />
              </Tooltip>
            </div>
          </div>
        )}
        
        {/* Tips for better results */}
        <div className="pt-3 border-t border-gray-200">
          <details className="text-xs">
            <summary className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
              Tips for Better OCR Results
            </summary>
            <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
              <li>Ensure the PDF is high resolution (300 DPI or higher)</li>
              <li>Avoid skewed or rotated documents</li>
              <li>Use clear, high-contrast scans</li>
              <li>Ensure text is not too small or blurry</li>
              <li>Remove any watermarks or overlays if possible</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
