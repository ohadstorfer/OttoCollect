
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
import SEOHead from "@/components/seo/SEOHead";
import { SEO_CONFIG } from "@/config/seoConfig";
import { useTranslation } from "react-i18next";

const SULTAN_DISPLAY_ORDER: Record<string, number> = {
  AbdulMecid: 1,
  AbdulAziz: 2,
  Murad: 3,
  AbdulHamid: 4,
  "M.Resad": 5,
  "M.Vahdeddin": 6
};

const Marketplace = () => {

  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { t, i18n: i18nInstance } = useTranslation(['marketplace', 'pages']);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<FilterOption[]>([]);
  const [availableTypes, setAvailableTypes] = useState<FilterOption[]>([]);
  const [availableCountries, setAvailableCountries] = useState<FilterOption[]>([]);



  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Remove unnecessary translation reloading - handled by i18next automatically

  const loadMarketplaceItems = useCallback(async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {

      if (user?.role === 'Admin') {
        await synchronizeMarketplaceWithCollection();
      }

      const items = await fetchMarketplaceItems();


      if (items.length === 0) {
        if (showToast) {
          toast({
            title: tWithFallback('status.noItems', 'No Items Found'),
            description: tWithFallback('status.noItemsDescription', 'There are currently no items available in the marketplace'),
            variant: "default"
          });
        }
      }

      // Extract available categories, types, and countries from fetched items
      const categoryMap = new Map<string, FilterOption>();
      const typeMap = new Map<string, FilterOption>();
      const countryMap = new Map<string, FilterOption>();

      items.forEach(item => {
        const { series, type, country } = item.collectionItem?.banknote || {};

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

        // Process country
        if (country) {
          const id = country.toLowerCase().replace(/\s+/g, '-');
          countryMap.set(id, { id, name: country });
        }
      });

      // Update available filters
      setAvailableCategories(Array.from(categoryMap.values()));
      setAvailableTypes(Array.from(typeMap.values()));
      setAvailableCountries(Array.from(countryMap.values()));

      setMarketplaceItems(items);

    } catch (err) {
      console.error("Error loading marketplace items:", err);
      setError(tWithFallback('status.errorDescription', 'Failed to load marketplace items. Please try again later.'));
      toast({
        title: tWithFallback('status.error', 'Error loading marketplace items'),
        description: tWithFallback('status.errorDescription', 'Failed to load marketplace items. Please try again later.'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast, user?.role, t]);

  useEffect(() => {
   
    loadMarketplaceItems();
  }, [loadMarketplaceItems]);

  // Transform marketplace items to have the banknote property at the top level
  // This allows useBanknoteFilter to work correctly, while preserving collectionItem for price sorting
  const marketplaceItemsForFilter = useMemo(() => {
    return marketplaceItems.map(item => ({
      ...item,
      banknote: item.collectionItem?.banknote,
      collectionItem: item.collectionItem // Preserve collectionItem for price/date sorting
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
      sort: ["newest"] // Default to "Newest Listed" when no user preferences are loaded
    }
  });

  

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMarketplaceItems(true);
  };

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, [setFilters]);

  const loadingSection = useMemo(() => {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Spinner size="lg" />
        <p className="dark:text-ottoman-300 text-ottoman-600">{tWithFallback('status.loading', 'Loading marketplace items...')}</p>
      </div>
    );
  }, [t]);

  const errorSection = useMemo(() => {
    if (!error) return null;

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle><span>{tWithFallback('status.error', 'Error loading marketplace items')}</span></AlertTitle>
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            className="mt-4 dark:border-ottoman-700 border-ottoman-300 dark:text-ottoman-200 text-ottoman-800"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {tWithFallback('status.tryAgain', 'Try Again')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }, [error, handleRefresh, t]);

  const emptySection = useMemo(() => {
    return (
      <Card className="text-center py-20 dark:bg-dark-600/50 bg-white/90 dark:border-ottoman-900/30 border-ottoman-200/70">
        <h3 className="text-2xl font-serif font-semibold dark:text-ottoman-200 text-ottoman-800 mb-2">
          <span>{tWithFallback('status.noItems', 'No Items Found')}</span>
        </h3>
        <p className="dark:text-ottoman-400 text-ottoman-600 mb-6">
          {filters && (filters.categories?.length > 0 || filters.types?.length > 0 || filters.search || filters.countries?.length > 0 || filters.sort?.length > 0)
            ? tWithFallback('status.noItemsFiltered', 'No items match your current filters. Try adjusting your criteria.')
            : tWithFallback('status.noItemsDescription', 'There are currently no items available in the marketplace')}
        </p>
        <div className="space-x-4">
          <Button
            className="ottoman-button"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {tWithFallback('actions.refresh', 'Refresh')}
          </Button>
          {filters && (filters.categories?.length > 0 || filters.types?.length > 0 || filters.search || filters.countries?.length > 0 || filters.sort?.length > 0) && (
            <Button
              variant="outline"
              onClick={() => setFilters({ categories: [], types: [], search: "", sort: ["newest"], countries: [] })}
            >
              {tWithFallback('filters.clearFilters', 'Clear Filters')}
            </Button>
          )}
        </div>
      </Card>
    );
  }, [handleRefresh, filters, setFilters, t]);

  const marketplaceItemsSection = useMemo(() => {
  if (!filteredItems || filteredItems.length === 0) {
    return null;
  }

  // For marketplace, use filtered and sorted items directly (no grouping needed)
  const allItems = filteredItems;

  return (
    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {allItems.map((item, index) => (
        <div
          key={`marketplace-item-${index}`}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <MarketplaceItem item={item} />
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
      <SEOHead
        title={SEO_CONFIG.pages.marketplace.title}
        description={SEO_CONFIG.pages.marketplace.description}
        keywords={SEO_CONFIG.pages.marketplace.keywords}
      />
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
              ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
              : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            <span>{tWithFallback('title', 'Marketplace')}</span>
          </h1>
          <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
            {tWithFallback('subtitle', 'Browse and purchase Ottoman banknotes from fellow collectors')}
          </p>
        </div>
      </section>

      <div className="bg-card border rounded-lg mt-10 p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <section className="py-1">
          <div className="container mx-auto px-4">
              <BanknoteFilterMarketplace
                onFilterChange={handleFilterChange}
                currentFilters={filters}
                isLoading={loading}
                availableCategories={availableCategories}
                availableTypes={availableTypes}
                availableCountries={availableCountries}
              />
            
            {contentSection}
            
          </div>
        </section>
      </div>
    </div>
  );
};

export default Marketplace;
