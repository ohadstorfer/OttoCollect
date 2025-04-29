
import { useCallback, useState, useEffect } from 'react';

export interface BanknoteGroupDialogState {
  isOpen: boolean;
  baseNumber: string;
  itemIds: string[];
  countryId: string;
  viewMode: 'grid' | 'list';
}

export function useBanknoteDialogState(countryId: string) {
  const [dialogState, setDialogState] = useState<BanknoteGroupDialogState | null>(null);
  
  // Load dialog state from session storage
  useEffect(() => {
    try {
      const storedState = sessionStorage.getItem(`banknote-dialog-${countryId}`);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        if (parsedState && parsedState.countryId === countryId) {
          setDialogState(parsedState);
        }
      }
    } catch (e) {
      console.error('Error loading dialog state from session storage:', e);
    }
  }, [countryId]);
  
  // Save dialog state to session storage
  const saveDialogState = useCallback((state: BanknoteGroupDialogState | null) => {
    try {
      if (state) {
        sessionStorage.setItem(`banknote-dialog-${countryId}`, JSON.stringify(state));
      } else {
        sessionStorage.removeItem(`banknote-dialog-${countryId}`);
      }
      setDialogState(state);
    } catch (e) {
      console.error('Error saving dialog state to session storage:', e);
    }
  }, [countryId]);
  
  // Set flag for navigating to detail view
  const setNavigatingToDetail = useCallback((banknoteId: string) => {
    try {
      sessionStorage.setItem('banknote-returning-from-detail', 'true');
      sessionStorage.setItem('banknote-detail-id', banknoteId);
    } catch (e) {
      console.error('Error setting navigation state:', e);
    }
  }, []);
  
  // Check if we're returning from a detail view
  const isReturningFromDetail = useCallback(() => {
    try {
      return sessionStorage.getItem('banknote-returning-from-detail') === 'true';
    } catch (e) {
      return false;
    }
  }, []);
  
  // Get the banknote ID we navigated to
  const getDetailBanknoteId = useCallback(() => {
    try {
      return sessionStorage.getItem('banknote-detail-id');
    } catch (e) {
      return null;
    }
  }, []);
  
  // Clear returning flag
  const clearReturningFlag = useCallback(() => {
    try {
      sessionStorage.removeItem('banknote-returning-from-detail');
      sessionStorage.removeItem('banknote-detail-id');
    } catch (e) {
      console.error('Error clearing navigation state:', e);
    }
  }, []);
  
  return {
    dialogState,
    saveDialogState,
    setNavigatingToDetail,
    isReturningFromDetail,
    getDetailBanknoteId,
    clearReturningFlag
  };
}
