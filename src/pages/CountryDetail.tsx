
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { DetailedBanknote } from "@/types";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { DynamicFilterState } from "@/types/filter";
import { fetchCountryByName } from "@/services/countryService";
import { useAuth } from "@/context/AuthContext";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decodedCountryName = decodeURIComponent(country || "");
  
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });
  
  const [groupedItems, setGroupedItems] = useState<Array<{
    category: string;
    categoryId: string;
    items: DetailedBanknote[];
    sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
  }>>([]);
  
  const isUpdatingFilters = useRef(false);
  
  console.log("CountryDetail: Rendering with", { 
    country: decodedCountryName, 
    countryId, 
    loading, 
    banknotes: banknotes.length,
    filters
  });
  
  // Load country data and set country ID
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

  // Fetch banknotes with filters whenever filters change or country is loaded
  useEffect(() => {
    const fetchBanknotesWithFilters = async () => {
      if (!countryId) return;
      
      console.log("CountryDetail: Fetching banknotes with filters", { countryId, filters });
      setLoading(true);
      
      try {
        // Convert to expected filter format
        const filterParams = {
          search: filters.search,
          categories: filters.categories,
          types: filters.types,
          sort: filters.sort
        };
        
        const data = await fetchBanknotesByCountryId(countryId, filterParams);
        console.log("CountryDetail: Banknotes loaded:", data.length);
        setBanknotes(data);
        
        // Group banknotes by category
        const grouped = groupBanknotesByCategory(
          data, 
          filters.categories, 
          filters.sort.includes("sultan")
        );
        
        setGroupedItems(grouped);
      } catch (error) {
        console.error("CountryDetail: Error fetching banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
        setBanknotes([]);
        setGroupedItems([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBanknotesWithFilters();
  }, [countryId, filters, toast]);

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    if (isUpdatingFilters.current) {
      console.log("CountryDetail: Skipping filter change - update in progress");
      return;
    }
    
    console.log("CountryDetail: Filter change", newFilters);
    
    isUpdatingFilters.current = true;
    
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      country_id: countryId || prev.country_id
    }));
    
    setTimeout(() => {
      isUpdatingFilters.current = false;
    }, 100);
  }, [countryId]);

  // Group banknotes by category and optionally by sultan within each category
  function groupBanknotesByCategory(
    items: DetailedBanknote[], 
    selectedCategoryIds: string[],
    groupBySultan: boolean
  ) {
    const groups: Array<{
      category: string;
      categoryId: string;
      items: DetailedBanknote[];
      sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
    }> = [];
    
    // Group banknotes by their category
    const categoryMap = new Map<string, {
      items: DetailedBanknote[];
      categoryId: string;
    }>();
    
    items.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          items: [],
          categoryId: selectedCategoryIds.find(id => id === category) || ''
        });
      }
      
      categoryMap.get(category)?.items.push(banknote);
    });
    
    // Convert map to array and sort alphabetically
    Array.from(categoryMap.entries()).forEach(([category, { items, categoryId }]) => {
      const group = {
        category,
        categoryId,
        items,
      };
      
      // If sorting by sultan, group banknotes by sultan within each category
      if (groupBySultan) {
        const sultanMap = new Map<string, DetailedBanknote[]>();
        
        items.forEach(banknote => {
          const sultan = banknote.sultanName || 'Unknown';
          
          if (!sultanMap.has(sultan)) {
            sultanMap.set(sultan, []);
          }
          
          sultanMap.get(sultan)?.push(banknote);
        });
        
        // Convert sultan map to array and sort by sultan name
        group.sultanGroups = Array.from(sultanMap.entries())
          .map(([sultan, items]) => ({ sultan, items }))
          .sort((a, b) => a.sultan.localeCompare(b.sultan));
      }
      
      groups.push(group);
    });
    
    return groups.sort((a, b) => a.category.localeCompare(b.category));
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{decodedCountryName} Banknotes</h1>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        {countryId && (
          <BanknoteFilterCatalog
            countryId={countryId}
            onFilterChange={handleFilterChange}
            currentFilters={filters}
            isLoading={loading}
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
                  <div className="sticky top-[184px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <h2 className="text-xl font-bold">{group.category}</h2>
                  </div>
                  
                  {group.sultanGroups ? (
                    <div className="space-y-6">
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          <div className="sticky top-[248px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                            <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                              {sultanGroup.sultan}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sultanGroup.items.map((banknote, index) => (
                              <BanknoteDetailCard
                                key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                                banknote={banknote}
                                source="catalog"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((banknote, index) => (
                        <BanknoteDetailCard
                          key={`banknote-${group.category}-${index}`}
                          banknote={banknote}
                          source="catalog"
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
