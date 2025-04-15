
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { DetailedBanknote } from "@/types";
import { fetchBanknotes } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BanknoteFilter } from "@/components/filter/BanknoteFilter";
import { useBanknoteFilter } from "@/hooks/use-banknote-filter";

const CountryDetail = () => {
  console.log("### CountryDetail RENDERING ###");
  
  const { country } = useParams();
  const navigate = useNavigate();
  const decodedCountryName = decodeURIComponent(country || "");
  console.log(`Country from URL param: ${decodedCountryName}`);
  
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadBanknotes = async () => {
      console.log("Starting loadBanknotes for country:", decodedCountryName);
      setLoading(true);
      try {
        console.log(`Fetching banknotes for country: ${decodedCountryName}`);
        const data = await fetchBanknotes();
        
        // Filter banknotes for this country
        const countryBanknotes = data.filter(
          banknote => banknote.country === decodedCountryName
        );
        
        console.log(`Found ${countryBanknotes.length} banknotes for ${decodedCountryName}`);
        console.log("Sample banknote data:", countryBanknotes.length > 0 ? countryBanknotes[0] : "No banknotes");
        setBanknotes(countryBanknotes);
        
      } catch (error) {
        console.error("Error loading banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknotes. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        console.log("Banknote loading complete");
      }
    };

    if (country) {
      loadBanknotes();
    }
  }, [country, decodedCountryName, toast]);

  // Use the banknote filter hook
  console.log("Initializing useBanknoteFilter with banknotes:", banknotes.length);
  const { 
    filteredItems: filteredBanknotes,
    filters, 
    setFilters,
    availableCategories,
    availableTypes,
    groupedItems
  } = useBanknoteFilter({
    items: banknotes,
    initialFilters: {
      sort: ["extPick"] // Default sort by extended pick number
    }
  });
  
  console.log("useBanknoteFilter results:", {
    filteredBanknotes: filteredBanknotes.length,
    filters,
    availableCategories: availableCategories.length,
    availableTypes: availableTypes.length,
    groupedItems: groupedItems.length
  });

  const handleBack = () => {
    navigate('/catalog');
  };

  const handleFilterChange = (newFilters: any) => {
    console.log("Filter changed in CountryDetail:", newFilters);
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
        {console.log("Rendering BanknoteFilter with props:", {
          categoriesCount: availableCategories.length,
          typesCount: availableTypes.length,
          loading
        })}
        <BanknoteFilter
          categories={availableCategories}
          availableTypes={availableTypes}
          onFilterChange={handleFilterChange}
          isLoading={loading}
          defaultSort={["extPick"]}
        />

        <div className="mt-6">
          {console.log("Rendering content based on loading and filtered items:", {
            loading,
            filteredCount: filteredBanknotes.length
          })}
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
              {console.log(`Rendering ${groupedItems.length} grouped items`)}
              {groupedItems.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="space-y-4">
                  {console.log(`Rendering group ${groupIndex}: ${group.category} with ${group.items.length} items`)}
                  <div className="sticky top-[168px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b">
                    <h2 className="text-xl font-bold">{group.category}</h2>
                  </div>
                  
                  {group.sultanGroups ? (
                    // If grouped by sultan
                    <div className="space-y-6">
                      {console.log(`Rendering with sultan groups. ${group.sultanGroups.length} sultans`)}
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          {console.log(`Rendering sultan group ${sultanIndex}: ${sultanGroup.sultan} with ${sultanGroup.items.length} items`)}
                          <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                            {sultanGroup.sultan}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sultanGroup.items.map((banknote, index) => {
                              console.log(`Rendering banknote card for ${(banknote as any)?.catalogId || index}`);
                              return (
                                <BanknoteDetailCard
                                  key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                                  banknote={banknote as DetailedBanknote}
                                  source="catalog"
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // If not grouped by sultan
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {console.log(`Rendering without sultan groups. ${group.items.length} items directly`)}
                      {group.items.map((banknote, index) => {
                        console.log(`Rendering banknote card for ${(banknote as any)?.catalogId || index}`);
                        return (
                          <BanknoteDetailCard
                            key={`banknote-${group.category}-${index}`}
                            banknote={banknote as DetailedBanknote}
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
