import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFUploader } from '../components/PDFUploader';
import { DataDisplay } from '../components/DataDisplay';
import { ComparableVehicleForm } from '../components/ComparableVehicleForm';
import { ComparableVehicleList } from '../components/ComparableVehicleList';
import { MarketValueCalculator } from '../components/MarketValueCalculator';
import { MarketValueCalculatorErrorBoundary } from '../components/MarketValueCalculatorErrorBoundary';
import { SuccessState } from '../components/IntegrationEnhancements';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { CalculationLoadingOverlay } from '../components/CalculationLoadingOverlay';
import { AnimatedCard } from '../components/SuccessFeedback';
import { useAppStore } from '../store';
import { ErrorType, ComparableVehicle } from '../../types';
import { useNotifications } from '../hooks/useNotifications';

export function NewAppraisal() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { 
    currentAppraisal, 
    processingStatus,
    addToHistory,
    resetProcessing,
    createError,
    loadHistory,
    comparableVehicles,
    marketAnalysis,
    marketAnalysisLoading,
    marketAnalysisError,
    loadComparables,
    addComparable,
    updateComparable,
    deleteComparable,
    calculateMarketValue
  } = useAppStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedAppraisalId, setSavedAppraisalId] = useState<string | null>(null);
  const [currentAppraisalId, setCurrentAppraisalId] = useState<string | null>(null);
  const [showComparableForm, setShowComparableForm] = useState(false);
  const [editingComparable, setEditingComparable] = useState<ComparableVehicle | undefined>(undefined);
  const [comparablesLoaded, setComparablesLoaded] = useState(false);
  const [highlightMarketValue, setHighlightMarketValue] = useState(false);
  const [previousMarketValue, setPreviousMarketValue] = useState<number | null>(null);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (currentAppraisal && processingStatus === 'complete' && !isSaving) {
          handleCompleteAppraisal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAppraisal, processingStatus, isSaving]);

  // Listen for processing completion to get the appraisal ID
  useEffect(() => {
    if (processingStatus === 'complete' && currentAppraisal) {
      // The appraisal is already saved during PDF processing
      // We need to get the latest appraisal ID
      const fetchLatestAppraisal = async () => {
        try {
          const appraisals = await window.electron.getAppraisals();
          const latestAppraisal = appraisals[appraisals.length - 1];
          if (latestAppraisal && latestAppraisal.data.vin === currentAppraisal.vin) {
            setCurrentAppraisalId(latestAppraisal.id);
          }
        } catch (error) {
          console.error('Failed to fetch latest appraisal:', error);
        }
      };
      fetchLatestAppraisal();
    }
  }, [processingStatus, currentAppraisal]);

  // Handle save as draft (appraisal is already saved, just navigate)
  const handleSaveDraft = async () => {
    if (!currentAppraisal || !currentAppraisalId) return;

    setIsSaving(true);
    try {
      // Reload history to ensure it's up to date
      await loadHistory();
      
      setSavedAppraisalId(currentAppraisalId);
      
      // Show success notification
      notifications.actionSuccess('save', 'Appraisal saved as draft');
      
      // Navigate after brief delay for UX
      setTimeout(() => {
        navigate('/history');
      }, 1200);
    } catch (error) {
      createError(
        ErrorType.STORAGE_ERROR,
        'Failed to navigate to history',
        error,
        true,
        'Please try again'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle complete appraisal
  const handleCompleteAppraisal = async () => {
    if (!currentAppraisal || !currentAppraisalId) return;

    setIsSaving(true);
    try {
      // Update status to complete
      const success = await window.electron.updateAppraisalStatus(currentAppraisalId, 'complete');
      
      if (success) {
        // Reload history to get updated data
        await loadHistory();
        
        setSavedAppraisalId(currentAppraisalId);
        
        // Show success notification
        notifications.actionSuccess('save', 'Appraisal completed successfully');
        
        // Navigate after brief delay for UX
        setTimeout(() => {
          navigate('/history');
        }, 1200);
      } else {
        createError(
          ErrorType.STORAGE_ERROR,
          'Failed to update appraisal status',
          undefined,
          true,
          'Please try again'
        );
      }
    } catch (error) {
      createError(
        ErrorType.STORAGE_ERROR,
        'Failed to complete appraisal',
        error,
        true,
        'Please try again'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle start new appraisal
  const handleStartNew = () => {
    resetProcessing();
    setSavedAppraisalId(null);
  };

  // Handle add comparable
  const handleAddComparable = () => {
    if (!currentAppraisalId) {
      notifications.error('Please save the appraisal first before adding comparables');
      return;
    }
    setEditingComparable(undefined);
    setShowComparableForm(true);
  };

  // Handle edit comparable
  const handleEditComparable = (id: string) => {
    if (!currentAppraisalId) {
      notifications.error('Cannot edit comparable: Appraisal ID not found');
      return;
    }
    const comparable = comparableVehicles.find(c => c.id === id);
    if (comparable) {
      setEditingComparable(comparable);
      setShowComparableForm(true);
    }
  };

  // Handle save comparable
  const handleSaveComparable = (comparable: ComparableVehicle) => {
    if (!currentAppraisalId) {
      notifications.error('Please save the appraisal first before adding comparables');
      return;
    }

    // Store previous market value for comparison
    if (marketAnalysis) {
      setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
    }

    if (editingComparable) {
      // Update existing comparable - pass appraisal ID to store action
      updateComparable(comparable.id, comparable, currentAppraisalId);
      setShowComparableForm(false);
      setEditingComparable(undefined);
      notifications.actionSuccess('update', 'Comparable vehicle updated');
    } else {
      // Add new comparable - pass appraisal ID to store action
      addComparable(comparable, currentAppraisalId);
      setShowComparableForm(false);
      notifications.actionSuccess('create', 'Comparable vehicle added');
    }
  };

  // Handle delete comparable
  const handleDeleteComparable = (id: string) => {
    if (!currentAppraisalId) {
      notifications.error('Cannot delete comparable: Appraisal ID not found');
      return;
    }

    // Store previous market value for comparison
    if (marketAnalysis) {
      setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
    }

    // Store action handles IPC - pass appraisal ID
    deleteComparable(id, currentAppraisalId);
    notifications.actionSuccess('delete', 'Comparable vehicle removed');
  };

  // Handle recalculate market value
  const handleRecalculate = () => {
    if (currentAppraisalId && comparableVehicles.length > 0) {
      console.log('Manually recalculating market value for appraisal:', currentAppraisalId);
      
      // Store previous market value for comparison
      if (marketAnalysis) {
        setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
      }
      
      calculateMarketValue(currentAppraisalId);
    } else {
      console.warn('Cannot recalculate: missing appraisalId or no comparables', {
        currentAppraisalId,
        comparablesCount: comparableVehicles.length
      });
    }
  };

  // Load comparables when appraisal ID is available (only once per appraisal)
  useEffect(() => {
    if (currentAppraisalId && !comparablesLoaded) {
      // Use the store's loadComparables action which properly loads without triggering notifications
      loadComparables(currentAppraisalId);
      setComparablesLoaded(true);
    }
  }, [currentAppraisalId, comparablesLoaded, loadComparables]);

  // Reset comparables loaded flag when starting a new appraisal
  useEffect(() => {
    if (!currentAppraisalId) {
      setComparablesLoaded(false);
    }
  }, [currentAppraisalId]);
  
  // Show success feedback when market analysis updates
  useEffect(() => {
    if (marketAnalysis && !marketAnalysisLoading) {
      console.log('Market analysis updated:', {
        calculatedValue: marketAnalysis.calculatedMarketValue,
        comparablesCount: marketAnalysis.comparablesCount,
        hasBreakdown: !!marketAnalysis.calculationBreakdown
      });
      
      // Check if this is a new calculation (value changed)
      if (previousMarketValue !== null && previousMarketValue !== marketAnalysis.calculatedMarketValue) {
        setHighlightMarketValue(true);
        
        // Format currency for notification
        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(value);
        };
        
        notifications.successNotification(
          'Market Value Calculated',
          `New market value: ${formatCurrency(marketAnalysis.calculatedMarketValue)}`,
          { duration: 3 }
        );
        
        // Reset highlight after animation
        setTimeout(() => {
          setHighlightMarketValue(false);
          setPreviousMarketValue(null);
        }, 2500);
      } else if (previousMarketValue === null) {
        // First calculation - just show success without highlight
        notifications.success('Market value calculated successfully');
      }
    }
  }, [marketAnalysis, marketAnalysisLoading, previousMarketValue, notifications]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Appraisal</h1>
        <p className="text-gray-600 mt-1">
          Upload a PDF report to extract vehicle data and create an appraisal
        </p>
        
        {/* Debug information - remove this in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs">
            <strong>Debug Info:</strong>
            <div>Processing Status: {processingStatus}</div>
            <div>Current Appraisal: {currentAppraisal ? 'Yes' : 'No'}</div>
            <div>Current Appraisal ID: {currentAppraisalId || 'None'}</div>
            <div>Comparables Count: {comparableVehicles.length}</div>
          </div>
        )}
      </div>
      
      {savedAppraisalId ? (
        // Enhanced success state
        <SuccessState
          title="Appraisal Saved Successfully"
          description="Your appraisal has been saved and you'll be redirected to the history page."
          onContinue={() => navigate('/history')}
          onStartNew={handleStartNew}
          continueText="View History"
          startNewText="Create Another"
        />
      ) : (
        <>
          {/* Progress indicator */}
          <ProgressIndicator
            currentStep={
              savedAppraisalId ? 3 :
              comparableVehicles.length > 0 ? 2 :
              processingStatus === 'complete' ? 2 : 1
            }
            pdfProcessed={processingStatus === 'complete'}
            comparablesCount={comparableVehicles.length}
            appraisalCompleted={!!savedAppraisalId}
            className="mb-6"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Upload PDF Report</h2>
              <PDFUploader />
            </div>
            
            {(currentAppraisal || processingStatus === 'complete') && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Extracted Data</h2>
                <DataDisplay />
              </div>
            )}
          </div>
          
          {/* Enhanced Comparable Vehicles Section - always visible but conditionally enabled */}
          <div className="space-y-6 pt-6 border-t">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Comparable Vehicles</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {currentAppraisal && processingStatus === 'complete' && currentAppraisalId
                    ? "Add comparable vehicles to calculate market value"
                    : currentAppraisal && processingStatus === 'complete' && !currentAppraisalId
                    ? "Waiting for appraisal to be saved..."
                    : "Upload and process a PDF first to add comparable vehicles"
                  }
                </p>
              </div>
              <button
                onClick={handleAddComparable}
                disabled={!(currentAppraisal && processingStatus === 'complete' && currentAppraisalId) || marketAnalysisLoading}
                className="btn-primary w-full sm:w-auto"
                title={!currentAppraisalId && currentAppraisal ? "Appraisal must be saved first" : marketAnalysisLoading ? "Calculation in progress" : ""}
              >
                + Add Comparable
              </button>
            </div>
            
            {/* Error banner when appraisal ID is missing but data is ready */}
            {currentAppraisal && processingStatus === 'complete' && !currentAppraisalId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Appraisal Not Yet Saved
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      The appraisal is being saved automatically. Please wait a moment before adding comparables.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comparable Form with smooth transition */}
            {showComparableForm && (
              <div className="card fade-in-up">
                <div className="card-header">
                  <h3 className="text-md font-semibold text-gray-900">
                    {editingComparable ? 'Edit Comparable Vehicle' : 'Add Comparable Vehicle'}
                  </h3>
                </div>
                <div className="card-body">
                  {currentAppraisalId && currentAppraisal && (
                    <ComparableVehicleForm
                      appraisalId={currentAppraisalId}
                      lossVehicle={currentAppraisal}
                      existingComparable={editingComparable}
                      onSave={handleSaveComparable}
                      onCancel={() => {
                        setShowComparableForm(false);
                        setEditingComparable(undefined);
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Comparable List */}
            {comparableVehicles.length > 0 && (
              <div className="card fade-in relative">
                <CalculationLoadingOverlay 
                  isCalculating={marketAnalysisLoading}
                  message="Calculating market value..."
                  showProgress={true}
                />
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-gray-900">Your Comparable Vehicles</h3>
                    <span className="badge badge-primary">
                      {comparableVehicles.length} comparable{comparableVehicles.length !== 1 ? 's' : ''} added
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <ComparableVehicleList
                    comparables={comparableVehicles}
                    onEdit={handleEditComparable}
                    onDelete={handleDeleteComparable}
                  />
                </div>
              </div>
            )}

            {/* Market Value Summary */}
            {comparableVehicles.length > 0 && marketAnalysis && (
              <AnimatedCard highlight={highlightMarketValue} className="card fade-in relative">
                <CalculationLoadingOverlay 
                  isCalculating={marketAnalysisLoading}
                  message="Recalculating market value..."
                  showProgress={true}
                />
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-gray-900">Market Value Analysis</h3>
                    <span className="badge badge-success">Calculated</span>
                  </div>
                </div>
                <div className="card-body">
                  <MarketValueCalculatorErrorBoundary onRetry={handleRecalculate}>
                    <MarketValueCalculator
                      marketAnalysis={marketAnalysis}
                      comparablesCount={comparableVehicles.length}
                      onRecalculate={handleRecalculate}
                    />
                  </MarketValueCalculatorErrorBoundary>
                </div>
              </AnimatedCard>
            )}
            
            {/* Loading state for initial market value calculation */}
            {comparableVehicles.length > 0 && !marketAnalysis && marketAnalysisLoading && (
              <div className="card fade-in relative">
                <CalculationLoadingOverlay 
                  isCalculating={true}
                  message="Calculating market value..."
                  showProgress={true}
                />
                <div className="card-header">
                  <h3 className="text-md font-semibold text-gray-900">Market Value Analysis</h3>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center text-gray-400">
                      <p className="text-sm">Preparing analysis...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error state for market value calculation */}
            {comparableVehicles.length > 0 && !marketAnalysis && !marketAnalysisLoading && marketAnalysisError && (
              <div className="card fade-in border-red-200">
                <div className="card-header bg-red-50">
                  <h3 className="text-md font-semibold text-red-900">Market Value Calculation Error</h3>
                </div>
                <div className="card-body">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-red-800">
                          Failed to Calculate Market Value
                        </h3>
                        <p className="mt-1 text-sm text-red-700">
                          {marketAnalysisError}
                        </p>
                        <div className="mt-4">
                          <button
                            onClick={handleRecalculate}
                            className="btn-secondary text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry Calculation
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Empty State */}
            {comparableVehicles.length === 0 && !showComparableForm && (
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                currentAppraisal && processingStatus === 'complete' && currentAppraisalId
                  ? 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-300 hover:border-blue-400'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-6xl mb-4">
                  {currentAppraisal && processingStatus === 'complete' && currentAppraisalId ? '🚗' : '📄'}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentAppraisal && processingStatus === 'complete' && currentAppraisalId 
                    ? 'No Comparables Yet' 
                    : 'Ready for Comparables'
                  }
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {currentAppraisal && processingStatus === 'complete' && currentAppraisalId
                    ? 'Add comparable vehicles from AutoTrader, Cars.com, or other sources to calculate market value and build a compelling case.'
                    : 'Once you upload and process a PDF report, you\'ll be able to add comparable vehicles to build your market analysis.'
                  }
                </p>
                {currentAppraisal && processingStatus === 'complete' && currentAppraisalId && (
                  <button
                    onClick={handleAddComparable}
                    className="btn-primary btn-lg"
                  >
                    Add Your First Comparable
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons - always visible but conditionally enabled */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
            <button 
              onClick={handleSaveDraft}
              disabled={isSaving || !(currentAppraisal && processingStatus === 'complete')}
              className="btn-secondary w-full sm:w-auto"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingAnimation size="xs" variant="spinner" />
                  Saving...
                </div>
              ) : (
                'Save as Draft'
              )}
            </button>
            
            <button 
              onClick={handleCompleteAppraisal}
              disabled={isSaving || !(currentAppraisal && processingStatus === 'complete')}
              className="btn-primary w-full sm:w-auto"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingAnimation size="xs" variant="spinner" color="white" />
                  Saving...
                </div>
              ) : (
                'Complete Appraisal'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}