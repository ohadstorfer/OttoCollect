import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CollectionItem } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { fetchUserCollectionByCountry } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UseCollectionItemsFetchingProps {
  userId?: string;
  countryId: string;
  filters: DynamicFilterState;
  skipInitialFetch?: boolean;
}

interface UseCollectionItemsFetchingResult {
  collectionItems: CollectionItem[];
  loading: boolean;
}

export const useCollectionItemsFetching = ({ 
  userId,
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
  
  // Use the current user's ID if userId is not provided
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    // Skip empty countryId or if there's no user ID
    if (!countryId || !effectiveUserId) return;

    // Skip the initial fetch if requested
    if (skipInitialFetch && lastFetchKey.current === "") {
      console.log("useCollectionItemsFetching: Skipping initial fetch as requested");
      return;
    }
    
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
        let filteredItems: CollectionItem[];
        if (countryId) {
          filteredItems = await fetchUserCollectionByCountry(effectiveUserId, countryId);
          console.log(`Loaded ${filteredItems.length} collection items for country ${countryId}`);
        } else {
          // fallback to legacy
          filteredItems = await fetchUserCollectionItems(effectiveUserId);
          console.log('Loaded all collection items:', filteredItems.length);
        }
        
        // Apply filters if needed
        
        
        // Apply search filter if provided
        if (filters.search && filters.search.trim() !== '') {
          const searchTerm = filters.search.toLowerCase();
          filteredItems = filteredItems.filter(item => {
            const banknote = item.banknote;
            if (!banknote) return false;
            
            // Search in multiple fields - modify this to use optional chaining to avoid type errors
            return (
              banknote.denomination?.toLowerCase().includes(searchTerm) ||
              banknote.year?.toLowerCase().includes(searchTerm) ||
              // Use optional chaining for properties that might not exist on Banknote type
              banknote.extendedPickNumber?.toLowerCase().includes(searchTerm) ||
              banknote.type?.toLowerCase().includes(searchTerm) ||
              banknote.category?.toLowerCase().includes(searchTerm) ||
              // Fixed: Use optional chaining for properties that might not be on basic Banknote
              (banknote as any).pickNumber?.toLowerCase?.().includes(searchTerm) ||
              banknote.sultanName?.toLowerCase().includes(searchTerm)
            );
          });
        }
        
        // Convert category IDs to category names for filtering
        let categoryNames: string[] = [];
        if (filters.categories && filters.categories.length > 0) {
          try {
            const { data: categoryData } = await supabase
              .from('banknote_category_definitions')
              .select('name')
              .in('id', filters.categories);
            
            categoryNames = (categoryData || []).map(cat => cat.name);
            console.log("useCollectionItemsFetching: Converted category IDs to names:", { 
              categoryIds: filters.categories, 
              categoryNames 
            });
          } catch (err) {
            console.error("useCollectionItemsFetching: Failed to fetch category names:", err);
          }
        }
        
        // Apply category filter
        if (categoryNames.length > 0) {
          filteredItems = filteredItems.filter(item => {
            // The banknote itself carries the category
            const category = item.banknote?.category;
            const matched = category && categoryNames.includes(category);
            console.log(`useCollectionItemsFetching: Category filter - item: ${item.id}, banknote category: ${category}, matched: ${matched}`);
            return matched;
          });
        }
        
        // Convert type IDs to type names for filtering
        let typeNames: string[] = [];
        if (filters.types && filters.types.length > 0) {
          try {
            const { data: typeData } = await supabase
              .from('banknote_type_definitions')
              .select('name')
              .in('id', filters.types);
            
            typeNames = (typeData || []).map(type => type.name);
            console.log("useCollectionItemsFetching: Converted type IDs to names:", { 
              typeIds: filters.types, 
              typeNames 
            });
          } catch (err) {
            console.error("useCollectionItemsFetching: Failed to fetch type names:", err);
          }
        }
        
        // Apply type filter - Fix: normalize comparison by handling singular/plural forms
        if (typeNames.length > 0) {
          filteredItems = filteredItems.filter(item => {
            const type = item.banknote?.type;
            
            // Log more detail to diagnose the issue
            console.log(`useCollectionItemsFetching: Type filter details - item type: "${type}", available types:`, typeNames);
            
            // Handle both singular and plural forms by normalizing the comparison
            // "Issued note" should match "Issued notes"
            const matched = type && typeNames.some(typeName => {
              // Remove trailing 's' if exists for comparison
              const normalizedTypeName = typeName.endsWith('s') 
                ? typeName.slice(0, -1) 
                : typeName;
              
              const normalizedType = type.endsWith('s')
                ? type.slice(0, -1)
                : type;
              
              return normalizedTypeName.toLowerCase() === normalizedType.toLowerCase();
            });
            
            console.log(`useCollectionItemsFetching: Type filter - item: ${item.id}, banknote type: ${type}, matched: ${matched}`);
            return matched;
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
  }, [countryId, effectiveUserId, filters, toast, skipInitialFetch]);

  return { collectionItems, loading };
};
