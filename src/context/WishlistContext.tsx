import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchWishlistStatusForBanknotes } from '@/services/wishlistService';

interface WishlistContextType {
  wishlistMap: Map<string, any>;
  isWishlistItem: (banknoteId: string) => boolean;
  getWishlistItemId: (banknoteId: string) => string | null;
  refreshWishlistStatus: (banknoteIds: string[]) => Promise<void>;
  addToWishlistMap: (banknoteId: string, wishlistItem: any) => void;
  removeFromWishlistMap: (banknoteId: string) => void;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

interface WishlistProviderProps {
  children: React.ReactNode;
  banknoteIds?: string[];
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({ 
  children, 
  banknoteIds = [] 
}) => {
  const { user } = useAuth();
  const [wishlistMap, setWishlistMap] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlistStatus = useCallback(async (banknoteIds: string[]) => {
    if (!user?.id || !banknoteIds.length) {
      setWishlistMap(new Map());
      return;
    }

    setIsLoading(true);
    try {
      const newWishlistMap = await fetchWishlistStatusForBanknotes(user.id, banknoteIds);
      setWishlistMap(newWishlistMap);
    } catch (error) {
      console.error('Error refreshing wishlist status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const isWishlistItem = useCallback((banknoteId: string) => {
    return wishlistMap.has(banknoteId);
  }, [wishlistMap]);

  const getWishlistItemId = useCallback((banknoteId: string) => {
    const item = wishlistMap.get(banknoteId);
    return item?.id || null;
  }, [wishlistMap]);

  const addToWishlistMap = useCallback((banknoteId: string, wishlistItem: any) => {
    setWishlistMap(prev => new Map(prev).set(banknoteId, wishlistItem));
  }, []);

  const removeFromWishlistMap = useCallback((banknoteId: string) => {
    setWishlistMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(banknoteId);
      return newMap;
    });
  }, []);

  // Refresh wishlist status when banknoteIds change
  useEffect(() => {
    if (banknoteIds.length > 0) {
      refreshWishlistStatus(banknoteIds);
    }
  }, [banknoteIds, refreshWishlistStatus]);

  const value: WishlistContextType = {
    wishlistMap,
    isWishlistItem,
    getWishlistItemId,
    refreshWishlistStatus,
    addToWishlistMap,
    removeFromWishlistMap,
    isLoading
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}; 