
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
import { supabase } from "@/integrations/supabase/client";

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

  const [currencies, setCurrencies] = useState<{ id: string, name: string, display_order: number }[]>([]);

  const [sortFields, setSortFields] = useState<{ name: string; display_order: number }[]>([]);
  const [activeSortOptionId, setActiveSortOptionId] = useState<string>("");

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
        
        // Check if we have sort fields from the server
        if (data.length > 0 && data[0]._sortFields) {
          console.log("Server provided sort fields:", data[0]._sortFields);
          setSortFields(data[0]._sortFields);
        }
        
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

  // Function to get the display order for a value from server-provided sort fields
  const getDisplayOrderFromSortFields = (value: string | undefined): number => {
    if (!value || sortFields.length === 0) {
      return Number.MAX_SAFE_INTEGER; // Default to the end if no match
    }

    // Normalize the input value for comparison
    const normalizedValue = value.trim().toLowerCase();
    
    // First try exact match
    const exactMatch = sortFields.find(field => 
      field.name.trim().toLowerCase() === normalizedValue
    );
    
    if (exactMatch) {
      console.log(`Found exact display order for "${value}": ${exactMatch.display_order}`);
      return exactMatch.display_order;
    }
    
    // Then try partial matches
    for (const field of sortFields) {
      const fieldNameLower = field.name.trim().toLowerCase();
      if (normalizedValue.includes(fieldNameLower) || fieldNameLower.includes(normalizedValue)) {
        console.log(`Found partial match display order for "${value}" with "${field.name}": ${field.display_order}`);
        return field.display_order;
      }
    }
    
    console.log(`No display order found for "${value}" in sort fields, using MAX_SAFE_INTEGER`);
    return Number.MAX_SAFE_INTEGER;
  };

  // Function to get currency display order from the currencies list
  const getCurrencyOrder = (denomination: string | undefined) => {
    if (!denomination || currencies.length === 0) return Number.MAX_SAFE_INTEGER;
    const currencyObj = currencies.find(
      c => denomination.toLowerCase().includes(c.name.toLowerCase())
    );
    return currencyObj ? currencyObj.display_order : Number.MAX_SAFE_INTEGER;
  };

  // Parse face value for sorting
  const parseFaceValue = (denomination: string | undefined) => {
    if (!denomination) return NaN;
    const match = denomination.match(/(\d+(\.\d+)?)/);
    if (match) {
      return parseFloat(match[0]);
    }
    return NaN;
  };

  // GroupedItems implementation using server-provided sort fields
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

        // Sort items within each sultan group using display_order
        const sultanGroups = Array.from(sultanMap.entries())
          .map(([sultan, items]) => ({
            sultan,
            items: [...items].sort((a, b) => {
              // Primary sort by the selected sort field
              const primarySort = filters.sort?.[0];
              let aField = "";
              let bField = "";
              
              if (primarySort === "faceValue" || primarySort === "currency" || primarySort === "denomination") {
                aField = a.denomination || a.face_value || "";
                bField = b.denomination || b.face_value || "";
              } else {
                aField = a[primarySort] || "";
                bField = b[primarySort] || "";
              }
              
              const aOrder = getDisplayOrderFromSortFields(aField);
              const bOrder = getDisplayOrderFromSortFields(bField);
              
              if (aOrder !== bOrder) {
                return aOrder - bOrder;
              }
              
              // Secondary sort by currency
              const aOrder2 = getCurrencyOrder(a.denomination || a.face_value);
              const bOrder2 = getCurrencyOrder(b.denomination || b.face_value);
              if (aOrder2 !== bOrder2) return aOrder2 - bOrder2;

              // Tertiary sort by face value
              const aVal = parseFaceValue(a.denomination || a.face_value);
              const bVal = parseFaceValue(b.denomination || b.face_value);
              if (!isNaN(aVal) && !isNaN(bVal)) return aVal - bVal;
              
              return (a.denomination || a.face_value || "").localeCompare(b.denomination || b.face_value || "");
            })
          }));
        
        // Sort sultan groups by display_order from sort_fields
        sultanGroups.sort((a, b) => {
          const aOrder = getDisplayOrderFromSortFields(a.sultan);
          const bOrder = getDisplayOrderFromSortFields(b.sultan);
          
          if (aOrder !== bOrder) {
            console.log(`Sorting sultan groups: ${a.sultan} (${aOrder}) vs ${b.sultan} (${bOrder})`);
            return aOrder - bOrder;
          }
          
          return a.sultan.localeCompare(b.sultan);
        });

        group.sultanGroups = sultanGroups;
      });
    }

    const groupArray = Array.from(categoryMap.values());

    // Sort categories by their display order
    if (categoryOrder.length > 0) {
      groupArray.sort((a, b) => {
        const orderA = categoryOrder.find(c => c.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = categoryOrder.find(c => c.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      groupArray.sort((a, b) => a.category.localeCompare(b.category));
    }

    // Sort items within each category if not grouping by sultan
    if (!groupBySultan) {
      groupArray.forEach(group => {
        group.items = [...group.items].sort((a, b) => {
          // Primary sort by the selected sort field
          const primarySort = filters.sort?.[0];
          let aField = "";
          let bField = "";
          
          if (primarySort === "faceValue" || primarySort === "currency" || primarySort === "denomination") {
            aField = a.denomination || a.face_value || "";
            bField = b.denomination || b.face_value || "";
          } else if (primarySort === "sultan") {
            aField = a.sultanName || "";
            bField = b.sultanName || "";
          } else {
            aField = a[primarySort] || "";
            bField = b[primarySort] || "";
          }
          
          const aOrder = getDisplayOrderFromSortFields(aField);
          const bOrder = getDisplayOrderFromSortFields(bField);
          
          if (aOrder !== bOrder) {
            console.log(`Sorting ${aField} (${aOrder}) vs ${bField} (${bOrder})`);
            return aOrder - bOrder;
          }
          
          // Secondary sort by currency
          const aOrder2 = getCurrencyOrder(a.denomination || a.face_value);
          const bOrder2 = getCurrencyOrder(b.denomination || b.face_value);
          if (aOrder2 !== bOrder2) return aOrder2 - bOrder2;

          // Tertiary sort by face value
          const aVal = parseFaceValue(a.denomination || a.face_value);
          const bVal = parseFaceValue(b.denomination || b.face_value);
          if (!isNaN(aVal) && !isNaN(bVal)) return aVal - bVal;
          
          return (a.denomination || a.face_value || "").localeCompare(b.denomination || b.face_value || "");
        });
      });
    }

    return groupArray;
  }, [
    banknotes,
    filters.sort,
    categoryOrder,
    currencies,
    sortFields
  ]);

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
