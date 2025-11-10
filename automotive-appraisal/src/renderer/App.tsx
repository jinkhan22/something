import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, Spin } from 'antd';
import ErrorBoundary from './components/ErrorBoundary';
import { AppraisalDetailErrorBoundary } from './components/AppraisalDetailErrorBoundary';
import { RouteGuard } from './components/RouteGuard';
import { PageTransition } from './components/PageTransition';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NewAppraisal } from './pages/NewAppraisal';
import { History } from './pages/History';
import { AppraisalDetail } from './pages/AppraisalDetail';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useStateHydration } from './hooks/useStateHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { initializePerformanceMonitoring, PerformanceMonitor } from './utils/performanceEnhancements';
import { setAppInstance } from './utils/notifications';

function AppContent() {
  const { isHydrated, hydrationError } = useStateHydration();
  const appInstance = AntApp.useApp();
  
  // Initialize notification system with App context
  useEffect(() => {
    setAppInstance(appInstance);
  }, [appInstance]);

  // Initialize performance monitoring
  useEffect(() => {
    initializePerformanceMonitoring();
    PerformanceMonitor.mark('app-content-start');
    
    return () => {
      PerformanceMonitor.mark('app-content-end');
      PerformanceMonitor.measure('app-content-lifecycle', 'app-content-start', 'app-content-end');
    };
  }, []);

  // Mark hydration completion
  useEffect(() => {
    if (isHydrated) {
      PerformanceMonitor.mark('hydration-complete');
      PerformanceMonitor.measure('hydration-time', 'app-start', 'hydration-complete');
    }
  }, [isHydrated]);

  // Show loading spinner while hydrating state
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Spin size="large" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">Loading application...</p>
            <p className="text-sm text-gray-500">Initializing workspace and settings</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if hydration failed (but still render app)
  if (hydrationError) {
    console.warn('Application started with hydration error:', hydrationError);
  }

  return (
    <Router>
      <RouteGuard>
        <RouterContent />
      </RouteGuard>
    </Router>
  );
}

function RouterContent() {
  // Enable keyboard shortcuts (must be inside Router context)
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <main className="flex-1 bg-white">
        {/* macOS-style titlebar area */}
        <div className="h-8 draggable-area bg-gray-50 border-b border-gray-200" />
        
        {/* Page content with enhanced transitions - responsive padding */}
        <div className="pt-4 sm:pt-8 pb-4 sm:pb-6 px-3 sm:px-6 h-full overflow-auto">
          <ErrorBoundary>
            <PageTransition variant="fade" duration={250} showLoader={false}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new" element={<NewAppraisal />} />
                <Route path="/history" element={<History />} />
                <Route 
                  path="/history/:id" 
                  element={
                    <AppraisalDetailErrorBoundary>
                      <AppraisalDetail />
                    </AppraisalDetailErrorBoundary>
                  } 
                />
                <Route path="/settings" element={<Settings />} />
                
                {/* 404 handling - catch all unmatched routes */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </PageTransition>
          </ErrorBoundary>
        </div>
      </main>
      
      {/* Keyboard shortcuts help button */}
      <KeyboardShortcutsHelp />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#2563eb',
          },
        }}
      >
        <AntApp>
          <AppContent />
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}