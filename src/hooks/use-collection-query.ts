import { useQuery, useQueries } from '@tanstack/react-query';
import { CollectionItem, DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { fetchUserCollectionByCountry, fetchUserCollection, fetchBanknoteCategoriesAndTypes } from '@/services/optimizedCollectionService';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { useMemo } from 'react';

// Query keys for React Query caching
export const collectionQueryKeys = {
  userCollection: (userId: string, countryId?: string) => 
    countryId ? ['userCollection', userId, countryId] as const : ['userCollection', userId] as const,
  collectionMetadata: (items: CollectionItem[]) => 
    ['collectionMetadata', items.length, items.map(i => i.id).slice(0, 10).join(',')] as const,
  countryBanknotes: (countryId: string, filters: DynamicFilterState) => 
    ['countryBanknotes', countryId, filters] as const,
  wishlistBanknotes: (userId: string, countryId: string) => 
    ['wishlistBanknotes', userId, countryId] as const,
};

interface UseCollectionQueryProps {
  userId: string;
  countryId?: string;
  enabled?: boolean;
}

interface UseCollectionQueryResult {
  collectionItems: CollectionItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Main collection query hook with React Query caching
export const useCollectionQuery = ({ 
  userId, 
  countryId, 
  enabled = true 
}: UseCollectionQueryProps): UseCollectionQueryResult => {
  const {
    data: collectionItems = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: collectionQueryKeys.userCollection(userId, countryId),
    queryFn: async () => {
      if (countryId) {
        return fetchUserCollectionByCountry(userId, countryId);
      } else {
        return fetchUserCollection(userId);
      }
    },
    enabled: enabled && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for collection data
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  return {
    collectionItems,
    loading,
    error: error as Error | null,
    refetch,
  };
};

// Hook for collection metadata (categories and types) with longer cache time
export const useCollectionMetadata = (collectionItems: CollectionItem[]) => {
  return useQuery({
    queryKey: collectionQueryKeys.collectionMetadata(collectionItems),
    queryFn: () => fetchBanknoteCategoriesAndTypes(collectionItems),
    enabled: collectionItems.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes for metadata
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

// Hook for country banknotes (for missing items calculation)
export const useCountryBanknotes = (countryId: string, filters: DynamicFilterState) => {
  return useQuery({
    queryKey: collectionQueryKeys.countryBanknotes(countryId, filters),
    queryFn: () => fetchBanknotesByCountryId(countryId, {
      search: filters.search,
      categories: filters.categories,
      types: filters.types,
      sort: filters.sort
    }),
    enabled: !!countryId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Combined hook for all collection-related data with parallel queries
export const useCollectionData = (
  userId: string,
  countryId?: string,
  filters: DynamicFilterState = {
    search: '',
    categories: [],
    types: [],
    sort: []
  }
) => {
  // Create query configurations for parallel execution
  const queries = [
    // User collection query
    {
      queryKey: collectionQueryKeys.userCollection(userId, countryId),
      queryFn: async () => {
        if (countryId) {
          return fetchUserCollectionByCountry(userId, countryId);
        } else {
          return fetchUserCollection(userId);
        }
      },
      enabled: !!userId,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    // Country banknotes query (for missing items)
    ...(countryId ? [{
      queryKey: collectionQueryKeys.countryBanknotes(countryId, filters),
      queryFn: () => fetchBanknotesByCountryId(countryId, {
        search: filters.search,
        categories: filters.categories,
        types: filters.types,
        sort: filters.sort
      }),
      enabled: !!countryId,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    }] : []),
  ];

  const results = useQueries({ queries });

  const memoizedResult = useMemo(() => {
    const [collectionQuery, banknoteQuery] = results;
    const collectionItems = collectionQuery?.data || [];
    
    // Calculate missing banknotes if we have country banknotes
    const allCountryBanknotes = banknoteQuery?.data || [];
    const collectedBanknoteIds = new Set(
      collectionItems.map(item => item.banknoteId).filter(Boolean)
    );
    
    const missingBanknotes = allCountryBanknotes.filter(
      banknote => !collectedBanknoteIds.has(banknote.id)
    );
    
    // Extract wishlist items
    const wishlistItems = collectionItems.filter((item: CollectionItem) => 
      item.type === 'wishlist' || (item as any).isWishlist
    );
    
    // Extract sale items  
    const saleItems = collectionItems.filter((item: CollectionItem) => item.isForSale);
    
    return {
      collectionItems,
      allBanknotes: allCountryBanknotes,
      missingBanknotes,
      wishlistItems,
      saleItems,
      loading: results.some(query => query.isLoading),
      error: results.find(query => query.error)?.error as Error | null,
      refetch: () => results.forEach(query => query.refetch()),
    };
  }, [results]);

  return memoizedResult;
};

// Enhanced collection data hook with metadata
export const useEnhancedCollectionData = (
  userId: string,
  countryId?: string,
  filters: DynamicFilterState = {
    search: '',
    categories: [],
    types: [],
    sort: []
  }
) => {
  const collectionResult = useCollectionData(userId, countryId, filters);
  
  // Get collection metadata
  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError
  } = useCollectionMetadata(collectionResult.collectionItems as CollectionItem[]);

  return useMemo(() => ({
    ...collectionResult,
    categories: metadata?.categories || [],
    types: metadata?.types || [],
    loading: collectionResult.loading || metadataLoading,
    error: collectionResult.error || metadataError,
  }), [collectionResult, metadata, metadataLoading, metadataError]);
};