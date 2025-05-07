
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CollectionItem } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { fetchUserCollectionByCountry } from '@/services/collectionService';
import { useAuth } from '@/context/AuthContext';

interface UseCollectionItemsFetchingProps {
  countryId: string;
  filters: DynamicFilterState;
  skipInitialFetch?: boolean;
}

interface UseCollectionItemsFetchingResult {
  collectionItems: CollectionItem[];
  loading: boolean;
  fetchCollectionItems: () => Promise<void>; 
}

export const useCollectionItemsFetching = ({ 
  countryId, 
  filters,
  skipInitialFetch = false
}: UseCollectionItemsFetchingProps): UseCollectionItemsFetchingResult => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchKey = useRef<string>("");
  
  // Function to fetch collection items that can be called manually
  const fetchCollectionItems = async () => {
    // Skip if no user or countryId
    if (!user?.id || !countryId) {
      console.log("UseCollectionItemsFetching: No user or country ID, skipping fetch");
      return;
    }
    
    // Create a cache key from countryId and filters
    const fetchKey = countryId + JSON.stringify(filters);
    
    // Skip duplicate fetches with same parameters
    if (fetchKey === lastFetchKey.current) {
      console.log("UseCollectionItemsFetching: Skipping duplicate fetch with same parameters");
      return;
    }
    
    // Skip if already fetching
    if (isFetchingRef.current) {
      console.log("UseCollectionItemsFetching: Fetch already in progress, skipping");
      return;
    }
    
    console.log("UseCollectionItemsFetching: Fetching items with filters", { countryId, filters });
    setLoading(true);
    isFetchingRef.current = true;

    try {
      const data = await fetchUserCollectionByCountry(user.id, countryId, filters);
      console.log("UseCollectionItemsFetching: Collection items loaded:", data.length);
      
      // Only update state if component is still mounted
      setCollectionItems(data);
      lastFetchKey.current = fetchKey;
    } catch (error) {
      console.error("UseCollectionItemsFetching: Error fetching collection items:", error);
      toast({
        title: "Error",
        description: "Failed to load your collection items. Please try again later.",
        variant: "destructive",
      });
      setCollectionItems([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Skip initial fetch if requested
    if (skipInitialFetch) {
      console.log("UseCollectionItemsFetching: Skipping initial fetch as requested");
      return;
    }
    
    fetchCollectionItems();
  }, [countryId, filters, user?.id, toast, skipInitialFetch]);

  return { 
    collectionItems, 
    loading, 
    fetchCollectionItems
  };
};
