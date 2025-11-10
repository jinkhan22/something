import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  base: './', // Use relative paths for production builds
  build: {
    outDir: '.vite/renderer',
    // Optimize bundle size
    minify: 'esbuild',
    target: 'esnext',
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['antd', '@heroicons/react'],
          'state-vendor': ['zustand'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173
  },
  css: {
    postcss: './postcss.config.js',
  },
  esbuild: {
    jsx: 'automatic',
    // Remove console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'antd', 'zustand'],
  },
});
