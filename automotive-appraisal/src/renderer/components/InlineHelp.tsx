import React, { useState } from 'react';
import { Tooltip } from './Tooltip';

interface InlineHelpProps {
  topic: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

// Comprehensive help content for different topics
const helpContent: Record<string, { title: string; content: string; tips?: string[] }> = {
  // Form field help
  'source-selection': {
    title: 'Comparable Source',
    content: 'Select where you found this comparable vehicle. This helps track data sources and establishes credibility for your analysis. AutoTrader, Cars.com, and CarMax are highly regarded sources.',
    tips: [
      'Dealer listings often have more detailed information',
      'Private party sales may need condition verification',
      'CarMax provides no-haggle pricing data'
    ]
  },
  
  'source-url': {
    title: 'Source URL',
    content: 'Paste the direct link to the vehicle listing. This allows you to quickly reference the original listing later and provides documentation for your analysis.',
    tips: [
      'Save URLs before listings expire',
      'Take screenshots as backup documentation',
      'Verify links work before finalizing analysis'
    ]
  },
  
  'vehicle-year': {
    title: 'Model Year',
    content: 'Enter the model year of the comparable vehicle. Vehicles within 2 years of your loss vehicle receive the highest quality scores. Each year difference results in a 2-point penalty.',
    tips: [
      'Exact year matches get no penalty',
      'Model year changes can affect equipment availability',
      'Consider mid-cycle refreshes and updates'
    ]
  },
  
  'vehicle-make': {
    title: 'Vehicle Make',
    content: 'Enter the manufacturer name. Same make as your loss vehicle provides the most accurate comparison, but different makes in the same class can still be valuable.',
    tips: [
      'Use consistent spelling (Toyota, not TOYOTA)',
      'Luxury brands may have different depreciation patterns',
      'Consider brand reputation and reliability factors'
    ]
  },
  
  'vehicle-model': {
    title: 'Vehicle Model',
    content: 'Enter the specific model name. Same model provides the best comparison, but similar models in the same vehicle class can also be used with appropriate adjustments.',
    tips: [
      'Be specific (Camry, not just sedan)',
      'Consider model generations and redesigns',
      'Similar class vehicles can work if exact matches are limited'
    ]
  },
  
  'vehicle-trim': {
    title: 'Trim Level',
    content: 'Enter the trim level or package (e.g., SE, XLE, Limited). This affects equipment and pricing. Higher trims typically have more features and higher values.',
    tips: [
      'Trim levels determine standard equipment',
      'Base trims may need equipment adjustments',
      'Sport packages often add significant value'
    ]
  },
  
  'vehicle-mileage': {
    title: 'Vehicle Mileage',
    content: 'Enter the total odometer reading. Mileage within 20% of your loss vehicle gets bonus points. The system automatically calculates mileage adjustments based on vehicle age.',
    tips: [
      'Verify mileage is reasonable for vehicle age',
      'High mileage vehicles get larger adjustments',
      'Low mileage can indicate limited use or issues'
    ]
  },
  
  'vehicle-location': {
    title: 'Vehicle Location',
    content: 'Enter where the comparable vehicle is located in "City, ST" format. Closer locations (within 100 miles) receive higher quality scores. Distance is automatically calculated.',
    tips: [
      'Use standard city and state abbreviations',
      'Regional markets can affect pricing',
      'Consider transportation costs for distant vehicles'
    ]
  },
  
  'list-price': {
    title: 'List Price',
    content: 'Enter the advertised asking price from the listing. This will be adjusted for mileage, equipment, and condition differences to calculate the final comparable value.',
    tips: [
      'Use the asking price, not negotiated price',
      'Verify price includes all fees if applicable',
      'Watch for price reductions over time'
    ]
  },
  
  'vehicle-condition': {
    title: 'Vehicle Condition',
    content: 'Select the overall condition based on the listing description and photos. This affects the final adjusted price: Excellent (+5%), Good (baseline), Fair (-5%), Poor (-15%).',
    tips: [
      'Excellent: Like new, no visible wear',
      'Good: Minor wear, well maintained',
      'Fair: Noticeable wear, some issues',
      'Poor: Significant wear or damage'
    ]
  },
  
  'vehicle-equipment': {
    title: 'Equipment Features',
    content: 'Select all features this comparable has. Equipment matching your loss vehicle gets bonus points (+15 for all matches). Missing features get penalties (-10 each), extra features get small bonuses (+5 each).',
    tips: [
      'Check listing details carefully',
      'Verify trim-level standard equipment',
      'Consider aftermarket vs. factory options'
    ]
  },
  
  // Quality score help
  'quality-score': {
    title: 'Quality Score Explained',
    content: 'Quality scores determine how much weight each comparable receives in the market value calculation. Scores range from 0-120+, with higher scores indicating better matches.',
    tips: [
      '80+ points: Excellent comparable',
      '60-80 points: Good comparable',
      'Below 60: Consider finding better matches'
    ]
  },
  
  'distance-factor': {
    title: 'Distance Factor',
    content: 'Distance penalties ensure local market relevance. No penalty within 100 miles, then 0.1 points deducted per mile over 100, capped at 20 points maximum.',
    tips: [
      'Local markets are most relevant',
      'Regional price differences can be significant',
      'Consider transportation costs in distant markets'
    ]
  },
  
  'age-factor': {
    title: 'Age Factor',
    content: 'Age penalties account for model year differences. Exact matches get no penalty, while each year difference results in a 2-point deduction, maximum 10 points.',
    tips: [
      'Model refreshes can affect comparability',
      'Technology updates between years matter',
      'Safety and emission standards may change'
    ]
  },
  
  'mileage-factor': {
    title: 'Mileage Factor',
    content: 'Mileage scoring rewards close matches. Within 20% gets +10 bonus, 20-40% difference gets -5 penalty, 40-60% gets -10, over 60% gets -15 points.',
    tips: [
      'Close mileage matches are most valuable',
      'High mileage indicates more wear',
      'Very low mileage may indicate storage issues'
    ]
  },
  
  'equipment-factor': {
    title: 'Equipment Factor',
    content: 'Equipment scoring rewards feature matches. Perfect match gets +15 bonus, each missing major feature gets -10 penalty, each extra feature gets +5 bonus.',
    tips: [
      'Equipment significantly affects value',
      'Technology features depreciate quickly',
      'Safety features add lasting value'
    ]
  },
  
  // Adjustment help
  'mileage-adjustment': {
    title: 'Mileage Adjustments',
    content: 'Mileage adjustments use industry-standard depreciation rates: $0.25/mile (0-3 years), $0.15/mile (4-7 years), $0.05/mile (8+ years). Applied to the mileage difference between comparable and loss vehicle.',
    tips: [
      'Newer vehicles depreciate faster per mile',
      'Adjustments can be substantial for high differences',
      'Based on automotive lease mileage penalties'
    ]
  },
  
  'equipment-adjustment': {
    title: 'Equipment Adjustments',
    content: 'Equipment adjustments use standard market values for common features. Missing equipment is deducted from comparable price, extra equipment is added.',
    tips: [
      'Values based on OEM option pricing',
      'Technology features may vary by age',
      'Aftermarket additions typically worth less'
    ]
  },
  
  'condition-adjustment': {
    title: 'Condition Adjustments',
    content: 'Condition adjustments normalize all comparables to the same condition level using multipliers: Excellent (1.05), Good (1.00), Fair (0.95), Poor (0.85).',
    tips: [
      'Condition significantly affects value',
      'Be conservative in condition assessment',
      'Document condition rationale'
    ]
  },
  
  // Market value help
  'market-value-calculation': {
    title: 'Market Value Calculation',
    content: 'Market value uses a quality-weighted average: sum of (adjusted price × quality score) divided by sum of quality scores. This gives more influence to higher-quality comparables.',
    tips: [
      'Higher quality comparables have more influence',
      'Outliers are naturally de-weighted',
      'Minimum 3 comparables recommended'
    ]
  },
  
  'confidence-level': {
    title: 'Confidence Level',
    content: 'Confidence level indicates analysis reliability based on comparable count, quality score consistency, and price variance. Higher confidence means more reliable results.',
    tips: [
      '90%+ confidence: Very reliable analysis',
      '70-90% confidence: Good analysis',
      'Below 70%: Consider adding more comparables'
    ]
  },
  
  'insurance-comparison': {
    title: 'Insurance Comparison',
    content: 'Compares your calculated market value with the insurance company valuation. Differences over 20% may indicate undervaluation and warrant further investigation.',
    tips: [
      'Green: Values closely aligned (within 5%)',
      'Yellow: Moderate difference (5-20%)',
      'Red: Significant difference (over 20%)'
    ]
  },
  
  // Troubleshooting help
  'low-quality-scores': {
    title: 'Improving Low Quality Scores',
    content: 'If comparables have scores below 60, try expanding search radius, looking for closer year matches, focusing on same make/model, or verifying equipment selections.',
    tips: [
      'Prioritize local market first',
      'Same make/model preferred',
      'Verify equipment accuracy'
    ]
  },
  
  'high-price-variance': {
    title: 'Reducing Price Variance',
    content: 'High price variance reduces confidence. Remove obvious outliers, verify condition assessments, check equipment consistency, and ensure comparables are from similar time periods.',
    tips: [
      'Remove extreme outliers',
      'Verify condition assessments',
      'Check for listing errors'
    ]
  },
  
  'geocoding-issues': {
    title: 'Location Issues',
    content: 'If location distance calculation fails, use standard "City, ST" format, try nearest major city, avoid abbreviations, or contact support for persistent issues.',
    tips: [
      'Use "Los Angeles, CA" format',
      'Try major nearby cities',
      'Avoid special characters'
    ]
  }
};

export const InlineHelp: React.FC<InlineHelpProps> = ({ 
  topic, 
  children, 
  position = 'top',
  size = 'md' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const help = helpContent[topic];

  if (!help) {
    console.warn(`No help content found for topic: ${topic}`);
    return children || null;
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const HelpIcon = () => (
    <svg className={`${iconSizes[size]} text-gray-400 cursor-help`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

  // Simple tooltip version
  if (!isExpanded) {
    return (
      <div className="inline-flex items-center gap-1">
        {children}
        <Tooltip content={help.content} position={position}>
          <button
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center hover:text-blue-600 transition-colors"
            aria-label={`Get help about ${help.title}`}
          >
            <HelpIcon />
          </button>
        </Tooltip>
      </div>
    );
  }

  // Expanded help panel
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1">
        {children}
        <button
          onClick={() => setIsExpanded(false)}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          aria-label={`Hide help for ${help.title}`}
        >
          <HelpIcon />
        </button>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-blue-900 mb-2">{help.title}</h4>
        <p className="text-blue-800 mb-3">{help.content}</p>
        
        {help.tips && help.tips.length > 0 && (
          <div>
            <h5 className="font-medium text-blue-900 mb-1">💡 Tips:</h5>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              {help.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button
          onClick={() => setIsExpanded(false)}
          className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Hide help
        </button>
      </div>
    </div>
  );
};

// Quick help component for specific use cases
export const QuickHelp: React.FC<{ 
  content: string; 
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ content, title, position = 'top' }) => {
  return (
    <Tooltip content={content} position={position}>
      <button className="inline-flex items-center text-gray-400 hover:text-blue-600 transition-colors ml-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        {title && <span className="sr-only">{title}</span>}
      </button>
    </Tooltip>
  );
};

// Help section component for grouping related help items
export const HelpSection: React.FC<{
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}> = ({ title, children, collapsible = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <svg 
              className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="space-y-2 text-sm text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
};