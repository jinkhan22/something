import { EquipmentValuationService } from '../src/main/services/equipmentValuation';

describe('EquipmentValuationService', () => {
  let service: EquipmentValuationService;

  beforeEach(() => {
    service = new EquipmentValuationService();
  });

  describe('getEquipmentValue', () => {
    it('should return standard value for known equipment', () => {
      expect(service.getEquipmentValue('Navigation')).toBe(1200);
      expect(service.getEquipmentValue('Sunroof')).toBe(1200);
      expect(service.getEquipmentValue('Premium Audio')).toBe(800);
      expect(service.getEquipmentValue('Sport Package')).toBe(1500);
      expect(service.getEquipmentValue('Leather Seats')).toBe(1000);
    });

    it('should return 0 for unknown equipment', () => {
      expect(service.getEquipmentValue('Unknown Feature')).toBe(0);
    });

    it('should be case-insensitive', () => {
      expect(service.getEquipmentValue('navigation')).toBe(1200);
      expect(service.getEquipmentValue('NAVIGATION')).toBe(1200);
      expect(service.getEquipmentValue('Navigation')).toBe(1200);
    });

    it('should handle whitespace', () => {
      expect(service.getEquipmentValue('  Navigation  ')).toBe(1200);
    });

    it('should return custom value when set', () => {
      service.setCustomValue('Navigation', 1500);
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
    });
  });

  describe('getEquipmentFeature', () => {
    it('should return full feature details', () => {
      const feature = service.getEquipmentFeature('Navigation');
      
      expect(feature).toBeDefined();
      expect(feature?.name).toBe('Navigation');
      expect(feature?.category).toBe('technology');
      expect(feature?.standardValue).toBe(1200);
      expect(feature?.description).toBe('Built-in GPS navigation system');
    });

    it('should return undefined for unknown equipment', () => {
      const feature = service.getEquipmentFeature('Unknown Feature');
      expect(feature).toBeUndefined();
    });
  });

  describe('getAllEquipment', () => {
    it('should return all equipment features', () => {
      const allEquipment = service.getAllEquipment();
      
      expect(allEquipment.length).toBeGreaterThan(20);
      expect(allEquipment.every(e => e.name && e.category && e.standardValue >= 0)).toBe(true);
    });

    it('should include all major features', () => {
      const allEquipment = service.getAllEquipment();
      const names = allEquipment.map(e => e.name);
      
      expect(names).toContain('Navigation');
      expect(names).toContain('Sunroof');
      expect(names).toContain('All-Wheel Drive');
      expect(names).toContain('Leather Seats');
    });
  });

  describe('getEquipmentByCategory', () => {
    it('should return equipment in comfort category', () => {
      const comfort = service.getEquipmentByCategory('comfort');
      
      expect(comfort.length).toBeGreaterThan(0);
      expect(comfort.every(e => e.category === 'comfort')).toBe(true);
      expect(comfort.map(e => e.name)).toContain('Leather Seats');
    });

    it('should return equipment in technology category', () => {
      const technology = service.getEquipmentByCategory('technology');
      
      expect(technology.length).toBeGreaterThan(0);
      expect(technology.every(e => e.category === 'technology')).toBe(true);
      expect(technology.map(e => e.name)).toContain('Navigation');
    });

    it('should return equipment in safety category', () => {
      const safety = service.getEquipmentByCategory('safety');
      
      expect(safety.length).toBeGreaterThan(0);
      expect(safety.every(e => e.category === 'safety')).toBe(true);
      expect(safety.map(e => e.name)).toContain('Backup Camera');
    });

    it('should return equipment in performance category', () => {
      const performance = service.getEquipmentByCategory('performance');
      
      expect(performance.length).toBeGreaterThan(0);
      expect(performance.every(e => e.category === 'performance')).toBe(true);
      expect(performance.map(e => e.name)).toContain('All-Wheel Drive');
    });

    it('should return equipment in appearance category', () => {
      const appearance = service.getEquipmentByCategory('appearance');
      
      expect(appearance.length).toBeGreaterThan(0);
      expect(appearance.every(e => e.category === 'appearance')).toBe(true);
    });
  });

  describe('isValidEquipment', () => {
    it('should return true for standard equipment', () => {
      expect(service.isValidEquipment('Navigation')).toBe(true);
      expect(service.isValidEquipment('Sunroof')).toBe(true);
    });

    it('should return false for unknown equipment', () => {
      expect(service.isValidEquipment('Unknown Feature')).toBe(false);
    });

    it('should return true for custom equipment', () => {
      service.setCustomValue('Custom Feature', 500);
      expect(service.isValidEquipment('Custom Feature')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(service.isValidEquipment('navigation')).toBe(true);
      expect(service.isValidEquipment('NAVIGATION')).toBe(true);
    });
  });

  describe('setCustomValue', () => {
    it('should set custom value for equipment', () => {
      service.setCustomValue('Navigation', 1500);
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
    });

    it('should override standard value', () => {
      const standardValue = service.getEquipmentValue('Navigation');
      service.setCustomValue('Navigation', 2000);
      expect(service.getEquipmentValue('Navigation')).toBe(2000);
      expect(service.getEquipmentValue('Navigation')).not.toBe(standardValue);
    });

    it('should allow setting custom value for non-standard equipment', () => {
      service.setCustomValue('Custom Feature', 750);
      expect(service.getEquipmentValue('Custom Feature')).toBe(750);
    });

    it('should throw error for negative value', () => {
      expect(() => service.setCustomValue('Navigation', -100)).toThrow('cannot be negative');
    });

    it('should allow zero value', () => {
      service.setCustomValue('Navigation', 0);
      expect(service.getEquipmentValue('Navigation')).toBe(0);
    });
  });

  describe('removeCustomValue', () => {
    it('should remove custom value and revert to standard', () => {
      service.setCustomValue('Navigation', 1500);
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      
      service.removeCustomValue('Navigation');
      expect(service.getEquipmentValue('Navigation')).toBe(1200); // Standard value
    });

    it('should handle removing non-existent custom value', () => {
      expect(() => service.removeCustomValue('Navigation')).not.toThrow();
    });
  });

  describe('clearCustomValues', () => {
    it('should clear all custom values', () => {
      service.setCustomValue('Navigation', 1500);
      service.setCustomValue('Sunroof', 1300);
      service.setCustomValue('Custom Feature', 500);
      
      service.clearCustomValues();
      
      expect(service.getEquipmentValue('Navigation')).toBe(1200); // Standard
      expect(service.getEquipmentValue('Sunroof')).toBe(1200); // Standard
      expect(service.getEquipmentValue('Custom Feature')).toBe(0); // No standard
    });
  });

  describe('getCustomValues', () => {
    it('should return all custom values', () => {
      service.setCustomValue('Navigation', 1500);
      service.setCustomValue('Custom Feature', 750);
      
      const customValues = service.getCustomValues();
      
      expect(customValues.size).toBe(2);
      expect(customValues.get('Navigation')).toBe(1500);
      expect(customValues.get('Custom Feature')).toBe(750);
    });

    it('should return empty map when no custom values', () => {
      const customValues = service.getCustomValues();
      expect(customValues.size).toBe(0);
    });
  });

  describe('calculateTotalValue', () => {
    it('should calculate total value of equipment list', () => {
      const equipment = ['Navigation', 'Sunroof', 'Leather Seats'];
      const total = service.calculateTotalValue(equipment);
      
      expect(total).toBe(1200 + 1200 + 1000); // 3400
    });

    it('should return 0 for empty list', () => {
      expect(service.calculateTotalValue([])).toBe(0);
    });

    it('should handle unknown equipment as 0', () => {
      const equipment = ['Navigation', 'Unknown Feature', 'Sunroof'];
      const total = service.calculateTotalValue(equipment);
      
      expect(total).toBe(1200 + 0 + 1200); // 2400
    });

    it('should use custom values when set', () => {
      service.setCustomValue('Navigation', 1500);
      const equipment = ['Navigation', 'Sunroof'];
      const total = service.calculateTotalValue(equipment);
      
      expect(total).toBe(1500 + 1200); // 2700
    });
  });

  describe('searchEquipment', () => {
    it('should return all equipment for empty query', () => {
      const results = service.searchEquipment('');
      expect(results.length).toBeGreaterThan(20);
    });

    it('should find equipment by partial name', () => {
      const results = service.searchEquipment('seat');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain('Leather Seats');
      expect(results).toContain('Heated Seats');
    });

    it('should be case-insensitive', () => {
      const results1 = service.searchEquipment('navigation');
      const results2 = service.searchEquipment('NAVIGATION');
      const results3 = service.searchEquipment('Navigation');
      
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it('should handle whitespace', () => {
      const results = service.searchEquipment('  navigation  ');
      expect(results).toContain('Navigation');
    });

    it('should return empty array for no matches', () => {
      const results = service.searchEquipment('xyz123');
      expect(results).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', () => {
      const categories = service.getCategories();
      
      expect(categories).toContain('comfort');
      expect(categories).toContain('technology');
      expect(categories).toContain('performance');
      expect(categories).toContain('safety');
      expect(categories).toContain('appearance');
    });

    it('should return exactly 5 categories', () => {
      const categories = service.getCategories();
      expect(categories.length).toBe(5);
    });
  });

  describe('exportValues', () => {
    it('should export values as JSON', () => {
      service.setCustomValue('Navigation', 1500);
      service.setCustomValue('Custom Feature', 750);
      
      const json = service.exportValues();
      const parsed = JSON.parse(json);
      
      expect(parsed.standard).toBeDefined();
      expect(parsed.custom).toBeDefined();
      expect(parsed.custom.Navigation).toBe(1500);
      expect(parsed.custom['Custom Feature']).toBe(750);
    });

    it('should export empty custom values', () => {
      const json = service.exportValues();
      const parsed = JSON.parse(json);
      
      expect(parsed.custom).toEqual({});
    });
  });

  describe('importCustomValues', () => {
    it('should import custom values from JSON', () => {
      const json = JSON.stringify({
        custom: {
          'Navigation': 1500,
          'Custom Feature': 750
        }
      });
      
      service.importCustomValues(json);
      
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      expect(service.getEquipmentValue('Custom Feature')).toBe(750);
    });

    it('should clear existing custom values before import', () => {
      service.setCustomValue('Sunroof', 1300);
      
      const json = JSON.stringify({
        custom: {
          'Navigation': 1500
        }
      });
      
      service.importCustomValues(json);
      
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      expect(service.getEquipmentValue('Sunroof')).toBe(1200); // Reverted to standard
    });

    it('should throw error for invalid JSON', () => {
      expect(() => service.importCustomValues('invalid json')).toThrow('Invalid JSON format');
    });

    it('should ignore negative values during import', () => {
      const json = JSON.stringify({
        custom: {
          'Navigation': 1500,
          'Sunroof': -100
        }
      });
      
      service.importCustomValues(json);
      
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      expect(service.getEquipmentValue('Sunroof')).toBe(1200); // Not imported, uses standard
    });

    it('should ignore non-numeric values during import', () => {
      const json = JSON.stringify({
        custom: {
          'Navigation': 1500,
          'Sunroof': 'invalid'
        }
      });
      
      service.importCustomValues(json);
      
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      expect(service.getEquipmentValue('Sunroof')).toBe(1200); // Not imported, uses standard
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow', () => {
      // Get standard values
      const navValue = service.getEquipmentValue('Navigation');
      expect(navValue).toBe(1200);
      
      // Set custom value
      service.setCustomValue('Navigation', 1500);
      expect(service.getEquipmentValue('Navigation')).toBe(1500);
      
      // Calculate total with custom value
      const total = service.calculateTotalValue(['Navigation', 'Sunroof']);
      expect(total).toBe(1500 + 1200);
      
      // Export and import
      const exported = service.exportValues();
      const newService = new EquipmentValuationService();
      newService.importCustomValues(exported);
      expect(newService.getEquipmentValue('Navigation')).toBe(1500);
      
      // Clear custom values
      service.clearCustomValues();
      expect(service.getEquipmentValue('Navigation')).toBe(1200);
    });

    it('should support multiple custom values', () => {
      const customEquipment = [
        { name: 'Custom Feature 1', value: 500 },
        { name: 'Custom Feature 2', value: 750 },
        { name: 'Custom Feature 3', value: 1000 }
      ];
      
      customEquipment.forEach(({ name, value }) => {
        service.setCustomValue(name, value);
      });
      
      const total = service.calculateTotalValue(customEquipment.map(e => e.name));
      expect(total).toBe(2250);
    });

    it('should handle mixed standard and custom equipment', () => {
      service.setCustomValue('Custom Feature', 500);
      
      const equipment = ['Navigation', 'Custom Feature', 'Sunroof'];
      const total = service.calculateTotalValue(equipment);
      
      expect(total).toBe(1200 + 500 + 1200);
    });
  });

  describe('edge cases', () => {
    it('should handle equipment with special characters', () => {
      service.setCustomValue("O'Reilly's Feature", 500);
      expect(service.getEquipmentValue("O'Reilly's Feature")).toBe(500);
    });

    it('should handle very large values', () => {
      service.setCustomValue('Expensive Feature', 999999);
      expect(service.getEquipmentValue('Expensive Feature')).toBe(999999);
    });

    it('should handle equipment list with duplicates', () => {
      const equipment = ['Navigation', 'Navigation', 'Sunroof'];
      const total = service.calculateTotalValue(equipment);
      
      expect(total).toBe(1200 + 1200 + 1200); // Counts duplicates
    });
  });
});
