/**
 * Skeleton Loaders for AppraisalDetail Page
 * Provides loading placeholders for better perceived performance
 */

import React from 'react';

/**
 * Skeleton for vehicle information card
 */
export function VehicleInfoSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="card-header flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="h-9 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, index) => (
            <div key={index}>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-5 bg-gray-300 rounded w-32"></div>
            </div>
          ))}
        </div>
        
        {/* Equipment skeleton */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="h-4 bg-gray-200 rounded w-40 mb-3"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-7 bg-gray-200 rounded-lg w-24"></div>
            ))}
          </div>
        </div>

        {/* Timestamps skeleton */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for comparables list
 */
export function ComparablesListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="card">
          <div className="card-body">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-300 rounded w-64"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-28"></div>
                  </div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for market value calculator
 */
export function MarketValueSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </div>
      </div>
      <div className="card-body space-y-6">
        {/* Main value display */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="h-10 bg-gray-300 rounded w-48 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-40"></div>
        </div>

        {/* Adjustment factors */}
        <div className="space-y-4">
          <div className="h-5 bg-gray-200 rounded w-40 mb-4"></div>
          {[...Array(3)].map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Complete skeleton for AppraisalDetail page
 */
export function AppraisalDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded"></div>
          <div>
            <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        <div className="h-8 bg-gray-200 rounded-full w-24"></div>
      </div>

      {/* Vehicle info skeleton */}
      <VehicleInfoSkeleton />

      {/* Comparables section skeleton */}
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-pulse">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40"></div>
        </div>
        
        <ComparablesListSkeleton />
      </div>

      {/* Market value skeleton */}
      <MarketValueSkeleton />
    </div>
  );
}
