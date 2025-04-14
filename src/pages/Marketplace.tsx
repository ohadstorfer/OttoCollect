import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceItem as MarketplaceItemType } from "@/types";
import { Filter, Search, SortAsc, X, AlertCircle, RefreshCw } from "lucide-react";
import MarketplaceItem from "@/components/marketplace/MarketplaceItem";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fetchMarketplaceItems, synchronizeMarketplaceWithCollection } from "@/services/marketplaceService";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

const Marketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItemType[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("newest");
  
  // Load real marketplace data
  const loadMarketplaceItems = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Starting to fetch marketplace items");
      
      // First, synchronize the marketplace with collection items
      if (user?.role === 'Admin') {
        await synchronizeMarketplaceWithCollection();
      }
      
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
      
      setMarketplaceItems(items);
      
      // Set initial price range based on actual items
      if (items.length > 0) {
        const maxItemPrice = Math.max(...items.map(item => item.collectionItem.salePrice || 0), 100);
        setPriceRange([0, maxItemPrice]);
      }
      
    } catch (err) {
      console.error("Error loading marketplace items:", err);
      setError("Failed to load marketplace items. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to load marketplace items. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadMarketplaceItems();
  }, [toast]);
  
  // Get unique countries from the marketplace items
  const countries = Array.from(
    new Set(marketplaceItems.map(item => item.collectionItem.banknote.country))
  ).sort();
  
  // Get max price for range slider
  const maxPrice = Math.max(
    ...marketplaceItems.map(item => item.collectionItem.salePrice || 0),
    1000
  );
  
  // Filter items when search or filters change
  useEffect(() => {
    console.log("Filtering with marketplaceItems:", marketplaceItems);
    let results = [...marketplaceItems]; // Make a copy of the items
    
    // Only show available items
    results = results.filter(item => item.status === "Available");
    console.log("After available filter:", results);
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(
        item => {
          const banknote = item.collectionItem.banknote;
          return (
            banknote.catalogId.toLowerCase().includes(lowerSearchTerm) ||
            banknote.country.toLowerCase().includes(lowerSearchTerm) ||
            banknote.denomination.toLowerCase().includes(lowerSearchTerm) ||
            banknote.year.toLowerCase().includes(lowerSearchTerm) ||
            item.seller.username.toLowerCase().includes(lowerSearchTerm)
          );
        }
      );
    }
    
    // Apply country filter
    if (selectedCountry && selectedCountry !== "all") {
      results = results.filter(
        item => item.collectionItem.banknote.country === selectedCountry
      );
    }
    
    // Apply condition filter
    if (selectedCondition && selectedCondition !== "all") {
      results = results.filter(
        item => item.collectionItem.condition === selectedCondition
      );
    }
    
    // Apply price filter
    results = results.filter(
      item => {
        const price = item.collectionItem.salePrice || 0;
        return price >= priceRange[0] && price <= priceRange[1];
      }
    );
    
    // Apply sorting
    switch (sortBy) {
      case "price-asc":
        results.sort((a, b) => 
          (a.collectionItem.salePrice || 0) - (b.collectionItem.salePrice || 0)
        );
        break;
      case "price-desc":
        results.sort((a, b) => 
          (b.collectionItem.salePrice || 0) - (a.collectionItem.salePrice || 0)
        );
        break;
      case "newest":
        results.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        results.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
    }
    
    console.log(`Filtering marketplace items: ${results.length} items match filters`);
    setFilteredItems(results);
  }, [searchTerm, selectedCountry, selectedCondition, priceRange, sortBy, marketplaceItems]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedCondition("all");
    setPriceRange([0, maxPrice]);
    setSortBy("newest");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMarketplaceItems(true);
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <section className="bg-dark-600 dark:bg-dark-600 bg-ottoman-100 py-12 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] dark:bg-dark-500/40 bg-ottoman-500/10 shadow-xl dark:shadow-ottoman-900/20 shadow-ottoman-300/20 ring-1 ring-inset dark:ring-ottoman-900/10 ring-ottoman-400/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center dark:text-parchment-500 text-ottoman-900 fade-bottom">
            Marketplace
          </h1>
          <p className="mt-4 text-center dark:text-ottoman-300 text-ottoman-700 max-w-2xl mx-auto fade-bottom">
            Browse and purchase Ottoman banknotes from fellow collectors
          </p>
          
          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto reveal fade-bottom">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search banknotes or sellers..."
                className="ottoman-input pr-10 dark:bg-white/10 bg-white/80 dark:text-white text-ottoman-900 placeholder:dark:text-gray-400 placeholder:text-ottoman-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-gray-300 text-ottoman-500 dark:hover:text-white hover:text-ottoman-900"
                onClick={() => setSearchTerm("")}
              >
                {searchTerm ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Marketplace Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Filter section */}
          <Card className="mb-8 dark:bg-dark-600/50 bg-white/90 dark:border-ottoman-900/30 border-ottoman-200/70">
            <div className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-serif font-semibold dark:text-ottoman-200 text-ottoman-800">
                  Filters & Sorting
                </h3>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="dark:text-ottoman-400 text-ottoman-500 dark:hover:text-ottoman-200 hover:text-ottoman-900"
                    onClick={resetFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="dark:border-ottoman-700 border-ottoman-300 dark:text-ottoman-200 text-ottoman-800 lg:hidden"
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {isFilterExpanded ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>
              </div>
              
              <div className={cn(
                "mt-4",
                !isFilterExpanded && "hidden lg:block"
              )}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-ottoman-300 mb-1 block">
                      Country
                    </label>
                    <Select 
                      value={selectedCountry} 
                      onValueChange={setSelectedCountry}
                    >
                      <SelectTrigger className="ottoman-input">
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-ottoman-300 mb-1 block">
                      Condition
                    </label>
                    <Select 
                      value={selectedCondition} 
                      onValueChange={setSelectedCondition}
                    >
                      <SelectTrigger className="ottoman-input">
                        <SelectValue placeholder="Any Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Condition</SelectItem>
                        <SelectItem value="UNC">UNC</SelectItem>
                        <SelectItem value="AU">AU</SelectItem>
                        <SelectItem value="XF">XF</SelectItem>
                        <SelectItem value="VF">VF</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="VG">VG</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-ottoman-300 mb-1 block">
                      Sort By
                    </label>
                    <Select 
                      value={sortBy} 
                      onValueChange={setSortBy}
                    >
                      <SelectTrigger className="ottoman-input">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      className="ottoman-button w-full"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
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
                
                <div className="pt-4 border-t dark:border-ottoman-900/30 border-ottoman-200/70">
                  <label className="text-sm font-medium text-ottoman-300 mb-3 block">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={maxPrice}
                    step={10}
                    className="my-6"
                    onValueChange={setPriceRange}
                  />
                </div>
              </div>
            </div>
          </Card>
          
          {/* Results header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <p className="dark:text-ottoman-300 text-ottoman-700 mb-4 sm:mb-0">
              Showing <span className="font-semibold dark:text-ottoman-100 text-ottoman-900">{filteredItems.length}</span> items for sale
            </p>
            
            {user && (
              <Link to="/collection?filter=forsale">
                <Button className="ottoman-button">
                  <SortAsc className="h-4 w-4 mr-2" />
                  My Listings
                </Button>
              </Link>
            )}
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
                {searchTerm || selectedCountry !== "all" || selectedCondition !== "all" || priceRange[0] > 0 || priceRange[1] < maxPrice
                  ? "Try adjusting your search criteria or filters"
                  : "There are currently no items available in the marketplace"}
              </p>
              <div className="space-x-4">
                <Button 
                  variant="outline" 
                  className="dark:border-ottoman-700 border-ottoman-300 dark:text-ottoman-200 text-ottoman-800"
                  onClick={resetFilters}
                >
                  Clear All Filters
                </Button>
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
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <MarketplaceItem item={item} />
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
