import { useState, useEffect, useCallback } from 'react';

export function useBanknoteSessionStorage(countryId: string) {
  // Get stored state from session storage
  const getStoredState = useCallback(() => {
    if (!countryId) return null;
    
    try {
      const storedData = sessionStorage.getItem(`banknotes-${countryId}`);
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) {
      console.error('Error retrieving banknote data from session storage:', e);
      return null;
    }
  }, [countryId]);

  // Store state in session storage
  const saveState = useCallback((state: any) => {
    if (!countryId) return;
    
    try {
      sessionStorage.setItem(`banknotes-${countryId}`, JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error saving banknote data to session storage:', e);
    }
  }, [countryId]);

  // Check if we're returning from a detail page
  const isReturningFromDetail = useCallback(() => {
    try {
      return sessionStorage.getItem('banknote-returning-from-detail') === 'true';
    } catch (e) {
      return false;
    }
  }, []);

  // Set returning flag when navigating to detail
  const setNavigatingToDetail = useCallback(() => {
    try {
      sessionStorage.setItem('banknote-returning-from-detail', 'true');
    } catch (e) {
      console.error('Error setting navigation state:', e);
    }
  }, []);
  
  // Clear returning flag
  const clearReturningFlag = useCallback(() => {
    try {
      sessionStorage.removeItem('banknote-returning-from-detail');
    } catch (e) {
      console.error('Error clearing navigation state:', e);
    }
  }, []);

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    try {
      sessionStorage.setItem(`banknotes-${countryId}-scroll`, window.scrollY.toString());
    } catch (e) {
      console.error('Error saving scroll position:', e);
    }
  }, [countryId]);

  // Get saved scroll position
  const getSavedScrollPosition = useCallback(() => {
    try {
      const position = sessionStorage.getItem(`banknotes-${countryId}-scroll`);
      return position ? parseInt(position, 10) : 0;
    } catch (e) {
      return 0;
    }
  }, [countryId]);

  return {
    getStoredState,
    saveState,
    isReturningFromDetail,
    setNavigatingToDetail,
    clearReturningFlag,
    saveScrollPosition,
    getSavedScrollPosition
  };
}
