import { useState, useEffect, useCallback } from 'react';
import { fetchUserCollectionByCountry } from '@/services/collectionService';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { fetchUserWishlistByCountry } from '@/services/wishlistService';
import { CollectionItem, DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import type { CollectionPatch } from '@/lib/collectionRefresh';

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
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  applyPatches: (patches: CollectionPatch[]) => void;
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

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!countryId || !userId || !countryName) {
      return;
    }

    // Only skip fetching if explicitly told to skip
    if (skipInitialFetch) {
      console.log('[useCollectionData] Skipping fetch - skipInitialFetch is true');
      return;
    }

    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError(null);

    try {
      console.log('[useCollectionData] Starting parallel data fetch for country:', countryName, silent ? '(silent)' : '');

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
      if (!silent) setLoading(false);
    }
  }, [countryId, userId, countryName, skipInitialFetch]);

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

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    await fetchData(options);
  }, [fetchData]);

  // Apply optimistic patches in place (no fetch) — used when a detail page
  // hands us the freshly-saved item, so the cached collection reflects the
  // change instantly instead of waiting for the safety-net silent refetch.
  const applyPatches = useCallback((patches: CollectionPatch[]) => {
    if (!patches.length) return;
    setCollectionItems(prev => {
      let next = prev;
      for (const patch of patches) {
        if (patch.kind === 'delete') {
          next = next.filter(i => i.id !== patch.itemId);
        } else {
          const idx = next.findIndex(i => i.id === patch.item.id);
          if (idx >= 0) {
            next = [...next.slice(0, idx), patch.item, ...next.slice(idx + 1)];
          }
        }
      }
      return next;
    });
  }, []);

  return {
    collectionItems,
    allBanknotes,
    wishlistItems,
    missingBanknotes,
    loading,
    error,
    refresh,
    applyPatches
  };
}; 