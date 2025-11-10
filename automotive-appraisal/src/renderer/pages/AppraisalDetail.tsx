import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { AppraisalRecord, ComparableVehicle, ErrorType } from '../../types';
import { ComparableVehicleForm } from '../components/ComparableVehicleForm';
import { ComparableVehicleList } from '../components/ComparableVehicleList';
import { MarketValueCalculator } from '../components/MarketValueCalculator';
import { MarketValueCalculatorErrorBoundary } from '../components/MarketValueCalculatorErrorBoundary';
import { EditAppraisalDialog } from '../components/EditAppraisalDialog';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { AppraisalDetailSkeleton } from '../components/SkeletonLoaders';
import { CalculationLoadingOverlay } from '../components/CalculationLoadingOverlay';
import { AnimatedCard, HighlightedValue } from '../components/SuccessFeedback';
import { useNotifications } from '../hooks/useNotifications';

export function AppraisalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notifications = useNotifications();

  // Store state
  const {
    appraisalHistory,
    comparableVehicles,
    marketAnalysis,
    marketAnalysisLoading,
    marketAnalysisError,
    loadComparables,
    addComparable,
    updateComparable,
    deleteComparable,
    calculateMarketValue,
    createError,
    setAppraisal
  } = useAppStore();

  // Local state
  const [appraisal, setAppraisalState] = useState<AppraisalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparableForm, setShowComparableForm] = useState(false);
  const [editingComparable, setEditingComparable] = useState<ComparableVehicle | undefined>(undefined);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [highlightMarketValue, setHighlightMarketValue] = useState(false);
  const [previousMarketValue, setPreviousMarketValue] = useState<number | null>(null);

  // Focus management - set focus to main heading on load
  useEffect(() => {
    if (!loading && appraisal) {
      const mainHeading = document.querySelector('h1');
      if (mainHeading) {
        mainHeading.setAttribute('tabindex', '-1');
        mainHeading.focus();
      }
    }
  }, [loading, appraisal]);

  // Load appraisal data on mount - optimized to avoid redundant calls
  useEffect(() => {
    const loadAppraisalData = async () => {
      if (!id) {
        setError('No appraisal ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Find appraisal in history (cached in store)
        const foundAppraisal = appraisalHistory.find(a => a.id === id);
        
        if (!foundAppraisal) {
          // Try loading from IPC if not in store (only once)
          const appraisalFromIPC = await window.electron.getAppraisal(id);
          
          if (!appraisalFromIPC) {
            setError('Appraisal not found');
            setLoading(false);
            return;
          }
          
          setAppraisalState(appraisalFromIPC);
          setAppraisal(appraisalFromIPC.data);
        } else {
          setAppraisalState(foundAppraisal);
          setAppraisal(foundAppraisal.data);
        }

        // Load comparables for this appraisal (store handles caching)
        await loadComparables(id);
        
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load appraisal';
        setError(errorMessage);
        setLoading(false);
        
        createError(
          ErrorType.STORAGE_ERROR,
          errorMessage,
          err,
          true,
          'Try refreshing the page or go back to history'
        );
      }
    };

    loadAppraisalData();
    // Only run when id changes - avoid running on every appraisalHistory update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle add comparable
  const handleAddComparable = () => {
    setEditingComparable(undefined);
    setShowComparableForm(true);
    
    // Focus the form after it renders
    setTimeout(() => {
      const formElement = document.querySelector('[role="form"]') as HTMLElement;
      if (formElement) {
        const firstInput = formElement.querySelector('input, select, textarea') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  };

  // Handle edit comparable
  const handleEditComparable = (comparableId: string) => {
    const comparable = comparableVehicles.find(c => c.id === comparableId);
    if (comparable) {
      setEditingComparable(comparable);
      setShowComparableForm(true);
    }
  };

  // Handle save comparable
  const handleSaveComparable = async (comparable: ComparableVehicle) => {
    if (!id) return;

    // Store previous market value for comparison
    if (marketAnalysis) {
      setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
    }

    if (editingComparable) {
      // Update existing comparable
      await updateComparable(comparable.id, comparable, id);
      setShowComparableForm(false);
      setEditingComparable(undefined);
      notifications.actionSuccess('update', 'Comparable vehicle updated');
    } else {
      // Add new comparable
      await addComparable(comparable, id);
      setShowComparableForm(false);
      notifications.actionSuccess('create', 'Comparable vehicle added');
    }
  };

  // Handle delete comparable
  const handleDeleteComparable = async (comparableId: string) => {
    if (!id) return;
    
    // Store previous market value for comparison
    if (marketAnalysis) {
      setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
    }
    
    await deleteComparable(comparableId, id);
    notifications.actionSuccess('delete', 'Comparable vehicle removed');
  };

  // Handle recalculate market value
  const handleRecalculate = async () => {
    if (id && comparableVehicles.length > 0) {
      // Store previous market value for comparison
      if (marketAnalysis) {
        setPreviousMarketValue(marketAnalysis.calculatedMarketValue);
      }
      await calculateMarketValue(id);
    }
  };

  // Show success feedback when market analysis updates
  useEffect(() => {
    if (marketAnalysis && !marketAnalysisLoading) {
      // Check if this is a new calculation (value changed)
      if (previousMarketValue !== null && previousMarketValue !== marketAnalysis.calculatedMarketValue) {
        setHighlightMarketValue(true);
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
      }
    }
  }, [marketAnalysis, marketAnalysisLoading, previousMarketValue, notifications]);

  // Handle edit appraisal
  const handleEditAppraisal = () => {
    setShowEditDialog(true);
  };

  // Handle save appraisal edits
  const handleSaveAppraisal = async (updatedData: any) => {
    if (!id || !appraisal) return;

    try {
      const success = await window.electron.updateAppraisal(id, updatedData);
      
      if (success) {
        // Update local state
        setAppraisalState(prev => prev ? { ...prev, data: updatedData } : null);
        setAppraisal(updatedData);
        setShowEditDialog(false);
        notifications.actionSuccess('update', 'Appraisal updated successfully');
        
        // Recalculate market value if comparables exist
        if (comparableVehicles.length > 0) {
          await calculateMarketValue(id);
        }
      } else {
        throw new Error('Failed to update appraisal');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appraisal';
      notifications.error(errorMessage);
      
      createError(
        ErrorType.STORAGE_ERROR,
        errorMessage,
        err,
        true,
        'Please try again'
      );
    }
  };

  // Handle generate report
  const handleGenerateReport = () => {
    // Report generation is handled by MarketValueCalculator component
  };

  // Handle retry on error
  const handleRetry = () => {
    window.location.reload();
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state with skeleton
  if (loading) {
    return <AppraisalDetailSkeleton />;
  }

  // Error state
  if (error || !appraisal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Appraisal Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || 'The appraisal you\'re looking for doesn\'t exist or has been deleted.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
              <button
                onClick={() => navigate('/history')}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="btn-secondary"
            aria-label="Back to history"
            title="Back to history (⌘H)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" tabIndex={-1}>Appraisal Details</h1>
            <p className="text-gray-600 mt-1" role="doc-subtitle">
              {appraisal.data.year} {appraisal.data.make} {appraisal.data.model}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
            appraisal.status === 'complete'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {appraisal.status === 'complete' ? '✓ Complete' : '📝 Draft'}
          </span>
        </div>
      </div>

      {/* Vehicle Information Card */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Vehicle Information</h2>
          <button
            onClick={handleEditAppraisal}
            className="btn-secondary btn-sm w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">VIN</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.vin}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Year</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.year}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Make</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.make}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Model</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.model}</p>
            </div>
            {appraisal.data.trim && (
              <div>
                <label className="text-sm font-medium text-gray-500">Trim</label>
                <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.trim}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Mileage</label>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {appraisal.data.mileage.toLocaleString()} miles
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Location</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.location}</p>
            </div>
            {appraisal.data.condition && (
              <div>
                <label className="text-sm font-medium text-gray-500">Condition</label>
                <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.condition}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Report Type</label>
              <p className="mt-1 text-base font-semibold text-gray-900">{appraisal.data.reportType}</p>
            </div>
          </div>

          {appraisal.data.equipment && appraisal.data.equipment.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-500 mb-3 block">Equipment & Features</label>
              <div className="flex flex-wrap gap-2">
                {appraisal.data.equipment.map((item: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {formatDate(appraisal.createdAt)}
            </div>
            {appraisal.updatedAt && (
              <div>
                <span className="font-medium">Last Updated:</span> {formatDate(appraisal.updatedAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparable Vehicles Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Comparable Vehicles</h2>
            <p className="text-sm text-gray-600 mt-1">
              {comparableVehicles.length > 0
                ? `${comparableVehicles.length} comparable${comparableVehicles.length !== 1 ? 's' : ''} added`
                : 'Add comparable vehicles to calculate market value'}
            </p>
          </div>
          <button
            onClick={handleAddComparable}
            disabled={marketAnalysisLoading}
            className="btn-primary w-full sm:w-auto"
            aria-label="Add comparable vehicle"
            title="Add comparable vehicle (⌘⇧A)"
          >
            + Add Comparable
          </button>
        </div>

        {/* Comparable Form */}
        {showComparableForm && (
          <div className="card fade-in-up">
            <div className="card-header">
              <h3 className="text-md font-semibold text-gray-900">
                {editingComparable ? 'Edit Comparable Vehicle' : 'Add Comparable Vehicle'}
              </h3>
            </div>
            <div className="card-body">
              <ComparableVehicleForm
                appraisalId={id!}
                lossVehicle={appraisal.data}
                existingComparable={editingComparable}
                onSave={handleSaveComparable}
                onCancel={() => {
                  setShowComparableForm(false);
                  setEditingComparable(undefined);
                }}
              />
            </div>
          </div>
        )}

        {/* Comparable List */}
        {comparableVehicles.length > 0 ? (
          <div className="card fade-in relative">
            <CalculationLoadingOverlay 
              isCalculating={marketAnalysisLoading}
              message="Calculating market value..."
              showProgress={true}
            />
            <div className="card-body">
              <ComparableVehicleList
                comparables={comparableVehicles}
                onEdit={handleEditComparable}
                onDelete={handleDeleteComparable}
              />
            </div>
          </div>
        ) : !showComparableForm && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gradient-to-br from-gray-50 to-blue-50 border-gray-300">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparables Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Add comparable vehicles from AutoTrader, Cars.com, or other sources to calculate market value.
            </p>
            <button
              onClick={handleAddComparable}
              className="btn-primary btn-lg"
            >
              Add Your First Comparable
            </button>
          </div>
        )}
      </div>

      {/* Market Value Analysis */}
      {comparableVehicles.length > 0 && marketAnalysis && (
        <AnimatedCard highlight={highlightMarketValue} className="card fade-in relative">
          <CalculationLoadingOverlay 
            isCalculating={marketAnalysisLoading}
            message="Recalculating market value..."
            showProgress={true}
          />
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Market Value Analysis</h2>
              <span className="badge badge-success">Calculated</span>
            </div>
          </div>
          <div className="card-body">
            <MarketValueCalculatorErrorBoundary onRetry={handleRecalculate}>
              <MarketValueCalculator
                marketAnalysis={marketAnalysis}
                marketAnalysisError={marketAnalysisError}
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
            <h2 className="text-lg font-semibold text-gray-900">Market Value Analysis</h2>
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

      {/* Edit Appraisal Dialog */}
      {appraisal && (
        <EditAppraisalDialog
          isOpen={showEditDialog}
          appraisalId={appraisal.id}
          initialData={appraisal.data}
          onSave={handleSaveAppraisal}
          onCancel={() => setShowEditDialog(false)}
        />
      )}
    </div>
  );
}
