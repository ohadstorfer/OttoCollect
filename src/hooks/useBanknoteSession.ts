
import { useState, useEffect, useRef } from 'react';
import { DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';

interface SessionState {
  banknotes: DetailedBanknote[];
  filters: DynamicFilterState;
  viewMode: 'grid' | 'list';
  scrollPosition: number;
  timestamp: number;
  countryId: string;
}

export const useBanknoteSession = (countryId: string) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const isInitialMount = useRef(true);
  const hasLoadedFromSession = useRef(false);
  const sessionKey = `banknote-session-${countryId}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load session state on mount - only once
  useEffect(() => {
    if (!countryId) return;

    if (isInitialMount.current) {
      const savedState = sessionStorage.getItem(sessionKey);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState) as SessionState;
          if (parsed.countryId === countryId && 
              Date.now() - parsed.timestamp < CACHE_DURATION) {
            console.log("useBanknoteSession: Restoring cached state");
            setSessionState(parsed);
            hasLoadedFromSession.current = true;
            
            // Wait a bit to restore scroll position (after render)
            if (parsed.scrollPosition) {
              setTimeout(() => {
                window.scrollTo(0, parsed.scrollPosition);
              }, 100);
            }
          } else {
            console.log("useBanknoteSession: Cache expired, removing");
            sessionStorage.removeItem(sessionKey);
          }
        } catch (err) {
          console.error("useBanknoteSession: Error parsing session data", err);
          sessionStorage.removeItem(sessionKey);
        }
      }
      isInitialMount.current = false;
    }
  }, [countryId, sessionKey]);

  const saveState = (state: Partial<SessionState>) => {
    const currentState = sessionState || {
      banknotes: [],
      filters: { search: '', categories: [], types: [], sort: ['extPick'] },
      viewMode: 'grid',
      scrollPosition: 0,
      timestamp: Date.now(),
      countryId
    };

    const newState = {
      ...currentState,
      ...state,
      timestamp: Date.now(),
      countryId
    };

    setSessionState(newState);
    sessionStorage.setItem(sessionKey, JSON.stringify(newState));
  };

  const clearState = () => {
    sessionStorage.removeItem(sessionKey);
    setSessionState(null);
    hasLoadedFromSession.current = false;
  };

  const saveScrollPosition = () => {
    if (sessionState) {
      saveState({ scrollPosition: window.scrollY });
    }
  };

  return {
    sessionState,
    saveState,
    clearState,
    saveScrollPosition,
    isInitialMount: isInitialMount.current,
    hasLoadedFromSession: hasLoadedFromSession.current
  };
};
