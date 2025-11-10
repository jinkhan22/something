import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportHistoryRecord } from '../../types';

/**
 * Service for managing report history storage
 */
export class ReportHistoryStorage {
  private historyFilePath: string;
  private history: ReportHistoryRecord[] = [];
  private initialized = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.historyFilePath = path.join(userDataPath, 'report-history.json');
  }

  /**
   * Initialize the storage by loading existing history
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.historyFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert date strings back to Date objects
      this.history = parsed.map((record: any) => ({
        ...record,
        generatedAt: new Date(record.generatedAt)
      }));
      
      this.initialized = true;
    } catch (error) {
      // File doesn't exist or is invalid, start with empty history
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.history = [];
        this.initialized = true;
        await this.save();
      } else {
        console.error('Failed to load report history:', error);
        this.history = [];
        this.initialized = true;
      }
    }
  }

  /**
   * Save history to disk
   */
  private async save(): Promise<void> {
    try {
      const data = JSON.stringify(this.history, null, 2);
      await fs.writeFile(this.historyFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save report history:', error);
      throw new Error('Failed to save report history');
    }
  }

  /**
   * Get all report history records
   */
  async getHistory(): Promise<ReportHistoryRecord[]> {
    await this.initialize();
    // Return a copy sorted by generation date (newest first)
    return [...this.history].sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  /**
   * Add a new report to history
   */
  async addReport(report: ReportHistoryRecord): Promise<boolean> {
    await this.initialize();
    
    try {
      // Check if report with same ID already exists
      const existingIndex = this.history.findIndex(r => r.id === report.id);
      
      if (existingIndex >= 0) {
        // Update existing record
        this.history[existingIndex] = report;
      } else {
        // Add new record
        this.history.push(report);
      }
      
      await this.save();
      return true;
    } catch (error) {
      console.error('Failed to add report to history:', error);
      return false;
    }
  }

  /**
   * Delete a report from history
   */
  async deleteReport(id: string): Promise<boolean> {
    await this.initialize();
    
    try {
      const initialLength = this.history.length;
      this.history = this.history.filter(r => r.id !== id);
      
      if (this.history.length < initialLength) {
        await this.save();
        return true;
      }
      
      return false; // Report not found
    } catch (error) {
      console.error('Failed to delete report from history:', error);
      return false;
    }
  }

  /**
   * Get reports for a specific appraisal
   */
  async getReportsForAppraisal(appraisalId: string): Promise<ReportHistoryRecord[]> {
    await this.initialize();
    return this.history
      .filter(r => r.appraisalId === appraisalId)
      .sort((a, b) => 
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );
  }

  /**
   * Clear all history (for testing or reset purposes)
   */
  async clearHistory(): Promise<boolean> {
    await this.initialize();
    
    try {
      this.history = [];
      await this.save();
      return true;
    } catch (error) {
      console.error('Failed to clear report history:', error);
      return false;
    }
  }
}

// Singleton instance
let instance: ReportHistoryStorage | null = null;

export function getReportHistoryStorage(): ReportHistoryStorage {
  if (!instance) {
    instance = new ReportHistoryStorage();
  }
  return instance;
}
