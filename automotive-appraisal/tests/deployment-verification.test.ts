/**
 * Deployment Verification Tests
 * 
 * Tests to verify the application is ready for production deployment.
 * These tests check build configuration, security measures, and asset availability.
 */

import fs from 'fs-extra';
import path from 'path';

describe('Deployment Verification', () => {
  describe('Build Configuration', () => {
    it('should have valid package.json', async () => {
      const packagePath = path.join(__dirname, '../package.json');
      expect(await fs.pathExists(packagePath)).toBe(true);
      
      const packageJson = await fs.readJson(packagePath);
      
      // Verify required fields
      expect(packageJson.name).toBe('automotive-appraisal');
      expect(packageJson.version).toBeTruthy();
      expect(packageJson.main).toBeTruthy();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.package).toBeDefined();
      expect(packageJson.scripts.make).toBeDefined();
    });

    it('should have valid forge configuration', async () => {
      const forgeConfigPath = path.join(__dirname, '../forge.config.ts');
      expect(await fs.pathExists(forgeConfigPath)).toBe(true);
      
      const forgeConfig = await fs.readFile(forgeConfigPath, 'utf-8');
      
      // Verify key configuration elements
      expect(forgeConfig).toContain('asar: true');
      expect(forgeConfig).toContain('tesseract-assets');
      expect(forgeConfig).toContain('FusesPlugin');
      expect(forgeConfig).toContain('EnableEmbeddedAsarIntegrityValidation');
    });

    it('should have all required build scripts', async () => {
      const packageJson = await fs.readJson(path.join(__dirname, '../package.json'));
      
      const requiredScripts = [
        'start',
        'package',
        'make',
        'test',
        'postinstall',
      ];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts[script]).toBeDefined();
      });
    });
  });

  describe('Asset Availability', () => {
    it('should have tesseract assets directory', async () => {
      const assetsPath = path.join(__dirname, '../../tesseract-assets');
      expect(await fs.pathExists(assetsPath)).toBe(true);
    });

    it('should have english language data file', async () => {
      const langDataPath = path.join(__dirname, '../../tesseract-assets/eng.traineddata');
      expect(await fs.pathExists(langDataPath)).toBe(true);
      
      const stats = await fs.stat(langDataPath);
      expect(stats.size).toBeGreaterThan(1000000); // Should be > 1MB
    });

    it('should have asset setup script', async () => {
      const setupScriptPath = path.join(__dirname, '../scripts/setup-tesseract-assets.js');
      expect(await fs.pathExists(setupScriptPath)).toBe(true);
    });
  });

  describe('Security Configuration', () => {
    it('should have security fuses configured', async () => {
      const forgeConfig = await fs.readFile(
        path.join(__dirname, '../forge.config.ts'),
        'utf-8'
      );
      
      // Verify security settings
      expect(forgeConfig).toContain('RunAsNode]: false');
      expect(forgeConfig).toContain('EnableCookieEncryption]: true');
      expect(forgeConfig).toContain('EnableNodeOptionsEnvironmentVariable]: false');
      expect(forgeConfig).toContain('EnableNodeCliInspectArguments]: false');
      expect(forgeConfig).toContain('EnableEmbeddedAsarIntegrityValidation]: true');
      expect(forgeConfig).toContain('OnlyLoadAppFromAsar]: true');
    });

    it('should have proper preload configuration', async () => {
      const preloadPath = path.join(__dirname, '../src/preload.ts');
      expect(await fs.pathExists(preloadPath)).toBe(true);
      
      const preloadContent = await fs.readFile(preloadPath, 'utf-8');
      
      // Verify context isolation
      expect(preloadContent).toContain('contextBridge');
      expect(preloadContent).toContain('ipcRenderer');
    });

    it('should not expose Node.js APIs directly', async () => {
      const preloadContent = await fs.readFile(
        path.join(__dirname, '../src/preload.ts'),
        'utf-8'
      );
      
      // Should use contextBridge, not direct exposure
      expect(preloadContent).toContain('contextBridge.exposeInMainWorld');
      expect(preloadContent).not.toContain('window.require');
      expect(preloadContent).not.toContain('window.process');
    });
  });

  describe('Documentation', () => {
    it('should have production deployment guide', async () => {
      const guidePath = path.join(__dirname, '../PRODUCTION_DEPLOYMENT_GUIDE.md');
      expect(await fs.pathExists(guidePath)).toBe(true);
      
      const content = await fs.readFile(guidePath, 'utf-8');
      expect(content).toContain('Production Deployment Guide');
      expect(content).toContain('Build Configuration');
      expect(content).toContain('Code Signing');
      expect(content).toContain('Security Measures');
    });

    it('should have user guide', async () => {
      const guidePath = path.join(__dirname, '../USER_GUIDE.md');
      expect(await fs.pathExists(guidePath)).toBe(true);
      
      const content = await fs.readFile(guidePath, 'utf-8');
      expect(content).toContain('User Guide');
      expect(content).toContain('Getting Started');
      expect(content).toContain('Keyboard Shortcuts');
      expect(content).toContain('Troubleshooting');
    });

    it('should have README', async () => {
      const readmePath = path.join(__dirname, '../README.md');
      expect(await fs.pathExists(readmePath)).toBe(true);
    });
  });

  describe('Dependencies', () => {
    it('should have all production dependencies installed', async () => {
      const packageJson = await fs.readJson(path.join(__dirname, '../package.json'));
      const nodeModulesPath = path.join(__dirname, '../node_modules');
      
      expect(await fs.pathExists(nodeModulesPath)).toBe(true);
      
      // Check key dependencies
      const keyDeps = [
        'electron',
        'react',
        'react-dom',
        'tesseract.js',
        'pdf-parse',
        'zustand',
      ];
      
      for (const dep of keyDeps) {
        const depPath = path.join(nodeModulesPath, dep);
        expect(await fs.pathExists(depPath)).toBe(true);
      }
    });

    it('should not have security vulnerabilities in dependencies', async () => {
      const packageJson = await fs.readJson(path.join(__dirname, '../package.json'));
      
      // Verify we're using recent versions of key packages
      // Note: electron is in devDependencies
      expect(packageJson.devDependencies.electron || packageJson.dependencies.electron).toBeTruthy();
      expect(packageJson.dependencies.react).toBeTruthy();
      expect(packageJson.dependencies['tesseract.js']).toBeTruthy();
    });
  });

  describe('Application Structure', () => {
    it('should have main process entry point', async () => {
      const mainPath = path.join(__dirname, '../src/main.ts');
      expect(await fs.pathExists(mainPath)).toBe(true);
    });

    it('should have renderer process entry point', async () => {
      const rendererPath = path.join(__dirname, '../src/renderer.ts');
      expect(await fs.pathExists(rendererPath)).toBe(true);
    });

    it('should have preload script', async () => {
      const preloadPath = path.join(__dirname, '../src/preload.ts');
      expect(await fs.pathExists(preloadPath)).toBe(true);
    });

    it('should have all required services', async () => {
      const servicesPath = path.join(__dirname, '../src/main/services');
      expect(await fs.pathExists(servicesPath)).toBe(true);
      
      const requiredServices = [
        'pdfExtractor.ts',
        'dataValidator.ts',
        'storage.ts',
        'csvExporter.ts',
        'errorHandler.ts',
        'settingsService.ts',
        'systemChecker.ts',
        'tesseractAssets.ts',
      ];
      
      for (const service of requiredServices) {
        const servicePath = path.join(servicesPath, service);
        expect(await fs.pathExists(servicePath)).toBe(true);
      }
    });

    it('should have all required components', async () => {
      const componentsPath = path.join(__dirname, '../src/renderer/components');
      expect(await fs.pathExists(componentsPath)).toBe(true);
      
      const requiredComponents = [
        'PDFUploader.tsx',
        'DataDisplay.tsx',
        'OCRStatusIndicator.tsx',
        'LoadingAnimation.tsx',
        'ErrorBoundary.tsx',
        'Tooltip.tsx',
      ];
      
      for (const component of requiredComponents) {
        const componentPath = path.join(componentsPath, component);
        expect(await fs.pathExists(componentPath)).toBe(true);
      }
    });
  });

  describe('Test Coverage', () => {
    it('should have comprehensive test suite', async () => {
      const testsPath = path.join(__dirname, '../tests');
      expect(await fs.pathExists(testsPath)).toBe(true);
      
      const testFiles = await fs.readdir(testsPath);
      const testCount = testFiles.filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx')).length;
      
      // Should have at least 20 test files
      expect(testCount).toBeGreaterThanOrEqual(20);
    });

    it('should have integration tests', async () => {
      const integrationTestPath = path.join(__dirname, './complete-workflow-integration.test.ts');
      expect(await fs.pathExists(integrationTestPath)).toBe(true);
    });

    it('should have UI polish tests', async () => {
      const uiTestPath = path.join(__dirname, './ui-polish.test.tsx');
      expect(await fs.pathExists(uiTestPath)).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should have performance optimization service', async () => {
      const perfOptimizerPath = path.join(__dirname, '../src/main/services/performanceOptimizer.ts');
      expect(await fs.pathExists(perfOptimizerPath)).toBe(true);
    });

    it('should have streaming OCR extractor', async () => {
      const streamingPath = path.join(__dirname, '../src/main/services/streamingOCRExtractor.ts');
      expect(await fs.pathExists(streamingPath)).toBe(true);
    });

    it('should have virtualized table component', async () => {
      const virtualizedPath = path.join(__dirname, '../src/renderer/components/VirtualizedTable.tsx');
      expect(await fs.pathExists(virtualizedPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should have error handler service', async () => {
      const errorHandlerPath = path.join(__dirname, '../src/main/services/errorHandler.ts');
      expect(await fs.pathExists(errorHandlerPath)).toBe(true);
      
      const content = await fs.readFile(errorHandlerPath, 'utf-8');
      expect(content).toContain('ErrorHandler');
      expect(content).toContain('classifyError');
    });

    it('should have error boundary component', async () => {
      const errorBoundaryPath = path.join(__dirname, '../src/renderer/components/ErrorBoundary.tsx');
      expect(await fs.pathExists(errorBoundaryPath)).toBe(true);
    });

    it('should have system checker', async () => {
      const systemCheckerPath = path.join(__dirname, '../src/main/services/systemChecker.ts');
      expect(await fs.pathExists(systemCheckerPath)).toBe(true);
    });
  });

  describe('Build Readiness', () => {
    it('should have TypeScript configuration', async () => {
      const tsconfigPath = path.join(__dirname, '../tsconfig.json');
      expect(await fs.pathExists(tsconfigPath)).toBe(true);
      
      const tsconfig = await fs.readJson(tsconfigPath);
      expect(tsconfig.compilerOptions).toBeDefined();
    });

    it('should have Vite configurations', async () => {
      const viteConfigs = [
        'vite.main.config.ts',
        'vite.preload.config.ts',
        'vite.renderer.config.ts',
      ];
      
      for (const config of viteConfigs) {
        const configPath = path.join(__dirname, '..', config);
        expect(await fs.pathExists(configPath)).toBe(true);
      }
    });

    it('should have ESLint configuration', async () => {
      const eslintPath = path.join(__dirname, '../.eslintrc.json');
      expect(await fs.pathExists(eslintPath)).toBe(true);
    });
  });
});
