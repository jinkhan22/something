/**
 * Performance Enhancement Utilities
 * Optimizes bundle size, load times, and runtime performance
 */

import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyComparableVehicleForm = lazy(() => 
  import('../components/ComparableVehicleForm').then(module => ({ 
    default: module.ComparableVehicleForm 
  }))
);

export const LazyMarketValueCalculator = lazy(() => 
  import('../components/MarketValueCalculator').then(module => ({ 
    default: module.MarketValueCalculator 
  }))
);

export const LazyCalculationBreakdownView = lazy(() => 
  import('../components/CalculationBreakdownView').then(module => ({ 
    default: module.CalculationBreakdownView 
  }))
);

export const LazyInsuranceComparisonPanel = lazy(() => 
  import('../components/InsuranceComparisonPanel').then(module => ({ 
    default: module.InsuranceComparisonPanel 
  }))
);

// Performance monitoring utilities
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  private static measures: Map<string, number> = new Map();

  static mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.marks.set(name, Date.now());
    }
  }

  static measure(name: string, startMark: string, endMark?: string): number {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }
        
        const entries = performance.getEntriesByName(name, 'measure');
        const duration = entries[entries.length - 1]?.duration || 0;
        this.measures.set(name, duration);
        return duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
    
    // Fallback for environments without performance API
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : Date.now();
    if (startTime && endTime) {
      const duration = endTime - startTime;
      this.measures.set(name, duration);
      return duration;
    }
    
    return 0;
  }

  static getMetrics(): { marks: Map<string, number>; measures: Map<string, number> } {
    return {
      marks: new Map(this.marks),
      measures: new Map(this.measures)
    };
  }

  static logMetrics(): void {
    console.group('Performance Metrics');
    console.table(Object.fromEntries(this.measures));
    console.groupEnd();
  }

  static clear(): void {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
    this.marks.clear();
    this.measures.clear();
  }
}

// Memory optimization utilities
export class MemoryOptimizer {
  private static cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static clear(): void {
    this.cache.clear();
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Bundle size optimization utilities
export const optimizeBundle = {
  // Preload critical resources
  preloadCriticalResources(): void {
    const criticalResources = [
      '/fonts/inter.woff2'
      // Removed app-icon.png as it's not being used immediately
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.includes('.woff') ? 'font' : 'image';
      if (resource.includes('.woff')) {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  },

  // Lazy load non-critical CSS
  loadNonCriticalCSS(): void {
    const nonCriticalCSS = [
      '/css/animations.css',
      '/css/print.css'
    ];

    nonCriticalCSS.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print';
      link.onload = () => {
        link.media = 'all';
      };
      document.head.appendChild(link);
    });
  },

  // Remove unused event listeners
  cleanupEventListeners(): void {
    // This would be called on component unmount or route changes
    const events = ['resize', 'scroll', 'keydown', 'mousemove'];
    events.forEach(event => {
      // Remove any global event listeners that might have been added
      document.removeEventListener(event, () => {});
      window.removeEventListener(event, () => {});
    });
  }
};

// Runtime performance optimizations
export const runtimeOptimizations = {
  // Debounce function for expensive operations
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate?: boolean
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  },

  // Throttle function for high-frequency events
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoization for expensive calculations
  memoize<T extends (...args: any[]) => any>(
    func: T,
    getKey?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map();
    
    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Virtual scrolling for large lists
  calculateVisibleItems(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number,
    overscan: number = 5
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);
    
    return { startIndex, endIndex, visibleItems };
  }
};

// Load time optimization
export const loadTimeOptimizations = {
  // Measure and log load times
  measureLoadTime(): void {
    if (typeof performance !== 'undefined' && performance.timing) {
      window.addEventListener('load', () => {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        
        console.group('Load Time Metrics');
        console.log(`Total Load Time: ${loadTime}ms`);
        console.log(`DOM Ready Time: ${domReady}ms`);
        console.log(`First Paint: ${timing.responseStart - timing.navigationStart}ms`);
        console.groupEnd();
        
        // Report to analytics if needed
        if (loadTime > 3000) {
          console.warn('Slow load time detected:', loadTime + 'ms');
        }
      });
    }
  },

  // Optimize images
  optimizeImages(): void {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for browsers without IntersectionObserver
      images.forEach(img => {
        const image = img as HTMLImageElement;
        image.src = image.dataset.src!;
      });
    }
  }
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = (): void => {
  // Mark app start
  PerformanceMonitor.mark('app-start');
  
  // Measure load time
  loadTimeOptimizations.measureLoadTime();
  
  // Preload critical resources
  optimizeBundle.preloadCriticalResources();
  
  // Setup memory cleanup
  setInterval(() => {
    MemoryOptimizer.cleanup();
  }, 60000); // Cleanup every minute
  
  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      PerformanceMonitor.logMetrics();
    }, 5000);
  }
};

export default {
  PerformanceMonitor,
  MemoryOptimizer,
  optimizeBundle,
  runtimeOptimizations,
  loadTimeOptimizations,
  initializePerformanceMonitoring
};