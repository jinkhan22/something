import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { AppraisalRecord, ErrorType, ExtractedVehicleData, ComparableVehicle } from '../../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EditAppraisalDialog } from '../components/EditAppraisalDialog';
import { ComparableVehicleForm } from '../components/ComparableVehicleForm';
import { ComparableVehicleList } from '../components/ComparableVehicleList';
import { MarketValueCalculator } from '../components/MarketValueCalculator';
import { InsuranceComparisonPanel } from '../components/InsuranceComparisonPanel';
import { ReportHistory } from '../components/ReportHistory';

type SortField = 'createdAt' | 'year' | 'make' | 'model' | 'vin' | 'mileage' | 'confidence';
type SortDirection = 'asc' | 'desc';

export function History() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { 
    appraisalHistory, 
    historyLoading, 
    historyError,
    loadHistory,
    updateHistoryItem,
    removeFromHistory,
    createError,
    settings,
    comparableVehicles,
    marketAnalysis,
    addComparable,
    updateComparable,
    deleteComparable,
    calculateMarketValue,
    loadComparables,
    reportHistory,
    reportHistoryLoading,
    reportHistoryError,
    loadReportHistory,
    deleteReportFromHistory
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'complete'>('all');
  const [extractionMethodFilter, setExtractionMethodFilter] = useState<'all' | 'standard' | 'ocr' | 'hybrid'>('all');
  const [marketAnalysisFilter, setMarketAnalysisFilter] = useState<'all' | 'with' | 'without'>('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [confidenceMin, setConfidenceMin] = useState<number>(0);
  const [confidenceMax, setConfidenceMax] = useState<number>(100);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedAppraisal, setSelectedAppraisal] = useState<AppraisalRecord | null>(null);
  const [selectedAppraisals, setSelectedAppraisals] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ isOpen: boolean; id?: string; isBulk?: boolean }>({ isOpen: false });
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; appraisal?: AppraisalRecord }>({ isOpen: false });
  const [showComparableForm, setShowComparableForm] = useState(false);
  const [editingComparable, setEditingComparable] = useState<ComparableVehicle | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'appraisals' | 'reports'>('appraisals');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportDateFilter, setReportDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');

  // Load history data on mount
  useEffect(() => {
    loadHistory();
    loadReportHistory();
  }, [loadHistory, loadReportHistory]);

  // Load selected appraisal if ID is in URL
  useEffect(() => {
    if (id && appraisalHistory.length > 0) {
      const appraisal = appraisalHistory.find(a => a.id === id);
      if (appraisal) {
        setSelectedAppraisal(appraisal);
      } else {
        navigate('/history');
      }
    }
  }, [id, appraisalHistory, navigate]);

  // Filter, search, and sort appraisals
  const filteredAppraisals = useMemo(() => {
    let filtered = appraisalHistory;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Apply extraction method filter
    if (extractionMethodFilter !== 'all') {
      filtered = filtered.filter(a => a.data.extractionMethod === extractionMethodFilter);
    }

    // Apply market analysis filter
    if (marketAnalysisFilter !== 'all') {
      filtered = filtered.filter(a => {
        const hasComparables = (a as any).hasComparables || (a as any).comparableCount > 0;
        return marketAnalysisFilter === 'with' ? hasComparables : !hasComparables;
      });
    }

    // Apply date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(a => new Date(a.createdAt) >= startDate);
    }
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => new Date(a.createdAt) <= endDate);
    }

    // Apply confidence range filter
    if (confidenceMin > 0 || confidenceMax < 100) {
      filtered = filtered.filter(a => 
        a.data.extractionConfidence >= confidenceMin && 
        a.data.extractionConfidence <= confidenceMax
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.data.vin.toLowerCase().includes(query) ||
        a.data.make.toLowerCase().includes(query) ||
        a.data.model.toLowerCase().includes(query) ||
        a.data.year.toString().includes(query) ||
        a.data.location.toLowerCase().includes(query) ||
        (a.data.trim && a.data.trim.toLowerCase().includes(query)) ||
        (a.data.marketValue && a.data.marketValue.toString().includes(query)) ||
        (a.data.settlementValue && a.data.settlementValue.toString().includes(query)) ||
        ((a as any).calculatedMarketValue && (a as any).calculatedMarketValue.toString().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'year':
          aValue = a.data.year;
          bValue = b.data.year;
          break;
        case 'make':
          aValue = a.data.make.toLowerCase();
          bValue = b.data.make.toLowerCase();
          break;
        case 'model':
          aValue = a.data.model.toLowerCase();
          bValue = b.data.model.toLowerCase();
          break;
        case 'vin':
          aValue = a.data.vin.toLowerCase();
          bValue = b.data.vin.toLowerCase();
          break;
        case 'mileage':
          aValue = a.data.mileage;
          bValue = b.data.mileage;
          break;
        case 'confidence':
          aValue = a.data.extractionConfidence;
          bValue = b.data.extractionConfidence;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [appraisalHistory, statusFilter, extractionMethodFilter, dateRangeStart, dateRangeEnd, confidenceMin, confidenceMax, searchQuery, sortField, sortDirection]);

  // Handle status update
  const handleStatusUpdate = async (appraisalId: string, newStatus: 'draft' | 'complete') => {
    try {
      const success = await window.electron.updateAppraisalStatus(appraisalId, newStatus);
      if (success) {
        updateHistoryItem(appraisalId, { status: newStatus });
        if (selectedAppraisal?.id === appraisalId) {
          setSelectedAppraisal({ ...selectedAppraisal, status: newStatus });
        }
      } else {
        createError(ErrorType.STORAGE_ERROR, 'Failed to update appraisal status', undefined, true, 'Please try again');
      }
    } catch (error) {
      createError(ErrorType.STORAGE_ERROR, 'Failed to update appraisal status', error, true, 'Please try again');
    }
  };

  // Handle delete
  const handleDelete = async (appraisalId: string) => {
    setIsDeleting(true);
    try {
      const success = await window.electron.deleteAppraisal(appraisalId);
      if (success) {
        removeFromHistory(appraisalId);
        if (selectedAppraisal?.id === appraisalId) {
          setSelectedAppraisal(null);
          navigate('/history');
        }
        setDeleteConfirmDialog({ isOpen: false });
      } else {
        createError(ErrorType.STORAGE_ERROR, 'Failed to delete appraisal', undefined, true, 'Please try again');
      }
    } catch (error) {
      createError(ErrorType.STORAGE_ERROR, 'Failed to delete appraisal', error, true, 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedAppraisals.size === 0) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedAppraisals).map(id => 
        window.electron.deleteAppraisal(id)
      );
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r).length;
      
      if (successCount > 0) {
        Array.from(selectedAppraisals).forEach(id => {
          removeFromHistory(id);
        });
        setSelectedAppraisals(new Set());
        setDeleteConfirmDialog({ isOpen: false });
      }
      
      if (successCount < selectedAppraisals.size) {
        createError(
          ErrorType.STORAGE_ERROR, 
          `Failed to delete ${selectedAppraisals.size - successCount} appraisal(s)`, 
          undefined, 
          true, 
          'Please try again'
        );
      }
    } catch (error) {
      createError(ErrorType.STORAGE_ERROR, 'Failed to delete appraisals', error, true, 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit save
  const handleEditSave = (data: ExtractedVehicleData) => {
    if (editDialog.appraisal) {
      updateHistoryItem(editDialog.appraisal.id, { data });
      if (selectedAppraisal?.id === editDialog.appraisal.id) {
        setSelectedAppraisal({ ...selectedAppraisal, data });
      }
      setEditDialog({ isOpen: false });
    }
  };

  // Handle bulk export
  const handleBulkExport = async (format?: 'csv' | 'json') => {
    if (selectedAppraisals.size === 0) return;
    
    // Use provided format or default from settings
    const exportFormat = format || settings.defaultExportFormat;
    
    setIsExporting(true);
    try {
      const appraisalIds = Array.from(selectedAppraisals);
      const result = exportFormat === 'csv' 
        ? await window.electron.exportToCSV(appraisalIds)
        : await window.electron.exportToJSON(appraisalIds);
      
      if (result.success) {
        alert(`Successfully exported ${appraisalIds.length} appraisal(s) to ${result.filePath}`);
        setSelectedAppraisals(new Set());
      } else {
        createError(
          ErrorType.STORAGE_ERROR, 
          result.error || 'Export failed', 
          undefined, 
          true, 
          'Please try again'
        );
      }
    } catch (error) {
      createError(ErrorType.STORAGE_ERROR, 'Failed to export appraisals', error, true, 'Please try again');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAppraisals.size === filteredAppraisals.length) {
      setSelectedAppraisals(new Set());
    } else {
      setSelectedAppraisals(new Set(filteredAppraisals.map(a => a.id)));
    }
  };

  // Handle toggle selection
  const handleToggleSelection = (id: string) => {
    const newSelection = new Set(selectedAppraisals);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedAppraisals(newSelection);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setExtractionMethodFilter('all');
    setMarketAnalysisFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setConfidenceMin(0);
    setConfidenceMax(100);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || extractionMethodFilter !== 'all' || 
    marketAnalysisFilter !== 'all' || dateRangeStart || dateRangeEnd || confidenceMin > 0 || confidenceMax < 100;

  // Handle view details
  const handleViewDetails = (appraisal: AppraisalRecord) => {
    setSelectedAppraisal(appraisal);
    navigate(`/history/${appraisal.id}`);
  };

  // Handle close details
  const handleCloseDetails = () => {
    setSelectedAppraisal(null);
    navigate('/history');
  };

  // Handle add comparable
  const handleAddComparable = () => {
    setEditingComparable(undefined);
    setShowComparableForm(true);
  };

  // Handle edit comparable
  const handleEditComparable = (id: string) => {
    const comparable = comparableVehicles.find(c => c.id === id);
    if (comparable) {
      setEditingComparable(comparable);
      setShowComparableForm(true);
    }
  };

  // Handle save comparable
  const handleSaveComparable = (comparable: ComparableVehicle) => {
    if (!selectedAppraisal) return;

    if (editingComparable) {
      updateComparable(comparable.id, comparable);
      setShowComparableForm(false);
      setEditingComparable(undefined);
    } else {
      addComparable(comparable);
      setShowComparableForm(false);
    }
  };

  // Handle delete comparable
  const handleDeleteComparable = (id: string) => {
    if (!selectedAppraisal) return;
    deleteComparable(id);
  };

  // Handle recalculate market value
  const handleRecalculate = () => {
    if (selectedAppraisal && comparableVehicles.length > 0) {
      calculateMarketValue(selectedAppraisal.id);
    }
  };

  // Load comparables when appraisal is selected
  useEffect(() => {
    if (selectedAppraisal) {
      loadComparables(selectedAppraisal.id);
    }
  }, [selectedAppraisal?.id]);

  // Handle open report file
  const handleOpenReport = async (filePath: string) => {
    try {
      const result = await window.electron.openReportFile(filePath);
      if (!result.success) {
        createError(
          ErrorType.UNKNOWN_ERROR,
          result.error || 'Failed to open report file',
          undefined,
          true,
          'Check if the file still exists at the specified location'
        );
      }
    } catch (error) {
      createError(
        ErrorType.UNKNOWN_ERROR,
        'Failed to open report file',
        error,
        true,
        'Check if the file still exists at the specified location'
      );
    }
  };

  // Handle regenerate report
  const handleRegenerateReport = (appraisalId: string) => {
    // Find the appraisal and navigate to it
    const appraisal = appraisalHistory.find(a => a.id === appraisalId);
    if (appraisal) {
      setSelectedAppraisal(appraisal);
      navigate(`/history/${appraisalId}`);
      // User can then click "Generate Report" button in the detail view
    } else {
      createError(
        ErrorType.UNKNOWN_ERROR,
        'Appraisal not found',
        undefined,
        false,
        'The appraisal may have been deleted'
      );
    }
  };

  // Handle delete report from history
  const handleDeleteReportFromHistory = async (id: string) => {
    try {
      await deleteReportFromHistory(id);
    } catch (error) {
      // Error is already handled in the store action
    }
  };

  // Filter reports based on search and date
  const filteredReports = useMemo(() => {
    let filtered = [...reportHistory];

    // Apply search filter
    if (reportSearchQuery.trim()) {
      const query = reportSearchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.vehicleInfo.year.toString().includes(query) ||
        report.vehicleInfo.make.toLowerCase().includes(query) ||
        report.vehicleInfo.model.toLowerCase().includes(query) ||
        report.vehicleInfo.vin.toLowerCase().includes(query) ||
        report.options.appraiserName.toLowerCase().includes(query) ||
        (report.options.companyName && report.options.companyName.toLowerCase().includes(query))
      );
    }

    // Apply date filter
    if (reportDateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (reportDateFilter) {
        case '7days':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }
      
      filtered = filtered.filter(report => 
        new Date(report.generatedAt) >= cutoffDate
      );
    }

    return filtered;
  }, [reportHistory, reportSearchQuery, reportDateFilter]);

  // Render loading state
  if (historyLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appraisal History</h1>
          <p className="text-gray-600 mt-1">
            View and manage your past appraisals
          </p>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            <div className="h-20 bg-gray-200 rounded w-full"></div>
            <div className="h-20 bg-gray-200 rounded w-full"></div>
            <div className="h-20 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (historyError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appraisal History</h1>
          <p className="text-gray-600 mt-1">
            View and manage your past appraisals
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-1">
                Failed to Load History
              </h3>
              <p className="text-red-700 mb-4">{historyError}</p>
              <button
                onClick={() => loadHistory()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render detail view if appraisal is selected
  if (selectedAppraisal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCloseDetails}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to History
          </button>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedAppraisal.data.year} {selectedAppraisal.data.make} {selectedAppraisal.data.model}
              </h1>
              <p className="text-gray-600 mt-1">
                Created {new Date(selectedAppraisal.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Upload a new PDF to re-process this appraisal"
              >
                Re-process
              </button>
              <select
                value={selectedAppraisal.status}
                onChange={(e) => handleStatusUpdate(selectedAppraisal.id, e.target.value as 'draft' | 'complete')}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="complete">Complete</option>
              </select>
              <button
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    // Use default export format from settings
                    const result = settings.defaultExportFormat === 'csv'
                      ? await window.electron.exportToCSV([selectedAppraisal.id])
                      : await window.electron.exportToJSON([selectedAppraisal.id]);
                    if (result.success) {
                      alert(`Successfully exported to ${result.filePath}`);
                    } else {
                      createError(ErrorType.STORAGE_ERROR, result.error || 'Export failed', undefined, true, 'Please try again');
                    }
                  } catch (error) {
                    createError(ErrorType.STORAGE_ERROR, 'Failed to export appraisal', error, true, 'Please try again');
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : `Export (${settings.defaultExportFormat.toUpperCase()})`}
              </button>
              <button
                onClick={() => setEditDialog({ isOpen: true, appraisal: selectedAppraisal })}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirmDialog({ isOpen: true, id: selectedAppraisal.id })}
                disabled={isDeleting}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Vehicle Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">VIN</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.vin}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Year</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.year}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Make</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.make}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Model</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.model}</p>
                </div>
                {selectedAppraisal.data.trim && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Trim</p>
                    <p className="font-medium text-gray-900">{selectedAppraisal.data.trim}</p>
                  </div>
                )}
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Mileage</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.mileage.toLocaleString()} miles</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.location}</p>
                </div>
              </div>
            </div>

            {/* Valuation Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Valuation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAppraisal.data.marketValue && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="text-sm text-gray-500 mb-1">Market Value</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${selectedAppraisal.data.marketValue.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedAppraisal.data.settlementValue && (
                  <div className="border rounded-lg p-4 bg-green-50">
                    <p className="text-sm text-gray-500 mb-1">Settlement Value</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${selectedAppraisal.data.settlementValue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Report Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Report Type</p>
                  <p className="font-medium text-gray-900">{selectedAppraisal.data.reportType}</p>
                </div>
                {selectedAppraisal.data.extractionMethod && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Extraction Method</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedAppraisal.data.extractionMethod === 'ocr' 
                        ? 'bg-orange-100 text-orange-700'
                        : selectedAppraisal.data.extractionMethod === 'hybrid'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedAppraisal.data.extractionMethod.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Extraction Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedAppraisal.data.extractionConfidence >= settings.confidenceThresholds.warning ? 'bg-green-500' :
                          selectedAppraisal.data.extractionConfidence >= settings.confidenceThresholds.error ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${selectedAppraisal.data.extractionConfidence}%` }}
                      ></div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedAppraisal.data.extractionConfidence}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extraction Errors */}
            {selectedAppraisal.data.extractionErrors.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Extraction Notes</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-1">
                    {selectedAppraisal.data.extractionErrors.map((error: string, index: number) => (
                      <li key={index} className="text-sm text-yellow-800">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Comparable Vehicles Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Comparable Vehicles</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Market analysis based on comparable vehicles
                  </p>
                </div>
                <button
                  onClick={handleAddComparable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Add Comparable
                </button>
              </div>

              {/* Comparable Form */}
              {showComparableForm && (
                <div className="bg-gray-50 border rounded-lg p-6 mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">
                    {editingComparable ? 'Edit Comparable Vehicle' : 'Add Comparable Vehicle'}
                  </h3>
                  <ComparableVehicleForm
                    appraisalId={selectedAppraisal.id}
                    lossVehicle={selectedAppraisal.data}
                    existingComparable={editingComparable}
                    onSave={handleSaveComparable}
                    onCancel={() => {
                      setShowComparableForm(false);
                      setEditingComparable(undefined);
                    }}
                  />
                </div>
              )}

              {/* Comparable List */}
              {comparableVehicles.length > 0 && (
                <div className="mb-6">
                  <ComparableVehicleList
                    comparables={comparableVehicles}
                    onEdit={handleEditComparable}
                    onDelete={handleDeleteComparable}
                  />
                </div>
              )}

              {/* Insurance Comparison */}
              {marketAnalysis && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Insurance Comparison</h3>
                  <InsuranceComparisonPanel
                    insuranceValue={marketAnalysis.insuranceValue}
                    calculatedValue={marketAnalysis.calculatedMarketValue}
                    difference={marketAnalysis.valueDifference}
                    differencePercentage={marketAnalysis.valueDifferencePercentage}
                  />
                </div>
              )}

              {/* Market Value Calculator */}
              {comparableVehicles.length > 0 && marketAnalysis && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Market Value Analysis</h3>
                  <MarketValueCalculator
                    marketAnalysis={marketAnalysis}
                    onRecalculate={handleRecalculate}
                  />
                </div>
              )}

              {/* Empty State */}
              {comparableVehicles.length === 0 && !showComparableForm && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-3">🚗</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparables Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add comparable vehicles to calculate market value and compare with insurance valuation.
                  </p>
                  <button
                    onClick={handleAddComparable}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Comparable
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render list view
  return (
    <>
      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        title={deleteConfirmDialog.isBulk ? 'Delete Multiple Appraisals' : 'Delete Appraisal'}
        message={
          deleteConfirmDialog.isBulk
            ? `Are you sure you want to delete ${selectedAppraisals.size} appraisal(s)? This action cannot be undone.`
            : 'Are you sure you want to delete this appraisal? This action cannot be undone.'
        }
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteConfirmDialog.isBulk) {
            handleBulkDelete();
          } else if (deleteConfirmDialog.id) {
            handleDelete(deleteConfirmDialog.id);
          }
        }}
        onCancel={() => setDeleteConfirmDialog({ isOpen: false })}
      />

      {/* Edit Dialog */}
      {editDialog.isOpen && editDialog.appraisal && (
        <EditAppraisalDialog
          isOpen={editDialog.isOpen}
          appraisalId={editDialog.appraisal.id}
          initialData={editDialog.appraisal.data}
          onSave={handleEditSave}
          onCancel={() => setEditDialog({ isOpen: false })}
        />
      )}

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-gray-600 mt-1">
          View and manage your past appraisals and generated reports
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('appraisals')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'appraisals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appraisals ({appraisalHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generated Reports ({reportHistory.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Report History Tab */}
      {activeTab === 'reports' && (
        <>
          {reportHistoryLoading ? (
            <div className="bg-white rounded-lg border p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="h-20 bg-gray-200 rounded w-full"></div>
                <div className="h-20 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ) : reportHistoryError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Failed to Load Report History
                  </h3>
                  <p className="text-red-700 mb-4">{reportHistoryError}</p>
                  <button
                    onClick={() => loadReportHistory()}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search and Filter for Reports */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="search"
                      placeholder="Search reports by vehicle, VIN, appraiser, or company..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Search reports"
                    />
                  </div>
                  <div>
                    <select
                      value={reportDateFilter}
                      onChange={(e) => setReportDateFilter(e.target.value as any)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              {(reportSearchQuery || reportDateFilter !== 'all') && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {filteredReports.length} of {reportHistory.length} reports
                  </p>
                  {(reportSearchQuery || reportDateFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setReportSearchQuery('');
                        setReportDateFilter('all');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              {/* Report History Component */}
              <ReportHistory
                reports={filteredReports}
                onOpenReport={handleOpenReport}
                onRegenerateReport={handleRegenerateReport}
                onDeleteReport={handleDeleteReportFromHistory}
              />
            </>
          )}
        </>
      )}

      {/* Appraisals Tab */}
      {activeTab === 'appraisals' && (
        <>
          {appraisalHistory.length === 0 ? (
            // Empty state
            <div className="bg-white rounded-lg border">
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appraisals yet</h3>
                <p className="text-gray-500 mb-6">
                  Start by uploading a PDF report to create your first appraisal.
                </p>
                <button 
                  onClick={() => navigate('/new')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create New Appraisal
                </button>
              </div>
            </div>
          ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 space-y-4">
              {/* Main search bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="search"
                    placeholder="Search by VIN, make, model, year, trim, or location... (⌘F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Search appraisals"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    showFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'
                  }`}
                >
                  {showFilters ? '▼' : '▶'} Filters {hasActiveFilters && '(Active)'}
                </button>
              </div>

              {/* Advanced filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'complete')}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Drafts</option>
                      <option value="complete">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extraction Method</label>
                    <select
                      value={extractionMethodFilter}
                      onChange={(e) => setExtractionMethodFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Methods</option>
                      <option value="standard">Standard</option>
                      <option value="ocr">OCR</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Market Analysis</label>
                    <select
                      value={marketAnalysisFilter}
                      onChange={(e) => setMarketAnalysisFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Appraisals</option>
                      <option value="with">With Comparables</option>
                      <option value="without">Without Comparables</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Confidence (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={confidenceMin}
                      onChange={(e) => setConfidenceMin(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Confidence (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={confidenceMax}
                      onChange={(e) => setConfidenceMax(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                    <button
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary and Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Showing {filteredAppraisals.length} of {appraisalHistory.length} appraisals
              </p>
              {selectedAppraisals.size > 0 && (
                <span className="text-sm font-medium text-blue-600">
                  {selectedAppraisals.size} selected
                </span>
              )}
            </div>
            
            {selectedAppraisals.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkExport('csv')}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  onClick={() => handleBulkExport('json')}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : 'Export JSON'}
                </button>
                <button
                  onClick={() => setDeleteConfirmDialog({ isOpen: true, isBulk: true })}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            )}
          </div>

          {/* Appraisal List */}
          {filteredAppraisals.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* Table header with sorting */}
              <div className="bg-gray-50 border-b px-6 py-3">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedAppraisals.size === filteredAppraisals.length && filteredAppraisals.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1 grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('year')}
                      className="text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      Vehicle {sortField === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('vin')}
                      className="text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      VIN {sortField === 'vin' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('mileage')}
                      className="text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      Mileage {sortField === 'mileage' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <span className="text-left">Comparables</span>
                    <button
                      onClick={() => handleSort('confidence')}
                      className="text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      Confidence {sortField === 'confidence' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                    <span className="text-left">Actions</span>
                  </div>
                </div>
              </div>

              {/* Table rows */}
              <div className="divide-y">
                {filteredAppraisals.map((appraisal) => (
                  <div
                    key={appraisal.id}
                    className={`px-6 py-4 hover:bg-blue-50 hover:shadow-sm transition-all duration-150 cursor-pointer ${
                      selectedAppraisals.has(appraisal.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleViewDetails(appraisal)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewDetails(appraisal);
                      }
                    }}
                    aria-label={`View details for ${appraisal.data.year} ${appraisal.data.make} ${appraisal.data.model}`}
                  >
                    <div className="flex items-center gap-4 group">
                      <input
                        type="checkbox"
                        checked={selectedAppraisals.has(appraisal.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelection(appraisal.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                        {/* Vehicle */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">
                              {appraisal.data.year} {appraisal.data.make}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              appraisal.status === 'complete' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {appraisal.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{appraisal.data.model}</p>
                          {appraisal.data.trim && (
                            <p className="text-xs text-gray-500">{appraisal.data.trim}</p>
                          )}
                        </div>

                        {/* VIN */}
                        <div>
                          <p className="text-sm font-mono text-gray-900">{appraisal.data.vin}</p>
                          {appraisal.data.extractionMethod && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              appraisal.data.extractionMethod === 'ocr' 
                                ? 'bg-orange-100 text-orange-700'
                                : appraisal.data.extractionMethod === 'hybrid'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {appraisal.data.extractionMethod}
                            </span>
                          )}
                        </div>

                        {/* Mileage */}
                        <div>
                          <p className="text-sm text-gray-900">{appraisal.data.mileage.toLocaleString()} mi</p>
                          <p className="text-xs text-gray-500">{appraisal.data.location}</p>
                        </div>

                        {/* Comparables */}
                        <div>
                          {((appraisal as any).hasComparables || (appraisal as any).comparableCount > 0) ? (
                            <div className="flex items-center gap-1">
                              <span className="text-green-600 text-lg">✓</span>
                              <div>
                                <p className="text-sm font-medium text-green-700">
                                  {(appraisal as any).comparableCount || 0} vehicles
                                </p>
                                {(appraisal as any).calculatedMarketValue && (
                                  <p className="text-xs text-gray-600">
                                    ${(appraisal as any).calculatedMarketValue.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No comparables</span>
                          )}
                        </div>

                        {/* Confidence */}
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  appraisal.data.extractionConfidence >= 80 ? 'bg-green-500' :
                                  appraisal.data.extractionConfidence >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${appraisal.data.extractionConfidence}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {appraisal.data.extractionConfidence}%
                            </span>
                          </div>
                          {(appraisal.data.marketValue || appraisal.data.settlementValue) && (
                            <div className="flex gap-2 mt-1">
                              {appraisal.data.marketValue && (
                                <span className="text-xs text-blue-700 font-medium">
                                  ${appraisal.data.marketValue.toLocaleString()}
                                </span>
                              )}
                              {appraisal.data.settlementValue && (
                                <span className="text-xs text-green-700 font-medium">
                                  ${appraisal.data.settlementValue.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Created */}
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(appraisal.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(appraisal.createdAt).toLocaleTimeString()}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(appraisal);
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 font-medium shadow-sm hover:shadow"
                            title="View details"
                            aria-label={`View details for ${appraisal.data.year} ${appraisal.data.make} ${appraisal.data.model}`}
                          >
                            View Details
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditDialog({ isOpen: true, appraisal });
                            }}
                            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            title="Edit appraisal"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmDialog({ isOpen: true, id: appraisal.id });
                            }}
                            disabled={isDeleting}
                            className="px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete appraisal"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      {/* Navigation indicator - shows on hover */}
                      <div className="ml-4 text-gray-400 group-hover:text-blue-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
          )}
        </>
      )}
    </div>
    </>
  );
}