import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DetailedBanknote } from "@/types";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { DynamicFilterState } from "@/types/filter";
import { fetchCountryByName, fetchCategoriesByCountryId } from "@/services/countryService";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BanknoteGroups } from "@/components/banknotes/BanknoteGroups";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteSession } from "@/hooks/use-banknote-session";
import { useAuth } from "@/context/AuthContext";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const decodedCountryName = decodeURIComponent(country || "");
  const [countryId, setCountryId] = useState<string>("");
  const scrollPositionRef = useRef(0);
  const initialLoadRef = useRef(false);

  const { sessionState, saveState, hasValidState } = useBanknoteSession(countryId);

  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    sessionState?.filters?.viewMode || 'grid'
  );
  const [currencies, setCurrencies] = useState<{ id: string, name: string, display_order: number }[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<{ name: string, order: number }[]>([]);

  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });

  // Load country data and initialize state
  useEffect(() => {
    const loadCountryData = async () => {
      if (!decodedCountryName) {
        console.log("CountryDetail: No country name provided");
        return;
      }

      console.log("CountryDetail: Loading country data for", decodedCountryName);

      try {
        const countryData = await fetchCountryByName(decodedCountryName);

        if (!countryData) {
          console.error("CountryDetail: Country not found:", decodedCountryName);
          toast({
            title: "Error",
            description: `Country "${decodedCountryName}" not found.`,
            variant: "destructive",
          });
          navigate('/catalog');
          return;
        }

        console.log("CountryDetail: Country data loaded", countryData);
        setCountryId(countryData.id);
        setFilters(prev => ({
          ...prev,
          country_id: countryData.id
        }));

        const categories = await fetchCategoriesByCountryId(countryData.id);
        const orderMap = categories.map(cat => ({
          name: cat.name,
          order: cat.display_order
        }));
        setCategoryOrder(orderMap);

        const { data: currencyRows, error: currencyError } = await supabase
          .from("currencies")
          .select("id, name, display_order")
          .eq("country_id", countryData.id)
          .order("display_order", { ascending: true });

        if (currencyError) {
          console.error("Error fetching currencies:", currencyError);
          setCurrencies([]);
        } else if (currencyRows) {
          setCurrencies(currencyRows);
          console.log("Loaded currencies:", currencyRows);
        }

        // If we have valid session state, use it
        if (hasValidState && sessionState?.filters) {
          setFilters(sessionState.filters);
          if (sessionState.scrollPosition) {
            window.scrollTo(0, sessionState.scrollPosition);
          }
        }
      } catch (error) {
        console.error("CountryDetail: Error loading country data:", error);
        toast({
          title: "Error",
          description: "Failed to load country data. Please try again later.",
          variant: "destructive",
        });
      }
    };

    loadCountryData();
  }, [decodedCountryName, navigate, toast, hasValidState, sessionState]);

  // Load banknotes when filters change
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
  }, [countryId, filters, toast]);

  // Use the custom sorting hook
  const sortedBanknotes = useBanknoteSorting({
    banknotes,
    currencies,
    sortFields: filters.sort
  });

  const groupedItems = useCallback(() => {
    const categoryMap = new Map();
    const showSultanGroups = filters.sort.includes('sultan');
  
    const sultanOrder = [
      "AbdulMecid",
      "AbdulAziz",
      "Murad",
      "AbdulHamid",
      "M.Resad",
      "M.Vahdeddin"
    ];
  
    // 1. Group banknotes by category
    sortedBanknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
  
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          categoryId: '',
          items: []
        });
      }
  
      categoryMap.get(category).items.push(banknote);
    });
  
    const groupArray = Array.from(categoryMap.values());
  
    // 2. Sort category groups if order is provided
    if (categoryOrder.length > 0) {
      groupArray.sort((a, b) => {
        const orderA = categoryOrder.find(c => c.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = categoryOrder.find(c => c.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      groupArray.sort((a, b) => a.category.localeCompare(b.category));
    }
  
    // 3. If sorting by sultan, group and sort inside each category group
    if (showSultanGroups) {
      groupArray.forEach(group => {
        const sultanMap = new Map();
  
        group.items.forEach(banknote => {
          const sultan = banknote.sultanName || 'Unknown';
          if (!sultanMap.has(sultan)) {
            sultanMap.set(sultan, []);
          }
          sultanMap.get(sultan).push(banknote);
        });
  
        group.sultanGroups = Array.from(sultanMap.entries())
          .map(([sultan, items]) => ({ sultan, items }))
          .sort((a, b) => {
            const indexA = sultanOrder.findIndex(name => name.toLowerCase() === a.sultan.toLowerCase());
            const indexB = sultanOrder.findIndex(name => name.toLowerCase() === b.sultan.toLowerCase());
            return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
          });
      });
    }
  
    return groupArray;
  }, [sortedBanknotes, filters.sort, categoryOrder]);

  // Save scroll position before unmounting
  useEffect(() => {
    return () => {
      if (initialLoadRef.current) {
        saveState({ scrollPosition: window.scrollY });
      }
    };
  }, [saveState]);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      country_id: countryId
    };
    setFilters(updatedFilters);
    saveState({ filters: updatedFilters });
  }, [countryId, filters, saveState]);

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveState({ 
      filters: { ...filters, viewMode: mode }
    });
  };

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{decodedCountryName} Banknotes</h1>
      </div>

      <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        {countryId && (
          <BanknoteFilterCatalog
            countryId={countryId}
            onFilterChange={handleFilterChange}
            currentFilters={filters}
            isLoading={loading}
            onViewModeChange={handleViewModeChange}
          />
        )}

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : banknotes.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">No banknotes found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <BanknoteGroups
              groups={groupedItems()}
              showSultanGroups={filters.sort.includes('sultan')}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryDetail;
