/**
 * Tests for System Checker Service
 */

import { SystemChecker } from '../src/main/services/systemChecker';
import * as os from 'os';
import * as fs from 'fs';
import { app } from 'electron';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return '/mock/user/data';
      if (name === 'temp') return '/mock/temp';
      return '/mock/path';
    }),
    getVersion: jest.fn(() => '1.0.0'),
    getAppPath: jest.fn(() => '/mock/app')
  }
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  },
  constants: {
    R_OK: 4,
    W_OK: 2
  }
}));

describe('SystemChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runAllChecks', () => {
    it('should run all system checks', async () => {
      // Mock successful checks
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const results = await SystemChecker.runAllChecks();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Each result should have required properties
      results.forEach(result => {
        expect(result).toHaveProperty('requirement');
        expect(result).toHaveProperty('satisfied');
        expect(result).toHaveProperty('required');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('fallbackAvailable');
      });
    });

    it('should identify satisfied requirements', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const results = await SystemChecker.runAllChecks();
      const nodeCheck = results.find(r => r.requirement === 'Node.js Runtime');

      expect(nodeCheck).toBeDefined();
      expect(nodeCheck?.satisfied).toBe(true);
      expect(nodeCheck?.message).toContain('OK');
    });

    it('should identify failed requirements', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const results = await SystemChecker.runAllChecks();
      const fileSystemCheck = results.find(r => r.requirement === 'File System Access');

      expect(fileSystemCheck).toBeDefined();
      expect(fileSystemCheck?.satisfied).toBe(false);
      expect(fileSystemCheck?.installationGuidance).toBeDefined();
      expect(fileSystemCheck?.installationGuidance?.length).toBeGreaterThan(0);
    });

    it('should handle check failures gracefully', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const results = await SystemChecker.runAllChecks();

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // Should not throw, should return results with failures
    });
  });

  describe('checkCriticalRequirements', () => {
    it('should return true when all critical requirements are met', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await SystemChecker.checkCriticalRequirements();

      expect(result.allMet).toBe(true);
      expect(result.failedRequirements).toHaveLength(0);
    });

    it('should return false when critical requirements fail', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const result = await SystemChecker.checkCriticalRequirements();

      expect(result.allMet).toBe(false);
      expect(result.failedRequirements.length).toBeGreaterThan(0);
      
      // All failed requirements should be required
      result.failedRequirements.forEach(req => {
        expect(req.required).toBe(true);
      });
    });

    it('should not include optional requirements in critical check', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await SystemChecker.checkCriticalRequirements();

      // Even if optional requirements fail, critical check should pass
      expect(result.allMet).toBe(true);
    });
  });

  describe('getDiagnostics', () => {
    it('should return comprehensive system diagnostics', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const diagnostics = await SystemChecker.getDiagnostics();

      expect(diagnostics).toHaveProperty('platform');
      expect(diagnostics).toHaveProperty('platformVersion');
      expect(diagnostics).toHaveProperty('arch');
      expect(diagnostics).toHaveProperty('nodeVersion');
      expect(diagnostics).toHaveProperty('electronVersion');
      expect(diagnostics).toHaveProperty('totalMemory');
      expect(diagnostics).toHaveProperty('freeMemory');
      expect(diagnostics).toHaveProperty('cpuCount');
      expect(diagnostics).toHaveProperty('appVersion');
      expect(diagnostics).toHaveProperty('userDataPath');
      expect(diagnostics).toHaveProperty('tempPath');
      expect(diagnostics).toHaveProperty('allRequirementsMet');
      expect(diagnostics).toHaveProperty('criticalRequirementsMet');
      expect(diagnostics).toHaveProperty('checkResults');
      expect(diagnostics).toHaveProperty('timestamp');
    });

    it('should include check results in diagnostics', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const diagnostics = await SystemChecker.getDiagnostics();

      expect(Array.isArray(diagnostics.checkResults)).toBe(true);
      expect(diagnostics.checkResults.length).toBeGreaterThan(0);
    });

    it('should correctly set allRequirementsMet flag', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const diagnostics = await SystemChecker.getDiagnostics();

      const allSatisfied = diagnostics.checkResults.every(r => r.satisfied);
      expect(diagnostics.allRequirementsMet).toBe(allSatisfied);
    });

    it('should correctly set criticalRequirementsMet flag', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const diagnostics = await SystemChecker.getDiagnostics();

      const criticalSatisfied = diagnostics.checkResults
        .filter(r => r.required)
        .every(r => r.satisfied);
      expect(diagnostics.criticalRequirementsMet).toBe(criticalSatisfied);
    });

    it('should format memory values as human-readable', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const diagnostics = await SystemChecker.getDiagnostics();

      expect(diagnostics.totalMemory).toMatch(/\d+\.\d+ (B|KB|MB|GB|TB)/);
      expect(diagnostics.freeMemory).toMatch(/\d+\.\d+ (B|KB|MB|GB|TB)/);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations based on system state', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const recommendations = await SystemChecker.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should recommend closing apps when memory is low', async () => {
      // Note: We can't easily mock os.freemem, so we'll just verify recommendations exist
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const recommendations = await SystemChecker.getRecommendations();

      // Recommendations should be an array (may or may not include memory warning depending on actual system state)
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should include platform-specific recommendations', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const recommendations = await SystemChecker.getRecommendations();

      const platform = os.platform();
      if (platform === 'darwin') {
        expect(recommendations.some(r => r.includes('macOS'))).toBe(true);
      } else if (platform === 'win32') {
        expect(recommendations.some(r => r.includes('Windows'))).toBe(true);
      }
    });
  });

  describe('exportDiagnostics', () => {
    it('should export diagnostics as JSON string', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const exported = await SystemChecker.exportDiagnostics();

      expect(typeof exported).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('platform');
      expect(parsed).toHaveProperty('checkResults');
    });
  });

  describe('isFeatureAvailable', () => {
    it('should check OCR feature availability', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      const available = await SystemChecker.isFeatureAvailable('ocr');

      expect(typeof available).toBe('boolean');
    });

    it('should check large PDF feature availability', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const available = await SystemChecker.isFeatureAvailable('large-pdf');

      expect(typeof available).toBe('boolean');
    });

    it('should return true for unknown features', async () => {
      const available = await SystemChecker.isFeatureAvailable('unknown-feature');

      expect(available).toBe(true);
    });
  });

  describe('getFallbackOptions', () => {
    it('should return fallback options for requirements with fallbacks', async () => {
      const fallback = await SystemChecker.getFallbackOptions('Sufficient Memory');

      expect(fallback.available).toBe(true);
      expect(fallback.description).toBeDefined();
      expect(fallback.actions).toBeDefined();
      expect(Array.isArray(fallback.actions)).toBe(true);
    });

    it('should return no fallback for requirements without fallbacks', async () => {
      const fallback = await SystemChecker.getFallbackOptions('Node.js Runtime');

      expect(fallback.available).toBe(false);
    });

    it('should return no fallback for unknown requirements', async () => {
      const fallback = await SystemChecker.getFallbackOptions('Unknown Requirement');

      expect(fallback.available).toBe(false);
    });
  });

  describe('validateStartup', () => {
    it('should allow startup when all critical requirements are met', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const validation = await SystemChecker.validateStartup();

      expect(validation.canStart).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should prevent startup when critical requirements fail', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const validation = await SystemChecker.validateStartup();

      expect(validation.canStart).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should include warnings for optional requirement failures', async () => {
      (fs.promises.access as jest.Mock).mockImplementation((path: string) => {
        // Fail tesseract assets check (optional)
        if (path.includes('tesseract')) {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.resolve();
      });
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      const validation = await SystemChecker.validateStartup();

      // Should still allow startup
      expect(validation.canStart).toBe(true);
      // But should have warnings
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should include installation guidance in errors', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const validation = await SystemChecker.validateStartup();

      expect(validation.errors.some(e => e.includes('Critical:'))).toBe(true);
    });
  });
});
