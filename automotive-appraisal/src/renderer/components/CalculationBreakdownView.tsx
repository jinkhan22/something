import React, { useState } from 'react';
import type { MarketAnalysis, ComparableVehicle } from '../../types';

interface CalculationBreakdownViewProps {
  marketAnalysis: MarketAnalysis;
  expandAll?: boolean;
}

export const CalculationBreakdownView: React.FC<CalculationBreakdownViewProps> = ({
  marketAnalysis,
  expandAll = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    expandAll ? new Set(marketAnalysis.comparables.map((c) => c.id)) : new Set()
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateComparableText = (comparable: ComparableVehicle): string => {
    const lines: string[] = [];
    lines.push(`Comparable Vehicle: ${comparable.year} ${comparable.make} ${comparable.model}`);
    lines.push(`Source: ${comparable.source}`);
    lines.push(`\nOriginal List Price: ${formatCurrency(comparable.listPrice)}`);
    lines.push(`\nADJUSTMENTS:`);
    
    // Mileage adjustment
    const mileageAdj = comparable.adjustments.mileageAdjustment;
    lines.push(`\nMileage Adjustment:`);
    lines.push(`  ${mileageAdj.explanation}`);
    lines.push(`  Calculation: ${Math.abs(mileageAdj.mileageDifference)} miles × ${formatCurrency(mileageAdj.depreciationRate)}/mile`);
    lines.push(`  Amount: ${mileageAdj.adjustmentAmount >= 0 ? '+' : ''}${formatCurrency(mileageAdj.adjustmentAmount)}`);
    
    // Equipment adjustments
    if (comparable.adjustments.equipmentAdjustments.length > 0) {
      lines.push(`\nEquipment Adjustments:`);
      comparable.adjustments.equipmentAdjustments.forEach((adj) => {
        lines.push(`  ${adj.feature} (${adj.type}): ${adj.value >= 0 ? '+' : ''}${formatCurrency(adj.value)}`);
      });
      const totalEquipment = comparable.adjustments.equipmentAdjustments.reduce(
        (sum, adj) => sum + adj.value,
        0
      );
      lines.push(`  Total Equipment: ${totalEquipment >= 0 ? '+' : ''}${formatCurrency(totalEquipment)}`);
    }
    
    // Condition adjustment
    const condAdj = comparable.adjustments.conditionAdjustment;
    if (condAdj.adjustmentAmount !== 0) {
      lines.push(`\nCondition Adjustment:`);
      lines.push(`  ${condAdj.explanation}`);
      lines.push(`  Multiplier: ${condAdj.multiplier.toFixed(2)}`);
      lines.push(`  Amount: ${condAdj.adjustmentAmount >= 0 ? '+' : ''}${formatCurrency(condAdj.adjustmentAmount)}`);
    }
    
    lines.push(`\nTotal Adjustments: ${comparable.adjustments.totalAdjustment >= 0 ? '+' : ''}${formatCurrency(comparable.adjustments.totalAdjustment)}`);
    lines.push(`Adjusted Price: ${formatCurrency(comparable.adjustments.adjustedPrice)}`);
    lines.push(`\nQuality Score: ${comparable.qualityScore.toFixed(1)}`);
    
    return lines.join('\n');
  };

  const generateMarketValueText = (): string => {
    const lines: string[] = [];
    lines.push('MARKET VALUE CALCULATION');
    lines.push('='.repeat(50));
    lines.push('\nQuality-Weighted Average Formula:');
    lines.push('Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Scores)');
    lines.push('');
    
    marketAnalysis.calculationBreakdown.steps.forEach((step) => {
      lines.push(`Step ${step.step}: ${step.description}`);
      lines.push(`  ${step.calculation}`);
      lines.push(`  Result: ${formatCurrency(step.result)}`);
      lines.push('');
    });
    
    lines.push(`Final Market Value: ${formatCurrency(marketAnalysis.calculatedMarketValue)}`);
    lines.push(`Confidence Level: ${marketAnalysis.confidenceLevel.toFixed(1)}%`);
    
    return lines.join('\n');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6 print:shadow-none">
      <div className="flex items-center justify-between print:mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Detailed Calculation Breakdown
        </h3>
        <button
          onClick={() => copyToClipboard(generateMarketValueText(), 'market-value')}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors print:hidden"
        >
          {copiedSection === 'market-value' ? (
            <>
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Market Value Calculation Summary */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 print:border-gray-400">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Market Value Calculation
        </h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
            <div className="text-sm font-medium text-gray-700 mb-2">Formula:</div>
            <div className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded">
              Market Value = Σ(Adjusted Price × Quality Score) / Σ(Quality Scores)
            </div>
          </div>

          {marketAnalysis.calculationBreakdown.steps.map((step) => (
            <div key={step.step} className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">
                  Step {step.step}: {step.description}
                </div>
              </div>
              <div className="font-mono text-sm text-gray-600 mb-2">{step.calculation}</div>
              <div className="text-sm">
                <span className="text-gray-600">Result: </span>
                <span className="font-semibold text-gray-900">{formatCurrency(step.result)}</span>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 print:border-blue-400">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Final Market Value:</span>
              <span className="text-xl font-bold text-blue-900">
                {formatCurrency(marketAnalysis.calculatedMarketValue)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-blue-700">Confidence Level:</span>
              <span className="text-sm font-semibold text-blue-900">
                {marketAnalysis.confidenceLevel.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Comparable Breakdowns */}
      <div className="space-y-3">
        <h4 className="text-md font-semibold text-gray-900">
          Individual Comparable Adjustments
        </h4>
        {marketAnalysis.comparables.map((comparable, index) => {
          const isExpanded = expandedSections.has(comparable.id);
          return (
            <div
              key={comparable.id}
              className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-400 print:break-inside-avoid"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(comparable.id)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between print:hidden"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium text-gray-900">
                    {comparable.year} {comparable.make} {comparable.model}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(comparable.listPrice)} → {formatCurrency(comparable.adjustments.adjustedPrice)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Quality: {comparable.qualityScore.toFixed(1)}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Print-only header */}
              <div className="hidden print:block px-4 py-3 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="font-medium text-gray-900">
                    {comparable.year} {comparable.make} {comparable.model}
                  </span>
                </div>
              </div>

              {/* Accordion Content */}
              {(isExpanded || expandAll) && (
                <div className="p-4 space-y-4 print:block">
                  <div className="flex items-center justify-between print:hidden">
                    <div className="text-sm text-gray-600">
                      Source: <span className="font-medium text-gray-900">{comparable.source}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(generateComparableText(comparable), comparable.id)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      {copiedSection === comparable.id ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Original Price */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 print:border-blue-400">
                    <div className="text-sm font-medium text-blue-900 mb-1">Original List Price</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(comparable.listPrice)}
                    </div>
                  </div>

                  {/* Adjustments */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-900">Adjustments:</div>

                    {/* Mileage Adjustment */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 print:border-gray-400">
                      <div className="text-sm font-medium text-gray-900 mb-2">Mileage Adjustment</div>
                      <div className="text-xs text-gray-600 mb-2">
                        {comparable.adjustments.mileageAdjustment.explanation}
                      </div>
                      <div className="font-mono text-xs text-gray-700 bg-white p-2 rounded mb-2">
                        {Math.abs(comparable.adjustments.mileageAdjustment.mileageDifference).toLocaleString()} miles ×{' '}
                        {formatCurrency(comparable.adjustments.mileageAdjustment.depreciationRate)}/mile
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Amount: </span>
                        <span
                          className={`font-semibold ${
                            comparable.adjustments.mileageAdjustment.adjustmentAmount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {comparable.adjustments.mileageAdjustment.adjustmentAmount >= 0 ? '+' : ''}
                          {formatCurrency(comparable.adjustments.mileageAdjustment.adjustmentAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Equipment Adjustments */}
                    {comparable.adjustments.equipmentAdjustments.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 print:border-gray-400">
                        <div className="text-sm font-medium text-gray-900 mb-2">Equipment Adjustments</div>
                        <div className="space-y-1.5">
                          {comparable.adjustments.equipmentAdjustments.map((adj, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">
                                {adj.feature}{' '}
                                <span className="text-gray-500">({adj.type === 'missing' ? 'Missing' : 'Extra'})</span>
                              </span>
                              <span
                                className={`font-semibold ${
                                  adj.value >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {adj.value >= 0 ? '+' : ''}
                                {formatCurrency(adj.value)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-gray-300 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Total Equipment:</span>
                            <span
                              className={`text-sm font-semibold ${
                                comparable.adjustments.equipmentAdjustments.reduce((sum, adj) => sum + adj.value, 0) >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {comparable.adjustments.equipmentAdjustments.reduce((sum, adj) => sum + adj.value, 0) >= 0
                                ? '+'
                                : ''}
                              {formatCurrency(
                                comparable.adjustments.equipmentAdjustments.reduce((sum, adj) => sum + adj.value, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Condition Adjustment */}
                    {comparable.adjustments.conditionAdjustment.adjustmentAmount !== 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 print:border-gray-400">
                        <div className="text-sm font-medium text-gray-900 mb-2">Condition Adjustment</div>
                        <div className="text-xs text-gray-600 mb-2">
                          {comparable.adjustments.conditionAdjustment.explanation}
                        </div>
                        <div className="font-mono text-xs text-gray-700 bg-white p-2 rounded mb-2">
                          Multiplier: {comparable.adjustments.conditionAdjustment.multiplier.toFixed(2)}
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Amount: </span>
                          <span
                            className={`font-semibold ${
                              comparable.adjustments.conditionAdjustment.adjustmentAmount >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {comparable.adjustments.conditionAdjustment.adjustmentAmount >= 0 ? '+' : ''}
                            {formatCurrency(comparable.adjustments.conditionAdjustment.adjustmentAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total Adjustments */}
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 print:border-yellow-400">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-900">Total Adjustments:</span>
                      <span
                        className={`text-lg font-bold ${
                          comparable.adjustments.totalAdjustment >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {comparable.adjustments.totalAdjustment >= 0 ? '+' : ''}
                        {formatCurrency(comparable.adjustments.totalAdjustment)}
                      </span>
                    </div>
                  </div>

                  {/* Adjusted Price */}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 print:border-green-400">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">Adjusted Price:</span>
                      <span className="text-2xl font-bold text-green-900">
                        {formatCurrency(comparable.adjustments.adjustedPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-green-700">Quality Score:</span>
                      <span className="text-sm font-semibold text-green-900">
                        {comparable.qualityScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
