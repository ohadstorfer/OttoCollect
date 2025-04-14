
import { useState, useEffect } from "react";
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
import { BanknoteFilter } from "@/components/filter/BanknoteFilter";
import { useBanknoteFilter } from "@/hooks/use-banknote-filter";

const Marketplace = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load real marketplace data
  const loadMarketplaceItems = async (showToast = false) => {
    console.log('Starting loadMarketplaceItems function');
    setLoading(true);
    setError(null);
    try {
      console.log("Starting to fetch marketplace items");
      
      // First, synchronize the marketplace with collection items
      if (user?.role === 'Admin') {
        console.log('User is admin, synchronizing marketplace with collection');
        await synchronizeMarketplaceWithCollection();
      }
      
      console.log('Calling fetchMarketplaceItems');
      const items = await fetchMarketplaceItems();
      console.log("Fetched marketplace items:", items);
      
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
  };
  
  useEffect(() => {
    console.log('Initial useEffect for loadMarketplaceItems running');
    loadMarketplaceItems();
  }, [toast]);
  
  // Transform marketplace items for the filter
  const marketplaceItemsForFilter = marketplaceItems.map(item => ({
    banknote: item.collectionItem.banknote,
    marketplaceItem: item
  }));
  
  // Use the banknote filter hook with default selected categories
  const { 
    filteredItems, 
    filters, 
    setFilters,
    availableCategories,
    availableTypes
  } = useBanknoteFilter({
    items: marketplaceItemsForFilter,
    initialFilters: {
      categories: ["First Kaime 1851-1861", "1893 War Banknote", "Imperial Ottoman Bank", "World War I banknotes"],
      sort: ["extPick"]
    }
  });

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    loadMarketplaceItems(true);
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
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
      
      {/* Marketplace Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Filter section */}
          <div className="sticky top-[64px] z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-4 pb-4 mb-6">
            <Card className={`${theme === 'light' ? 'bg-white/90 border-ottoman-200/70' : 'bg-dark-600/50 border-ottoman-900/30'}`}>
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

                <BanknoteFilter
                  categories={availableCategories}
                  availableTypes={availableTypes}
                  onFilterChange={setFilters}
                  isLoading={loading}
                  defaultSort={["extPick"]}
                  defaultCategories={["First Kaime 1851-1861", "1893 War Banknote", "Imperial Ottoman Bank", "World War I banknotes"]}
                  className="pb-0" // Remove padding to fit better in the card
                />
              </div>
            </Card>
          </div>
          
          {/* Results header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <p className={`${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} mb-4 sm:mb-0`}>
              Showing <span className={`font-semibold ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>{filteredItems.length}</span> items for sale
            </p>
          </div>
          
          {/* Content states */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Spinner size="lg" />
              <p className="dark:text-ottoman-300 text-ottoman-600">Loading marketplace items...</p>
            </div>
          ) : error ? (
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
          ) : filteredItems.length === 0 ? (
            <Card className="text-center py-20 dark:bg-dark-600/50 bg-white/90 dark:border-ottoman-900/30 border-ottoman-200/70">
              <h3 className="text-2xl font-serif font-semibold dark:text-ottoman-200 text-ottoman-800 mb-2">
                No Items Found
              </h3>
              <p className="dark:text-ottoman-400 text-ottoman-600 mb-6">
                { "There are currently no items available in the marketplace"}
              </p>
              <div className="space-x-4">
                <Button 
                  className="ottoman-button"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item: any, index) => (
                <div 
                  key={`marketplace-item-${index}`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <MarketplaceItem item={item.marketplaceItem} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Marketplace;
