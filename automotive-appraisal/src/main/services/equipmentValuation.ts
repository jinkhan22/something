import { EquipmentFeature } from '../../types';

/**
 * Standard equipment values based on industry averages.
 * These values represent typical market adjustments for common vehicle features.
 */
const STANDARD_EQUIPMENT_VALUES: Record<string, EquipmentFeature> = {
  'Navigation': {
    name: 'Navigation',
    category: 'technology',
    standardValue: 1200,
    description: 'Built-in GPS navigation system'
  },
  'Sunroof': {
    name: 'Sunroof',
    category: 'comfort',
    standardValue: 1200,
    description: 'Power sunroof or moonroof'
  },
  'Premium Audio': {
    name: 'Premium Audio',
    category: 'technology',
    standardValue: 800,
    description: 'Upgraded sound system (e.g., Bose, Harman Kardon)'
  },
  'Sport Package': {
    name: 'Sport Package',
    category: 'performance',
    standardValue: 1500,
    description: 'Sport suspension, wheels, and styling'
  },
  'Leather Seats': {
    name: 'Leather Seats',
    category: 'comfort',
    standardValue: 1000,
    description: 'Leather upholstery'
  },
  'Heated Seats': {
    name: 'Heated Seats',
    category: 'comfort',
    standardValue: 500,
    description: 'Front heated seats'
  },
  'Backup Camera': {
    name: 'Backup Camera',
    category: 'safety',
    standardValue: 400,
    description: 'Rear-view camera system'
  },
  'Blind Spot Monitoring': {
    name: 'Blind Spot Monitoring',
    category: 'safety',
    standardValue: 600,
    description: 'Blind spot detection system'
  },
  'Adaptive Cruise Control': {
    name: 'Adaptive Cruise Control',
    category: 'safety',
    standardValue: 800,
    description: 'Radar-based adaptive cruise control'
  },
  'Parking Sensors': {
    name: 'Parking Sensors',
    category: 'safety',
    standardValue: 400,
    description: 'Front and/or rear parking sensors'
  },
  'Keyless Entry': {
    name: 'Keyless Entry',
    category: 'comfort',
    standardValue: 300,
    description: 'Keyless entry and push-button start'
  },
  'Remote Start': {
    name: 'Remote Start',
    category: 'comfort',
    standardValue: 300,
    description: 'Remote engine start system'
  },
  'Tow Package': {
    name: 'Tow Package',
    category: 'performance',
    standardValue: 700,
    description: 'Trailer hitch and towing equipment'
  },
  'All-Wheel Drive': {
    name: 'All-Wheel Drive',
    category: 'performance',
    standardValue: 2000,
    description: 'All-wheel drive system (AWD/4WD)'
  },
  'Premium Wheels': {
    name: 'Premium Wheels',
    category: 'appearance',
    standardValue: 800,
    description: 'Upgraded alloy wheels'
  },
  'Panoramic Sunroof': {
    name: 'Panoramic Sunroof',
    category: 'comfort',
    standardValue: 1500,
    description: 'Large panoramic glass roof'
  },
  'Ventilated Seats': {
    name: 'Ventilated Seats',
    category: 'comfort',
    standardValue: 600,
    description: 'Cooled/ventilated front seats'
  },
  'Power Liftgate': {
    name: 'Power Liftgate',
    category: 'comfort',
    standardValue: 500,
    description: 'Power-operated rear liftgate'
  },
  'Lane Departure Warning': {
    name: 'Lane Departure Warning',
    category: 'safety',
    standardValue: 500,
    description: 'Lane departure warning system'
  },
  'Automatic Emergency Braking': {
    name: 'Automatic Emergency Braking',
    category: 'safety',
    standardValue: 700,
    description: 'Automatic emergency braking system'
  },
  'Head-Up Display': {
    name: 'Head-Up Display',
    category: 'technology',
    standardValue: 900,
    description: 'Windshield head-up display'
  },
  'Wireless Charging': {
    name: 'Wireless Charging',
    category: 'technology',
    standardValue: 200,
    description: 'Wireless phone charging pad'
  },
  'Apple CarPlay': {
    name: 'Apple CarPlay',
    category: 'technology',
    standardValue: 300,
    description: 'Apple CarPlay integration'
  },
  'Android Auto': {
    name: 'Android Auto',
    category: 'technology',
    standardValue: 300,
    description: 'Android Auto integration'
  },
  'Memory Seats': {
    name: 'Memory Seats',
    category: 'comfort',
    standardValue: 400,
    description: 'Driver seat memory settings'
  },
  'Rain-Sensing Wipers': {
    name: 'Rain-Sensing Wipers',
    category: 'comfort',
    standardValue: 200,
    description: 'Automatic rain-sensing wipers'
  },
  'Dual-Zone Climate': {
    name: 'Dual-Zone Climate',
    category: 'comfort',
    standardValue: 400,
    description: 'Dual-zone automatic climate control'
  },
  'Tri-Zone Climate': {
    name: 'Tri-Zone Climate',
    category: 'comfort',
    standardValue: 600,
    description: 'Tri-zone automatic climate control'
  },
  'Heated Steering Wheel': {
    name: 'Heated Steering Wheel',
    category: 'comfort',
    standardValue: 200,
    description: 'Heated steering wheel'
  },
  'Power Seats': {
    name: 'Power Seats',
    category: 'comfort',
    standardValue: 500,
    description: 'Power-adjustable front seats'
  }
};

/**
 * EquipmentValuationService provides standardized values for vehicle equipment
 * and features. It supports both standard equipment and custom values.
 */
export class EquipmentValuationService {
  private customValues: Map<string, number>;

  constructor() {
    this.customValues = new Map();
  }

  /**
   * Get the value of a specific equipment feature.
   * Returns custom value if set, otherwise returns standard value.
   * 
   * @param equipmentName - Name of the equipment feature
   * @returns Value in dollars, or 0 if not found
   */
  getEquipmentValue(equipmentName: string): number {
    const normalizedName = this.normalizeEquipmentName(equipmentName);

    // Check custom values first
    if (this.customValues.has(normalizedName)) {
      return this.customValues.get(normalizedName)!;
    }

    // Check standard values
    const equipment = STANDARD_EQUIPMENT_VALUES[normalizedName];
    if (equipment) {
      return equipment.standardValue;
    }

    return 0;
  }

  /**
   * Get the full equipment feature details.
   * 
   * @param equipmentName - Name of the equipment feature
   * @returns EquipmentFeature object or undefined if not found
   */
  getEquipmentFeature(equipmentName: string): EquipmentFeature | undefined {
    const normalizedName = this.normalizeEquipmentName(equipmentName);
    return STANDARD_EQUIPMENT_VALUES[normalizedName];
  }

  /**
   * Get all available equipment features.
   * 
   * @returns Array of all equipment features
   */
  getAllEquipment(): EquipmentFeature[] {
    return Object.values(STANDARD_EQUIPMENT_VALUES);
  }

  /**
   * Get equipment features by category.
   * 
   * @param category - Equipment category
   * @returns Array of equipment features in the category
   */
  getEquipmentByCategory(category: EquipmentFeature['category']): EquipmentFeature[] {
    return Object.values(STANDARD_EQUIPMENT_VALUES).filter(
      equipment => equipment.category === category
    );
  }

  /**
   * Validate if an equipment name exists in the standard list.
   * 
   * @param equipmentName - Name of the equipment feature
   * @returns True if equipment exists, false otherwise
   */
  isValidEquipment(equipmentName: string): boolean {
    const normalizedName = this.normalizeEquipmentName(equipmentName);
    return normalizedName in STANDARD_EQUIPMENT_VALUES || this.customValues.has(normalizedName);
  }

  /**
   * Set a custom value for an equipment feature.
   * This overrides the standard value.
   * 
   * @param equipmentName - Name of the equipment feature
   * @param value - Custom value in dollars
   */
  setCustomValue(equipmentName: string, value: number): void {
    if (value < 0) {
      throw new Error('Equipment value cannot be negative');
    }

    const normalizedName = this.normalizeEquipmentName(equipmentName);
    this.customValues.set(normalizedName, value);
  }

  /**
   * Remove a custom value for an equipment feature.
   * Reverts to standard value if available.
   * 
   * @param equipmentName - Name of the equipment feature
   */
  removeCustomValue(equipmentName: string): void {
    const normalizedName = this.normalizeEquipmentName(equipmentName);
    this.customValues.delete(normalizedName);
  }

  /**
   * Clear all custom values.
   */
  clearCustomValues(): void {
    this.customValues.clear();
  }

  /**
   * Get all custom values.
   * 
   * @returns Map of equipment names to custom values
   */
  getCustomValues(): Map<string, number> {
    return new Map(this.customValues);
  }

  /**
   * Calculate total value of an equipment list.
   * 
   * @param equipmentList - Array of equipment names
   * @returns Total value in dollars
   */
  calculateTotalValue(equipmentList: string[]): number {
    return equipmentList.reduce((total, equipment) => {
      return total + this.getEquipmentValue(equipment);
    }, 0);
  }

  /**
   * Get equipment names that match a search query.
   * Useful for autocomplete functionality.
   * 
   * @param query - Search query
   * @returns Array of matching equipment names
   */
  searchEquipment(query: string): string[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return Object.keys(STANDARD_EQUIPMENT_VALUES);
    }

    return Object.keys(STANDARD_EQUIPMENT_VALUES).filter(name =>
      name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Normalize equipment name for consistent lookups.
   * Handles case-insensitivity and common variations.
   * 
   * @param equipmentName - Raw equipment name
   * @returns Normalized equipment name
   */
  private normalizeEquipmentName(equipmentName: string): string {
    // Trim and convert to title case for matching
    const trimmed = equipmentName.trim();
    
    // Try exact match first
    if (trimmed in STANDARD_EQUIPMENT_VALUES) {
      return trimmed;
    }

    // Try case-insensitive match
    const lowerName = trimmed.toLowerCase();
    for (const key of Object.keys(STANDARD_EQUIPMENT_VALUES)) {
      if (key.toLowerCase() === lowerName) {
        return key;
      }
    }

    // Return original if no match found (for custom values)
    return trimmed;
  }

  /**
   * Get equipment categories.
   * 
   * @returns Array of unique categories
   */
  getCategories(): Array<EquipmentFeature['category']> {
    return ['comfort', 'technology', 'performance', 'safety', 'appearance'];
  }

  /**
   * Export equipment values to JSON format.
   * Useful for backup or sharing configurations.
   * 
   * @returns JSON string of all equipment values
   */
  exportValues(): string {
    const data = {
      standard: STANDARD_EQUIPMENT_VALUES,
      custom: Object.fromEntries(this.customValues)
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import custom values from JSON.
   * 
   * @param json - JSON string containing custom values
   */
  importCustomValues(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.custom && typeof data.custom === 'object') {
        this.customValues.clear();
        for (const [name, value] of Object.entries(data.custom)) {
          if (typeof value === 'number' && value >= 0) {
            this.customValues.set(name, value);
          }
        }
      }
    } catch (error) {
      throw new Error('Invalid JSON format for custom values');
    }
  }
}
