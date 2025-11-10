import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  DocumentPlusIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  HomeIcon,
  CheckCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../store';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths?: string[]; // Additional paths that should highlight this nav item
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'New Appraisal', href: '/new', icon: DocumentPlusIcon },
  { name: 'History', href: '/history', icon: ClockIcon, matchPaths: ['/history/*'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { processingStatus } = useAppStore();
  
  /**
   * Check if a navigation item is active based on current location
   */
  const isItemActive = (item: NavigationItem): boolean => {
    // Exact match
    if (location.pathname === item.href) {
      return true;
    }
    
    // Check additional match paths (for nested routes)
    if (item.matchPaths) {
      return item.matchPaths.some(pattern => {
        if (pattern.endsWith('/*')) {
          const basePath = pattern.slice(0, -2);
          return location.pathname.startsWith(basePath);
        }
        return location.pathname === pattern;
      });
    }
    
    return false;
  };

  /**
   * Get breadcrumb for current location
   */
  const getBreadcrumb = (): string | null => {
    // Check for nested routes that need breadcrumbs
    if (location.pathname.startsWith('/history/') && location.pathname !== '/history') {
      return 'Appraisal Details';
    }
    return null;
  };

  const breadcrumb = getBreadcrumb();
  const isProcessing = processingStatus === 'processing' || processingStatus === 'uploading';
  
  return (
    <aside className="w-[264px] bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo Area */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">
          Automotive Appraisal
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          PDF Report Processor
        </p>
      </div>
      
      {/* Breadcrumb Navigation */}
      {breadcrumb && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Back
            </button>
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{breadcrumb}</span>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = isItemActive(item);
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 ease-in-out
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <CheckCircleIcon className="w-4 h-4 text-blue-600 animate-in fade-in duration-200" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Status Area */}
      <div className="p-4 border-t border-gray-200">
        <div className={`
          rounded-lg p-3 transition-all duration-300
          ${isProcessing 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-green-50 border border-green-200'
          }
        `}>
          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full transition-colors duration-300
              ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}
            `}></div>
            <span className={`
              text-sm font-medium transition-colors duration-300
              ${isProcessing ? 'text-yellow-800' : 'text-green-800'}
            `}>
              {isProcessing ? 'Processing...' : 'System Ready'}
            </span>
          </div>
          <p className={`
            text-xs mt-1 transition-colors duration-300
            ${isProcessing ? 'text-yellow-600' : 'text-green-600'}
          `}>
            {isProcessing ? 'Processing PDF report' : 'Ready to process PDF reports'}
          </p>
        </div>
      </div>
    </aside>
  );
}