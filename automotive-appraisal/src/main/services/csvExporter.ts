import { AppraisalRecord, ComparableVehicle, MarketAnalysis } from '../../types';
import { storage } from './storage';
import { ComparableStorageService } from './comparableStorage';
import fs from 'fs-extra';
import path from 'path';

/**
 * CSV Export Service
 * Handles exporting appraisal data to CSV format with customizable field selection
 */

// Default fields to export
const DEFAULT_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'status',
  'vin',
  'year',
  'make',
  'model',
  'trim',
  'mileage',
  'location',
  'reportType',
  'extractionMethod',
  'extractionConfidence',
  'ocrConfidence',
  'marketValue',
  'settlementValue',
  'processingTime'
];

interface ExportOptions {
  fields?: string[];
  includeHeaders?: boolean;
  delimiter?: string;
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Format date for CSV
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Extract field value from appraisal record
 */
function getFieldValue(appraisal: AppraisalRecord, field: string): any {
  switch (field) {
    case 'id':
      return appraisal.id;
    case 'createdAt':
      return formatDate(appraisal.createdAt);
    case 'updatedAt':
      return appraisal.updatedAt ? formatDate(appraisal.updatedAt) : '';
    case 'status':
      return appraisal.status;
    case 'vin':
      return appraisal.data.vin;
    case 'year':
      return appraisal.data.year;
    case 'make':
      return appraisal.data.make;
    case 'model':
      return appraisal.data.model;
    case 'trim':
      return appraisal.data.trim || '';
    case 'mileage':
      return appraisal.data.mileage;
    case 'location':
      return appraisal.data.location;
    case 'reportType':
      return appraisal.data.reportType;
    case 'extractionMethod':
      return appraisal.data.extractionMethod || '';
    case 'extractionConfidence':
      return appraisal.data.extractionConfidence;
    case 'ocrConfidence':
      return appraisal.data.ocrConfidence || '';
    case 'marketValue':
      return appraisal.data.marketValue || '';
    case 'settlementValue':
      return appraisal.data.settlementValue || '';
    case 'processingTime':
      return appraisal.processingTime || '';
    default:
      return '';
  }
}

/**
 * Convert appraisals to CSV format
 */
export function appraisalsToCSV(
  appraisals: AppraisalRecord[],
  options: ExportOptions = {}
): string {
  const {
    fields = DEFAULT_FIELDS,
    includeHeaders = true,
    delimiter = ','
  } = options;
  
  const lines: string[] = [];
  
  // Add header row
  if (includeHeaders) {
    const headers = fields.map(field => {
      // Convert camelCase to Title Case
      return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });
    lines.push(headers.map(escapeCSVField).join(delimiter));
  }
  
  // Add data rows
  for (const appraisal of appraisals) {
    const values = fields.map(field => getFieldValue(appraisal, field));
    lines.push(values.map(escapeCSVField).join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * Export appraisals to CSV file
 */
export async function exportAppraisalsToCSV(
  appraisalIds: string[],
  filePath: string,
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!appraisalIds || appraisalIds.length === 0) {
      return { success: false, error: 'No appraisals selected for export' };
    }
    
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }
    
    // Get appraisals from storage
    const appraisals: AppraisalRecord[] = [];
    const notFound: string[] = [];
    
    for (const id of appraisalIds) {
      const appraisal = storage.getAppraisal(id);
      if (appraisal) {
        appraisals.push(appraisal);
      } else {
        notFound.push(id);
      }
    }
    
    if (appraisals.length === 0) {
      return { success: false, error: 'No appraisals found with the provided IDs' };
    }
    
    // Convert to CSV
    const csv = appraisalsToCSV(appraisals, options);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    
    // Write to file
    await fs.writeFile(filePath, csv, 'utf-8');
    
    // Return success with warning if some appraisals were not found
    if (notFound.length > 0) {
      return {
        success: true,
        error: `Warning: ${notFound.length} appraisal(s) not found and were skipped`
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('CSV export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during export'
    };
  }
}

/**
 * Export appraisals to JSON file
 */
export async function exportAppraisalsToJSON(
  appraisalIds: string[],
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!appraisalIds || appraisalIds.length === 0) {
      return { success: false, error: 'No appraisals selected for export' };
    }
    
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }
    
    // Get appraisals from storage
    const appraisals: AppraisalRecord[] = [];
    const notFound: string[] = [];
    
    for (const id of appraisalIds) {
      const appraisal = storage.getAppraisal(id);
      if (appraisal) {
        appraisals.push(appraisal);
      } else {
        notFound.push(id);
      }
    }
    
    if (appraisals.length === 0) {
      return { success: false, error: 'No appraisals found with the provided IDs' };
    }
    
    // Convert to JSON
    const json = JSON.stringify(appraisals, null, 2);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    
    // Write to file
    await fs.writeFile(filePath, json, 'utf-8');
    
    // Return success with warning if some appraisals were not found
    if (notFound.length > 0) {
      return {
        success: true,
        error: `Warning: ${notFound.length} appraisal(s) not found and were skipped`
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('JSON export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during export'
    };
  }
}

// ============================================================================
// Comparable Vehicles CSV Export
// ============================================================================

/**
 * Default fields for comparable vehicles export
 */
const COMPARABLE_FIELDS = [
  'id',
  'appraisalId',
  'source',
  'sourceUrl',
  'dateAdded',
  'year',
  'make',
  'model',
  'trim',
  'mileage',
  'location',
  'distanceFromLoss',
  'listPrice',
  'adjustedPrice',
  'condition',
  'equipment',
  'qualityScore',
  'notes',
  'createdAt',
  'updatedAt'
];

/**
 * Extract field value from comparable vehicle
 */
function getComparableFieldValue(comparable: ComparableVehicle, field: string): any {
  switch (field) {
    case 'id':
      return comparable.id;
    case 'appraisalId':
      return comparable.appraisalId;
    case 'source':
      return comparable.source;
    case 'sourceUrl':
      return comparable.sourceUrl || '';
    case 'dateAdded':
      return formatDate(comparable.dateAdded);
    case 'year':
      return comparable.year;
    case 'make':
      return comparable.make;
    case 'model':
      return comparable.model;
    case 'trim':
      return comparable.trim || '';
    case 'mileage':
      return comparable.mileage;
    case 'location':
      return comparable.location;
    case 'distanceFromLoss':
      return comparable.distanceFromLoss;
    case 'listPrice':
      return comparable.listPrice;
    case 'adjustedPrice':
      return comparable.adjustedPrice || comparable.listPrice;
    case 'condition':
      return comparable.condition;
    case 'equipment':
      return comparable.equipment.join('; ');
    case 'qualityScore':
      return comparable.qualityScore.toFixed(2);
    case 'notes':
      return comparable.notes || '';
    case 'createdAt':
      return formatDate(comparable.createdAt);
    case 'updatedAt':
      return formatDate(comparable.updatedAt);
    default:
      return '';
  }
}

/**
 * Convert comparables to CSV format
 */
export function comparablesToCSV(
  comparables: ComparableVehicle[],
  options: ExportOptions = {}
): string {
  const {
    fields = COMPARABLE_FIELDS,
    includeHeaders = true,
    delimiter = ','
  } = options;
  
  const lines: string[] = [];
  
  // Add header row
  if (includeHeaders) {
    const headers = fields.map(field => {
      // Convert camelCase to Title Case
      return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    });
    lines.push(headers.map(escapeCSVField).join(delimiter));
  }
  
  // Add data rows
  for (const comparable of comparables) {
    const values = fields.map(field => getComparableFieldValue(comparable, field));
    lines.push(values.map(escapeCSVField).join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * Export comparables to CSV file
 */
export async function exportComparablesToCSV(
  appraisalId: string,
  filePath: string,
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!appraisalId) {
      return { success: false, error: 'No appraisal ID provided' };
    }
    
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }
    
    // Get comparables from storage
    const comparableStorage = new ComparableStorageService();
    const comparables = await comparableStorage.getComparables(appraisalId);
    
    if (comparables.length === 0) {
      return { success: false, error: 'No comparables found for this appraisal' };
    }
    
    // Convert to CSV
    const csv = comparablesToCSV(comparables, options);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    
    // Write to file
    await fs.writeFile(filePath, csv, 'utf-8');
    
    return { success: true };
    
  } catch (error) {
    console.error('Comparables CSV export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during export'
    };
  }
}

/**
 * Export market analysis summary to CSV
 */
export async function exportMarketAnalysisToCSV(
  marketAnalysis: MarketAnalysis,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!filePath) {
      return { success: false, error: 'No file path provided' };
    }
    
    const lines: string[] = [];
    
    // Header
    lines.push('Market Analysis Summary');
    lines.push('');
    
    // Loss Vehicle Information
    lines.push('Loss Vehicle Information');
    lines.push('Field,Value');
    lines.push(`VIN,${escapeCSVField(marketAnalysis.lossVehicle.vin)}`);
    lines.push(`Year,${marketAnalysis.lossVehicle.year}`);
    lines.push(`Make,${escapeCSVField(marketAnalysis.lossVehicle.make)}`);
    lines.push(`Model,${escapeCSVField(marketAnalysis.lossVehicle.model)}`);
    lines.push(`Mileage,${marketAnalysis.lossVehicle.mileage}`);
    lines.push(`Location,${escapeCSVField(marketAnalysis.lossVehicle.location)}`);
    lines.push('');
    
    // Market Analysis Results
    lines.push('Market Analysis Results');
    lines.push('Metric,Value');
    lines.push(`Calculated Market Value,$${marketAnalysis.calculatedMarketValue.toFixed(2)}`);
    lines.push(`Insurance Value,$${marketAnalysis.insuranceValue.toFixed(2)}`);
    lines.push(`Difference,$${marketAnalysis.valueDifference.toFixed(2)}`);
    lines.push(`Difference Percentage,${marketAnalysis.valueDifferencePercentage.toFixed(2)}%`);
    lines.push(`Is Undervalued,${marketAnalysis.isUndervalued ? 'Yes' : 'No'}`);
    lines.push(`Confidence Level,${marketAnalysis.confidenceLevel.toFixed(0)}%`);
    lines.push(`Number of Comparables,${marketAnalysis.comparablesCount}`);
    lines.push(`Calculation Method,${marketAnalysis.calculationMethod}`);
    lines.push('');
    
    // Comparables Summary
    lines.push('Comparable Vehicles');
    const comparableHeaders = ['Vehicle', 'Mileage', 'Location', 'Distance (mi)', 'List Price', 'Adjusted Price', 'Quality Score', 'Source'];
    lines.push(comparableHeaders.join(','));
    
    for (const comp of marketAnalysis.comparables) {
      const row = [
        `${comp.year} ${comp.make} ${comp.model}`,
        comp.mileage.toString(),
        comp.location,
        comp.distanceFromLoss.toString(),
        `$${comp.listPrice.toFixed(2)}`,
        `$${(comp.adjustedPrice || comp.listPrice).toFixed(2)}`,
        comp.qualityScore.toFixed(2),
        comp.source
      ];
      lines.push(row.map(escapeCSVField).join(','));
    }
    
    // Write to file
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    
    return { success: true };
    
  } catch (error) {
    console.error('Market analysis CSV export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during export'
    };
  }
}
