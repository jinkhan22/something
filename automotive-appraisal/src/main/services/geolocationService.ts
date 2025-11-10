import { Coordinates } from '../../types';

/**
 * GeolocationService handles geocoding locations and calculating distances
 * between coordinates using the Haversine formula.
 */
export class GeolocationService {
  private geocodeCache: Map<string, Coordinates>;

  constructor() {
    this.geocodeCache = new Map();
  }

  /**
   * Geocode a location string to coordinates.
   * Uses caching to avoid repeated lookups.
   * 
   * @param location - Location string in "City, State" format
   * @returns Coordinates or null if geocoding fails
   */
  async geocodeLocation(location: string): Promise<Coordinates | null> {
    // Normalize location string for cache lookup
    const normalizedLocation = location.trim().toLowerCase();

    // Handle empty string
    if (!normalizedLocation) {
      return null;
    }

    // Check cache first
    if (this.geocodeCache.has(normalizedLocation)) {
      return this.geocodeCache.get(normalizedLocation)!;
    }

    try {
      // For now, we'll use a simple fallback approach with common US cities
      // In production, this could integrate with a geocoding API or offline database
      const coordinates = await this.geocodeWithFallback(location);

      if (coordinates) {
        // Cache the result
        this.geocodeCache.set(normalizedLocation, coordinates);
        return coordinates;
      }

      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula.
   * 
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in miles
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return this.haversineDistance(
      coord1.latitude,
      coord1.longitude,
      coord2.latitude,
      coord2.longitude
    );
  }

  /**
   * Haversine formula for calculating great-circle distance between two points.
   * 
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Distance in miles
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians.
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Geocode with fallback logic.
   * First tries to parse as coordinates, then uses a simple city database.
   * 
   * @param location - Location string
   * @returns Coordinates or null
   */
  private async geocodeWithFallback(location: string): Promise<Coordinates | null> {
    // Try to parse as direct coordinates (e.g., "40.7128, -74.0060")
    const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2])
      };
    }

    // Try to geocode using simple city database
    const coordinates = this.geocodeFromCityDatabase(location);
    if (coordinates) {
      return coordinates;
    }

    // If all else fails, return null
    return null;
  }

  /**
   * Simple geocoding using a database of major US cities.
   * This is a fallback for offline operation.
   * 
   * @param location - Location string
   * @returns Coordinates or null
   */
  private geocodeFromCityDatabase(location: string): Coordinates | null {
    const normalizedLocation = location.trim().toLowerCase();

    // Simple database of major US cities
    // In production, this would be a more comprehensive database
    const cityDatabase: Record<string, Coordinates> = {
      // Major cities
      'new york, ny': { latitude: 40.7128, longitude: -74.0060 },
      'los angeles, ca': { latitude: 34.0522, longitude: -118.2437 },
      'chicago, il': { latitude: 41.8781, longitude: -87.6298 },
      'houston, tx': { latitude: 29.7604, longitude: -95.3698 },
      'phoenix, az': { latitude: 33.4484, longitude: -112.0740 },
      'philadelphia, pa': { latitude: 39.9526, longitude: -75.1652 },
      'san antonio, tx': { latitude: 29.4241, longitude: -98.4936 },
      'san diego, ca': { latitude: 32.7157, longitude: -117.1611 },
      'dallas, tx': { latitude: 32.7767, longitude: -96.7970 },
      'san jose, ca': { latitude: 37.3382, longitude: -121.8863 },
      'austin, tx': { latitude: 30.2672, longitude: -97.7431 },
      'jacksonville, fl': { latitude: 30.3322, longitude: -81.6557 },
      'fort worth, tx': { latitude: 32.7555, longitude: -97.3308 },
      'columbus, oh': { latitude: 39.9612, longitude: -82.9988 },
      'charlotte, nc': { latitude: 35.2271, longitude: -80.8431 },
      'san francisco, ca': { latitude: 37.7749, longitude: -122.4194 },
      'indianapolis, in': { latitude: 39.7684, longitude: -86.1581 },
      'seattle, wa': { latitude: 47.6062, longitude: -122.3321 },
      'denver, co': { latitude: 39.7392, longitude: -104.9903 },
      'washington, dc': { latitude: 38.9072, longitude: -77.0369 },
      'boston, ma': { latitude: 42.3601, longitude: -71.0589 },
      'nashville, tn': { latitude: 36.1627, longitude: -86.7816 },
      'detroit, mi': { latitude: 42.3314, longitude: -83.0458 },
      'portland, or': { latitude: 45.5152, longitude: -122.6784 },
      'las vegas, nv': { latitude: 36.1699, longitude: -115.1398 },
      'memphis, tn': { latitude: 35.1495, longitude: -90.0490 },
      'baltimore, md': { latitude: 39.2904, longitude: -76.6122 },
      'milwaukee, wi': { latitude: 43.0389, longitude: -87.9065 },
      'albuquerque, nm': { latitude: 35.0844, longitude: -106.6504 },
      'tucson, az': { latitude: 32.2226, longitude: -110.9747 },
      'fresno, ca': { latitude: 36.7378, longitude: -119.7871 },
      'sacramento, ca': { latitude: 38.5816, longitude: -121.4944 },
      'kansas city, mo': { latitude: 39.0997, longitude: -94.5786 },
      'atlanta, ga': { latitude: 33.7490, longitude: -84.3880 },
      'miami, fl': { latitude: 25.7617, longitude: -80.1918 },
      'tampa, fl': { latitude: 27.9506, longitude: -82.4572 },
      'orlando, fl': { latitude: 28.5383, longitude: -81.3792 },
      'cleveland, oh': { latitude: 41.4993, longitude: -81.6944 },
      'pittsburgh, pa': { latitude: 40.4406, longitude: -79.9959 },
      'cincinnati, oh': { latitude: 39.1031, longitude: -84.5120 },
      'minneapolis, mn': { latitude: 44.9778, longitude: -93.2650 },
      'st. louis, mo': { latitude: 38.6270, longitude: -90.1994 },
      'raleigh, nc': { latitude: 35.7796, longitude: -78.6382 },
      'new orleans, la': { latitude: 29.9511, longitude: -90.0715 },
      'salt lake city, ut': { latitude: 40.7608, longitude: -111.8910 },
    };

    // Try exact match first
    if (cityDatabase[normalizedLocation]) {
      return cityDatabase[normalizedLocation];
    }

    // Try partial match (city name only)
    const cityName = normalizedLocation.split(',')[0].trim();
    for (const [key, coords] of Object.entries(cityDatabase)) {
      if (key.startsWith(cityName)) {
        return coords;
      }
    }

    return null;
  }

  /**
   * Clear the geocoding cache.
   * Useful for testing or memory management.
   */
  clearCache(): void {
    this.geocodeCache.clear();
  }

  /**
   * Get the size of the geocoding cache.
   */
  getCacheSize(): number {
    return this.geocodeCache.size;
  }
}
