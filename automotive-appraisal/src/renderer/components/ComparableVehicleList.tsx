import React, { useState, memo, useMemo } from 'react';
import { ComparableVehicle } from '../../types';

interface ComparableVehicleListProps {
  comparables: ComparableVehicle[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSort?: (field: keyof ComparableVehicle, direction: 'asc' | 'desc') => void;
  sortField?: keyof ComparableVehicle;
  sortDirection?: 'asc' | 'desc';
}

type SortableField = 'year' | 'make' | 'model' | 'mileage' | 'listPrice' | 'distanceFromLoss' | 'qualityScore';

const ComparableVehicleListComponent: React.FC<ComparableVehicleListProps> = ({
  comparables,
  onEdit,
  onDelete,
  onSort,
  sortField,
  sortDirection
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortableField) => {
    if (onSort) {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(field, newDirection);
    }
  };

  const getQualityScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getQualityScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getQualityScoreIcon = (score: number) => {
    if (score >= 80) {
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (score >= 60) {
      return (
        <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const SortIcon: React.FC<{ field: SortableField }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (comparables.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-lg p-12 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-16 w-16 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">No Comparable Vehicles Yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Build a comprehensive market analysis by adding comparable vehicles from online marketplaces.
          </p>
          
          <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-blue-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">📋 Getting Started Guide</h4>
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mr-2 flex-shrink-0">1</span>
                <span>Search online marketplaces (AutoTrader, Cars.com, CarMax, etc.)</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mr-2 flex-shrink-0">2</span>
                <span>Find vehicles similar to your loss vehicle (same make/model preferred)</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mr-2 flex-shrink-0">3</span>
                <span>Add at least <strong>3-5 comparables</strong> for reliable results</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mr-2 flex-shrink-0">4</span>
                <span>Look for vehicles within 100 miles and similar mileage</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>💡 Pro Tip:</strong> Higher quality comparables (closer location, similar mileage, same equipment) 
              will produce more accurate market value estimates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th scope="col" className="w-12 px-3 py-4"></th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('year')}
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Vehicle
                  <SortIcon field="year" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('mileage')}
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Mileage
                  <SortIcon field="mileage" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('listPrice')}
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Price
                  <SortIcon field="listPrice" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('distanceFromLoss')}
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Distance
                  <SortIcon field="distanceFromLoss" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => handleSort('qualityScore')}
              >
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quality Score
                  <SortIcon field="qualityScore" />
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparables.map((comparable) => (
              <React.Fragment key={comparable.id}>
                <tr className="hover:bg-blue-50 transition-all duration-150 border-b border-gray-100">
                  <td className="px-3 py-4">
                    <button
                      onClick={() => toggleRow(comparable.id)}
                      className="text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1 transition-colors"
                      aria-label={expandedRows.has(comparable.id) ? 'Collapse details' : 'Expand details'}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${expandedRows.has(comparable.id) ? 'transform rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {comparable.year} {comparable.make} {comparable.model}
                        </div>
                        {comparable.vin && (
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">VIN: {comparable.vin}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {comparable.source}
                          </span>
                          {comparable.condition && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              comparable.condition === 'Excellent' ? 'bg-green-100 text-green-700' :
                              comparable.condition === 'Good' ? 'bg-blue-100 text-blue-700' :
                              comparable.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {comparable.condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatNumber(comparable.mileage)}
                    </div>
                    <div className="text-xs text-gray-500">miles</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(comparable.listPrice)}
                    </div>
                    {comparable.adjustments?.adjustedPrice && comparable.adjustments.adjustedPrice !== comparable.listPrice && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">Adjusted:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {formatCurrency(comparable.adjustments.adjustedPrice)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {comparable.distanceFromLoss.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">miles</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${getQualityScoreColor(comparable.qualityScore)}`}>
                        {getQualityScoreIcon(comparable.qualityScore)}
                        <span>{comparable.qualityScore.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-gray-500 text-center">
                        {getQualityScoreLabel(comparable.qualityScore)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(comparable.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Edit ${comparable.year} ${comparable.make} ${comparable.model}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(comparable.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Delete ${comparable.year} ${comparable.make} ${comparable.model}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(comparable.id) && (
                  <tr className="bg-gradient-to-br from-gray-50 to-blue-50">
                    <td colSpan={7} className="px-6 py-6">
                      <div className="space-y-5 max-w-5xl">
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Vehicle Details
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="text-gray-600 font-medium">Location:</span>
                              <span className="text-gray-900">{comparable.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-600 font-medium">Condition:</span>
                              <span className="text-gray-900">{comparable.condition}</span>
                            </div>
                          </div>
                        </div>

                        {comparable.equipment.length > 0 && (
                          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              Equipment & Features
                              <span className="ml-auto text-xs font-normal text-gray-500">
                                {comparable.equipment.length} {comparable.equipment.length === 1 ? 'feature' : 'features'}
                              </span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {comparable.equipment.map((item) => (
                                <span
                                  key={item}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm"
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

                        {comparable.adjustments && (
                          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Price Adjustments
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              {comparable.adjustments.mileageAdjustment.adjustmentAmount !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                                  <span className="text-gray-700 font-medium">Mileage Adjustment:</span>
                                  <span className={`font-semibold ${comparable.adjustments.mileageAdjustment.adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {comparable.adjustments.mileageAdjustment.adjustmentAmount > 0 ? '+' : ''}
                                    {formatCurrency(comparable.adjustments.mileageAdjustment.adjustmentAmount)}
                                  </span>
                                </div>
                              )}
                              {comparable.adjustments.equipmentAdjustments.map((adj, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                                  <span className="text-gray-700 font-medium">{adj.feature}:</span>
                                  <span className={`font-semibold ${adj.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {adj.value > 0 ? '+' : ''}{formatCurrency(adj.value)}
                                  </span>
                                </div>
                              ))}
                              {comparable.adjustments.conditionAdjustment.adjustmentAmount !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                                  <span className="text-gray-700 font-medium">Condition Adjustment:</span>
                                  <span className={`font-semibold ${comparable.adjustments.conditionAdjustment.adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {comparable.adjustments.conditionAdjustment.adjustmentAmount > 0 ? '+' : ''}
                                    {formatCurrency(comparable.adjustments.conditionAdjustment.adjustmentAmount)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded border-t-2 border-blue-200 mt-2">
                                <span className="text-gray-900 font-semibold">Total Adjustment:</span>
                                <span className={`font-bold text-lg ${comparable.adjustments.totalAdjustment > 0 ? 'text-green-600' : comparable.adjustments.totalAdjustment < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {comparable.adjustments.totalAdjustment > 0 ? '+' : ''}
                                  {formatCurrency(comparable.adjustments.totalAdjustment)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-3 px-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded border border-blue-300 shadow-sm">
                                <span className="text-gray-900 font-bold">Adjusted Price:</span>
                                <span className="text-blue-900 font-bold text-xl">
                                  {formatCurrency(comparable.adjustments.adjustedPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {comparable.qualityScoreBreakdown && (
                          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Quality Score Breakdown
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                                <span className="text-gray-700 font-medium">Base Score:</span>
                                <span className="text-gray-900 font-semibold">{comparable.qualityScoreBreakdown.baseScore.toFixed(1)}</span>
                              </div>
                              {comparable.qualityScoreBreakdown.distancePenalty !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded border-l-4 border-red-400">
                                  <span className="text-gray-700 font-medium">Distance Penalty:</span>
                                  <span className="text-red-600 font-semibold">-{Math.abs(comparable.qualityScoreBreakdown.distancePenalty).toFixed(1)}</span>
                                </div>
                              )}
                              {comparable.qualityScoreBreakdown.agePenalty !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded border-l-4 border-red-400">
                                  <span className="text-gray-700 font-medium">Age Penalty:</span>
                                  <span className="text-red-600 font-semibold">-{Math.abs(comparable.qualityScoreBreakdown.agePenalty).toFixed(1)}</span>
                                </div>
                              )}
                              {comparable.qualityScoreBreakdown.mileageBonus > 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded border-l-4 border-green-400">
                                  <span className="text-gray-700 font-medium">Mileage Bonus:</span>
                                  <span className="text-green-600 font-semibold">+{comparable.qualityScoreBreakdown.mileageBonus.toFixed(1)}</span>
                                </div>
                              )}
                              {comparable.qualityScoreBreakdown.mileagePenalty !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded border-l-4 border-red-400">
                                  <span className="text-gray-700 font-medium">Mileage Penalty:</span>
                                  <span className="text-red-600 font-semibold">-{Math.abs(comparable.qualityScoreBreakdown.mileagePenalty).toFixed(1)}</span>
                                </div>
                              )}
                              {comparable.qualityScoreBreakdown.equipmentBonus > 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded border-l-4 border-green-400">
                                  <span className="text-gray-700 font-medium">Equipment Bonus:</span>
                                  <span className="text-green-600 font-semibold">+{comparable.qualityScoreBreakdown.equipmentBonus.toFixed(1)}</span>
                                </div>
                              )}
                              {comparable.qualityScoreBreakdown.equipmentPenalty !== 0 && (
                                <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded border-l-4 border-red-400">
                                  <span className="text-gray-700 font-medium">Equipment Penalty:</span>
                                  <span className="text-red-600 font-semibold">-{Math.abs(comparable.qualityScoreBreakdown.equipmentPenalty).toFixed(1)}</span>
                                </div>
                              )}
                              <div className={`flex justify-between items-center py-3 px-3 rounded border-2 shadow-sm mt-2 ${getQualityScoreColor(comparable.qualityScoreBreakdown.finalScore)}`}>
                                <div className="flex items-center gap-2">
                                  {getQualityScoreIcon(comparable.qualityScoreBreakdown.finalScore)}
                                  <span className="font-bold">Final Score:</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-xl">{comparable.qualityScoreBreakdown.finalScore.toFixed(1)}</div>
                                  <div className="text-xs font-semibold">{getQualityScoreLabel(comparable.qualityScoreBreakdown.finalScore)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {comparable.notes && (
                          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              Notes
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{comparable.notes}</p>
                          </div>
                        )}

                        {comparable.sourceUrl && (
                          <div className="flex justify-center">
                            <a
                              href={comparable.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Original Listing
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {comparables.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{comparables.length}</span> comparable{comparables.length !== 1 ? 's' : ''} added
            </div>
            
            {comparables.length >= 5 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-800">Excellent data quality</span>
              </div>
            )}
            
            {comparables.length >= 3 && comparables.length < 5 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-blue-800">Good for analysis</span>
                <span className="text-xs text-blue-600">(add {5 - comparables.length} more for best results)</span>
              </div>
            )}
            
            {comparables.length === 2 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-full">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">Add 1 more for minimum reliability</span>
              </div>
            )}
            
            {comparables.length === 1 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-full">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-red-800">Add at least 2 more comparables</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ComparableVehicleList = memo(ComparableVehicleListComponent, (prevProps, nextProps) => {
  // Only re-render if comparables array changes (by reference or length)
  return (
    prevProps.comparables === nextProps.comparables &&
    prevProps.comparables.length === nextProps.comparables.length
  );
});
