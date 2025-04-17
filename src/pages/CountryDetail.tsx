import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Banknote, DetailedBanknote } from "@/types";
import { fetchBanknotesByCountryId } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { useDynamicFilter } from "@/hooks/use-dynamic-filter";
import { fetchCountryByName } from "@/services/countryService";
import { DynamicFilterState } from "@/types/filter";
import { useAuth } from "@/context/AuthContext";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decodedCountryName = decodeURIComponent(country || "");
  
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();
  
  const isUpdatingFilters = useRef(false);
  const isFirstRender = useRef(true);
  
  console.log("CountryDetail: Rendering with", { 
    country: decodedCountryName, 
    countryId, 
    loading, 
    banknotes: banknotes.length 
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
    const loadBanknotes = async () => {
      if (!countryId) return;
      
      setLoading(true);
      console.log("CountryDetail: Fetching banknotes for country", countryId);
      
      try {
        const banknotesData = await fetchBanknotes({ country_id: countryId });
        console.log("CountryDetail: Banknotes loaded:", banknotesData.length);
        setBanknotes(banknotesData);
      } catch (error) {
        console.error("Error fetching banknotes for country", countryId, ":", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
        setBanknotes([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (countryId) {
      loadBanknotes();
    }
  }, [countryId, toast]);

  const [currentFilters, setCurrentFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: ""
  });

  useEffect(() => {
    if (countryId && !isUpdatingFilters.current) {
      console.log("CountryDetail: Updating country_id in filters", countryId);
      
      isUpdatingFilters.current = true;
      setCurrentFilters(prev => ({
        ...prev,
        country_id: countryId
      }));
      
      setTimeout(() => {
        isUpdatingFilters.current = false;
      }, 100);
      
      if (!isFirstRender.current) {
        setHasInitialized(true);
      }
      isFirstRender.current = false;
    }
  }, [countryId]);

  const { 
    filteredItems: filteredBanknotes,
    filters,
    setFilters,
    groupedItems,
    isLoading: filterLoading
  } = useDynamicFilter({
    items: banknotes,
    initialFilters: currentFilters,
    countryId,
    categories: [],
    types: [],
    sortOptions: []
  });

  console.log("CountryDetail: Filter state", { 
    currentFilters, 
    hookFilters: filters, 
    filterLoading,
    filteredCount: filteredBanknotes.length,
    groupedCount: groupedItems.length
  });

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
    
    const updatedFilters = {
      ...newFilters,
      country_id: countryId
    };
    
    setCurrentFilters(prev => ({
      ...prev,
      ...updatedFilters
    }));
    
    setFilters(updatedFilters);
    
    setTimeout(() => {
      isUpdatingFilters.current = false;
    }, 100);
  }, [setFilters, countryId]);

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
            isLoading={loading || filterLoading}
          />
        )}

        <div className="mt-6">
          {loading || filterLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : filteredBanknotes.length === 0 ? (
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
                            {sultanGroup.items.map((banknote, index) => {
                              const detailedBanknote = banknote as unknown as DetailedBanknote;
                              return (
                                <BanknoteDetailCard
                                  key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                                  banknote={detailedBanknote}
                                  source="catalog"
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((banknote, index) => {
                        const detailedBanknote = banknote as unknown as DetailedBanknote;
                        return (
                          <BanknoteDetailCard
                            key={`banknote-${group.category}-${index}`}
                            banknote={detailedBanknote}
                            source="catalog"
                          />
                        );
                      })}
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
