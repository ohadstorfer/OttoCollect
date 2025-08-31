import { useQuery, useQueries } from '@tanstack/react-query';
import { DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { useLanguage } from '@/context/LanguageContext';
import { fetchUserFilterPreferences } from '@/services/countryService';
import { fetchUserCollection } from '@/services/collectionService';
import { useMemo } from 'react';

// Query keys for React Query caching
export const queryKeys = {
  banknotes: (countryId: string, filters: DynamicFilterState, language?: string) => 
    ['banknotes', countryId, filters, language] as const,
  userFilterPreferences: (userId: string, countryId: string) => 
    ['userFilterPreferences', userId, countryId] as const,
  userCollection: (userId: string) => 
    ['userCollection', userId] as const,
  countryMetadata: (countryId: string) => 
    ['countryMetadata', countryId] as const,
};

interface UseBanknoteQueryProps {
  countryId: string;
  filters: DynamicFilterState;
  enabled?: boolean;
}

interface UseBanknoteQueryResult {
  banknotes: DetailedBanknote[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Main banknote query hook with React Query caching
export const useBanknoteQuery = ({ 
  countryId, 
  filters, 
  enabled = true 
}: UseBanknoteQueryProps): UseBanknoteQueryResult => {
  const { currentLanguage } = useLanguage();
  const {
    data: banknotes = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.banknotes(countryId, filters, currentLanguage),
    queryFn: async () => {
      const filterParams = {
        search: filters.search,
        categories: filters.categories,
        types: filters.types,
        sort: filters.sort
      };
      return fetchBanknotesByCountryId(countryId, filterParams, currentLanguage);
    },
    enabled: enabled && !!countryId, // Remove the categories length check - empty array means "all selected"
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    banknotes,
    loading,
    error: error as Error | null,
    refetch,
  };
};

// Hook for user filter preferences with longer cache time
export const useUserFilterPreferences = (userId: string, countryId: string) => {
  return useQuery({
    queryKey: queryKeys.userFilterPreferences(userId, countryId),
    queryFn: () => fetchUserFilterPreferences(userId, countryId),
    enabled: !!userId && !!countryId,
    staleTime: 5 * 60 * 1000, // 5 minutes for metadata
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

// Hook for user collection with optimized caching
export const useUserCollection = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userCollection(userId),
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

// Combined hook for all banknote-related data with parallel queries
export const useBanknoteData = (
  countryId: string,
  filters: DynamicFilterState,
  userId?: string
) => {
  const { currentLanguage } = useLanguage();
  
  // Create query configurations
  const queries = [
    {
      queryKey: queryKeys.banknotes(countryId, filters, currentLanguage),
      queryFn: async () => {
        const filterParams = {
          search: filters.search,
          categories: filters.categories,
          types: filters.types,
          sort: filters.sort
        };
        return fetchBanknotesByCountryId(countryId, filterParams, currentLanguage);
      },
      enabled: !!countryId, // Remove the categories length check - empty array means "all selected"
      staleTime: 60 * 1000,
    },
    // Only include user collection query if userId is provided
    ...(userId ? [{
      queryKey: queryKeys.userCollection(userId),
      queryFn: () => fetchUserCollection(userId),
      enabled: !!userId,
      staleTime: 2 * 60 * 1000,
    }] : []),
  ];

  const results = useQueries({ queries });

  const memoizedResult = useMemo(() => {
    const [banknotesQuery, userCollectionQuery] = results;
    
    return {
      banknotes: banknotesQuery?.data || [],
      userCollection: userCollectionQuery?.data || [],
      loading: results.some(query => query.isLoading),
      error: results.find(query => query.error)?.error as Error | null,
      refetch: () => results.forEach(query => query.refetch()),
    };
  }, [results]);

  return memoizedResult;
};