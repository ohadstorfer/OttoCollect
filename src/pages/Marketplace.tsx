
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MarketplaceItem as MarketplaceItemType } from "@/types";
import { SortAsc, AlertCircle, RefreshCw } from "lucide-react";
import MarketplaceItem from "@/components/marketplace/MarketplaceItem";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { fetchMarketplaceItems, synchronizeMarketplaceWithCollection } from "@/services/marketplaceService";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { BanknoteFilterMarketplace } from "@/components/filter/BanknoteFilterMarketplace";
import { useBanknoteFilter } from "@/hooks/use-banknote-filter";
import { FilterOption } from "@/components/filter/BaseBanknoteFilter";

const SULTAN_DISPLAY_ORDER: Record<string, number> = {
  AbdulMecid: 1,
  AbdulAziz: 2,
  Murad: 3,
  AbdulHamid: 4,
  "M.Resad": 5,
  "M.Vahdeddin": 6
};

const Marketplace = () => {
  console.log("### Marketplace RENDERING ###");
  
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<FilterOption[]>([]);
  const [availableTypes, setAvailableTypes] = useState<FilterOption[]>([]);

  const loadMarketplaceItems = useCallback(async (showToast = false) => {
    console.log('Starting loadMarketplaceItems function');
    setLoading(true);
    setError(null);
    try {
      console.log("Starting to fetch marketplace items");
      
      if (user?.role === 'Admin') {
        console.log('User is admin, synchronizing marketplace with collection');
        await synchronizeMarketplaceWithCollection();
      }
      
      console.log('Calling fetchMarketplaceItems');
      const items = await fetchMarketplaceItems();
      console.log("Fetched marketplace items:", items.length);
      console.log("Sample marketplace item:", items.length > 0 ? items[0] : "No items");
      
      if (items.length === 0) {
        console.log("No marketplace items found");
        if (showToast) {
          toast({
            title: "No Items Found",
            description: "There are currently no items available in the marketplace.",
            variant: "default"
          });
        }
      }
      
      // Extract available categories and types from fetched items
      const categoryMap = new Map<string, FilterOption>();
      const typeMap = new Map<string, FilterOption>();
      
      items.forEach(item => {
        const { series, type } = item.collectionItem?.banknote || {};
        
        // Process category (series)
        if (series) {
          const id = series.toLowerCase().replace(/\s+/g, '-');
          categoryMap.set(id, { id, name: series });
        }
        
        // Process type
        if (type) {
          const id = type.toLowerCase().replace(/\s+/g, '-');
          typeMap.set(id, { id, name: type });
        }
      });
      
      // Update available filters
      setAvailableCategories(Array.from(categoryMap.values()));
      setAvailableTypes(Array.from(typeMap.values()));
      
      console.log('Setting marketplace items in state');
      setMarketplaceItems(items);
      
    } catch (err) {
      console.error("Error loading marketplace items:", err);
      setError("Failed to load marketplace items. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load marketplace items. Please try again later.",
        variant: "destructive"
      });
    } finally {
      console.log('Finishing loadMarketplaceItems, setting loading to false');
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast, user?.role]);
  
  useEffect(() => {
    console.log('Initial useEffect for loadMarketplaceItems running');
    loadMarketplaceItems();
  }, [loadMarketplaceItems]);
  
  // Transform marketplace items to have the banknote property at the top level
  // This allows useBanknoteFilter to work correctly
  const marketplaceItemsForFilter = useMemo(() => {
    return marketplaceItems.map(item => ({
      ...item,
      banknote: item.collectionItem?.banknote
    }));
  }, [marketplaceItems]);

  const { 
    filteredItems, 
    filters, 
    setFilters,
    groupedItems
  } = useBanknoteFilter({
    items: marketplaceItemsForFilter,
    initialFilters: {
      sort: ["extPick"]
    }
  });

  // Log the current state to debug items filtering
  useEffect(() => {
    console.log("Current marketplace state:", {
      itemsCount: marketplaceItems.length,
      filteredItemsCount: filteredItems.length,
      currentFilters: filters,
      groupedItemsCount: groupedItems.length
    });
  }, [marketplaceItems, filteredItems, filters, groupedItems]);

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    loadMarketplaceItems(true);
  };

  const handleFilterChange = useCallback((newFilters: any) => {
    console.log("Filter changed in Marketplace:", newFilters);
    setFilters(newFilters);
  }, [setFilters]);

  // Memoize components to avoid unnecessary re-renders
  const filterSection = useMemo(() => {
    return (
      <Card className={`mb-8 ${theme === 'light' ? 'bg-white/90 border-ottoman-200/70' : 'bg-dark-600/50 border-ottoman-900/30'} sticky top-[64px] z-50`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-serif font-semibold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>
              Filters & Sorting
            </h3>
            
            <div className="flex items-center gap-3">
              {user && (
                <Link to="/collection?filter=forsale">
                  <Button className="ottoman-button">
                    <SortAsc className="h-4 w-4 mr-2" />
                    My Listings
                  </Button>
                </Link>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={theme === 'light' ? 'border-ottoman-300 text-ottoman-800' : 'border-ottoman-700 text-ottoman-200'}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          <BanknoteFilterMarketplace
            onFilterChange={handleFilterChange}
            currentFilters={filters}
            isLoading={loading}
            availableCategories={availableCategories}
            availableTypes={availableTypes}
          />
        </div>
      </Card>
    );
  }, [theme, user, handleRefresh, isRefreshing, handleFilterChange, filters, loading, availableCategories, availableTypes]);

  const resultsSection = useMemo(() => {
    return (
      <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} mb-4 sm:mb-0`}>
        Showing <span className={`font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>
          {filteredItems.length}
        </span> items for sale
      </p>
    );
  }, [theme, filteredItems.length]);

  const loadingSection = useMemo(() => {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Spinner size="lg" />
        <p className="dark:text-ottoman-300 text-ottoman-600">Loading marketplace items...</p>
      </div>
    );
  }, []);

  const errorSection = useMemo(() => {
    if (!error) return null;
    
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            className="mt-4 dark:border-ottoman-700 border-ottoman-300 dark:text-ottoman-200 text-ottoman-800"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }, [error, handleRefresh]);

  const emptySection = useMemo(() => {
    return (
      <Card className="text-center py-20 dark:bg-dark-600/50 bg-white/90 dark:border-ottoman-900/30 border-ottoman-200/70">
        <h3 className="text-2xl font-serif font-semibold dark:text-ottoman-200 text-ottoman-800 mb-2">
          No Items Found
        </h3>
        <p className="dark:text-ottoman-400 text-ottoman-600 mb-6">
          {filters && (filters.categories?.length > 0 || filters.types?.length > 0 || filters.search) 
            ? "No items match your current filters. Try adjusting your criteria."
            : "There are currently no items available in the marketplace"}
        </p>
        <div className="space-x-4">
          <Button 
            className="ottoman-button"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {filters && (filters.categories?.length > 0 || filters.types?.length > 0 || filters.search) && (
            <Button 
              variant="outline" 
              onClick={() => setFilters({ categories: [], types: [], search: "", sort: ["extPick"] })}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>
    );
  }, [handleRefresh, filters, setFilters]);

  const marketplaceItemsSection = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) {
      return null;
    }

    return (
      <div className="space-y-8">
        {groupedItems.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="space-y-4">
            <div className="sticky top-[168px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b">
              <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-200'}`}>
                {group.category}
              </h2>
            </div>

            {group.sultanGroups ? (
              <div className="space-y-6">
                {[...group.sultanGroups]
                  .sort((a, b) => {
                    const orderA = SULTAN_DISPLAY_ORDER[a.sultan] ?? 999;
                    const orderB = SULTAN_DISPLAY_ORDER[b.sultan] ?? 999;
                    if (orderA === orderB) {
                      return a.sultan.localeCompare(b.sultan);
                    }
                    return orderA - orderB;
                  })
                  .map((sultanGroup, sultanIndex) => (
                    <div key={`sultan-${sultanIndex}`} className="space-y-4">
                      <h3 className={`text-lg font-semibold pl-4 border-l-4 ${theme === 'light' ? 'border-ottoman-600 text-ottoman-700' : 'border-ottoman-400 text-ottoman-300'}`}>
                        {sultanGroup.sultan}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sultanGroup.items.map((item, index) => (
                          <div
                            key={`marketplace-item-${index}`}
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <MarketplaceItem item={item} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map((item, index) => (
                  <div
                    key={`marketplace-item-${index}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <MarketplaceItem item={item} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [groupedItems, theme, filteredItems]);

  const contentSection = useMemo(() => {
    if (loading) {
      return loadingSection;
    } else if (error) {
      return errorSection;
    } else if (!filteredItems || filteredItems.length === 0) {
      return emptySection;
    } else {
      return marketplaceItemsSection;
    }
  }, [loading, error, filteredItems, loadingSection, errorSection, emptySection, marketplaceItemsSection]);

  return (
    <div className="min-h-screen animate-fade-in">
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${
            theme === 'light'
              ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
              : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
          } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            Marketplace
          </h1>
          <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
            Browse and purchase Ottoman banknotes from fellow collectors
          </p>
        </div>
      </section>
      
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="flex-1">
              {filterSection}
            </div>
            <div className="flex items-center gap-3">
              {resultsSection}
            </div>
          </div>
          {contentSection}
        </div>
      </section>
    </div>
  );
};

export default Marketplace;
