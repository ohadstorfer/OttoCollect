
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Banknote, DetailedBanknote } from "@/types";
import { fetchBanknotes } from "@/services/banknoteService";
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
  
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryId, setCountryId] = useState<string>("");
  const { toast } = useToast();
  
  useEffect(() => {
    const loadCountryData = async () => {
      if (!decodedCountryName) return;
      
      try {
        // Fetch country ID
        const countryData = await fetchCountryByName(decodedCountryName);
        if (!countryData) {
          toast({
            title: "Error",
            description: `Country "${decodedCountryName}" not found.`,
            variant: "destructive",
          });
          navigate('/catalog');
          return;
        }
        
        setCountryId(countryData.id);
        
        // Fetch banknotes
        setLoading(true);
        const banknotesData = await fetchBanknotes();
        
        // Filter banknotes for this country
        const countryBanknotes = banknotesData.filter(
          banknote => banknote.country === decodedCountryName
        );
        
        // Add category and type IDs to banknotes for filtering
        const enhancedBanknotes = countryBanknotes.map(banknote => ({
          ...banknote,
          // These will be populated from the database eventually
          // Currently using the name to connect to database values
          categoryId: banknote.series,
          typeId: banknote.type || "Issued Notes"
        }));
        
        setBanknotes(enhancedBanknotes);
        
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCountryData();
  }, [decodedCountryName, navigate, toast]);

  // Default filters
  const [currentFilters, setCurrentFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
    country_id: countryId
  });

  // Update country_id when it changes
  useEffect(() => {
    if (countryId) {
      setCurrentFilters(prev => ({
        ...prev,
        country_id: countryId
      }));
    }
  }, [countryId]);

  // Use the dynamic filter hook
  const { 
    filteredItems: filteredBanknotes,
    filters,
    setFilters,
    groupedItems
  } = useDynamicFilter({
    items: banknotes,
    initialFilters: currentFilters,
    countryId,
    categories: [], // These will be fetched by the filter component
    types: [],      // These will be fetched by the filter component
    sortOptions: [] // These will be fetched by the filter component
  });

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    setCurrentFilters({
      ...currentFilters,
      ...newFilters
    });
    setFilters(newFilters);
  };

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
