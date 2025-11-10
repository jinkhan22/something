/**
 * Test for Market Value extraction with various formats
 */

const sampleTexts = {
  // Format 1: Standard inline format
  standardInline: `
Valuation Summary
Loss Vehicle Adjustments
Base Value = $10,066.64
Market Value = $10,062.32
Settlement Value = $10,741.06
`,

  // Format 2: Multi-line format (Market Value on one line, dollar on next)
  multiLine: `
Valuation Summary
Loss Vehicle Adjustments
Base Value
$73,261.27
Market Value
$73,391.27
Settlement Value
$75,800.00
`,

  // Format 3: OCR with extra spaces
  extraSpaces: `
Valuation Summary
Base Value   =   $45,200.00
Market  Value   =   $45,850.00
Settlement Value   =   $47,250.00
`,

  // Format 4: Colon instead of equals
  withColon: `
Valuation Summary
Base Value: $35,100.00
Market Value: $35,450.00
Settlement Value: $36,200.00
`,

  // Format 5: No equals or colon
  noSeparator: `
Valuation Summary
Base Value $28,500.00
Market Value $28,750.00
Settlement Value $29,500.00
`,

  // Format 6: Multi-line with label variations
  labelVariations: `
Valuation Summary
Base Value
$50,000.00
arket Value
$51,200.00
Settlement Value
$52,500.00
`,

  // Format 7: OCR misreads "Value" as "vale"
  valueAsVale: `
Valuation Summary
Base Value = $45,200.00
market vale = $45,850.00
Settlement Value = $47,250.00
`,
};

describe('Market Value Extraction - Various Formats', () => {
  test('should extract Market Value from standard inline format', () => {
    const text = sampleTexts.standardInline;
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
      /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('Standard inline - Market Value:', marketValue);
    expect(marketValue).toBe(10062.32);
  });

  test('should extract Market Value from multi-line format', () => {
    const text = sampleTexts.multiLine;
    const lines = text.split('\n');
    
    let marketValue = 0;
    
    // Look for "Market Value" on its own line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(Market Value|arket\s*Value):?\s*$/i)) {
        // Look for dollar amount in next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('$')) {
            const dollarMatch = nextLine.match(/\$\s*([0-9,]+\.?\d*)/);
            if (dollarMatch) {
              marketValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }
        if (marketValue > 0) break;
      }
    }
    
    console.log('Multi-line - Market Value:', marketValue);
    expect(marketValue).toBe(73391.27);
  });

  test('should extract Market Value with extra spaces', () => {
    const text = sampleTexts.extraSpaces;
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
      /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('Extra spaces - Market Value:', marketValue);
    expect(marketValue).toBe(45850.00);
  });

  test('should extract Market Value with colon separator', () => {
    const text = sampleTexts.withColon;
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
      /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('With colon - Market Value:', marketValue);
    expect(marketValue).toBe(35450.00);
  });

  test('should extract Market Value without separator', () => {
    const text = sampleTexts.noSeparator;
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
      /Market\s*Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('No separator - Market Value:', marketValue);
    expect(marketValue).toBe(28750.00);
  });

  test('should handle OCR label variations (arket Value)', () => {
    const text = sampleTexts.labelVariations;
    const lines = text.split('\n');
    
    let marketValue = 0;
    
    // Look for "Market Value" or OCR variations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(Market Value|arket\s*Value):?\s*$/i)) {
        // Look for dollar amount in next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('$')) {
            const dollarMatch = nextLine.match(/\$\s*([0-9,]+\.?\d*)/);
            if (dollarMatch) {
              marketValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }
        if (marketValue > 0) break;
      }
    }
    
    console.log('OCR variations - Market Value:', marketValue);
    expect(marketValue).toBe(51200.00);
  });

  test('should handle OCR reading "Value" as "vale"', () => {
    const text = sampleTexts.valueAsVale;
    const patterns = [
      /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('OCR "vale" variation - Market Value:', marketValue);
    
    // Should extract $45,850.00 from "market vale = $45,850.00"
    expect(marketValue).toBe(45850.00);
    // Should NOT extract Base Value
    expect(marketValue).not.toBe(45200.00);
  });

  test('should never extract Base Value as Market Value', () => {
    const text = sampleTexts.standardInline;
    
    // Try to extract with patterns
    const patterns = [
      /Market\s+Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
      /Market\s+Value\s+\$\s*([0-9,]+\.?\d*)/i,
    ];
    
    let marketValue = 0;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        marketValue = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    console.log('Extracted value:', marketValue);
    console.log('Base Value in text: 10066.64');
    console.log('Market Value in text: 10062.32');
    
    // Should extract Market Value (10062.32), NOT Base Value (10066.64)
    expect(marketValue).toBe(10062.32);
    expect(marketValue).not.toBe(10066.64);
  });
});
