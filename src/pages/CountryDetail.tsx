
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { DetailedBanknote } from "@/types";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { DynamicFilterState } from "@/types/filter";
import { fetchCountryByName, fetchCategoriesByCountryId } from "@/services/countryService";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decodedCountryName = decodeURIComponent(country || "");
  
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });
  
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<{ name: string, order: number }[]>([]);
  
  console.log("CountryDetail: Rendering with", { 
    country: decodedCountryName, 
    countryId, 
    loading, 
    banknotes: banknotes.length,
    filters,
    viewMode,
    categoryOrder
  });
  
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
        
        // Fetch category definitions to get their display order
        const categories = await fetchCategoriesByCountryId(countryData.id);
        const orderMap = categories.map(cat => ({
          name: cat.name,
          order: cat.display_order
        }));
        setCategoryOrder(orderMap);
        console.log("CategoryOrder loaded:", orderMap);
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

  useEffect(() => {
    const fetchBanknotesData = async () => {
      if (!countryId || !filtersInitialized) return;
      
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
  }, [countryId, filters, toast, filtersInitialized]);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    console.log("CountryDetail: Filter change", newFilters);
    
    if (!filtersInitialized && (newFilters.categories?.length || newFilters.types?.length)) {
      setFiltersInitialized(true);
    }
    
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      country_id: countryId || prev.country_id
    }));
  }, [countryId, filtersInitialized]);

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    console.log("CountryDetail: View mode changed to", mode);
    setViewMode(mode);
  };

  const groupedItems = useMemo(() => {
    const categoryMap = new Map();
    
    banknotes.forEach(banknote => {
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
    
    const groupBySultan = filters.sort.includes("sultan");
    
    if (groupBySultan) {
      categoryMap.forEach((group) => {
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
          .sort((a, b) => a.sultan.localeCompare(b.sultan));
      });
    }
    
    // Get the categories from the map as an array
    const groupArray = Array.from(categoryMap.values());
    
    // Sort the groups based on the category order we fetched earlier
    if (categoryOrder.length > 0) {
      groupArray.sort((a, b) => {
        // Find the display order for each category
        const orderA = categoryOrder.find(c => c.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = categoryOrder.find(c => c.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
        
        // Sort by the display_order
        return orderA - orderB;
      });
    } else {
      // Fallback to alphabetical sort if no order is defined
      groupArray.sort((a, b) => a.category.localeCompare(b.category));
    }
    
    return groupArray;
  }, [banknotes, filters.sort, categoryOrder]);

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
            <div className="space-y-8">
              {groupedItems.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="space-y-4">
                  <div className="sticky top-[210px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-auto -mx-6 md:mx-0 px-6 md:px-0 ">
                    <h2 className="text-xl font-bold">{group.category}</h2>
                  </div>
                  
                  {group.sultanGroups && group.sultanGroups.length > 0 ? (
                    <div className="space-y-6">
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          <div className="sticky top-[255px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-auto  -mx-6 md:mx-0 px-6 md:px-0">
                            <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                              {sultanGroup.sultan}
                            </h3>
                          </div>
                          <div className={cn(
                            viewMode === 'grid' 
                              ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4" 
                              : "flex flex-col space-y-2",
                            "px-2 sm:px-0"
                          )}>
                            {sultanGroup.items.map((banknote, index) => (
                              <BanknoteDetailCard
                                key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                                banknote={banknote}
                                source="catalog"
                                viewMode={viewMode}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      viewMode === 'grid' 
                        ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4" 
                        : "flex flex-col space-y-2",
                      "px-2 sm:px-0"
                    )}>
                      {group.items.map((banknote, index) => (
                        <BanknoteDetailCard
                          key={`banknote-${group.category}-${index}`}
                          banknote={banknote}
                          source="catalog"
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryDetail;
