import { useEffect, useState } from 'react';
import { useAppStore } from '../store';

/**
 * Hook to handle state hydration on application startup
 */
export const useStateHydration = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const loadHistory = useAppStore(state => state.loadHistory);

  useEffect(() => {
    const hydrateState = async () => {
      try {
        console.log('🔄 Hydrating application state...');
        
        // Load history from storage
        await loadHistory();
        
        console.log('✅ State hydration complete');
        setIsHydrated(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to hydrate state';
        console.error('❌ State hydration failed:', errorMessage);
        setHydrationError(errorMessage);
        setIsHydrated(true); // Still mark as hydrated to allow app to continue
      }
    };

    hydrateState();
  }, [loadHistory]);

  return {
    isHydrated,
    hydrationError
  };
};

export default useStateHydration;
