/**
 * Performance Optimizer Service
 * Provides adaptive processing parameters and resource management
 */

import * as os from 'os';

export interface SystemResources {
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpuCount: number;
  platform: string;
}

export interface ProcessingParameters {
  maxConcurrentPages: number;
  imageQuality: number;
  batchSize: number;
  enableCaching: boolean;
  maxImageSize: { width: number; height: number };
}

export interface PerformanceMetrics {
  processingTime: number;
  memoryUsed: number;
  pageCount: number;
  timestamp: number;
}

/**
 * Performance Optimizer class for adaptive resource management
 */
export class PerformanceOptimizer {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 50;
  
  /**
   * Get current system resources
   */
  getSystemResources(): SystemResources {
    const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemoryMB = Math.round(os.freemem() / (1024 * 1024));
    const cpuCount = os.cpus().length;
    const platform = os.platform();
    
    return {
      totalMemoryMB,
      freeMemoryMB,
      cpuCount,
      platform
    };
  }
  
  /**
   * Calculate optimal processing parameters based on system resources
   */
  getOptimalParameters(): ProcessingParameters {
    const resources = this.getSystemResources();
    const memoryUsagePercent = ((resources.totalMemoryMB - resources.freeMemoryMB) / resources.totalMemoryMB) * 100;
    
    // Base parameters
    let maxConcurrentPages = 2;
    let imageQuality = 85;
    let batchSize = 5;
    let enableCaching = true;
    let maxImageSize = { width: 2400, height: 3200 };
    
    // Adjust based on available memory
    if (resources.freeMemoryMB < 1024) {
      // Low memory: conservative settings
      maxConcurrentPages = 1;
      imageQuality = 75;
      batchSize = 2;
      maxImageSize = { width: 1800, height: 2400 };
    } else if (resources.freeMemoryMB > 4096) {
      // High memory: aggressive settings
      maxConcurrentPages = Math.min(4, resources.cpuCount);
      imageQuality = 95;
      batchSize = 10;
      maxImageSize = { width: 3000, height: 4000 };
    }
    
    // Adjust based on CPU count
    if (resources.cpuCount >= 8) {
      maxConcurrentPages = Math.min(maxConcurrentPages + 2, 6);
    }
    
    // Adjust based on current memory pressure
    if (memoryUsagePercent > 80) {
      maxConcurrentPages = Math.max(1, Math.floor(maxConcurrentPages / 2));
      batchSize = Math.max(1, Math.floor(batchSize / 2));
      enableCaching = false;
    }
    
    return {
      maxConcurrentPages,
      imageQuality,
      batchSize,
      enableCaching,
      maxImageSize
    };
  }
  
  /**
   * Record performance metrics for a processing operation
   */
  recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    });
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }
  
  /**
   * Get average processing time per page
   */
  getAverageProcessingTime(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalTime = this.metrics.reduce((sum, m) => sum + m.processingTime, 0);
    const totalPages = this.metrics.reduce((sum, m) => sum + m.pageCount, 0);
    
    return totalPages > 0 ? totalTime / totalPages : 0;
  }
  
  /**
   * Get average memory usage
   */
  getAverageMemoryUsage(): number {
    if (this.metrics.length === 0) return 0;
    
    const totalMemory = this.metrics.reduce((sum, m) => sum + m.memoryUsed, 0);
    return totalMemory / this.metrics.length;
  }
  
  /**
   * Determine if system is under memory pressure
   */
  isMemoryPressure(): boolean {
    const resources = this.getSystemResources();
    const memoryUsagePercent = ((resources.totalMemoryMB - resources.freeMemoryMB) / resources.totalMemoryMB) * 100;
    
    return memoryUsagePercent > 85 || resources.freeMemoryMB < 512;
  }
  
  /**
   * Suggest batch size based on document size and system resources
   */
  suggestBatchSize(pageCount: number, estimatedPageSizeMB: number = 2): number {
    const resources = this.getSystemResources();
    const availableMemoryMB = resources.freeMemoryMB * 0.7; // Use 70% of free memory
    
    // Calculate how many pages we can process at once
    const maxPages = Math.floor(availableMemoryMB / estimatedPageSizeMB);
    
    // Limit to reasonable bounds
    const batchSize = Math.max(1, Math.min(maxPages, 10));
    
    return Math.min(batchSize, pageCount);
  }
  
  /**
   * Check if we should enable streaming for large documents
   */
  shouldUseStreaming(pageCount: number, fileSizeMB: number): boolean {
    const resources = this.getSystemResources();
    
    // Use streaming for large documents or low memory systems
    return pageCount > 20 || fileSizeMB > 50 || resources.freeMemoryMB < 2048;
  }
  
  /**
   * Get recommended image processing settings
   */
  getImageProcessingSettings(): {
    density: number;
    format: 'png' | 'jpeg';
    quality: number;
  } {
    const params = this.getOptimalParameters();
    
    return {
      density: params.imageQuality >= 90 ? 300 : 200,
      format: params.imageQuality >= 85 ? 'png' : 'jpeg',
      quality: params.imageQuality
    };
  }
  
  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Get all performance metrics
   */
  getMetrics(): {
    avgProcessingTime: number;
    avgMemoryUsage: number;
    totalOperations: number;
    recentMetrics: PerformanceMetrics[];
  } {
    return {
      avgProcessingTime: this.getAverageProcessingTime(),
      avgMemoryUsage: this.getAverageMemoryUsage(),
      totalOperations: this.metrics.length,
      recentMetrics: this.metrics.slice(-10) // Last 10 operations
    };
  }
  
  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.clearMetrics();
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport(): {
    averageProcessingTime: number;
    averageMemoryUsage: number;
    totalProcessed: number;
    systemResources: SystemResources;
    recommendedParameters: ProcessingParameters;
  } {
    return {
      averageProcessingTime: this.getAverageProcessingTime(),
      averageMemoryUsage: this.getAverageMemoryUsage(),
      totalProcessed: this.metrics.length,
      systemResources: this.getSystemResources(),
      recommendedParameters: this.getOptimalParameters()
    };
  }
}

// Singleton instance
let optimizerInstance: PerformanceOptimizer | null = null;

/**
 * Get the singleton performance optimizer instance
 */
export function getPerformanceOptimizer(): PerformanceOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new PerformanceOptimizer();
  }
  return optimizerInstance;
}
