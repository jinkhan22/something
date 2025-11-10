/**
 * Performance optimization utilities for the automotive appraisal application
 */

/**
 * Creates a debounced version of a function that delays execution until after
 * a specified wait time has elapsed since the last invocation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled version of a function that only executes at most once
 * per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Creates a hash string from an object for cache key generation
 */
export function hashObject(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Lazy loader for heavy components or calculations
 */
export class LazyLoader<T> {
  private value: T | null = null;
  private loading = false;
  private loader: () => Promise<T>;
  private callbacks: Array<(value: T) => void> = [];

  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }

  async load(): Promise<T> {
    if (this.value !== null) {
      return this.value;
    }

    if (this.loading) {
      return new Promise<T>((resolve) => {
        this.callbacks.push(resolve);
      });
    }

    this.loading = true;
    try {
      this.value = await this.loader();
      this.callbacks.forEach((cb) => cb(this.value!));
      this.callbacks = [];
      return this.value;
    } finally {
      this.loading = false;
    }
  }

  isLoaded(): boolean {
    return this.value !== null;
  }

  getValue(): T | null {
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.loading = false;
    this.callbacks = [];
  }
}

/**
 * Background task queue for processing tasks without blocking UI
 */
export class BackgroundTaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private onProgress?: (completed: number, total: number) => void;
  private completed = 0;

  constructor(onProgress?: (completed: number, total: number) => void) {
    this.onProgress = onProgress;
  }

  addTask(task: () => Promise<void>): void {
    this.queue.push(task);
  }

  async processAll(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    this.completed = 0;
    const total = this.queue.length;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          await task();
          this.completed++;
          if (this.onProgress) {
            this.onProgress(this.completed, total);
          }
        }

        // Yield to the event loop to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      this.processing = false;
    }
  }

  isProcessing(): boolean {
    return this.processing;
  }

  getProgress(): { completed: number; total: number } {
    return {
      completed: this.completed,
      total: this.completed + this.queue.length,
    };
  }

  clear(): void {
    this.queue = [];
    this.completed = 0;
  }
}

/**
 * Simple LRU cache implementation for storing calculation results
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists to re-add at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Remove oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Batch processor for grouping multiple operations together
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<R[]>;
  private batchSize: number;
  private batchDelay: number;
  private callbacks: Map<T, (result: R) => void> = new Map();

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    batchDelay: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve) => {
      this.batch.push(item);
      this.callbacks.set(item, resolve);

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else {
        this.scheduleFlush();
      }
    });
  }

  private scheduleFlush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.batch.length === 0) return;

    const currentBatch = [...this.batch];
    this.batch = [];

    try {
      const results = await this.processor(currentBatch);

      currentBatch.forEach((item, index) => {
        const callback = this.callbacks.get(item);
        if (callback) {
          callback(results[index]);
          this.callbacks.delete(item);
        }
      });
    } catch (error) {
      // Handle error - reject all pending callbacks
      currentBatch.forEach((item) => {
        this.callbacks.delete(item);
      });
      throw error;
    }
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (startTime === undefined) {
      throw new Error(`Start mark "${startMark}" not found`);
    }

    const duration = performance.now() - startTime;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return duration;
  }

  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  clear(): void {
    this.marks.clear();
    this.measurements.clear();
  }

  getAllStats(): Map<string, ReturnType<PerformanceMonitor['getStats']>> {
    const allStats = new Map();
    for (const name of this.measurements.keys()) {
      allStats.set(name, this.getStats(name));
    }
    return allStats;
  }
}

// Export singleton instance for global performance monitoring
export const performanceMonitor = new PerformanceMonitor();
