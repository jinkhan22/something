import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  service: string;
  operation: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, unknown>;
  userId?: string;
}

/**
 * ErrorLogger Service
 * 
 * Centralized error logging service that writes errors to file with context.
 * Logs include timestamps, stack traces, and contextual information for debugging.
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logDir: string;
  private logFile: string;
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  private constructor() {
    // Initialize log directory in user data folder
    const userDataPath = app.getPath('userData');
    this.logDir = path.join(userDataPath, 'logs');
    this.logFile = path.join(this.logDir, 'error.log');
    
    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Rotate log files if current log exceeds max size
   */
  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size < this.maxLogSize) {
        return;
      }

      // Rotate existing logs
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = path.join(this.logDir, `error.log.${i}`);
        const newFile = path.join(this.logDir, `error.log.${i + 1}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            // Delete oldest log
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Rotate current log
      const rotatedFile = path.join(this.logDir, 'error.log.1');
      fs.renameSync(this.logFile, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: ErrorLogEntry): void {
    try {
      this.rotateLogsIfNeeded();
      
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log an error with full context
   */
  public logError(
    service: string,
    operation: string,
    error: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service,
      operation,
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context: this.sanitizeContext(context)
    };

    // Write to file
    this.writeToFile(entry);
    
    // Also log to console for development
    console.error(`[${service}] ${operation}:`, error, context);
  }

  /**
   * Log a warning
   */
  public logWarning(
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      service,
      operation,
      message,
      context: this.sanitizeContext(context)
    };

    this.writeToFile(entry);
    console.warn(`[${service}] ${operation}:`, message, context);
  }

  /**
   * Log informational message
   */
  public logInfo(
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service,
      operation,
      message,
      context: this.sanitizeContext(context)
    };

    this.writeToFile(entry);
    console.log(`[${service}] ${operation}:`, message, context);
  }

  /**
   * Sanitize context to remove sensitive data and circular references
   */
  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) {
      return undefined;
    }

    try {
      // Create a deep copy and remove circular references
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(context)) {
        // Skip sensitive fields
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '[REDACTED]';
          continue;
        }

        // Handle different value types
        if (value === null || value === undefined) {
          sanitized[key] = value;
        } else if (typeof value === 'object') {
          try {
            // Try to stringify to check for circular references
            JSON.stringify(value);
            sanitized[key] = value;
          } catch {
            sanitized[key] = '[Circular Reference]';
          }
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize context' };
    }
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 100): ErrorLogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      const recentLines = lines.slice(-count);
      
      return recentLines
        .map(line => {
          try {
            return JSON.parse(line) as ErrorLogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is ErrorLogEntry => entry !== null);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }
      
      // Clear rotated logs
      for (let i = 1; i <= this.maxLogFiles; i++) {
        const rotatedFile = path.join(this.logDir, `error.log.${i}`);
        if (fs.existsSync(rotatedFile)) {
          fs.unlinkSync(rotatedFile);
        }
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Get log file path
   */
  public getLogFilePath(): string {
    return this.logFile;
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();
