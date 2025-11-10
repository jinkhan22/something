/**
 * Error Message Mapper
 * 
 * Maps technical error messages to user-friendly messages with actionable guidance.
 * Avoids exposing technical details to users while providing helpful information.
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
  errorCode?: string;
}

/**
 * Error patterns and their user-friendly mappings
 */
const ERROR_MAPPINGS: Array<{
  pattern: RegExp;
  mapping: (match: RegExpMatchArray) => UserFriendlyError;
}> = [
  // Market Value Calculation Errors - Enhanced with error codes
  {
    pattern: /Cannot calculate market value: Invalid appraisal ID/i,
    mapping: () => ({
      title: 'Invalid Appraisal',
      message: 'The appraisal ID is missing or invalid.',
      action: 'Save the appraisal first before adding comparables and calculating market value.',
      severity: 'error',
      errorCode: 'MV-001'
    })
  },
  {
    pattern: /Cannot calculate market value: Appraisal data not found/i,
    mapping: () => ({
      title: 'Appraisal Not Found',
      message: 'The appraisal data could not be found.',
      action: 'Try reloading the page or creating a new appraisal.',
      severity: 'error',
      errorCode: 'MV-002'
    })
  },
  {
    pattern: /Cannot calculate market value: No appraisal data available/i,
    mapping: () => ({
      title: 'No Appraisal Data',
      message: 'No appraisal data is currently loaded.',
      action: 'Load or create an appraisal before calculating market value.',
      severity: 'error',
      errorCode: 'MV-003'
    })
  },
  {
    pattern: /Cannot calculate market value: Missing required fields \(([^)]+)\)/i,
    mapping: (match) => ({
      title: 'Missing Required Information',
      message: `The appraisal is missing required fields: ${match[1]}.`,
      action: `Complete the following fields before calculating: ${match[1]}`,
      severity: 'error',
      errorCode: 'MV-004'
    })
  },
  {
    pattern: /Cannot calculate market value: Some comparables have missing required fields/i,
    mapping: () => ({
      title: 'Incomplete Comparable Data',
      message: 'One or more comparable vehicles are missing required information.',
      action: 'Review and complete all comparable vehicle information before calculating.',
      severity: 'error',
      errorCode: 'MV-005'
    })
  },
  {
    pattern: /Cannot calculate market value: Appraisal not found in history/i,
    mapping: () => ({
      title: 'Appraisal Not Saved',
      message: 'The appraisal has not been saved yet.',
      action: 'Save the appraisal first before adding comparables and calculating market value.',
      severity: 'warning',
      errorCode: 'MV-006'
    })
  },
  {
    pattern: /Add at least one comparable vehicle to calculate market value/i,
    mapping: () => ({
      title: 'No Comparable Vehicles',
      message: 'You need to add at least one comparable vehicle before calculating the market value.',
      action: 'Add comparable vehicles using the form below, then the market value will be calculated automatically.',
      severity: 'warning',
      errorCode: 'MV-007'
    })
  },
  {
    pattern: /Cannot calculate market value with zero comparables/i,
    mapping: () => ({
      title: 'No Comparable Vehicles',
      message: 'You need to add at least one comparable vehicle before calculating the market value.',
      action: 'Add comparable vehicles using the form below, then try calculating again.',
      severity: 'warning',
      errorCode: 'MV-007'
    })
  },
  {
    pattern: /Loss vehicle must have a valid year/i,
    mapping: () => ({
      title: 'Missing Vehicle Year',
      message: 'The loss vehicle is missing a valid year.',
      action: 'Please edit the appraisal and enter the vehicle year (between 1900 and current year).',
      severity: 'error',
      errorCode: 'VAL-001'
    })
  },
  {
    pattern: /Loss vehicle must have a valid mileage/i,
    mapping: () => ({
      title: 'Missing Vehicle Mileage',
      message: 'The loss vehicle is missing valid mileage information.',
      action: 'Please edit the appraisal and enter the vehicle mileage.',
      severity: 'error',
      errorCode: 'VAL-002'
    })
  },
  {
    pattern: /Comparable (\d+) must have a valid list price/i,
    mapping: (match) => ({
      title: 'Invalid Comparable Price',
      message: `Comparable vehicle #${match[1]} is missing a valid list price.`,
      action: `Please edit comparable #${match[1]} and enter a valid price greater than $0.`,
      severity: 'error',
      errorCode: 'VAL-101'
    })
  },
  {
    pattern: /Comparable (\d+) must have a valid mileage/i,
    mapping: (match) => ({
      title: 'Invalid Comparable Mileage',
      message: `Comparable vehicle #${match[1]} is missing valid mileage.`,
      action: `Please edit comparable #${match[1]} and enter the mileage.`,
      severity: 'error',
      errorCode: 'VAL-102'
    })
  },
  {
    pattern: /Comparable (\d+) must have a valid year/i,
    mapping: (match) => ({
      title: 'Invalid Comparable Year',
      message: `Comparable vehicle #${match[1]} is missing a valid year.`,
      action: `Please edit comparable #${match[1]} and enter the vehicle year.`,
      severity: 'error',
      errorCode: 'VAL-103'
    })
  },
  {
    pattern: /Comparable (\d+) must have adjustments calculated/i,
    mapping: (match) => ({
      title: 'Missing Adjustments',
      message: `Comparable vehicle #${match[1]} is missing price adjustments.`,
      action: 'This is usually calculated automatically. Try refreshing the page or re-adding the comparable.',
      severity: 'error',
      errorCode: 'VAL-104'
    })
  },
  {
    pattern: /Comparable (\d+) must have a valid quality score/i,
    mapping: (match) => ({
      title: 'Missing Quality Score',
      message: `Comparable vehicle #${match[1]} is missing a quality score.`,
      action: 'This is usually calculated automatically. Try refreshing the page or re-adding the comparable.',
      severity: 'error',
      errorCode: 'VAL-105'
    })
  },
  {
    pattern: /total quality scores equal zero/i,
    mapping: () => ({
      title: 'Invalid Quality Scores',
      message: 'All comparable vehicles have a quality score of zero, which prevents calculation.',
      action: 'Please check your comparable vehicles and ensure they have valid data.',
      severity: 'error',
      errorCode: 'CALC-001'
    })
  },
  {
    pattern: /Invalid adjusted price calculated/i,
    mapping: () => ({
      title: 'Calculation Error',
      message: 'An error occurred while calculating adjusted prices for comparable vehicles.',
      action: 'Please check that all comparable vehicles have valid prices and try again.',
      severity: 'error',
      errorCode: 'CALC-002'
    })
  },

  // Report Generation Errors
  {
    pattern: /Failed to generate appraisal report/i,
    mapping: () => ({
      title: 'Report Generation Failed',
      message: 'We encountered an error while generating your appraisal report.',
      action: 'Please check that all required data is complete and try again. If the problem persists, contact support.',
      severity: 'error',
      errorCode: 'RPT-001'
    })
  },
  {
    pattern: /Failed to load company logo/i,
    mapping: () => ({
      title: 'Logo Loading Failed',
      message: 'The company logo could not be loaded.',
      action: 'The report will be generated without the logo. Check that the logo file exists and is a valid image (PNG or JPG).',
      severity: 'warning',
      errorCode: 'RPT-002'
    })
  },
  {
    pattern: /ENOENT|no such file or directory/i,
    mapping: () => ({
      title: 'File Not Found',
      message: 'A required file could not be found.',
      action: 'Please check that all file paths are correct and the files exist.',
      severity: 'error',
      errorCode: 'FS-001'
    })
  },
  {
    pattern: /EACCES|permission denied/i,
    mapping: () => ({
      title: 'Permission Denied',
      message: 'The application does not have permission to access the requested file or folder.',
      action: 'Please check file permissions or try saving to a different location.',
      severity: 'error',
      errorCode: 'FS-002'
    })
  },
  {
    pattern: /ENOSPC|no space left/i,
    mapping: () => ({
      title: 'Disk Full',
      message: 'There is not enough disk space to complete this operation.',
      action: 'Please free up disk space and try again.',
      severity: 'error',
      errorCode: 'FS-003'
    })
  },

  // Validation Errors
  {
    pattern: /at least (\d+) comparable/i,
    mapping: (match) => ({
      title: 'Not Enough Comparables',
      message: `You need at least ${match[1]} comparable vehicles to generate a report.`,
      action: `Please add ${match[1]} or more comparable vehicles before generating the report.`,
      severity: 'warning',
      errorCode: 'VAL-200'
    })
  },
  {
    pattern: /missing required field/i,
    mapping: () => ({
      title: 'Missing Required Information',
      message: 'Some required information is missing from the appraisal.',
      action: 'Please review the appraisal and fill in all required fields.',
      severity: 'error',
      errorCode: 'VAL-201'
    })
  },

  // Network/API Errors
  {
    pattern: /network error|fetch failed|ECONNREFUSED/i,
    mapping: () => ({
      title: 'Connection Error',
      message: 'Unable to connect to the service.',
      action: 'Please check your internet connection and try again.',
      severity: 'error',
      errorCode: 'NET-001'
    })
  },
  {
    pattern: /timeout/i,
    mapping: () => ({
      title: 'Request Timeout',
      message: 'The operation took too long and timed out.',
      action: 'Please try again. If the problem persists, the service may be experiencing issues.',
      severity: 'error',
      errorCode: 'NET-002'
    })
  },

  // Storage Errors
  {
    pattern: /storage error|failed to save/i,
    mapping: () => ({
      title: 'Save Failed',
      message: 'Your data could not be saved.',
      action: 'Please try again. If the problem persists, check available disk space.',
      severity: 'error',
      errorCode: 'STR-001'
    })
  },
  {
    pattern: /failed to load|could not retrieve/i,
    mapping: () => ({
      title: 'Load Failed',
      message: 'The requested data could not be loaded.',
      action: 'Please try refreshing the page. If the problem persists, the data may be corrupted.',
      severity: 'error',
      errorCode: 'STR-002'
    })
  }
];

/**
 * Default error message for unmapped errors
 */
const DEFAULT_ERROR: UserFriendlyError = {
  title: 'An Error Occurred',
  message: 'Something went wrong while processing your request.',
  action: 'Please try again. If the problem persists, contact support.',
  severity: 'error',
  errorCode: 'ERR-000'
};

/**
 * Map a technical error to a user-friendly error message
 * 
 * @param error - The error to map (Error object or string)
 * @returns User-friendly error with title, message, and action
 */
export function mapErrorToUserFriendly(error: Error | string | unknown): UserFriendlyError {
  // Extract error message
  let errorMessage: string;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = String(error);
  }

  // Try to match against known patterns
  for (const { pattern, mapping } of ERROR_MAPPINGS) {
    const match = errorMessage.match(pattern);
    if (match) {
      return mapping(match);
    }
  }

  // Return default error if no pattern matches
  return DEFAULT_ERROR;
}

/**
 * Get a short error summary for notifications
 * 
 * @param error - The error to summarize
 * @returns Short error message suitable for toast notifications
 */
export function getErrorSummary(error: Error | string | unknown): string {
  const userFriendly = mapErrorToUserFriendly(error);
  return userFriendly.message;
}

/**
 * Get actionable guidance for an error
 * 
 * @param error - The error to get guidance for
 * @returns Actionable guidance string or null if none available
 */
export function getErrorAction(error: Error | string | unknown): string | null {
  const userFriendly = mapErrorToUserFriendly(error);
  return userFriendly.action || null;
}

/**
 * Check if an error is recoverable (user can take action)
 * 
 * @param error - The error to check
 * @returns True if the error has actionable guidance
 */
export function isRecoverableError(error: Error | string | unknown): boolean {
  const userFriendly = mapErrorToUserFriendly(error);
  return !!userFriendly.action;
}

/**
 * Format error for display in UI
 * 
 * @param error - The error to format
 * @returns Formatted error object with all display properties
 */
export function formatErrorForDisplay(error: Error | string | unknown): {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
  errorCode?: string;
  isRecoverable: boolean;
} {
  const userFriendly = mapErrorToUserFriendly(error);
  return {
    ...userFriendly,
    isRecoverable: !!userFriendly.action
  };
}

/**
 * Get error code for support/debugging
 * 
 * @param error - The error to get code for
 * @returns Error code string or null if none available
 */
export function getErrorCode(error: Error | string | unknown): string | null {
  const userFriendly = mapErrorToUserFriendly(error);
  return userFriendly.errorCode || null;
}
