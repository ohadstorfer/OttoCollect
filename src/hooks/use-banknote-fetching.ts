
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailedBanknote } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { useBanknoteQuery } from "./use-banknote-query";

interface UseBanknoteFetchingProps {
  countryId: string;
  filters: DynamicFilterState;
}

interface UseBanknoteFetchingResult {
  banknotes: DetailedBanknote[];
  loading: boolean;
}

// Optimized hook using React Query with smart memoization
export const useBanknoteFetching = ({ 
  countryId, 
  filters 
}: UseBanknoteFetchingProps): UseBanknoteFetchingResult => {
  const { toast } = useToast();
  
  // Use React Query for caching and optimized fetching
  const {
    banknotes,
    loading,
    error,
  } = useBanknoteQuery({
    countryId,
    filters,
    enabled: !!countryId && !!filters.categories?.length,
  });

  // Handle errors with toast notifications
  if (error) {
    console.error("CountryDetail: Error fetching banknotes:", error);
    toast({
      title: "Error",
      description: "Failed to load banknotes. Please try again later.",
      variant: "destructive",
    });
  }

  // Memoize the result to prevent unnecessary re-renders
  const result = useMemo(() => ({
    banknotes,
    loading,
  }), [banknotes, loading]);

  return result;
};
