/**
 * Bundle Optimization Configuration
 * Optimizes bundle size and load times for production
 */

// Code splitting configuration for dynamic imports
export const dynamicImports = {
  // Lazy load heavy components
  ComparableVehicleForm: () => import('../components/ComparableVehicleForm'),
  MarketValueCalculator: () => import('../components/MarketValueCalculator'),
  CalculationBreakdownView: () => import('../components/CalculationBreakdownView'),
  InsuranceComparisonPanel: () => import('../components/InsuranceComparisonPanel'),
  
  // Lazy load utility libraries
  chartLibrary: () => import('chart.js'),
  pdfLibrary: () => import('jspdf'),
  excelLibrary: () => import('xlsx'),
};

// Tree shaking optimization - only import what we need
export const optimizedImports = {
  // Lodash - import specific functions
  debounce: () => import('lodash/debounce'),
  throttle: () => import('lodash/throttle'),
  memoize: () => import('lodash/memoize'),
  
  // Date utilities - import specific functions
  formatDate: () => import('date-fns/format'),
  parseDate: () => import('date-fns/parse'),
  isValid: () => import('date-fns/isValid'),
  
  // Antd - import specific components
  Button: () => import('antd/es/button'),
  Input: () => import('antd/es/input'),
  Select: () => import('antd/es/select'),
  Table: () => import('antd/es/table'),
};

// Resource preloading configuration
export const preloadConfig = {
  critical: [
    // Critical CSS
    '/css/critical.css',
    // Essential fonts
    '/fonts/inter-regular.woff2',
    '/fonts/inter-medium.woff2'
    // Removed app-icon.svg as it's not critical for initial load
  ],
  
  important: [
    // Secondary fonts
    '/fonts/inter-bold.woff2',
    // Common icons
    '/icons/upload.svg',
    '/icons/download.svg',
    '/icons/edit.svg',
    '/icons/delete.svg',
  ],
  
  optional: [
    // Non-critical CSS
    '/css/animations.css',
    '/css/print.css',
    // Additional icons
    '/icons/help.svg',
    '/icons/settings.svg',
  ]
};

// Webpack optimization hints
export const webpackOptimizations = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Vendor libraries
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
      
      // Common components
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'all',
        priority: 5,
        reuseExistingChunk: true,
      },
      
      // Antd components
      antd: {
        test: /[\\/]node_modules[\\/]antd[\\/]/,
        name: 'antd',
        chunks: 'all',
        priority: 15,
      },
      
      // React libraries
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
        name: 'react',
        chunks: 'all',
        priority: 20,
      },
    },
  },
  
  // Minimize bundle size
  minimize: true,
  
  // Remove unused code
  usedExports: true,
  sideEffects: false,
  
  // Optimize module concatenation
  concatenateModules: true,
};

// Runtime optimization configuration
export const runtimeConfig = {
  // Service worker for caching
  serviceWorker: {
    enabled: true,
    cacheStrategy: 'cacheFirst',
    cacheName: 'automotive-appraisal-v1',
    precacheFiles: [
      '/',
      '/static/css/main.css',
      '/static/js/main.js',
      ...preloadConfig.critical,
    ],
  },
  
  // Image optimization
  imageOptimization: {
    formats: ['webp', 'avif', 'jpg'],
    quality: 80,
    progressive: true,
    lazyLoading: true,
  },
  
  // Font optimization
  fontOptimization: {
    preload: ['inter-regular', 'inter-medium'],
    display: 'swap',
    subset: 'latin',
  },
};

// Performance budgets
export const performanceBudgets = {
  // Bundle size limits
  maxBundleSize: {
    main: '500kb',
    vendor: '1mb',
    total: '2mb',
  },
  
  // Load time targets
  loadTime: {
    firstContentfulPaint: '1.5s',
    largestContentfulPaint: '2.5s',
    firstInputDelay: '100ms',
    cumulativeLayoutShift: '0.1',
  },
  
  // Resource limits
  resources: {
    maxRequests: 50,
    maxImageSize: '200kb',
    maxFontSize: '100kb',
  },
};

// Development vs production optimizations
export const environmentOptimizations = {
  development: {
    // Fast refresh
    hotReload: true,
    
    // Source maps
    sourceMap: 'eval-source-map',
    
    // Bundle analysis
    bundleAnalyzer: true,
    
    // Performance monitoring
    performanceHints: 'warning',
  },
  
  production: {
    // Minification
    minify: true,
    
    // Compression
    gzip: true,
    brotli: true,
    
    // Source maps (for error tracking)
    sourceMap: 'source-map',
    
    // Bundle analysis
    bundleAnalyzer: false,
    
    // Performance monitoring
    performanceHints: 'error',
    
    // Dead code elimination
    treeShaking: true,
    
    // Module concatenation
    concatenateModules: true,
  },
};

// Monitoring and analytics
export const monitoringConfig = {
  // Performance monitoring
  performance: {
    enabled: true,
    sampleRate: 0.1, // 10% of users
    metrics: [
      'firstContentfulPaint',
      'largestContentfulPaint',
      'firstInputDelay',
      'cumulativeLayoutShift',
    ],
  },
  
  // Error tracking
  errorTracking: {
    enabled: true,
    sampleRate: 1.0, // All errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  },
  
  // Bundle analysis
  bundleAnalysis: {
    enabled: process.env.NODE_ENV === 'development',
    outputPath: './bundle-analysis',
    generateReport: true,
  },
};

// Export configuration based on environment
export const getOptimizationConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    ...webpackOptimizations,
    ...(isDevelopment ? environmentOptimizations.development : environmentOptimizations.production),
    runtime: runtimeConfig,
    budgets: performanceBudgets,
    monitoring: monitoringConfig,
    preload: preloadConfig,
  };
};

export default {
  dynamicImports,
  optimizedImports,
  preloadConfig,
  webpackOptimizations,
  runtimeConfig,
  performanceBudgets,
  environmentOptimizations,
  monitoringConfig,
  getOptimizationConfig,
};