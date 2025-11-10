import { GeolocationService } from '../src/main/services/geolocationService';
import { Coordinates } from '../src/types';

describe('GeolocationService', () => {
  let service: GeolocationService;

  beforeEach(() => {
    service = new GeolocationService();
  });

  describe('geocodeLocation', () => {
    it('should geocode a known city', async () => {
      const result = await service.geocodeLocation('New York, NY');
      
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(40.7128, 2);
      expect(result?.longitude).toBeCloseTo(-74.0060, 2);
    });

    it('should geocode case-insensitively', async () => {
      const result1 = await service.geocodeLocation('NEW YORK, NY');
      const result2 = await service.geocodeLocation('new york, ny');
      const result3 = await service.geocodeLocation('New York, NY');
      
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should cache geocoded locations', async () => {
      const result1 = await service.geocodeLocation('Los Angeles, CA');
      const result2 = await service.geocodeLocation('Los Angeles, CA');
      
      expect(result1).toEqual(result2);
      expect(service.getCacheSize()).toBe(1);
    });

    it('should handle whitespace in location strings', async () => {
      const result = await service.geocodeLocation('  Chicago, IL  ');
      
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(41.8781, 2);
    });

    it('should parse direct coordinate input', async () => {
      const result = await service.geocodeLocation('40.7128, -74.0060');
      
      expect(result).not.toBeNull();
      expect(result?.latitude).toBe(40.7128);
      expect(result?.longitude).toBe(-74.0060);
    });

    it('should handle partial city matches', async () => {
      const result = await service.geocodeLocation('Seattle');
      
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(47.6062, 2);
    });

    it('should return null for unknown locations', async () => {
      const result = await service.geocodeLocation('Unknown City, XX');
      
      expect(result).toBeNull();
    });

    it('should geocode multiple major cities', async () => {
      const cities = [
        { name: 'Houston, TX', lat: 29.7604, lon: -95.3698 },
        { name: 'Phoenix, AZ', lat: 33.4484, lon: -112.0740 },
        { name: 'Philadelphia, PA', lat: 39.9526, lon: -75.1652 },
      ];

      for (const city of cities) {
        const result = await service.geocodeLocation(city.name);
        expect(result).not.toBeNull();
        expect(result?.latitude).toBeCloseTo(city.lat, 2);
        expect(result?.longitude).toBeCloseTo(city.lon, 2);
      }
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between New York and Los Angeles', () => {
      const nyc: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const la: Coordinates = { latitude: 34.0522, longitude: -118.2437 };
      
      const distance = service.calculateDistance(nyc, la);
      
      // Actual distance is approximately 2,451 miles
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should calculate distance between Chicago and Houston', () => {
      const chicago: Coordinates = { latitude: 41.8781, longitude: -87.6298 };
      const houston: Coordinates = { latitude: 29.7604, longitude: -95.3698 };
      
      const distance = service.calculateDistance(chicago, houston);
      
      // Actual distance is approximately 940 miles
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1000);
    });

    it('should return 0 for same location', () => {
      const coord: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      const distance = service.calculateDistance(coord, coord);
      
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7589, longitude: -73.9851 }; // ~5 miles away
      
      const distance = service.calculateDistance(coord1, coord2);
      
      expect(distance).toBeGreaterThan(3);
      expect(distance).toBeLessThan(7);
    });

    it('should handle negative coordinates', () => {
      const coord1: Coordinates = { latitude: -33.8688, longitude: 151.2093 }; // Sydney
      const coord2: Coordinates = { latitude: -37.8136, longitude: 144.9631 }; // Melbourne
      
      const distance = service.calculateDistance(coord1, coord2);
      
      // Distance is approximately 440 miles
      expect(distance).toBeGreaterThan(400);
      expect(distance).toBeLessThan(500);
    });

    it('should be symmetric (distance A to B equals B to A)', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 34.0522, longitude: -118.2437 };
      
      const distance1 = service.calculateDistance(coord1, coord2);
      const distance2 = service.calculateDistance(coord2, coord1);
      
      expect(distance1).toBe(distance2);
    });

    it('should round to 1 decimal place', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7589, longitude: -73.9851 };
      
      const distance = service.calculateDistance(coord1, coord2);
      
      // Check that result has at most 1 decimal place
      const decimalPlaces = (distance.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });

    it('should calculate distances across the equator', () => {
      const coord1: Coordinates = { latitude: 10, longitude: 0 };
      const coord2: Coordinates = { latitude: -10, longitude: 0 };
      
      const distance = service.calculateDistance(coord1, coord2);
      
      // 20 degrees of latitude is approximately 1,380 miles
      expect(distance).toBeGreaterThan(1300);
      expect(distance).toBeLessThan(1450);
    });

    it('should calculate distances across the prime meridian', () => {
      const coord1: Coordinates = { latitude: 0, longitude: 10 };
      const coord2: Coordinates = { latitude: 0, longitude: -10 };
      
      const distance = service.calculateDistance(coord1, coord2);
      
      // 20 degrees of longitude at equator is approximately 1,380 miles
      expect(distance).toBeGreaterThan(1300);
      expect(distance).toBeLessThan(1450);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await service.geocodeLocation('New York, NY');
      await service.geocodeLocation('Los Angeles, CA');
      
      expect(service.getCacheSize()).toBe(2);
      
      service.clearCache();
      
      expect(service.getCacheSize()).toBe(0);
    });

    it('should rebuild cache after clearing', async () => {
      await service.geocodeLocation('New York, NY');
      service.clearCache();
      
      const result = await service.geocodeLocation('New York, NY');
      
      expect(result).not.toBeNull();
      expect(service.getCacheSize()).toBe(1);
    });

    it('should track cache size correctly', async () => {
      expect(service.getCacheSize()).toBe(0);
      
      await service.geocodeLocation('New York, NY');
      expect(service.getCacheSize()).toBe(1);
      
      await service.geocodeLocation('Los Angeles, CA');
      expect(service.getCacheSize()).toBe(2);
      
      // Same location should not increase cache size
      await service.geocodeLocation('New York, NY');
      expect(service.getCacheSize()).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const result = await service.geocodeLocation('');
      
      expect(result).toBeNull();
    });

    it('should handle malformed coordinate strings', async () => {
      const result = await service.geocodeLocation('abc, def');
      
      expect(result).toBeNull();
    });

    it('should handle coordinates at extreme latitudes', () => {
      const northPole: Coordinates = { latitude: 90, longitude: 0 };
      const southPole: Coordinates = { latitude: -90, longitude: 0 };
      
      const distance = service.calculateDistance(northPole, southPole);
      
      // Half the Earth's circumference is approximately 12,450 miles
      expect(distance).toBeGreaterThan(12000);
      expect(distance).toBeLessThan(13000);
    });

    it('should handle coordinates at extreme longitudes', () => {
      const coord1: Coordinates = { latitude: 0, longitude: 179 };
      const coord2: Coordinates = { latitude: 0, longitude: -179 };
      
      const distance = service.calculateDistance(coord1, coord2);
      
      // Should be a short distance (2 degrees), not halfway around the world
      expect(distance).toBeLessThan(200);
    });
  });

  describe('integration scenarios', () => {
    it('should support a complete workflow: geocode and calculate distance', async () => {
      const location1 = 'New York, NY';
      const location2 = 'Boston, MA';
      
      const coord1 = await service.geocodeLocation(location1);
      const coord2 = await service.geocodeLocation(location2);
      
      expect(coord1).not.toBeNull();
      expect(coord2).not.toBeNull();
      
      const distance = service.calculateDistance(coord1!, coord2!);
      
      // Distance between NYC and Boston is approximately 190 miles
      expect(distance).toBeGreaterThan(180);
      expect(distance).toBeLessThan(220);
    });

    it('should handle multiple distance calculations efficiently', async () => {
      const cities = [
        'New York, NY',
        'Los Angeles, CA',
        'Chicago, IL',
        'Houston, TX',
        'Phoenix, AZ'
      ];
      
      // Geocode all cities
      const coordinates = await Promise.all(
        cities.map(city => service.geocodeLocation(city))
      );
      
      // Calculate distances between all pairs
      const distances: number[] = [];
      for (let i = 0; i < coordinates.length; i++) {
        for (let j = i + 1; j < coordinates.length; j++) {
          if (coordinates[i] && coordinates[j]) {
            const distance = service.calculateDistance(coordinates[i]!, coordinates[j]!);
            distances.push(distance);
          }
        }
      }
      
      // Should have calculated 10 distances (5 choose 2)
      expect(distances.length).toBe(10);
      
      // All distances should be positive
      distances.forEach(distance => {
        expect(distance).toBeGreaterThan(0);
      });
    });
  });
});
