
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceItem as MarketplaceItemType } from "@/types";
import { Filter, Search, SortAsc, X } from "lucide-react";
import MarketplaceItem from "@/components/marketplace/MarketplaceItem";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fetchMarketplaceItems } from "@/services/marketplaceService";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

const Marketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItemType[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("newest");
  
  // Load real marketplace data
  useEffect(() => {
    const loadMarketplaceItems = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch marketplace items");
        const items = await fetchMarketplaceItems();
        console.log("Fetched marketplace items:", items);
        
        if (items.length === 0) {
          console.log("No marketplace items found");
        }
        
        setMarketplaceItems(items);
        
        // Set initial price range based on actual items
        const maxItemPrice = Math.max(...items.map(item => item.collectionItem.salePrice || 0), 100);
        setPriceRange([0, maxItemPrice]);
        
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
      }
    };
    
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
    let results = marketplaceItems;
    
    // Only show available items
    results = results.filter(item => item.status === "Available");
    
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

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <section className="bg-dark-600 py-12 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-500/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center text-parchment-500 reveal fade-bottom">
            Marketplace
          </h1>
          <p className="mt-4 text-center text-ottoman-300 max-w-2xl mx-auto reveal fade-bottom">
            Browse and purchase Ottoman banknotes from fellow collectors
          </p>
          
          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto reveal fade-bottom">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search banknotes or sellers..."
                className="ottoman-input pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ottoman-400 hover:text-ottoman-300"
                onClick={() => setSearchTerm("")}
              >
                {searchTerm ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Marketplace Content */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          {/* Filter section */}
          <div className="mb-8 bg-dark-600/50 rounded-lg p-4 reveal fade-bottom">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif font-semibold text-ottoman-200">
                Filters & Sorting
              </h3>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ottoman-400 hover:text-ottoman-200"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-ottoman-700 text-ottoman-200 lg:hidden"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {isFilterExpanded ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>
            </div>
            
            <div className={cn("mt-4", isFilterExpanded || window.innerWidth >= 1024 ? 'block' : 'hidden lg:block')}>
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
                  <Button className="ottoman-button w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-ottoman-900/30">
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
          
          {/* Results header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 reveal fade-bottom">
            <p className="text-ottoman-300 mb-4 sm:mb-0">
              Showing <span className="font-semibold text-ottoman-100">{filteredItems.length}</span> items for sale
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
          
          {/* Marketplace items grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-20 reveal fade-bottom">
              <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                Error Loading Marketplace
              </h3>
              <p className="text-ottoman-400 mb-4">
                {error}
              </p>
              <Button 
                variant="outline" 
                className="mt-4 border-ottoman-700 text-ottoman-200"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className="reveal fade-bottom"
                  style={{ animationDelay: `100ms` }}
                >
                  <MarketplaceItem item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 reveal fade-bottom">
              <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                No marketplace items found
              </h3>
              <p className="text-ottoman-400">
                Try adjusting your search criteria or filters
              </p>
              <Button 
                variant="outline" 
                className="mt-4 border-ottoman-700 text-ottoman-200"
                onClick={resetFilters}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Marketplace;
