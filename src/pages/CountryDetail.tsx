
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
  const { country } = useParams();
  const navigate = useNavigate();
  const decodedCountryName = decodeURIComponent(country || "");
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadBanknotes = async () => {
      setLoading(true);
      try {
        console.log(`Fetching banknotes for country: ${decodedCountryName}`);
        const data = await fetchBanknotes();
        
        // Filter banknotes for this country
        const countryBanknotes = data.filter(
          banknote => banknote.country === decodedCountryName
        );
        
        console.log(`Found ${countryBanknotes.length} banknotes for ${decodedCountryName}`);
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
      }
    };

    if (country) {
      loadBanknotes();
    }
  }, [country, decodedCountryName, toast]);

  // Use the banknote filter hook
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

  const handleBack = () => {
    navigate('/catalog');
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
        <BanknoteFilter
          categories={availableCategories}
          availableTypes={availableTypes}
          onFilterChange={setFilters}
          isLoading={loading}
          defaultSort={["extPick"]}
        />

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
                  <div className="sticky top-[168px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b">
                    <h2 className="text-xl font-bold">{group.category}</h2>
                  </div>
                  
                  {group.sultanGroups ? (
                    // If grouped by sultan
                    <div className="space-y-6">
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                            {sultanGroup.sultan}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sultanGroup.items.map((banknote, index) => (
                              <BanknoteDetailCard
                                key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                                banknote={banknote as DetailedBanknote}
                                source="catalog"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // If not grouped by sultan
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((banknote, index) => (
                        <BanknoteDetailCard
                          key={`banknote-${group.category}-${index}`}
                          banknote={banknote as DetailedBanknote}
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
