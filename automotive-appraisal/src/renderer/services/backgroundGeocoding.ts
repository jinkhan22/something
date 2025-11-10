import { ComparableVehicle } from '../../types';
import { useAppStore } from '../store';
import { BackgroundTaskQueue } from '../utils/performanceOptimization';

/**
 * Service for geocoding comparables in the background
 * Processes locations without blocking the UI
 */
export class BackgroundGeocodingService {
  private taskQueue: BackgroundTaskQueue;

  constructor() {
    this.taskQueue = new BackgroundTaskQueue((completed, total) => {
      // Update progress in store
      const store = useAppStore.getState();
      store.setGeocodingProgress(total, completed, true);
    });
  }

  /**
   * Geocode multiple comparables in the background
   */
  async geocodeComparables(
    comparables: ComparableVehicle[],
    appraisalId: string
  ): Promise<void> {
    const store = useAppStore.getState();
    
    // Filter comparables that need geocoding
    const needsGeocoding = comparables.filter(
      (c) => !c.coordinates && c.location
    );

    if (needsGeocoding.length === 0) {
      return;
    }

    // Set initial progress
    store.setGeocodingProgress(needsGeocoding.length, 0, true);

    // Add geocoding tasks to queue
    for (const comparable of needsGeocoding) {
      this.taskQueue.addTask(async () => {
        await this.geocodeComparable(comparable, appraisalId);
      });
    }

    // Process all tasks
    try {
      await this.taskQueue.processAll();
    } finally {
      // Clear progress indicator
      store.setGeocodingProgress(0, 0, false);
    }
  }

  /**
   * Geocode a single comparable
   */
  private async geocodeComparable(
    comparable: ComparableVehicle,
    appraisalId: string
  ): Promise<void> {
    const store = useAppStore.getState();

    try {
      // Check cache first
      const cached = store.getCachedGeolocation(comparable.location);
      if (cached) {
        // Update comparable with cached coordinates
        await store.updateComparable(comparable.id, {
          coordinates: cached,
        });
        return;
      }

      // Geocode the location
      const coordinates = await window.electron.geocodeLocation(
        comparable.location
      );

      if (coordinates) {
        // Cache the result
        store.setCachedGeolocation(comparable.location, coordinates);

        // Update comparable with coordinates
        await store.updateComparable(comparable.id, {
          coordinates,
        });
      }
    } catch (error) {
      console.error(
        `Failed to geocode location for comparable ${comparable.id}:`,
        error
      );
      // Continue with other comparables even if one fails
    }
  }

  /**
   * Check if geocoding is currently in progress
   */
  isProcessing(): boolean {
    return this.taskQueue.isProcessing();
  }

  /**
   * Get current progress
   */
  getProgress(): { completed: number; total: number } {
    return this.taskQueue.getProgress();
  }

  /**
   * Cancel all pending geocoding tasks
   */
  cancel(): void {
    this.taskQueue.clear();
    const store = useAppStore.getState();
    store.setGeocodingProgress(0, 0, false);
  }
}

// Export singleton instance
export const backgroundGeocodingService = new BackgroundGeocodingService();
