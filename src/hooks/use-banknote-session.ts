
import { useState, useEffect } from 'react';
import { DynamicFilterState } from '@/types/filter';

interface BanknoteSessionState {
  filters: DynamicFilterState;
  scrollPosition: number;
  lastUpdated: number;
  countryId: string;
}

const STORAGE_KEY = 'banknote_catalog_state';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useBanknoteSession = (countryId: string) => {
  const [sessionState, setSessionState] = useState<BanknoteSessionState | null>(null);

  // Load state from session storage
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsedState: BanknoteSessionState = JSON.parse(savedState);
      
      // Check if state is for current country and still valid
      const isValid = parsedState.countryId === countryId && 
        (Date.now() - parsedState.lastUpdated) < CACHE_DURATION;
      
      if (isValid) {
        setSessionState(parsedState);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [countryId]);

  // Save state to session storage
  const saveState = (state: Partial<BanknoteSessionState>) => {
    const newState = {
      ...sessionState,
      ...state,
      lastUpdated: Date.now(),
      countryId
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    setSessionState(newState);
  };

  const clearState = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  };

  return {
    sessionState,
    saveState,
    clearState,
    hasValidState: !!sessionState
  };
};
