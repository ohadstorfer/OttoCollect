
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CollectionItem } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { fetchUserCollectionByCountry } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";

interface UseCollectionItemsFetchingProps {
  userId?: string;
  countryId: string;
  filters: DynamicFilterState;
}

interface UseCollectionItemsFetchingResult {
  collectionItems: CollectionItem[];
  loading: boolean;
}

export const useCollectionItemsFetching = ({ 
  userId,
  countryId, 
  filters 
}: UseCollectionItemsFetchingProps): UseCollectionItemsFetchingResult => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchKey = useRef<string>("");
  
  // Use the current user's ID if userId is not provided
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    // Skip empty countryId or if there's no user ID
    if (!countryId || !effectiveUserId) return;
    
    // Create a cache key from countryId, userId and filters
    const fetchKey = `${countryId}_${effectiveUserId}_${JSON.stringify(filters)}`;
    
    // Skip duplicate fetches with same parameters
    if (fetchKey === lastFetchKey.current) {
      console.log("useCollectionItemsFetching: Skipping duplicate fetch with same parameters");
      return;
    }
    
    // Skip if already fetching
    if (isFetchingRef.current) {
      console.log("useCollectionItemsFetching: Fetch already in progress, skipping");
      return;
    }
    
    const fetchCollectionItems = async () => {
      console.log("useCollectionItemsFetching: Fetching collection items with filters", { countryId, effectiveUserId, filters });
      setLoading(true);
      isFetchingRef.current = true;

      try {
        // Fetch collection items for this country with the user ID
        const items = await fetchUserCollectionByCountry(effectiveUserId, countryId);
        console.log("useCollectionItemsFetching: Collection items loaded:", items.length);
        
        // Apply filters if needed
        let filteredItems = items;
        
        // Apply search filter if provided
        if (filters.search && filters.search.trim() !== '') {
          const searchTerm = filters.search.toLowerCase();
          filteredItems = filteredItems.filter(item => {
            const banknote = item.banknote;
            if (!banknote) return false;
            
            // Search in multiple fields
            return (
              banknote.denomination?.toLowerCase().includes(searchTerm) ||
              banknote.year?.toLowerCase().includes(searchTerm) ||
              banknote.pickNumber?.toLowerCase().includes(searchTerm) ||
              banknote.extendedPickNumber?.toLowerCase().includes(searchTerm) ||
              banknote.sultanName?.toLowerCase().includes(searchTerm) ||
              banknote.category?.toLowerCase().includes(searchTerm) ||
              banknote.type?.toLowerCase().includes(searchTerm)
            );
          });
        }
        
        // Apply category filter
        if (filters.categories && filters.categories.length > 0) {
          filteredItems = filteredItems.filter(item => {
            // The banknote itself carries the category
            const category = item.banknote?.category;
            return filters.categories.includes(category || '');
          });
        }
        
        // Apply type filter
        if (filters.types && filters.types.length > 0) {
          filteredItems = filteredItems.filter(item => {
            const type = item.banknote?.type;
            return filters.types.includes(type || '');
          });
        }
        
        console.log("useCollectionItemsFetching: After filters applied, items:", filteredItems.length);
        
        // Only update state if component is still mounted
        setCollectionItems(filteredItems);
        lastFetchKey.current = fetchKey;
      } catch (error) {
        console.error("useCollectionItemsFetching: Error fetching collection items:", error);
        toast({
          title: "Error",
          description: "Failed to load collection items. Please try again later.",
          variant: "destructive",
        });
        setCollectionItems([]);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchCollectionItems();
  }, [countryId, effectiveUserId, filters, toast]);

  return { collectionItems, loading };
};
