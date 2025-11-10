// Test the improved Land Rover parsing logic

// Multi-word vehicle manufacturers that need special handling
const MULTI_WORD_MANUFACTURERS = [
  'Alfa Romeo',
  'Aston Martin', 
  'Land Rover',
  'Range Rover', // Sometimes listed separately from Land Rover
  'Rolls Royce',
  'McLaren Automotive',
  'AM General',
  'American Motors',
  'Harley Davidson'
];

// Create a regex pattern for multi-word manufacturers
const MULTI_WORD_MAKE_PATTERN = new RegExp(
  `\\b(${MULTI_WORD_MANUFACTURERS.join('|')})\\b`,
  'i'
);

// Parse make and model with support for multi-word manufacturers
function parseMakeModel(text) {
  // First check for multi-word manufacturers
  const multiWordMatch = text.match(MULTI_WORD_MAKE_PATTERN);
  if (multiWordMatch) {
    const multiWordMake = multiWordMatch[1];
    const remaining = text.substring(text.indexOf(multiWordMake) + multiWordMake.length).trim();
    
    // Special case for Land Rover vehicles where model starts with "Range Rover"
    if (multiWordMake === 'Land Rover' && remaining.startsWith('Range Rover')) {
      const modelMatch = remaining.match(/^(Range Rover[^|]*?)(?:\s*\||$)/);
      return {
        make: multiWordMake,
        model: modelMatch ? modelMatch[1].trim() : remaining.split(/\s+/)[0] || ''
      };
    }
    
    // For other multi-word makes, extract model normally
    const modelMatch = remaining.match(/^([A-Za-z0-9\s\-]+?)(?:\s+(?:\d+\s+Door|AWD|FWD|RWD|\||$))/);
    return {
      make: multiWordMake,
      model: modelMatch ? modelMatch[1].trim() : remaining.split(/\s+/)[0] || ''
    };
  }
  
  // Standard single-word make parsing
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const modelParts = words.slice(1);
    
    // Find where model ends (look for common endings)
    const modelEndIndex = modelParts.findIndex(word => 
      /^(AWD|FWD|RWD|\d+\.\d+L|\d+\s+Door|\d+\s+Cyl|Automatic|Manual)$/i.test(word)
    );
    
    const model = modelEndIndex > -1 
      ? modelParts.slice(0, modelEndIndex).join(' ')
      : modelParts.join(' ');
      
    return { make, model: model.trim() };
  }
  
  return { make: words[0] || '', model: '' };
}

// Test cases
const testCases = [
  'Land Rover Range Rover Sport',
  'Land Rover Range Rover Sport | Dynamic 4 Door',
  'Range Rover Sport',
  'Hyundai Santa Fe Sport',
  'Ford F-150 XLT',
  'BMW 3 Series',
  'Aston Martin DB11'
];

console.log('Testing improved make/model parsing:');
testCases.forEach(testCase => {
  const result = parseMakeModel(testCase);
  console.log(`"${testCase}" -> Make: "${result.make}", Model: "${result.model}"`);
});