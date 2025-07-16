import { useState, useEffect, useCallback } from 'react';
import { fetchUserCollectionByCountry } from '@/services/collectionService';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { fetchUserWishlistByCountry } from '@/services/wishlistService';
import { CollectionItem, DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';

interface UseCollectionDataProps {
  countryId: string;
  userId: string;
  countryName: string;
  filters: DynamicFilterState;
  skipInitialFetch?: boolean;
}

interface UseCollectionDataResult {
  collectionItems: CollectionItem[];
  allBanknotes: DetailedBanknote[];
  wishlistItems: any[];
  missingBanknotes: DetailedBanknote[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useCollectionData = ({
  countryId,
  userId,
  countryName,
  filters,
  skipInitialFetch = false
}: UseCollectionDataProps): UseCollectionDataResult => {
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [allBanknotes, setAllBanknotes] = useState<DetailedBanknote[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!countryId || !userId || !countryName) {
      return;
    }

    // Skip fetching if filters are empty (preferences not loaded yet)
    if (!filters.categories.length && !filters.types.length && !filters.sort.length) {
      console.log('[useCollectionData] Skipping fetch - filters not loaded yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useCollectionData] Starting parallel data fetch for country:', countryName);

      // Fetch all data in parallel
      const [collectionResult, banknotesResult, wishlistResult] = await Promise.all([
        fetchUserCollectionByCountry(userId, countryId),
        fetchBanknotesByCountryId(countryId),
        fetchUserWishlistByCountry(userId, countryName)
      ]);

      setCollectionItems(collectionResult);
      setAllBanknotes(banknotesResult);
      setWishlistItems(wishlistResult || []);

      console.log('[useCollectionData] Successfully fetched data:', {
        collection: collectionResult.length,
        banknotes: banknotesResult.length,
        wishlist: wishlistResult?.length || 0
      });

    } catch (err) {
      console.error('[useCollectionData] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [countryId, userId, countryName, filters.categories.length, filters.types.length, filters.sort.length]);

  // Calculate missing banknotes
  const missingBanknotes = allBanknotes.filter(banknote => 
    !collectionItems.some(item => 
      item.banknoteId === banknote.id || 
      (item.banknote && item.banknote.id === banknote.id)
    )
  );

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchData();
    }
  }, [fetchData, skipInitialFetch]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    collectionItems,
    allBanknotes,
    wishlistItems,
    missingBanknotes,
    loading,
    error,
    refresh
  };
}; 