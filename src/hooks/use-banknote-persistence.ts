
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { Currency } from '@/types/banknote';

const SESSION_PREFIX = 'banknote_catalog_';

interface StoredCatalogState {
  filters: DynamicFilterState;
  banknotes: DetailedBanknote[];
  scrollPosition: number;
  viewMode: 'grid' | 'list';
  currencies: Currency[];
  lastFetched: number;
}

interface UseBanknotePersistenceProps {
  countryId: string;
  countryName: string;
}

/**
 * Custom hook for persisting banknote catalog state between navigation
 */
export const useBanknotePersistence = ({ countryId, countryName }: UseBanknotePersistenceProps) => {
  // Create storage keys specific to this country
  const storageKey = useMemo(() => `${SESSION_PREFIX}${countryId}`, [countryId]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Use refs to track state that shouldn't trigger re-renders
  const hasRestoredStateRef = useRef<boolean>(false);
  const hasRestoredScrollRef = useRef<boolean>(false);
  
  // Internal state for determining if we're coming back from a detail page
  const [isReturningFromDetail, setIsReturningFromDetail] = useState<boolean>(false);
  const isReturningRef = useRef<boolean>(false);
  
  const [storedState, setStoredState] = useState<StoredCatalogState | null>(null);
  
  // Load persisted data on initial mount only when countryId changes
  useEffect(() => {
    if (!countryId || hasRestoredStateRef.current) return;
    
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsedState = JSON.parse(stored) as StoredCatalogState;
        
        // Check if we're returning from a detail page
        const navState = sessionStorage.getItem(`${storageKey}_nav`);
        if (navState === 'detail') {
          setIsReturningFromDetail(true);
          isReturningRef.current = true;
          // Reset the navigation state
          sessionStorage.setItem(`${storageKey}_nav`, 'list');
          setStoredState(parsedState);
          hasRestoredStateRef.current = true;
        }
      }
    } catch (error) {
      console.error('Error loading persisted banknote state:', error);
    }
  }, [countryId, storageKey]);

  // Save data to session storage
  const persistState = useCallback((
    filters: DynamicFilterState,
    banknotes: DetailedBanknote[],
    viewMode: 'grid' | 'list',
    currencies: Currency[]
  ) => {
    if (!countryId) return;
    
    try {
      const scrollPosition = window.scrollY;
      
      const stateToStore: StoredCatalogState = {
        filters,
        banknotes,
        scrollPosition,
        viewMode,
        currencies,
        lastFetched: Date.now()
      };
      
      sessionStorage.setItem(storageKey, JSON.stringify(stateToStore));
    } catch (error) {
      console.error('Error persisting banknote state:', error);
    }
  }, [countryId, storageKey]);

  // Mark that we're navigating to a detail page
  const markNavigatingToDetail = useCallback(() => {
    if (!countryId) return;
    sessionStorage.setItem(`${storageKey}_nav`, 'detail');
  }, [countryId, storageKey]);
  
  // Restore scroll position after data is loaded
  const restoreScrollPosition = useCallback(() => {
    if (storedState?.scrollPosition && isReturningRef.current && !hasRestoredScrollRef.current) {
      setTimeout(() => {
        window.scrollTo({
          top: storedState.scrollPosition,
          behavior: 'auto'
        });
        hasRestoredScrollRef.current = true;
      }, 100);
    }
  }, [storedState]);

  // Check if data is still fresh (less than 5 minutes old)
  const isDataFresh = useCallback(() => {
    if (!storedState || !storedState.lastFetched) return false;
    
    const fiveMinutesInMs = 5 * 60 * 1000;
    return Date.now() - storedState.lastFetched < fiveMinutesInMs;
  }, [storedState]);

  // Reset the restoration flags when countryId changes
  useEffect(() => {
    hasRestoredStateRef.current = false;
    hasRestoredScrollRef.current = false;
    isReturningRef.current = false;
    setIsReturningFromDetail(false);
  }, [countryId]);

  return {
    storedState,
    isReturningFromDetail,
    persistState,
    markNavigatingToDetail,
    restoreScrollPosition,
    isDataFresh,
    scrollContainerRef
  };
};
