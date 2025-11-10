import React, { useState, memo } from 'react';
import { MarketAnalysis, ReportHistoryRecord } from '../../types';
import { ReportOptionsDialog, ReportOptions } from './ReportOptionsDialog';
import { useAppStore } from '../store';
import { formatErrorForDisplay } from '../services/errorMessageMapper';
import { ErrorRecoveryUI } from './ErrorRecoveryUI';

interface MarketValueCalculatorProps {
  marketAnalysis: MarketAnalysis | null;
  marketAnalysisError?: string | null;
  comparablesCount?: number;
  onRecalculate: () => void;
  onExportPDF?: () => void;
}

const MarketValueCalculatorComponent: React.FC<MarketValueCalculatorProps> = ({
  marketAnalysis,
  marketAnalysisError,
  comparablesCount = 0,
  onRecalculate,
  onExportPDF
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  
  // Report generation state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportGenerationProgress, setReportGenerationProgress] = useState<{
    stage: string;
    percentage: number;
  } | null>(null);

  // Cleanup flag for background operations
  const [isMounted, setIsMounted] = useState(true);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleRecalculate = async () => {
    setIsCalculating(true);
    setCalculationError(null);
    try {
      await onRecalculate();
    } catch (error) {
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      // Map to user-friendly error message
      const userFriendlyError = formatErrorForDisplay(error);
      const errorMessage = userFriendlyError.action 
        ? `${userFriendlyError.message} ${userFriendlyError.action}`
        : userFriendlyError.message;
      setCalculationError(errorMessage);
    } finally {
      // Only update state if component is still mounted
      if (isMounted) {
        setIsCalculating(false);
      }
    }
  };

  // Get data from store for report generation
  const currentAppraisal = useAppStore(state => state.currentAppraisal);
  const comparableVehicles = useAppStore(state => state.comparableVehicles);
  const addReportToHistory = useAppStore(state => state.addReportToHistory);
  const appraisalHistory = useAppStore(state => state.appraisalHistory);
  const marketAnalysisLoading = useAppStore(state => state.marketAnalysisLoading);
  const isRecalculating = useAppStore(state => state.isRecalculating);

  // Report dialog handlers
  const handleOpenReportDialog = () => {
    setReportError(null);
    
    // Validate data completeness before opening dialog
    const validationErrors: string[] = [];
    
    if (!currentAppraisal) {
      validationErrors.push('No appraisal data available');
    } else {
      // Check required fields
      if (!currentAppraisal.vin) validationErrors.push('VIN is missing');
      if (!currentAppraisal.year) validationErrors.push('Year is missing');
      if (!currentAppraisal.make) validationErrors.push('Make is missing');
      if (!currentAppraisal.model) validationErrors.push('Model is missing');
    }
    
    if (!marketAnalysis || marketAnalysis.calculatedMarketValue === 0) {
      validationErrors.push('Market value has not been calculated');
    }
    
    if (comparableVehicles.length < 3) {
      validationErrors.push(`At least 3 comparable vehicles are required (currently ${comparableVehicles.length})`);
    }
    
    // Show validation errors if any
    if (validationErrors.length > 0) {
      setReportError(validationErrors.join('. ') + '.');
      return;
    }
    
    // Open dialog if validation passes
    setIsReportDialogOpen(true);
  };

  const handleCloseReportDialog = () => {
    if (!isGeneratingReport) {
      setIsReportDialogOpen(false);
      setReportError(null);
    }
  };

  const handleGenerateReport = async (options: ReportOptions) => {
    if (!marketAnalysis || !currentAppraisal) {
      setReportError('Missing required data for report generation');
      return;
    }

    setIsGeneratingReport(true);
    setReportError(null);
    setReportGenerationProgress({ stage: 'Preparing report data...', percentage: 10 });

    try {
      // Prepare default file name
      const defaultFileName = `${currentAppraisal.year}_${currentAppraisal.make}_${currentAppraisal.model}_Appraisal_${new Date().toISOString().split('T')[0]}.docx`;
      
      setReportGenerationProgress({ stage: 'Opening save dialog...', percentage: 20 });
      
      // Get documents path as default location
      const documentsPath = await (window.electron as any).getPath('documents');
      
      // Show save dialog to let user choose location and filename
      const saveDialogResult = await (window.electron as any).showSaveDialog({
        title: 'Save Appraisal Report',
        defaultPath: `${documentsPath}/${defaultFileName}`,
        filters: [
          { name: 'Word Documents', extensions: ['docx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      // Check if user canceled the dialog
      if (saveDialogResult.canceled || !saveDialogResult.filePath) {
        setIsGeneratingReport(false);
        setReportGenerationProgress(null);
        setIsReportDialogOpen(false);
        return;
      }

      const filePath = saveDialogResult.filePath;

      setReportGenerationProgress({ stage: 'Preparing appraisal data...', percentage: 30 });

      // Prepare appraisal data for report
      const selectedComparables = comparableVehicles.filter(c => 
        !options.selectedComparables || options.selectedComparables.includes(c.id)
      );

      const appraisalData = {
        lossVehicle: currentAppraisal,
        insuranceInfo: {
          carrier: 'Unknown', // Insurance carrier not available in ExtractedVehicleData
          valuation: currentAppraisal.settlementValue || currentAppraisal.marketValue || 0,
          date: new Date().toISOString() // Use current date as valuation date
        },
        comparables: selectedComparables,
        marketAnalysis,
        metadata: {
          reportDate: new Date().toISOString(),
          appraiser: options.appraiserName,
          credentials: options.appraiserCredentials || undefined,
          company: options.companyName || undefined
        }
      };

      setReportGenerationProgress({ stage: 'Generating DOCX document...', percentage: 50 });

      // Generate report
      const result = await (window.electron as any).generateAppraisalReport(
        appraisalData,
        options,
        filePath
      );

      setReportGenerationProgress({ stage: 'Saving report file...', percentage: 90 });

      // Note: PDF generation is not yet implemented
      // If user requested PDF, show a message
      if (options.generatePDF) {
        console.log('PDF generation requested but not yet implemented. Only DOCX will be generated.');
      }

      if (result.success && result.filePath) {
        // Find the appraisal ID from history
        const appraisalRecord = appraisalHistory.find(
          a => a.data.vin === currentAppraisal.vin
        );
        
        // Add report to history
        if (appraisalRecord) {
          const reportHistoryRecord: ReportHistoryRecord = {
            id: `${appraisalRecord.id}-${Date.now()}`,
            appraisalId: appraisalRecord.id,
            filePath: result.filePath,
            generatedAt: new Date(),
            vehicleInfo: {
              year: currentAppraisal.year,
              make: currentAppraisal.make,
              model: currentAppraisal.model,
              vin: currentAppraisal.vin
            },
            options: {
              appraiserName: options.appraiserName,
              appraiserCredentials: options.appraiserCredentials,
              companyName: options.companyName,
              includeDetailedCalculations: options.includeDetailedCalculations,
              includeQualityScoreBreakdown: options.includeQualityScoreBreakdown,
              selectedComparables: options.selectedComparables
            },
            metadata: {
              comparableCount: selectedComparables.length,
              calculatedMarketValue: marketAnalysis.calculatedMarketValue,
              insuranceValue: currentAppraisal.settlementValue || currentAppraisal.marketValue
            }
          };
          
          await addReportToHistory(reportHistoryRecord);
        }
        
        // Show success message with options
        const userChoice = window.confirm(
          `Report generated successfully!\n\nSaved to: ${result.filePath}\n\nClick OK to open the report, or Cancel to close this dialog.`
        );
        
        if (userChoice) {
          // Open the file using the system's default application
          const openResult = await (window.electron as any).openReportFile(result.filePath);
          if (!openResult.success) {
            alert(`Report saved successfully, but could not open the file:\n${openResult.error}\n\nYou can find it at: ${result.filePath}`);
          }
        }
        
        // Ask if user wants to email the report
        const emailReport = window.confirm(
          `Would you like to email this report?\n\nThis will open your default email client with the report attached.`
        );
        
        if (emailReport) {
          // Create email with report attached
          const emailSubject = `Appraisal Report - ${currentAppraisal.year} ${currentAppraisal.make} ${currentAppraisal.model}`;
          const emailBody = `Please find attached the appraisal report for:\n\n` +
            `Vehicle: ${currentAppraisal.year} ${currentAppraisal.make} ${currentAppraisal.model}\n` +
            `VIN: ${currentAppraisal.vin}\n` +
            `Market Value: ${formatCurrency(marketAnalysis.calculatedMarketValue)}\n\n` +
            `Report generated on ${new Date().toLocaleDateString()}`;
          
          // Use shell.openExternal to open mailto link
          // Note: File attachment via mailto is not universally supported
          // This will open the email client with subject and body pre-filled
          const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody + '\n\nNote: Please attach the report file manually from: ' + result.filePath)}`;
          
          try {
            await (window.electron as any).openReportFile(mailtoLink);
          } catch (error) {
            console.error('Failed to open email client:', error);
            alert(`Could not open email client. Please manually attach the report from:\n${result.filePath}`);
          }
        }
        
        // Close dialog
        setIsReportDialogOpen(false);
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
    } catch (error) {
      // Only update state if component is still mounted
      if (!isMounted) return;
      
      // Map to user-friendly error message
      const userFriendlyError = formatErrorForDisplay(error);
      console.error('Report generation error:', error);
      
      // Set error message with action guidance
      const errorMessage = userFriendlyError.action 
        ? `${userFriendlyError.message}\n\n${userFriendlyError.action}`
        : userFriendlyError.message;
      setReportError(errorMessage);
      
      // Don't close the dialog on error - allow user to retry
      // Data is preserved in the form
    } finally {
      // Only update state if component is still mounted
      if (isMounted) {
        setIsGeneratingReport(false);
        setReportGenerationProgress(null);
      }
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getConfidenceColor = (level: number): string => {
    if (level >= 90) return 'bg-green-500';
    if (level >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (level: number): string => {
    if (level >= 90) return 'High Confidence';
    if (level >= 70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getConfidenceExplanation = (level: number): string => {
    if (level >= 90) {
      return 'This valuation is highly reliable with sufficient comparable vehicles and consistent data.';
    }
    if (level >= 70) {
      return 'This valuation is reasonably reliable but could be improved with additional comparable vehicles or more consistent data.';
    }
    return 'This valuation has limited reliability. Consider adding more comparable vehicles or reviewing data quality.';
  };

  const getConfidenceIcon = (level: number): React.ReactElement => {
    if (level >= 90) {
      return (
        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (level >= 70) {
      return (
        <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  // Show error state if there's an error
  if (marketAnalysisError || calculationError) {
    const errorMessage = marketAnalysisError || calculationError;
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <ErrorRecoveryUI
            error={errorMessage || 'An error occurred while calculating market value'}
            onRetry={handleRecalculate}
            onDismiss={() => {
              setCalculationError(null);
            }}
            showRetry={!isCalculating}
            showReportIssue={true}
          />
          {isCalculating && (
            <div className="mt-4 flex items-center justify-center text-blue-600">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Retrying...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show "add comparables" message if no comparables exist
  if (!marketAnalysis || comparablesCount === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-6 py-10">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Market Value Calculated
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Add comparable vehicles to calculate the market value for this appraisal. 
              You need at least one comparable to perform the calculation.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                Tip: Add 3-5 comparables for best results
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 relative">
      {/* Loading Overlay during recalculation */}
      {(marketAnalysisLoading || isRecalculating) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Recalculating market value...</p>
          </div>
        </div>
      )}
      
      {/* Header with Market Value */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-6 py-10 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center mb-3">
            <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Calculated Market Value
            </h2>
          </div>
          
          <div className="text-6xl font-bold mb-2 tracking-tight">
            {formatCurrency(marketAnalysis.calculatedMarketValue)}
          </div>
          
          <div className="flex items-center justify-center space-x-3 text-blue-100">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-sm font-medium">
                {marketAnalysis.comparablesCount} comparable{marketAnalysis.comparablesCount !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-blue-300">•</span>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                {marketAnalysis.calculationMethod === 'quality-weighted-average' ? 'Quality-Weighted Average' : marketAnalysis.calculationMethod}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Level */}
      <div className="px-6 py-5 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            {getConfidenceIcon(marketAnalysis.confidenceLevel)}
            <div className="ml-3">
              <h3 className="text-base font-semibold text-gray-900">
                {getConfidenceLabel(marketAnalysis.confidenceLevel)}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {marketAnalysis.confidenceLevel}% confidence score
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center transition-colors"
            aria-expanded={showConfidenceDetails}
            aria-label="Toggle confidence details"
          >
            {showConfidenceDetails ? 'Hide' : 'Details'}
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${showConfidenceDetails ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-700 ease-out ${getConfidenceColor(marketAnalysis.confidenceLevel)} shadow-sm`}
            style={{ width: `${marketAnalysis.confidenceLevel}%` }}
            role="progressbar"
            aria-valuenow={marketAnalysis.confidenceLevel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Confidence level: ${marketAnalysis.confidenceLevel}%`}
          />
        </div>

        {showConfidenceDetails && (
          <div className="mt-4 space-y-3 animate-fadeIn">
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-700 leading-relaxed">
                {getConfidenceExplanation(marketAnalysis.confidenceLevel)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className={`p-3 rounded-lg border ${
                marketAnalysis.confidenceFactors.comparableCount >= 3
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  {marketAnalysis.confidenceFactors.comparableCount >= 3 ? (
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      marketAnalysis.confidenceFactors.comparableCount >= 3 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      Comparable Count: {marketAnalysis.confidenceFactors.comparableCount}
                    </p>
                    <p className={`text-xs mt-1 ${
                      marketAnalysis.confidenceFactors.comparableCount >= 3 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {marketAnalysis.confidenceFactors.comparableCount >= 3
                        ? 'Sufficient comparables for reliable analysis'
                        : `Add ${3 - marketAnalysis.confidenceFactors.comparableCount} more comparable${3 - marketAnalysis.confidenceFactors.comparableCount > 1 ? 's' : ''} for better confidence`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                marketAnalysis.confidenceFactors.qualityScoreVariance < 10
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  {marketAnalysis.confidenceFactors.qualityScoreVariance < 10 ? (
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      marketAnalysis.confidenceFactors.qualityScoreVariance < 10 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      Quality Score Variance: {marketAnalysis.confidenceFactors.qualityScoreVariance.toFixed(1)}
                    </p>
                    <p className={`text-xs mt-1 ${
                      marketAnalysis.confidenceFactors.qualityScoreVariance < 10 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {marketAnalysis.confidenceFactors.qualityScoreVariance < 10
                        ? 'Comparables have consistent quality scores'
                        : 'High variance in quality scores may affect accuracy'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                marketAnalysis.confidenceFactors.priceVariance < 0.15
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  {marketAnalysis.confidenceFactors.priceVariance < 0.15 ? (
                    <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      marketAnalysis.confidenceFactors.priceVariance < 0.15 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      Price Variance: {(marketAnalysis.confidenceFactors.priceVariance * 100).toFixed(1)}%
                    </p>
                    <p className={`text-xs mt-1 ${
                      marketAnalysis.confidenceFactors.priceVariance < 0.15 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {marketAnalysis.confidenceFactors.priceVariance < 0.15
                        ? 'Comparables have consistent pricing'
                        : 'High price variance may indicate diverse market conditions'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insurance Comparison */}
      {marketAnalysis.insuranceValue > 0 && (
        <div className="px-6 py-5 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Insurance Comparison
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Insurance Value</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(marketAnalysis.insuranceValue)}
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Market Value</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(marketAnalysis.calculatedMarketValue)}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              marketAnalysis.valueDifference > 0 
                ? 'bg-green-50 border-green-200' 
                : marketAnalysis.valueDifference < 0
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                marketAnalysis.valueDifference > 0 
                  ? 'text-green-700' 
                  : marketAnalysis.valueDifference < 0
                  ? 'text-red-700'
                  : 'text-gray-500'
              }`}>
                Difference
              </div>
              <div className={`text-2xl font-bold ${
                marketAnalysis.valueDifference > 0 
                  ? 'text-green-700' 
                  : marketAnalysis.valueDifference < 0
                  ? 'text-red-700'
                  : 'text-gray-900'
              }`}>
                {marketAnalysis.valueDifference > 0 ? '+' : ''}
                {formatCurrency(Math.abs(marketAnalysis.valueDifference))}
              </div>
              <div className={`text-sm font-medium mt-1 ${
                marketAnalysis.valueDifference > 0 
                  ? 'text-green-600' 
                  : marketAnalysis.valueDifference < 0
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}>
                {marketAnalysis.valueDifferencePercentage != null ? (
                  <>
                    {marketAnalysis.valueDifferencePercentage > 0 ? '+' : ''}
                    {marketAnalysis.valueDifferencePercentage.toFixed(1)}%
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>

          {/* Visual comparison bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Visual Comparison</span>
              <span className="font-medium">
                {marketAnalysis.valueDifference > 0 ? 'Market value higher' : marketAnalysis.valueDifference < 0 ? 'Insurance value higher' : 'Equal values'}
              </span>
            </div>
            <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gray-400 flex items-center justify-center text-xs font-medium text-white"
                style={{ 
                  width: `${Math.min(100, (marketAnalysis.insuranceValue / Math.max(marketAnalysis.insuranceValue, marketAnalysis.calculatedMarketValue)) * 100)}%` 
                }}
              >
                {marketAnalysis.insuranceValue > marketAnalysis.calculatedMarketValue * 0.3 && (
                  <span className="px-2">Insurance</span>
                )}
              </div>
              <div
                className="absolute left-0 top-0 h-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white"
                style={{ 
                  width: `${Math.min(100, (marketAnalysis.calculatedMarketValue / Math.max(marketAnalysis.insuranceValue, marketAnalysis.calculatedMarketValue)) * 100)}%` 
                }}
              >
                {marketAnalysis.calculatedMarketValue > marketAnalysis.insuranceValue * 0.3 && (
                  <span className="px-2">Market</span>
                )}
              </div>
            </div>
          </div>

          {/* Alerts and warnings */}
          {marketAnalysis.isUndervalued && marketAnalysis.valueDifferencePercentage != null && Math.abs(marketAnalysis.valueDifferencePercentage) > 20 && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-r-lg shadow-sm">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">Significant Undervaluation Detected</p>
                  <p className="text-sm text-yellow-800 mt-1 leading-relaxed">
                    The insurance valuation is <span className="font-semibold">{Math.abs(marketAnalysis.valueDifferencePercentage).toFixed(1)}%</span> below the calculated market value. 
                    This substantial difference may warrant further review and documentation.
                  </p>
                  <div className="mt-3 flex items-center text-xs text-yellow-700">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Consider reviewing comparable selection and adjustment factors</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!marketAnalysis.isUndervalued && marketAnalysis.valueDifferencePercentage != null && Math.abs(marketAnalysis.valueDifferencePercentage) > 10 && Math.abs(marketAnalysis.valueDifferencePercentage) <= 20 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Moderate Difference Noted</p>
                  <p className="text-xs text-blue-700 mt-1">
                    There is a {Math.abs(marketAnalysis.valueDifferencePercentage).toFixed(1)}% difference between values. This is within acceptable range but worth noting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {marketAnalysis.valueDifferencePercentage != null && Math.abs(marketAnalysis.valueDifferencePercentage) <= 10 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-900">Values Closely Aligned</p>
                  <p className="text-xs text-green-700 mt-1">
                    The insurance and market values are within {Math.abs(marketAnalysis.valueDifferencePercentage).toFixed(1)}% of each other, indicating good alignment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Calculation */}
      <div className="px-6 py-5 bg-gray-50">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between w-full text-left group hover:bg-white p-3 rounded-lg transition-colors"
          aria-expanded={showDetails}
          aria-label="Toggle detailed calculation"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-base font-semibold text-gray-900">Detailed Calculation Breakdown</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-blue-600 font-medium mr-2 group-hover:underline">
              {showDetails ? 'Hide' : 'Show'} Details
            </span>
            <svg
              className={`w-5 h-5 text-blue-600 transition-transform duration-300 ${showDetails ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showDetails && marketAnalysis.calculationBreakdown && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* Comparables breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Comparable Vehicles Analysis
              </h4>
              <div className="space-y-3">
                {marketAnalysis.calculationBreakdown.comparables.map((comp, idx) => (
                  <div key={comp.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mr-2">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-gray-900">Comparable {idx + 1}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Quality Score</div>
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                          {comp.qualityScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">List Price</div>
                        <div className="font-semibold text-gray-900">{formatCurrency(comp.listPrice)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Adjusted Price</div>
                        <div className="font-semibold text-blue-700">{formatCurrency(comp.adjustedPrice)}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <div className="text-xs text-blue-700 mb-1">Weighted Value</div>
                        <div className="font-bold text-blue-900">{formatCurrency(comp.weightedValue)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final calculation summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 p-5 shadow-md">
              <h4 className="text-sm font-semibold text-blue-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                Final Calculation Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">Total Weighted Value:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(marketAnalysis.calculationBreakdown.totalWeightedValue)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">Total Weights:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {marketAnalysis.calculationBreakdown.totalWeights.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-white">Final Market Value:</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(marketAnalysis.calculationBreakdown.finalMarketValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation steps */}
            {marketAnalysis.calculationBreakdown.steps && marketAnalysis.calculationBreakdown.steps.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Step-by-Step Calculation
                </h4>
                <div className="space-y-3">
                  {marketAnalysis.calculationBreakdown.steps.map((step) => (
                    <div key={step.step} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 flex-shrink-0 mt-0.5">
                        {step.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium mb-1">{step.description}</p>
                        {step.calculation && (
                          <div className="p-2 bg-gray-800 rounded text-xs font-mono text-green-400 mb-2 overflow-x-auto">
                            {step.calculation}
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="text-xs text-gray-600 mr-2">Result:</span>
                          <span className="text-sm font-semibold text-blue-700">
                            {typeof step.result === 'number' ? formatCurrency(step.result) : step.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={handleRecalculate}
          disabled={isCalculating}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isCalculating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCalculating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Recalculating...
            </span>
          ) : (
            'Recalculate'
          )}
        </button>

        <div className="flex gap-3">
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Export to PDF
            </button>
          )}
          
          {/* Generate Report Button */}
          <button
            onClick={handleOpenReportDialog}
            disabled={marketAnalysis.calculatedMarketValue === 0}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all flex items-center ${
              marketAnalysis.calculatedMarketValue === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg'
            }`}
            title={
              marketAnalysis.calculatedMarketValue === 0
                ? 'Add comparable vehicles and calculate market value before generating a report'
                : 'Generate professional appraisal report'
            }
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Report
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="px-6 py-2 bg-gray-100 text-xs text-gray-500 text-center">
        Last calculated: {new Date(marketAnalysis.calculatedAt).toLocaleString()}
      </div>

      {/* Report Options Dialog */}
      {isReportDialogOpen && currentAppraisal && (
        <ReportOptionsDialog
          isOpen={isReportDialogOpen}
          onClose={handleCloseReportDialog}
          onGenerate={handleGenerateReport}
          lossVehicle={currentAppraisal}
          comparables={comparableVehicles}
          isGenerating={isGeneratingReport}
          generationProgress={reportGenerationProgress}
        />
      )}

      {/* Report Error Display */}
      {reportError && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg z-50 animate-fadeIn">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Report Generation Error</h4>
              <p className="text-sm text-red-700">{reportError}</p>
              <button
                onClick={() => setReportError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss
              </button>
            </div>
            <button
              onClick={() => setReportError(null)}
              className="text-red-400 hover:text-red-600 ml-2"
              aria-label="Close error"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const MarketValueCalculator = memo(MarketValueCalculatorComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific props change
  return (
    prevProps.marketAnalysis?.calculatedMarketValue === nextProps.marketAnalysis?.calculatedMarketValue &&
    prevProps.marketAnalysis?.confidenceLevel === nextProps.marketAnalysis?.confidenceLevel &&
    prevProps.marketAnalysisError === nextProps.marketAnalysisError &&
    prevProps.comparablesCount === nextProps.comparablesCount
  );
});
