import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard component that manages navigation state and provides
 * protection for routes that require certain conditions
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentPage, processingStatus } = useAppStore();

  useEffect(() => {
    // Update current page in store based on route
    const pageName = getPageNameFromPath(location.pathname);
    setCurrentPage(pageName);

    // Update document title
    document.title = `${pageName} - Automotive Appraisal`;
  }, [location.pathname, setCurrentPage]);

  // Navigation guard: warn if leaving during processing
  useEffect(() => {
    if (processingStatus === 'processing' || processingStatus === 'uploading') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [processingStatus]);

  return <>{children}</>;
}

/**
 * Helper function to extract page name from pathname
 */
function getPageNameFromPath(pathname: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Dashboard',
    '/new': 'New Appraisal',
    '/history': 'History',
    '/settings': 'Settings',
  };

  // Check for exact match first
  if (pathMap[pathname]) {
    return pathMap[pathname];
  }

  // Check for nested routes (e.g., /history/:id)
  if (pathname.startsWith('/history/')) {
    return 'Appraisal Details';
  }

  return 'Unknown Page';
}
