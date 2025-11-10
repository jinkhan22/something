import { useState } from 'react';
import { ReportHistoryRecord } from '../../types';
import { ConfirmDialog } from './ConfirmDialog';

interface ReportHistoryProps {
  reports: ReportHistoryRecord[];
  onOpenReport: (filePath: string) => void;
  onRegenerateReport: (appraisalId: string) => void;
  onDeleteReport: (id: string) => void;
}

export function ReportHistory({ 
  reports, 
  onOpenReport, 
  onRegenerateReport, 
  onDeleteReport 
}: ReportHistoryProps) {
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ 
    isOpen: boolean; 
    reportId?: string;
    reportName?: string;
  }>({ isOpen: false });

  const handleDeleteConfirm = () => {
    if (deleteConfirmDialog.reportId) {
      onDeleteReport(deleteConfirmDialog.reportId);
      setDeleteConfirmDialog({ isOpen: false });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (reports.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">📄</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated Yet</h3>
        <p className="text-gray-600">
          Generate your first appraisal report to see it here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        title="Delete Report from History"
        message={`Are you sure you want to remove "${deleteConfirmDialog.reportName}" from history? The report file will not be deleted from your computer.`}
        confirmText="Remove from History"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmDialog({ isOpen: false })}
      />

      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Vehicle Info */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {report.vehicleInfo.year} {report.vehicleInfo.make} {report.vehicleInfo.model}
                  </h3>
                  <span className="text-sm text-gray-500 font-mono">
                    {report.vehicleInfo.vin}
                  </span>
                </div>

                {/* Report Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Generated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(report.generatedAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Comparables</p>
                    <p className="text-sm font-medium text-gray-900">
                      {report.metadata.comparableCount} vehicles
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Market Value</p>
                    <p className="text-sm font-medium text-green-700">
                      ${report.metadata.calculatedMarketValue.toLocaleString()}
                    </p>
                  </div>

                  {report.metadata.insuranceValue && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Insurance Value</p>
                      <p className="text-sm font-medium text-blue-700">
                        ${report.metadata.insuranceValue.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Report Options */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    By: {report.options.appraiserName}
                  </span>
                  {report.options.companyName && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {report.options.companyName}
                    </span>
                  )}
                  {report.options.includeDetailedCalculations && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Detailed Calculations
                    </span>
                  )}
                  {report.options.includeQualityScoreBreakdown && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      Quality Scores
                    </span>
                  )}
                </div>

                {/* File Path */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>📁</span>
                  <span className="truncate" title={report.filePath}>
                    {report.filePath}
                  </span>
                  {report.metadata.fileSize && (
                    <span className="text-gray-400">
                      ({formatFileSize(report.metadata.fileSize)})
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => onOpenReport(report.filePath)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  title="Open report file"
                >
                  Open Report
                </button>
                <button
                  onClick={() => onRegenerateReport(report.appraisalId)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                  title="Generate a new report for this appraisal"
                >
                  Re-generate
                </button>
                <button
                  onClick={() => setDeleteConfirmDialog({ 
                    isOpen: true, 
                    reportId: report.id,
                    reportName: `${report.vehicleInfo.year} ${report.vehicleInfo.make} ${report.vehicleInfo.model}`
                  })}
                  className="px-4 py-2 text-red-600 border border-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                  title="Remove from history (file will not be deleted)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
