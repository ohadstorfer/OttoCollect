import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useBanknotePersistence } from "@/hooks/use-banknote-persistence";
import { Currency } from "@/types/banknote";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const decodedCountryName = decodeURIComponent(country || "");

  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<{ name: string, order: number }[]>([]);
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });
  
  const { 
    storedState, 
    isReturningFromDetail, 
    persistState, 
    markNavigatingToDetail,
    restoreScrollPosition,
    isDataFresh,
    scrollContainerRef
  } = useBanknotePersistence({
    countryId: countryId || '',
    countryName: decodedCountryName
  });
  
  useEffect(() => {
    if (countryId && storedState && isReturningFromDetail) {
      console.log("CountryDetail: Restoring from persistence", storedState);
      setFilters(storedState.filters);
      setBanknotes(storedState.banknotes);
      setViewMode(storedState.viewMode);
      setCurrencies(storedState.currencies);
      setLoading(false);
    }
  }, [countryId, storedState, isReturningFromDetail]);
  
  useEffect(() => {
    if (!loading && isReturningFromDetail && banknotes.length > 0) {
      restoreScrollPosition();
    }
  }, [loading, isReturningFromDetail, banknotes, restoreScrollPosition]);

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
          .select("id, name, display_order, country_id, created_at, updated_at")
          .eq("country_id", countryData.id)
          .order("display_order", { ascending: true });

        if (currencyError) {
          console.error("Error fetching currencies:", currencyError);
          setCurrencies([]);
        } else if (currencyRows) {
          setCurrencies(currencyRows);
          console.log("Loaded currencies:", currencyRows);
        }
        
        if (storedState && isReturningFromDetail && isDataFresh()) {
          console.log("Using cached data - skipping fetch");
          return;
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
  }, [decodedCountryName, navigate, toast, storedState, isReturningFromDetail, isDataFresh]);

  useEffect(() => {
    const fetchBanknotesData = async () => {
      if (!countryId) return;
      
      if (storedState && isReturningFromDetail && isDataFresh()) {
        return;
      }

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
        
        persistState(filters, data, viewMode, currencies);
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
  }, [countryId, filters, toast, persistState, currencies, viewMode, storedState, isReturningFromDetail, isDataFresh]);

  const sortedBanknotes = useBanknoteSorting({
    banknotes,
    currencies,
    sortFields: filters.sort
  });

  const groupedItems = useMemo(() => {
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
  
    if (categoryOrder.length > 0) {
      groupArray.sort((a, b) => {
        const orderA = categoryOrder.find(c => c.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = categoryOrder.find(c => c.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      groupArray.sort((a, b) => a.category.localeCompare(b.category));
    }
  
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

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      country_id: countryId || prev.country_id
    }));
  }, [countryId]);

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    
    if (countryId) {
      persistState(filters, banknotes, mode, currencies);
    }
  };
  
  const handleNavigateToDetail = useCallback(() => {
    markNavigatingToDetail();
    persistState(filters, banknotes, viewMode, currencies);
  }, [markNavigatingToDetail, persistState, filters, banknotes, viewMode, currencies]);

  return (
    <div className="w-full px-2 sm:px-6 py-8" ref={scrollContainerRef}>
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
              groups={groupedItems}
              showSultanGroups={filters.sort.includes('sultan')}
              viewMode={viewMode}
              onBanknoteClick={handleNavigateToDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryDetail;
