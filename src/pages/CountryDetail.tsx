
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DetailedBanknote } from "@/types";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { DynamicFilterState } from "@/types/filter";
import { fetchCountryByName, fetchCategoriesByCountryId } from "@/services/countryService";
import { supabase } from "@/integrations/supabase/client";
import { BanknoteGroups } from "@/components/banknotes/BanknoteGroups";
import { useBanknoteSession } from "@/hooks/useBanknoteSession";
import { cn } from "@/lib/utils";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { Currency } from "@/types/banknote";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const decodedCountryName = decodeURIComponent(country || "");
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<{ name: string; order: number }[]>([]);
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });
  
  const initialLoadComplete = useRef(false);
  const filtersChanged = useRef(false);
  const categoryLoadComplete = useRef(false);

  const {
    sessionState,
    saveState,
    clearState,
    saveScrollPosition,
    hasLoadedFromSession
  } = useBanknoteSession(countryId);

  // Load initial country data
  useEffect(() => {
    const loadCountryData = async () => {
      if (!decodedCountryName) {
        console.log("CountryDetail: No country name provided");
        return;
      }

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

        setCountryId(countryData.id);
        setFilters(prev => ({
          ...prev,
          country_id: countryData.id
        }));
        
        if (categoryLoadComplete.current) return;
        
        // Load categories and currencies
        categoryLoadComplete.current = true;
        
        const categories = await fetchCategoriesByCountryId(countryData.id);
        setCategoryOrder(categories.map(cat => ({
          name: cat.name,
          order: cat.display_order
        })));

        const { data: currencyRows, error: currencyError } = await supabase
          .from("currencies")
          .select("id, name, display_order, country_id, created_at, updated_at")
          .eq("country_id", countryData.id)
          .order("display_order", { ascending: true });

        if (currencyError) {
          console.error("Error fetching currencies:", currencyError);
        } else if (currencyRows) {
          setCurrencies(currencyRows);
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
  }, [decodedCountryName, navigate, toast]);

  // Restore or fetch banknotes
  useEffect(() => {
    const loadBanknotes = async () => {
      if (!countryId) return;
      
      // If we have valid session state, use it
      if (sessionState && hasLoadedFromSession && !filtersChanged.current) {
        console.log("CountryDetail: Using cached banknotes from session");
        setBanknotes(sessionState.banknotes);
        setFilters(sessionState.filters);
        setViewMode(sessionState.viewMode);
        setLoading(false);
        initialLoadComplete.current = true;
        return;
      }
      
      // Prevent duplicate fetches
      if (!filtersChanged.current && initialLoadComplete.current) {
        console.log("CountryDetail: Skipping fetch, initial load already complete");
        return;
      }

      setLoading(true);
      try {
        console.log("CountryDetail: Fetching banknotes from API");
        const data = await fetchBanknotesByCountryId(countryId, filters);
        setBanknotes(data);
        saveState({ 
          banknotes: data, 
          filters, 
          viewMode,
          scrollPosition: window.scrollY 
        });
        filtersChanged.current = false;
        initialLoadComplete.current = true;
      } catch (error) {
        console.error("Error fetching banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBanknotes();
  }, [countryId, filters, sessionState, hasLoadedFromSession, saveState, viewMode, toast]);

  // Save state when leaving the page
  useEffect(() => {
    return () => {
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    filtersChanged.current = true;
    
    setFilters(prev => {
      const updated = {
        ...prev,
        ...newFilters,
        country_id: countryId || prev.country_id
      };
      
      // Only clear the session if we're changing substantive filters
      if (
        newFilters.categories || 
        newFilters.types || 
        (newFilters.search !== undefined && newFilters.search !== prev.search)
      ) {
        clearState();
      }
      
      return updated;
    });
  }, [countryId, clearState]);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveState({ viewMode: mode });
  };

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

  const handleBack = () => {
    navigate('/catalog');
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
              groups={groupedItems}
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
