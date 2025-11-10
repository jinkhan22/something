/**
 * Tests for Performance Optimizer Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PerformanceOptimizer, getPerformanceOptimizer } from '../src/main/services/performanceOptimizer';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
  });

  describe('getSystemResources', () => {
    it('should return valid system resource information', () => {
      const resources = optimizer.getSystemResources();

      expect(resources.totalMemoryMB).toBeGreaterThan(0);
      expect(resources.freeMemoryMB).toBeGreaterThan(0);
      expect(resources.freeMemoryMB).toBeLessThanOrEqual(resources.totalMemoryMB);
      expect(resources.cpuCount).toBeGreaterThan(0);
      expect(resources.platform).toBeTruthy();
    });
  });

  describe('getOptimalParameters', () => {
    it('should return valid processing parameters', () => {
      const params = optimizer.getOptimalParameters();

      expect(params.maxConcurrentPages).toBeGreaterThan(0);
      expect(params.imageQuality).toBeGreaterThan(0);
      expect(params.imageQuality).toBeLessThanOrEqual(100);
      expect(params.batchSize).toBeGreaterThan(0);
      expect(typeof params.enableCaching).toBe('boolean');
      expect(params.maxImageSize.width).toBeGreaterThan(0);
      expect(params.maxImageSize.height).toBeGreaterThan(0);
    });

    it('should adjust parameters based on system resources', () => {
      const params = optimizer.getOptimalParameters();

      // Parameters should be within reasonable ranges
      expect(params.maxConcurrentPages).toBeGreaterThanOrEqual(1);
      expect(params.maxConcurrentPages).toBeLessThanOrEqual(6);
      expect(params.imageQuality).toBeGreaterThanOrEqual(75);
      expect(params.imageQuality).toBeLessThanOrEqual(95);
      expect(params.batchSize).toBeGreaterThanOrEqual(1);
      expect(params.batchSize).toBeLessThanOrEqual(10);
    });
  });

  describe('recordMetrics', () => {
    it('should record performance metrics', () => {
      optimizer.recordMetrics({
        processingTime: 5000,
        memoryUsed: 100,
        pageCount: 10
      });

      const avgTime = optimizer.getAverageProcessingTime();
      expect(avgTime).toBeGreaterThan(0);
    });

    it('should calculate average processing time correctly', () => {
      optimizer.recordMetrics({
        processingTime: 1000,
        memoryUsed: 50,
        pageCount: 5
      });

      optimizer.recordMetrics({
        processingTime: 2000,
        memoryUsed: 100,
        pageCount: 10
      });

      const avgTime = optimizer.getAverageProcessingTime();
      // (1000 + 2000) / (5 + 10) = 200ms per page
      expect(avgTime).toBe(200);
    });

    it('should calculate average memory usage correctly', () => {
      optimizer.recordMetrics({
        processingTime: 1000,
        memoryUsed: 100,
        pageCount: 5
      });

      optimizer.recordMetrics({
        processingTime: 2000,
        memoryUsed: 200,
        pageCount: 10
      });

      const avgMemory = optimizer.getAverageMemoryUsage();
      // (100 + 200) / 2 = 150MB
      expect(avgMemory).toBe(150);
    });

    it('should limit metrics history', () => {
      // Record more than maxMetricsHistory (50)
      for (let i = 0; i < 60; i++) {
        optimizer.recordMetrics({
          processingTime: 1000,
          memoryUsed: 50,
          pageCount: 5
        });
      }

      const report = optimizer.getPerformanceReport();
      // Should only keep last 50
      expect(report.totalProcessed).toBeLessThanOrEqual(50);
    });
  });

  describe('isMemoryPressure', () => {
    it('should detect memory pressure status', () => {
      const isUnderPressure = optimizer.isMemoryPressure();
      expect(typeof isUnderPressure).toBe('boolean');
    });
  });

  describe('suggestBatchSize', () => {
    it('should suggest appropriate batch size for small documents', () => {
      const batchSize = optimizer.suggestBatchSize(5, 2);
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(5);
    });

    it('should suggest appropriate batch size for large documents', () => {
      const batchSize = optimizer.suggestBatchSize(100, 2);
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(10);
    });

    it('should not exceed page count', () => {
      const pageCount = 3;
      const batchSize = optimizer.suggestBatchSize(pageCount, 2);
      expect(batchSize).toBeLessThanOrEqual(pageCount);
    });

    it('should return at least 1', () => {
      const batchSize = optimizer.suggestBatchSize(1, 100);
      expect(batchSize).toBeGreaterThanOrEqual(1);
    });
  });

  describe('shouldUseStreaming', () => {
    it('should recommend streaming for large page counts', () => {
      const shouldStream = optimizer.shouldUseStreaming(25, 10);
      expect(shouldStream).toBe(true);
    });

    it('should recommend streaming for large file sizes', () => {
      const shouldStream = optimizer.shouldUseStreaming(10, 60);
      expect(shouldStream).toBe(true);
    });

    it('should not recommend streaming for small documents', () => {
      const resources = optimizer.getSystemResources();
      
      // Only test if we have sufficient memory
      if (resources.freeMemoryMB > 2048) {
        const shouldStream = optimizer.shouldUseStreaming(5, 5);
        expect(shouldStream).toBe(false);
      }
    });
  });

  describe('getImageProcessingSettings', () => {
    it('should return valid image processing settings', () => {
      const settings = optimizer.getImageProcessingSettings();

      expect(settings.density).toBeGreaterThan(0);
      expect(['png', 'jpeg']).toContain(settings.format);
      expect(settings.quality).toBeGreaterThan(0);
      expect(settings.quality).toBeLessThanOrEqual(100);
    });

    it('should use higher quality settings when resources allow', () => {
      const settings = optimizer.getImageProcessingSettings();
      
      // Settings should be reasonable
      expect(settings.density).toBeGreaterThanOrEqual(200);
      expect(settings.density).toBeLessThanOrEqual(300);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all recorded metrics', () => {
      optimizer.recordMetrics({
        processingTime: 1000,
        memoryUsed: 50,
        pageCount: 5
      });

      optimizer.clearMetrics();

      const avgTime = optimizer.getAverageProcessingTime();
      expect(avgTime).toBe(0);
    });
  });

  describe('getPerformanceReport', () => {
    it('should return comprehensive performance report', () => {
      optimizer.recordMetrics({
        processingTime: 1000,
        memoryUsed: 50,
        pageCount: 5
      });

      const report = optimizer.getPerformanceReport();

      expect(report.averageProcessingTime).toBeGreaterThan(0);
      expect(report.averageMemoryUsage).toBeGreaterThan(0);
      expect(report.totalProcessed).toBe(1);
      expect(report.systemResources).toBeDefined();
      expect(report.recommendedParameters).toBeDefined();
    });

    it('should return zero averages when no metrics recorded', () => {
      const report = optimizer.getPerformanceReport();

      expect(report.averageProcessingTime).toBe(0);
      expect(report.averageMemoryUsage).toBe(0);
      expect(report.totalProcessed).toBe(0);
    });
  });

  describe('getPerformanceOptimizer singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getPerformanceOptimizer();
      const instance2 = getPerformanceOptimizer();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', () => {
      const instance1 = getPerformanceOptimizer();
      instance1.recordMetrics({
        processingTime: 1000,
        memoryUsed: 50,
        pageCount: 5
      });

      const instance2 = getPerformanceOptimizer();
      const avgTime = instance2.getAverageProcessingTime();

      expect(avgTime).toBeGreaterThan(0);
    });
  });
});
