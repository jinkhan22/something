import { ExtractedVehicleData } from '../../types';
import { extractTextWithOCRProcess as extractTextWithOCR, OCRProgressCallback } from './ocrExtractorProcess';

// Mitchell and CCC One specific extraction patterns
// Simplified patterns for clean OCR text (no more corruption workarounds!)
const MITCHELL_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  // Clean "Loss vehicle: YYYY Make Model |" pattern
  vehicleInfo: /Loss vehicle:\s*(\d{4})\s+([A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)\s+([\w\s\-]+?)\s*\|/i,
  // Simple mileage pattern
  mileage: /(\d{1,3}(?:,\d{3})*)\s*miles/i,
  // Clean location patterns
  location: [
    /Location[:\s]*([A-Z]{2}\s+\d{5})/i,
    /^([A-Z]{2}\s+\d{5})$/m,
    /([A-Z]{2}\s+\d{5})/
  ],
  // Market value patterns - ONLY match "Market Value", not "Base Value"
  // Multiple patterns to handle various OCR spacing and formatting
  // NOTE: OCR often misreads "Value" as "vale", "Val", "vaue" etc. so we include those variations
  // NOTE: OCR sometimes removes spaces ("Marketvalue") and dollar signs, or corrupts decimals
  marketValue: [
    /Market\s+Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,  // "Market Value" or "Market vale"
    /Market\s+Val(?:ue|e)\s*:\s*\$\s*([0-9,]+\.?\d*)/i,
    /Market\s+Val(?:ue|e)\s+\$\s*([0-9,]+\.?\d*)/i,
    /Market\s*Val(?:ue|e)\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    // Handle OCR errors: missing space, missing $, corrupted decimals, typos in "value"
    /Market\s*va[lu](?:ue|e)\s*=\s*\$?\s*([0-9,]+\.?\d*)/i,  // "Marketvalue", "Marketvaue" with or without $
    /Market\s*va[lu](?:ue|a?ue?)\s*=\s*([0-9]{6,})/i,  // OCR corrupted: "Marketvalue = 978221" (6+ digits, no decimal)
    /[vmu]a[rliu]k[eoa]t\s*[vmu]a[lti][liuo][eoa]\s*=\s*[s\$]?\s*([0-9]{6,})/i,  // Severe OCR: "varketvalie = s978221"
  ],
  // Simple settlement value patterns
  settlementValue: [
    /Settlement Value\s*=\s*\$\s*([0-9,]+\.?\d*)/i,
    /Settlement Value:?\s*\$\s*([0-9,]+\.?\d*)/i
  ]
};

// Comprehensive vehicle manufacturers database (sorted by length - longest first)
const VEHICLE_MANUFACTURERS = [
  // Multi-word manufacturers (longest first to avoid partial matches)
  'Morgan Motor Company',
  'Mahindra & Mahindra', 
  'McLaren Automotive',
  'Chevrolet Division',
  'Peugeot Citroën',
  'American Motors',
  'Harley Davidson',
  'General Motors',
  'Ashok Leyland',
  'Pinin Farina',
  'Aston Martin',
  'Alfa Romeo',
  'Land Rover',
  'Range Rover',
  'Rolls Royce',
  'Dodge Ram',
  'AM General',
  
  // Single-word manufacturers (alphabetical)
  'Acura', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 
  'Chrysler', 'Dodge', 'Ferrari', 'Ford', 'GMC', 'Honda', 'Hyundai', 
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Lexus', 'Lincoln',
  'Lucid', 'Maserati', 'Mazda', 'Mercedes', 'Mercedes-Benz', 'Mitsubishi', 
  'Nissan', 'Porsche', 'Ram', 'Rivian', 'Subaru', 'Tesla', 'Toyota', 
  'Volkswagen', 'Volvo'
];

// Note: With Tesseract OCR, we no longer need OCR corruption workarounds!

// Parse make and model using comprehensive manufacturer database
// Simplified for clean OCR text (no more corruption handling needed!)
function parseMakeModel(vehicleText: string): { make: string; model: string } {
  const cleanText = vehicleText.trim();
  
  // Try exact manufacturer matches (sorted longest first)
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    const manufacturerIndex = cleanText.toLowerCase().indexOf(manufacturer.toLowerCase());
    if (manufacturerIndex !== -1) {
      const make = manufacturer;
      
      // Extract everything after the manufacturer name until the first "|"
      const afterMake = cleanText.substring(manufacturerIndex + manufacturer.length).trim();
      const modelMatch = afterMake.match(/^([^|]+)/);
      const model = modelMatch ? modelMatch[1].trim() : '';
      
      // Only return if we found a meaningful model
      if (model && model.length > 0) {
        return { make, model };
      }
    }
  }
  
  // Fallback: if no manufacturer found, use first word as make
  const words = cleanText.split(/\s+/);
  if (words.length >= 2) {
    const make = words[0];
    const modelParts = words.slice(1);
    const model = modelParts.join(' ').replace(/\|.*$/, '').trim();
    return { make, model };
  }
  
  return { make: words[0] || '', model: '' };
}

// VIN to manufacturer mapping
const VIN_MANUFACTURER_MAP: Record<string, string> = {
  '1FT': 'Ford',
  '1GC': 'Chevrolet',
  '1GM': 'Chevrolet', 
  '1HD': 'Harley-Davidson',
  '2C3': 'Chrysler',
  '2C4': 'Chrysler',
  '2T1': 'Toyota',
  '3FA': 'Ford',
  '3VW': 'Volkswagen',
  '4T1': 'Toyota',
  '5YJ': 'Tesla',
  'JHM': 'Honda',
  'JN1': 'Nissan',
  'KMH': 'Hyundai',
  'WBA': 'BMW',
  'WBS': 'BMW',
  'WDD': 'Mercedes-Benz',
  'WVW': 'Volkswagen',
  'YV1': 'Volvo',
  '5XY': 'Hyundai'
};

// Model patterns for Mitchell reports
const MITCHELL_MODEL_PATTERNS = {
  // Match various Mitchell model formats
  modelLine1: /^([A-Za-z0-9\s\-]+?)(?:\s+(?:\d+\s+Door|XLT|Sport|Competition|Sedan|Crew Cab))/i,
  modelLine2: /^([A-Za-z0-9\s\-]+?)\s+(?:4\s+Door|Crew\s+Cab|Sedan|Coupe|Wagon|Hatchback)/i,
  // Generic pipe pattern for "Model | Trim" format common in Mitchell reports
  pipePattern: /([A-Za-z0-9\s\-]+?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|$)/i,
  // General model extraction before technical specs
  generalModel: /^([A-Za-z0-9\s\-]+?)(?:\s+\d+\.\d+L|\s+\d+\s+Cyl|\s+AWD|\s+FWD|\s+RWD|$)/i
};

const CCC_PATTERNS = {
  vin: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  // CCC reports have "Year YYYY" followed by text on same or next line
  // OCR sometimes splits this across lines, so match "Year" followed by 4 digits
  // ALSO match "Loss Vehicle YYYY Make Model" format (without colon)
  year: [
    /Year\s+(\d{4})/i,
    /Loss [Vv]ehicle:?\s+(\d{4})/i  // Handle both "Loss vehicle:" and "Loss Vehicle" (no colon)
  ],
  // CCC reports have specific "Make Brand" format
  // OCR sometimes adds garbage characters after the make name like "} ) oo" or ") } Co"
  // ALSO extract from "Loss Vehicle YYYY Make Model" format (e.g., "Loss Vehicle 2015 Mercedes-Benz SL-Class SL400")
  make: [
    /^Make\s+([A-Za-z\-]+?)(?:\s+[})()]+|\s*$)/m,
    /Loss [Vv]ehicle:?\s+\d{4}\s+([A-Za-z][A-Za-z\-]+(?:\s+[A-Za-z\-]+)?)/i  // Extract make (can be multi-word like "Mercedes-Benz")
  ],
  // CCC reports have specific "Model ModelName" format
  // Model can include spaces (e.g., "Model 3") and numbers, but stop at "Vehicle" keyword
  // Model is usually a short string (1-3 words), not a full sentence
  // ALSO extract from "Loss Vehicle YYYY Make Model" format
  model: [
    /^Model\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9]+)?(?:\s+[A-Za-z0-9]+)?)(?:\s|$)/m,
    // Match everything after "Make" in "Loss Vehicle YYYY Make Model" (e.g., "SL-Class SL400")
    // This pattern looks for the model after a known manufacturer name or after a single word
    /Loss [Vv]ehicle:?\s+\d{4}\s+(?:[A-Za-z\-]+\s+)?[A-Za-z\-]+\s+([\w\s\-]+?)(?:\n|$)/i
  ],
  // CCC reports have "Odometer XX,XXX" format (may have extra text after)
  mileage: /^Odometer\s+(\d{1,3}(?:,\d{3})*)/m,
  // CCC reports have "Location CITY, ST ZIPCODE" - match location up to "are" or "clot" or end
  // OCR often adds corrupted text after the zipcode
  location: /^Location\s+([A-Z][A-Z\s,\.\-0-9]+?)(?:\s+(?:are|clot|Vehicles)|\s*$)/m,
  // CCC reports have "Total $ XX,XXX.XX" - may have extra text after the amount
  // OCR sometimes adds spaces in the number (e.g., "9,251 .08")
  // Match the dollar amount and ignore anything after it
  settlementValue: /^Total\s+\$\s*([0-9,]+\s*\.\s*\d{2})/m,
  // CCC reports show BOTH "Base Vehicle Value" and "Adjusted Vehicle Value"
  // Base Vehicle Value = before condition adjustment
  // Adjusted Vehicle Value = after condition adjustment (THIS IS THE MARKET VALUE)
  // We want the Adjusted Vehicle Value as the market value
  marketValue: /^Adjusted Vehicle Value\s+\$\s*([0-9,]+\.\d{2})/m,
};

function extractField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : null;
}

// Extract field using multiple patterns (tries each pattern until one matches)
function extractFieldMultiple(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Extract vehicle info - simplified for clean OCR text
function extractVehicleInfo(text: string): { year: number; make: string; model: string } | null {
  // Match the entire "Loss vehicle:" line
  const lossVehicleMatch = text.match(/Loss vehicle:\s*(\d{4})\s+([\w\s\-]+?)\s*\|/i);
  
  if (!lossVehicleMatch) {
    return null;
  }
  
  const year = parseInt(lossVehicleMatch[1]);
  const vehicleText = lossVehicleMatch[2].trim(); // e.g., "Hyundai Santa Fe Sport" or "BMW M3"
  
  // Use the manufacturer list to identify where the make ends
  let make = '';
  let model = '';
  
  // Try to match against our manufacturer list (sorted longest first)
  for (const manufacturer of VEHICLE_MANUFACTURERS) {
    // Check if vehicleText starts with this manufacturer
    if (vehicleText.toLowerCase().startsWith(manufacturer.toLowerCase())) {
      make = manufacturer;
      // Everything after the manufacturer is the model
      model = vehicleText.substring(manufacturer.length).trim();
      break;
    }
  }
  
  // If no manufacturer match found, fall back to first word as make
  if (!make) {
    const words = vehicleText.split(/\s+/);
    make = words[0];
    model = words.slice(1).join(' ');
  }
  
  return {
    year,
    make,
    model
  };
}

function parseMileage(mileageStr: string | null): number {
  if (!mileageStr) return 0;
  return parseInt(mileageStr.replace(/,/g, ''));
}

// Decode manufacturer from VIN
function getManufacturerFromVIN(vin: string): string {
  if (!vin || vin.length < 3) return '';
  
  const vinPrefix = vin.substring(0, 3);
  return VIN_MANUFACTURER_MAP[vinPrefix] || '';
}

// Decode year from VIN (10th character)
function getYearFromVIN(vin: string): number {
  if (!vin || vin.length < 10) return 0;
  
  const yearChar = vin.charAt(9);
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
    'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
    'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };
  
  return yearMap[yearChar] || 0;
}

// Extract model information from Mitchell report lines
// Note: This function is currently unused with OCR but kept for potential fallback scenarios
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractMitchellModel(lines: string[], startIndex: number): string {
  // Look for model information in the next few lines after vehicle info
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or lines with just numbers/special chars
    if (!line || line.length < 3 || /^[\d\s\-_]+$/.test(line)) continue;
    
    // Skip "Mileage" line specifically
    if (line === 'Mileage') continue;
    
    // Skip mileage lines (contains numbers followed by "miles")
    if (/\d+[,\d]*\s+miles/i.test(line)) continue;
    
    // Handle OCR artifacts: lines starting with single letters
    let processedLine = line;
    if (/^[a-zA-Z]\s+/.test(line)) {
      // Remove the single letter prefix and continue processing
      processedLine = line.substring(2).trim();
      
      // If after removing the prefix, we don't have enough content, skip
      if (processedLine.length < 5) {
        continue;
      }
      
      // Special handling for lines that start with a model name (common OCR artifact)
      // Look for common Toyota models that might appear first
      if (processedLine.toLowerCase().startsWith('corolla')) {
        // Extract just the model part, stopping at technical specs
        const modelMatch = processedLine.match(/^([a-zA-Z][a-zA-Z\s]*?)(?:\s+\d|\s+[A-Z]+\s+[A-Z]+|$)/);
        if (modelMatch) {
          return modelMatch[1].trim();
        }
      }
    }
    
    // Skip lines that are mostly numbers with some non-alphanumeric chars
    if (/^[\d\s,\-_().]+$/.test(line)) continue;
    
    // Try to use our comprehensive manufacturer parsing
    const parsed = parseMakeModel(processedLine);
    if (parsed.model && parsed.model.length > 2) {
      return parsed.model;
    }
    
    // Generic patterns for Mitchell reports using quality scoring
    let bestModel = '';
    const candidates = [];
    
    // Generic pipe pattern: "Model | Trim Details"
    const pipeMatch = line.match(/([A-Za-z0-9\s\-]+?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|$)/i);
    if (pipeMatch) {
      const modelPart = pipeMatch[1].trim();
      const trimPart = pipeMatch[2].trim();
      
      if (modelPart && trimPart && 
          !modelPart.includes('\n') && !trimPart.includes('\n') &&
          !modelPart.includes('©') && !trimPart.includes('©')) {
        
        // Calculate quality score (prefer shorter, cleaner modelPart)
        const quality = 100 - modelPart.length - (modelPart.includes('Cyl') ? 50 : 0);
        
        candidates.push({
          model: `${modelPart} ${trimPart}`.replace(/\s+/g, ' ').trim(),
          quality: quality
        });
      }
    }
    
    // Try other generic patterns
    let modelMatch;
    
    // Pattern: Model followed by door count or body style
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.modelLine1);
    if (modelMatch) {
      candidates.push({
        model: modelMatch[1].trim(),
        quality: 80
      });
    }
    
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.modelLine2);
    if (modelMatch) {
      candidates.push({
        model: modelMatch[1].trim(),
        quality: 75
      });
    }
    
    modelMatch = line.match(MITCHELL_MODEL_PATTERNS.generalModel);
    if (modelMatch) {
      candidates.push({
        model: modelMatch[1].trim(),
        quality: 70
      });
    }
    
    // Pick the best candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.quality - a.quality);
      return candidates[0].model;
    }
  }
  
  return '';
}

// Enhanced model extraction that searches the entire text
// Simplified for clean OCR text
function findModelInText(text: string, make: string): string {
  const lines = text.split('\n');
  
  // Look for lines that contain the manufacturer
  const makeVariations = [make.toLowerCase()];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip lines that are too short, OCR artifacts, or mileage lines
    if (line.length < 10 || 
        /^[a-zA-Z]\s+/.test(line) || 
        /\d+[,\d]*\s+miles/i.test(line) ||
        /^[\d\s,\-_().]+$/.test(line)) continue;
    
    // Check if this line contains any variation of the manufacturer
    const hasManufacturer = makeVariations.some(variant => 
      line.toLowerCase().includes(variant)
    );
    
    if (hasManufacturer) {
      // First try our comprehensive manufacturer parsing
      const parsed = parseMakeModel(line);
      if (parsed.model && parsed.model.length > 2) {
        return parsed.model;
      }
      
      // Generic Mitchell Report pattern: often uses pipes to separate info
      // Common format: "Make Model | Trim | Engine" or "Make Model Trim | Engine"
      const pipePattern = /([A-Za-z0-9\s\-]+?)\s*\|\s*([A-Za-z0-9\s]+?)(?:\s+\d+\s+Door|\s+\d+\.\d+L|$)/gi;
      let match;
      const candidates = [];
      
      while ((match = pipePattern.exec(text)) !== null) {
        const part1 = match[1].trim();
        const part2 = match[2].trim();
        
        if (part1.length > 0 && part2.length > 0 && 
            !part1.includes('©') && !part2.includes('©') &&
            !part1.includes('Page') && !part2.includes('Page') &&
            !part1.includes('\n') && !part2.includes('\n') && // Prefer single-line matches
            (part2.includes('Competition') || part2.includes('Sport') || 
             part2.includes('XLT') || part2.includes('Limited') ||
             part2.includes('4 Door') || part2.includes('Sedan'))) {
          
          // Calculate a quality score (prefer shorter, cleaner part1)
          const quality = 100 - part1.length - (part1.includes('Cyl') ? 50 : 0) - (part1.includes('RWD') ? 50 : 0);
          
          candidates.push({
            model: `${part1} ${part2}`.replace(/\s+/g, ' ').trim(),
            quality: quality
          });
        }
      }
      
      // Sort by quality and pick the best
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.quality - a.quality);
        const bestModel = candidates[0].model
          .replace(/\s+\d+\s+Door.*$/i, '') // Remove door count and beyond
          .replace(/\s+\d+\.\d+L.*$/i, '') // Remove engine specs
          .replace(/\s+(AWD|FWD|RWD).*$/i, '') // Remove drivetrain
          .trim();
        
        if (bestModel && bestModel.length > 1) {
          return bestModel;
        }
      }
    }
  }
  
  return '';
}

// Clean up garbled OCR text in model names
function cleanModelName(model: string): string {
  if (!model) return '';
  
  // Remove common OCR artifacts and extra spaces
  return model
    .replace(/^[^a-zA-Z0-9]*/, '') // Remove leading non-alphanumeric chars
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

// Extract data from Mitchell reports
// Simplified for clean OCR text!
function extractMitchellData(text: string): ExtractedVehicleData {
  const lines = text.split('\n');
  
  // Extract VIN with context to avoid grabbing comparable vehicle VINs
  // Look for VIN near "Ext Color", "Vehicle Information", or in first 30 lines
  let vin = '';
  const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;  // Valid VIN characters (no I, O, Q)
  const vinPatternWithOCRErrors = /[A-Z0-9]{17}/;  // Includes O for OCR errors
  
  // Strategy 1: Look for VIN near "Ext Color" (most reliable)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/ext\s+color|exterior\s+color/i)) {
      // Check next 5 lines for VIN
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        let vinMatch = lines[j].match(vinPattern);
        // Try with OCR error pattern (O instead of 0) if no match
        if (!vinMatch) {
          vinMatch = lines[j].match(vinPatternWithOCRErrors);
          if (vinMatch) {
            // Fix OCR error: replace O with 0
            vin = vinMatch[0].replace(/O/g, '0');
            break;
          }
        } else {
          vin = vinMatch[0];
          break;
        }
      }
      if (vin) break;
    }
  }
  
  // Strategy 2: If not found, look in "Vehicle Information" section (first 30 lines)
  if (!vin) {
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      let vinMatch = lines[i].match(vinPattern);
      // Try with OCR error pattern if no match
      if (!vinMatch) {
        vinMatch = lines[i].match(vinPatternWithOCRErrors);
        if (vinMatch) {
          vin = vinMatch[0].replace(/O/g, '0');
          break;
        }
      } else {
        vin = vinMatch[0];
        break;
      }
    }
  }
  
  // Strategy 3: Last resort - use simple pattern (may get comparable VIN)
  if (!vin) {
    vin = extractField(text, MITCHELL_PATTERNS.vin) || '';
    // Fix potential OCR errors
    if (vin && /O/.test(vin)) {
      vin = vin.replace(/O/g, '0');
    }
  }
  
  // Extract vehicle info with clean OCR text
  let year = 0;
  let make = '';
  let model = '';
  
  // Primary extraction from "Loss vehicle:" line
  const vehicleInfo = extractVehicleInfo(text);
  if (vehicleInfo) {
    year = vehicleInfo.year;
    make = vehicleInfo.make;
    model = vehicleInfo.model;
  }
  
  // Fallback: use VIN if primary extraction failed
  if ((!year || !make || !model) && vin) {
    if (!year) {
      year = getYearFromVIN(vin);
    }
    if (!make) {
      make = getManufacturerFromVIN(vin);
    }
    if (!model && make) {
      model = findModelInText(text, make);
    }
  }
  
  // Enhanced settlement value extraction for Mitchell reports
  let settlementValue = 0;
  const settlementMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.settlementValue);
  if (settlementMatch) {
    settlementValue = parseFloat(settlementMatch.replace(/,/g, ''));
  } else {
    // Fallback: look for "Settlement Value" pattern manually for multi-line cases
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(Settlement Value|ettle\s*ent\s*Value):?\s*$/i)) {
        // Look for the dollar amount in the next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('$')) {
            const dollarMatch = nextLine.match(/\$([0-9,]+\.?\d*)/);
            if (dollarMatch) {
              settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
              break;
            }
          }
        }
        if (settlementValue > 0) break;
      }
      // Also check for the specific pattern we found: "$52,352.67" on its own line
      if (line.match(/^\$([0-9,]+\.\d+)$/) && i > 5) {  // Only after some content
        const prevLines = lines.slice(Math.max(0, i-3), i);
        const hasSettlementContext = prevLines.some(prevLine => 
          prevLine.toLowerCase().includes('ettle') || prevLine.toLowerCase().includes('settlement')
        );
        if (hasSettlementContext) {
          const dollarMatch = line.match(/^\$([0-9,]+\.\d+)$/);
          if (dollarMatch) {
            settlementValue = parseFloat(dollarMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }
    }
  }
  
  // Enhanced market value extraction for Mitchell reports
  let marketValue = 0;
  const marketMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.marketValue);
  if (marketMatch) {
    let valueStr = marketMatch.replace(/,/g, '');
    // If the value is 6+ digits with no decimal (OCR error), need to fix it
    if (/^\d{6,}$/.test(valueStr)) {
      // Check if first digit might be corrupted $ sign (OCR reads $ as 3, 5, S, etc.)
      // Pattern: 7+ digits starting with 3-5 = likely corrupted $ + actual price
      // e.g., "35285267" is actually "$52,852.67" (remove first digit, add decimal)
      if (/^[3-5]\d{6,}$/.test(valueStr)) {
        // Remove first digit (corrupted $) and add decimal
        valueStr = valueStr.slice(1, -2) + '.' + valueStr.slice(-2);
      } else {
        // Normal case: just insert decimal before last 2 digits
        // e.g., "978221" -> "9782.21", "7339127" -> "73391.27"
        valueStr = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
      }
    }
    marketValue = parseFloat(valueStr);
  } else {
    // Fallback: look for "Market Value" pattern manually for multi-line cases
    // Handle OCR variations: "Value" can be "vale", "Val", etc.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for "Market Value" label (may have OCR variations like "Market vale" or "arket Value")
      if (line.match(/^(Market\s+Val(?:ue|e)|arket\s*Val(?:ue|e)):?\s*$/i)) {
        // Look for the dollar amount in the next few lines
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
      // Also check for inline patterns with OCR variations in spacing
      // Handle "Value" vs "vale" vs "Val" vs "vaue", and missing $ or decimal
      const inlineMatch = line.match(/Market\s*va[lu](?:ue|e|aue?)\s*[:\s=]*\$?\s*([0-9,]+\.?\d*)/i);
      if (inlineMatch) {
        let valueStr = inlineMatch[1].replace(/,/g, '');
        // If 6+ digits with no decimal (OCR error), need to fix it
        if (/^\d{6,}$/.test(valueStr)) {
          // Check if first digit might be corrupted $ sign (7+ digits starting with 3-5)
          if (/^[3-5]\d{6,}$/.test(valueStr)) {
            // Remove first digit (corrupted $) and add decimal
            valueStr = valueStr.slice(1, -2) + '.' + valueStr.slice(-2);
          } else {
            // Normal case: just insert decimal before last 2 digits
            valueStr = valueStr.slice(0, -2) + '.' + valueStr.slice(-2);
          }
        }
        marketValue = parseFloat(valueStr);
        break;
      }
    }
  }
  
  // Enhanced location extraction
  let location = '';
  const locationMatch = extractFieldMultiple(text, MITCHELL_PATTERNS.location);
  if (locationMatch) {
    location = locationMatch;
  }
  
  return {
    vin,
    year,
    make,
    model: cleanModelName(model),
    mileage: parseMileage(extractField(text, MITCHELL_PATTERNS.mileage)),
    location,
    reportType: 'MITCHELL',
    extractionConfidence: 0,
    extractionErrors: [],
    settlementValue,
    marketValue
  };
}

// Fix common OCR errors in model names
function fixModelOCRErrors(model: string, make: string): string {
  if (!model) return model;
  
  // Trim the model first to remove any trailing/leading whitespace
  let fixed = model.trim();
  
  // Common OCR error corrections specific to known models
  const corrections: Record<string, Record<string, string>> = {
    'Volvo': {
      'XG60': 'XC60',
      'XG90': 'XC90',
      'XG40': 'XC40',
      'S60': 'S60',
      'S90': 'S90',
      'V60': 'V60',
      'V90': 'V90',
    },
    'BMW': {
      'M3': 'M3',
      'X3': 'X3',
      'X5': 'X5',
      'X7': 'X7',
      '3 Series': '3 Series',
      '5 Series': '5 Series',
      '7 Series': '7 Series',
      '8': '8 Series',  // OCR might drop "Series"
    },
    'Tesla': {
      'Model': 'Model 3',  // OCR sometimes cuts off the number
      'Model 3': 'Model 3',
      'Model S': 'Model S',
      'Model X': 'Model X',
      'Model Y': 'Model Y',
    },
    'Mercedes-Benz': {
      'SL-Class': 'SL-Class',
      'S-Class': 'S-Class',
      'E-Class': 'E-Class',
      'C-Class': 'C-Class',
      'GLE': 'GLE',
      'GLC': 'GLC',
    },
    // Add more as needed
  };
  
  // Check if we have corrections for this make
  if (corrections[make]) {
    const corrected = corrections[make][fixed];
    if (corrected) {
      return corrected;
    }
  }
  
  // Generic correction: Replace common OCR errors
  // C -> G is very common in OCR
  
  // For models starting with X, if followed by G and then numbers, likely XC (Volvo)
  if (/^X[G]/.test(fixed)) {
    fixed = fixed.replace(/^X[G]/, 'XC');
  }
  
  return fixed;
}

// Clean model name from CCC reports
function cleanCCCModel(model: string): string {
  if (!model) return model;
  
  // Remove common trailing phrases that get captured by OCR
  let cleaned = model
    .replace(/\s+Vehicle\s+Information.*$/i, '')  // Remove "Vehicle Information Section..."
    .replace(/\s+Vehicle.*$/i, '')  // Remove "Vehicle" and anything after
    .replace(/\s+Section.*$/i, '')  // Remove "Section" and anything after
    .trim();
  
  return cleaned;
}

// Extract data from CCC One reports
function extractCCCData(text: string): ExtractedVehicleData {
  const vin = extractField(text, CCC_PATTERNS.vin) || '';
  
  // Handle both single RegExp and RegExp[] patterns
  const extractWithPattern = (pattern: RegExp | RegExp[]) => {
    if (Array.isArray(pattern)) {
      return extractFieldMultiple(text, pattern);
    }
    return extractField(text, pattern);
  };
  
  let year = parseInt(extractWithPattern(CCC_PATTERNS.year) || '0');
  let make = extractWithPattern(CCC_PATTERNS.make) || '';
  let model = extractWithPattern(CCC_PATTERNS.model) || '';
  
  // Special handling for "Loss Vehicle YYYY Make Model" format (without structured fields)
  if (!make || !model || !year) {
    const lossVehicleMatch = text.match(/Loss [Vv]ehicle:?\s+(\d{4})\s+([\w\s\-]+?)(?:\n|$)/i);
    if (lossVehicleMatch) {
      year = parseInt(lossVehicleMatch[1]);
      const vehicleText = lossVehicleMatch[2].trim();
      // Use the parseMakeModel function to correctly split make and model
      const parsed = parseMakeModel(vehicleText);
      make = parsed.make || make;
      model = parsed.model || model;
    }
  }
  
  const mileage = parseMileage(extractField(text, CCC_PATTERNS.mileage));
  const location = (extractField(text, CCC_PATTERNS.location) || '').trim();
  
  // Extract and clean monetary values (remove commas and spaces - OCR sometimes adds spaces)
  const settlementValueStr = extractField(text, CCC_PATTERNS.settlementValue);
  const settlementValue = parseFloat(settlementValueStr?.replace(/[,\s]/g, '') || '0');
  
  const marketValueStr = extractField(text, CCC_PATTERNS.marketValue);
  const marketValue = parseFloat(marketValueStr?.replace(/[,\s]/g, '') || '0');
  
  // Clean and fix OCR errors in model
  if (model) {
    model = cleanCCCModel(model);
    if (make) {
      model = fixModelOCRErrors(model, make);
    }
  }
  
  return {
    vin,
    year,
    make,
    model,
    mileage,
    location,
    reportType: 'CCC_ONE',
    extractionConfidence: 0,
    extractionErrors: [],
    settlementValue,
    marketValue
  };
}

export async function extractVehicleData(
  buffer: Buffer,
  onProgress?: OCRProgressCallback
): Promise<ExtractedVehicleData> {
  try {
    // Extract text from PDF using Tesseract OCR
    const text = await extractTextWithOCR(buffer, onProgress);
    
    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }
    
    // Detect report type
    const reportType = text.includes('CCC ONE') || text.includes('CCC One') ? 'CCC_ONE' : 'MITCHELL';
    
    let extractedData: ExtractedVehicleData;
    
    if (reportType === 'MITCHELL') {
      extractedData = extractMitchellData(text);
    } else {
      extractedData = extractCCCData(text);
    }
    
    extractedData.reportType = reportType;
    
    // Calculate confidence score
    extractedData.extractionConfidence = calculateConfidence(extractedData);
    
    // Validate that we extracted meaningful data
    if (extractedData.extractionConfidence < 20) {
      extractedData.extractionErrors = [
        'Low confidence in extracted data. This may not be a standard valuation report.',
        `Confidence score: ${extractedData.extractionConfidence}%`
      ];
    }
    
    // At minimum, we should have some basic vehicle info
    // For Mitchell reports: Need VIN OR (Make + Year)
    // For CCC reports: Need VIN OR Make OR Year (more flexible)
    const hasVin = !!extractedData.vin && extractedData.vin.length === 17;
    const hasMake = !!extractedData.make;
    const hasYear = !!extractedData.year && extractedData.year > 1990;
    
    let isValid = false;
    if (extractedData.reportType === 'MITCHELL') {
      // Mitchell: Need VIN OR (Make AND Year)
      isValid = hasVin || (hasMake && hasYear);
    } else {
      // CCC One: Need at least VIN OR Make OR Year
      isValid = hasVin || hasMake || hasYear;
    }
    
    // Debug logging for failed extractions
    if (!isValid) {
      console.log('DEBUG: Extraction failed validation');
      console.log('VIN:', extractedData.vin, 'Length:', extractedData.vin?.length, 'Valid:', hasVin);
      console.log('Make:', extractedData.make, 'Valid:', hasMake);
      console.log('Year:', extractedData.year, 'Valid:', hasYear);
      console.log('Report type:', extractedData.reportType);
      console.log('Confidence:', extractedData.extractionConfidence);
    }
    
    if (!isValid) {
      throw new Error('Could not extract vehicle information from this PDF. Please ensure this is a CCC One or Mitchell valuation report.');
    }
    
    return extractedData;
  } catch (error) {
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateConfidence(data: ExtractedVehicleData): number {
  let score = 0;
  const weights = {
    vin: 30,
    year: 20,
    make: 20,
    model: 15,
    mileage: 10,
    location: 5
  };
  
  if (data.vin && data.vin.length === 17) score += weights.vin;
  if (data.year > 1990 && data.year <= 2025) score += weights.year;
  if (data.make) score += weights.make;
  if (data.model) score += weights.model;
  if (data.mileage > 0) score += weights.mileage;
  if (data.location) score += weights.location;
  
  return score;
}