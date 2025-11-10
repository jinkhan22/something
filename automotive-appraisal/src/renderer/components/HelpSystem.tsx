import React, { useState } from 'react';
import { Tooltip } from './Tooltip';

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpTopic {
  id: string;
  title: string;
  content: React.ReactNode;
  category: 'getting-started' | 'quality-scores' | 'adjustments' | 'calculations' | 'troubleshooting';
}

const helpTopics: HelpTopic[] = [
  {
    id: 'adding-comparables',
    title: 'Adding Comparable Vehicles',
    category: 'getting-started',
    content: (
      <div className="space-y-4">
        <p>To add a comparable vehicle to your market analysis:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click the "Add Comparable" button after extracting vehicle data</li>
          <li>Fill in all required fields marked with a red asterisk (*)</li>
          <li>Select the condition that best matches the listing description</li>
          <li>Choose all equipment features mentioned in the listing</li>
          <li>Click "Add Comparable" to save</li>
        </ol>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Use the exact make/model from your loss vehicle for best results</li>
            <li>Look for vehicles within 100 miles for higher quality scores</li>
            <li>Save the source URL for future reference</li>
            <li>Add detailed notes about any special circumstances</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'quality-scores',
    title: 'Understanding Quality Scores',
    category: 'quality-scores',
    content: (
      <div className="space-y-4">
        <p>Quality scores determine how much weight each comparable receives in the final market value calculation. Higher scores mean more influence.</p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Scoring Factors:</h4>
          <div className="space-y-3">
            <div>
              <strong>Distance (0 to -20 points)</strong>
              <p className="text-sm text-gray-600">No penalty within 100 miles, then -0.1 points per mile</p>
            </div>
            <div>
              <strong>Age (-2 points per year difference)</strong>
              <p className="text-sm text-gray-600">Exact year match is ideal, maximum -10 points</p>
            </div>
            <div>
              <strong>Mileage (-15 to +10 points)</strong>
              <p className="text-sm text-gray-600">+10 bonus within 20%, penalties for larger differences</p>
            </div>
            <div>
              <strong>Equipment (-10 to +15 points)</strong>
              <p className="text-sm text-gray-600">+15 for perfect match, -10 per missing feature, +5 per extra</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">80+</div>
            <div className="text-sm text-green-600">Excellent</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-700">60-80</div>
            <div className="text-sm text-yellow-600">Good</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-700">&lt;60</div>
            <div className="text-sm text-red-600">Fair</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'price-adjustments',
    title: 'Price Adjustments Explained',
    category: 'adjustments',
    content: (
      <div className="space-y-4">
        <p>The system automatically adjusts comparable prices to account for differences from your loss vehicle:</p>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Mileage Adjustments</h4>
            <p className="text-sm text-gray-600 mb-2">Based on vehicle age and industry depreciation rates:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>0-3 years:</strong> $0.25 per mile difference</li>
              <li><strong>4-7 years:</strong> $0.15 per mile difference</li>
              <li><strong>8+ years:</strong> $0.05 per mile difference</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Equipment Adjustments</h4>
            <p className="text-sm text-gray-600 mb-2">Standard values for common features:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Navigation: $1,200</div>
              <div>Sunroof: $1,200</div>
              <div>Premium Audio: $800</div>
              <div>Sport Package: $1,500</div>
              <div>Leather Seats: $1,000</div>
              <div>All-Wheel Drive: $2,000</div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Condition Adjustments</h4>
            <p className="text-sm text-gray-600 mb-2">Multipliers applied to final price:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>Excellent:</strong> +5% premium</li>
              <li><strong>Good:</strong> Baseline (no adjustment)</li>
              <li><strong>Fair:</strong> -5% discount</li>
              <li><strong>Poor:</strong> -15% discount</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'market-value-calculation',
    title: 'Market Value Calculation',
    category: 'calculations',
    content: (
      <div className="space-y-4">
        <p>The final market value uses a quality-weighted average formula that gives more influence to higher-quality comparables:</p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Formula:</h4>
          <div className="font-mono text-sm bg-white border rounded p-2">
            Market Value = Σ(Adjusted Price × Quality Score) ÷ Σ(Quality Scores)
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Confidence Level Factors:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Comparable Count:</strong> More comparables = higher confidence
              <ul className="list-disc list-inside ml-4 text-gray-600">
                <li>1-2 comparables: 20-40% base confidence</li>
                <li>3-4 comparables: 60-70% base confidence</li>
                <li>5+ comparables: 80%+ base confidence</li>
              </ul>
            </div>
            <div>
              <strong>Quality Consistency:</strong> Similar quality scores boost confidence
              <ul className="list-disc list-inside ml-4 text-gray-600">
                <li>Low variance (std dev &lt; 10): +20% bonus</li>
                <li>Moderate variance (10-20): +10% bonus</li>
              </ul>
            </div>
            <div>
              <strong>Price Consistency:</strong> Similar adjusted prices boost confidence
              <ul className="list-disc list-inside ml-4 text-gray-600">
                <li>Low variance (&lt; 15%): +20% bonus</li>
                <li>Moderate variance (15-25%): +10% bonus</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h4>
          <ul className="list-disc list-inside space-y-1 text-yellow-800">
            <li>Maximum confidence is capped at 95%</li>
            <li>Minimum 3 comparables recommended for reliable analysis</li>
            <li>High variance may indicate outliers or data quality issues</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'troubleshooting',
    title: 'Common Issues & Solutions',
    category: 'troubleshooting',
    content: (
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 mb-2">Low Quality Scores</h4>
            <p className="text-sm text-gray-600 mb-2">If your comparables have scores below 60:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Expand your search radius to find closer matches</li>
              <li>Look for vehicles within 2 years of your loss vehicle</li>
              <li>Focus on same make/model or similar class vehicles</li>
              <li>Verify equipment selections match the listings</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 mb-2">High Price Variance</h4>
            <p className="text-sm text-gray-600 mb-2">If your confidence level is low due to price differences:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Remove obvious outliers (extremely high/low prices)</li>
              <li>Verify condition assessments are accurate</li>
              <li>Check equipment selections for consistency</li>
              <li>Ensure all comparables are from similar time period</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 mb-2">Geocoding Failures</h4>
            <p className="text-sm text-gray-600 mb-2">If location distance calculation fails:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Use standard "City, ST" format (e.g., "Los Angeles, CA")</li>
              <li>Try using the nearest major city</li>
              <li>Avoid abbreviations or special characters</li>
              <li>Contact support if issues persist</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 mb-2">Limited Inventory</h4>
            <p className="text-sm text-gray-600 mb-2">For rare or luxury vehicles with few comparables:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Expand to similar models in the same class</li>
              <li>Consider different trim levels with equipment adjustments</li>
              <li>Look at predecessor/successor models</li>
              <li>Document your comparable selection rationale</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">📞 Need More Help?</h4>
          <p className="text-blue-800 text-sm">
            If you continue to experience issues, check the detailed methodology documentation 
            or contact technical support for assistance with complex appraisal scenarios.
          </p>
        </div>
      </div>
    )
  }
];

export const HelpSystem: React.FC<HelpSystemProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('getting-started');
  const [selectedTopic, setSelectedTopic] = useState<string>('adding-comparables');

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'quality-scores', label: 'Quality Scores', icon: '⭐' },
    { id: 'adjustments', label: 'Price Adjustments', icon: '💰' },
    { id: 'calculations', label: 'Calculations', icon: '🧮' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' }
  ];

  const filteredTopics = helpTopics.filter(topic => topic.category === selectedCategory);
  const currentTopic = helpTopics.find(topic => topic.id === selectedTopic);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Help & Documentation</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close help system"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Categories</h3>
              <nav className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      const firstTopic = helpTopics.find(t => t.category === category.id);
                      if (firstTopic) setSelectedTopic(firstTopic.id);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Topics */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Topics</h3>
              <nav className="space-y-1">
                {filteredTopics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedTopic === topic.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {topic.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{currentTopic?.title}</h1>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentTopic?.content}
          </div>

          {/* Content Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Need more detailed information? Check the full documentation files.
              </div>
              <div className="flex space-x-2">
                <Tooltip content="View calculation methodology documentation">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Methodology Docs
                  </button>
                </Tooltip>
                <Tooltip content="View example scenarios and use cases">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Example Scenarios
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Help button component for easy access
export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Tooltip content="Open help and documentation">
      <button
        onClick={onClick}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors z-40"
        aria-label="Open help system"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </Tooltip>
  );
};