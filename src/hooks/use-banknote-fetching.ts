
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailedBanknote } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";

interface UseBanknoteFetchingProps {
  countryId: string;
  filters: DynamicFilterState;
  skipInitialFetch?: boolean; // Add control for initial fetch
}

interface UseBanknoteFetchingResult {
  banknotes: DetailedBanknote[];
  loading: boolean;
  fetchBanknotes: () => Promise<void>; // Expose function to trigger fetch manually
}

export const useBanknoteFetching = ({ 
  countryId, 
  filters,
  skipInitialFetch = false
}: UseBanknoteFetchingProps): UseBanknoteFetchingResult => {
  const { toast } = useToast();
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchKey = useRef<string>("");

  // Function to fetch banknotes that can be called manually
  const fetchBanknotes = async () => {
    // Skip empty countryId
    if (!countryId) return;
    
    // Create a cache key from countryId and filters
    const fetchKey = countryId + JSON.stringify(filters);
    
    // Skip duplicate fetches with same parameters
    if (fetchKey === lastFetchKey.current) {
      console.log("UseBanknoteFetching: Skipping duplicate fetch with same parameters");
      return;
    }
    
    // Skip if already fetching
    if (isFetchingRef.current) {
      console.log("UseBanknoteFetching: Fetch already in progress, skipping");
      return;
    }
    
    console.log("UseBanknoteFetching: Fetching banknotes with filters", { countryId, filters });
    setLoading(true);
    isFetchingRef.current = true;

    try {
      const filterParams = {
        search: filters.search,
        categories: filters.categories,
        types: filters.types,
        sort: filters.sort
      };

      const data = await fetchBanknotesByCountryId(countryId, filterParams);
      console.log("UseBanknoteFetching: Banknotes loaded:", data.length);
      
      // Only update state if component is still mounted
      setBanknotes(data);
      lastFetchKey.current = fetchKey;
    } catch (error) {
      console.error("UseBanknoteFetching: Error fetching banknotes:", error);
      toast({
        title: "Error",
        description: "Failed to load banknotes. Please try again later.",
        variant: "destructive",
      });
      setBanknotes([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Skip initial fetch if requested
    if (skipInitialFetch) {
      console.log("UseBanknoteFetching: Skipping initial fetch as requested");
      return;
    }

    fetchBanknotes();
    // Note: groupMode is NOT included in the dependency array because changing groupMode
    // should not trigger a refetch of banknotes - it only affects how they are displayed
  }, [countryId, filters, toast, skipInitialFetch]);

  return { banknotes, loading, fetchBanknotes };
};
