import React, { useState } from 'react';
import { QualityScoreBreakdown } from '../../types';

interface QualityScoreDisplayProps {
  score: number;
  breakdown: QualityScoreBreakdown;
  compact?: boolean;
}

export const QualityScoreDisplay: React.FC<QualityScoreDisplayProps> = ({
  score,
  breakdown,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  const getScoreIcon = (score: number): React.ReactElement => {
    if (score >= 80) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (score >= 60) {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help"
        >
          {children}
        </div>
        {showTooltip && (
          <div className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 w-64">
            {text}
            <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}
      </div>
    );
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all hover:shadow-md ${getScoreColor(score)}`}
        aria-label={`Quality score ${score.toFixed(1)} - Click to expand details`}
      >
        {getScoreIcon(score)}
        <span className="font-bold text-lg">{score.toFixed(1)}</span>
        <span className="text-sm font-medium">{getScoreLabel(score)}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b-2 ${getScoreColor(score)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getScoreIcon(score)}
            <div>
              <div className="text-2xl font-bold">{score.toFixed(1)}</div>
              <div className="text-sm font-medium">{getScoreLabel(score)}</div>
            </div>
          </div>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Collapse quality score details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown</h4>

        {/* Base Score */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Base Score</span>
            <Tooltip text="All comparables start with a base score of 100 points">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {breakdown.baseScore.toFixed(1)}
          </span>
        </div>

        {/* Distance Factor */}
        {breakdown.distancePenalty !== 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Distance Penalty</span>
              <Tooltip text={breakdown.explanations.distance || "Penalty applied for comparables located more than 100 miles away (0.1 points per mile over 100)"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-red-600">
              -{Math.abs(breakdown.distancePenalty).toFixed(1)}
            </span>
          </div>
        )}

        {/* Age Factor */}
        {breakdown.agePenalty !== 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Age Penalty</span>
              <Tooltip text={breakdown.explanations.age || "Penalty of 2.0 points per year difference from loss vehicle"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-red-600">
              -{Math.abs(breakdown.agePenalty).toFixed(1)}
            </span>
          </div>
        )}

        {breakdown.ageBonus > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Age Match Bonus</span>
              <Tooltip text={breakdown.explanations.age || "Bonus for exact year match with loss vehicle"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-green-600">
              +{breakdown.ageBonus.toFixed(1)}
            </span>
          </div>
        )}

        {/* Mileage Factor */}
        {breakdown.mileageBonus > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Mileage Bonus</span>
              <Tooltip text={breakdown.explanations.mileage || "Bonus of 10 points for mileage within 20% of loss vehicle"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-green-600">
              +{breakdown.mileageBonus.toFixed(1)}
            </span>
          </div>
        )}

        {breakdown.mileagePenalty !== 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Mileage Penalty</span>
              <Tooltip text={breakdown.explanations.mileage || "Penalty for mileage difference from loss vehicle (5 points per 10% difference)"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-red-600">
              -{Math.abs(breakdown.mileagePenalty).toFixed(1)}
            </span>
          </div>
        )}

        {/* Equipment Factor */}
        {breakdown.equipmentBonus > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Equipment Bonus</span>
              <Tooltip text={breakdown.explanations.equipment || "Bonus for matching or additional equipment (5-15 points)"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-green-600">
              +{breakdown.equipmentBonus.toFixed(1)}
            </span>
          </div>
        )}

        {breakdown.equipmentPenalty !== 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Equipment Penalty</span>
              <Tooltip text={breakdown.explanations.equipment || "Penalty for missing equipment (10 points per major feature)"}>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </div>
            <span className="text-sm font-medium text-red-600">
              -{Math.abs(breakdown.equipmentPenalty).toFixed(1)}
            </span>
          </div>
        )}

        {/* Final Score */}
        <div className="flex items-center justify-between py-3 border-t-2 border-gray-300 mt-2">
          <span className="text-sm font-bold text-gray-900">Final Score</span>
          <span className="text-lg font-bold text-gray-900">
            {breakdown.finalScore.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};
