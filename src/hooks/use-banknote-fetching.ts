
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DetailedBanknote } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";

interface UseBanknoteFetchingProps {
  countryId: string;
  filters: DynamicFilterState;
}

export const useBanknoteFetching = ({ countryId, filters }: UseBanknoteFetchingProps) => {
  const { toast } = useToast();
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchBanknotesData = async () => {
      if (!countryId) return;

      console.log("CountryDetail: Fetching banknotes with filters", { countryId, filters });
      setLoading(true);

      try {
        const filterParams = {
          search: filters.search,
          categories: filters.categories,
          types: filters.types,
          sort: filters.sort
        };

        const data = await fetchBanknotesByCountryId(countryId, filterParams);
        console.log("CountryDetail: Banknotes loaded:", data.length);
        setBanknotes(data);
        setLoading(false);
      } catch (error) {
        console.error("CountryDetail: Error fetching banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
        setBanknotes([]);
        setLoading(false);
      }
    };

    fetchBanknotesData();
    // Note: groupMode is NOT included in the dependency array because changing groupMode
    // should not trigger a refetch of banknotes - it only affects how they are displayed
  }, [countryId, filters, toast]);

  return { banknotes, loading };
};
