
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Banknote, DetailedBanknote } from "@/types";
import { fetchBanknotes } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const CountryDetail = () => {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const decodedCountryName = decodeURIComponent(countryName || "");
  const [banknotes, setBanknotes] = useState<DetailedBanknote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("pick");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);

  // Filter options derived from banknotes
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);
  
  useEffect(() => {
    const loadBanknotes = async () => {
      setLoading(true);
      try {
        const data = await fetchBanknotes();
        
        // Filter banknotes for this country
        const countryBanknotes = data.filter(
          banknote => banknote.country === decodedCountryName
        );
        
        setBanknotes(countryBanknotes);
        
        // Extract unique types and rarities
        const types = new Set<string>();
        const rarities = new Set<string>();
        
        countryBanknotes.forEach(banknote => {
          if (banknote.series) types.add(banknote.series);
          // Assuming rarity might be in a property or derived from another field
          // This is placeholder logic - adjust based on your actual data structure
          if (banknote.obverseDescription && banknote.obverseDescription.includes("rare")) {
            rarities.add("Rare");
          } else if (banknote.obverseDescription && banknote.obverseDescription.includes("common")) {
            rarities.add("Common");
          } else {
            rarities.add("Standard");
          }
        });
        
        setAvailableTypes(Array.from(types));
        setAvailableRarities(Array.from(rarities));
        
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

    if (countryName) {
      loadBanknotes();
    }
  }, [countryName, decodedCountryName, toast]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleRarityToggle = (rarity: string) => {
    setSelectedRarities(prev => 
      prev.includes(rarity) 
        ? prev.filter(r => r !== rarity)
        : [...prev, rarity]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("pick");
    setSelectedTypes([]);
    setSelectedRarities([]);
  };

  const filteredBanknotes = banknotes
    .filter(banknote => {
      // Search query filter
      const matchesSearch = searchQuery
        ? banknote.catalogId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          banknote.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
          banknote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          banknote.year.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      
      // Type filter
      const matchesType = selectedTypes.length > 0
        ? banknote.series && selectedTypes.includes(banknote.series)
        : true;
      
      // Rarity filter - placeholder logic, adjust based on your data
      const banknoteRarity = banknote.obverseDescription?.includes("rare")
        ? "Rare"
        : banknote.obverseDescription?.includes("common")
          ? "Common"
          : "Standard";
      
      const matchesRarity = selectedRarities.length > 0
        ? selectedRarities.includes(banknoteRarity)
        : true;
      
      return matchesSearch && matchesType && matchesRarity;
    });

  const sortedBanknotes = [...filteredBanknotes].sort((a, b) => {
    switch (sortBy) {
      case "pick":
        return a.catalogId.localeCompare(b.catalogId);
      case "year":
        return a.year.localeCompare(b.year);
      case "denomination":
        return a.denomination.localeCompare(b.denomination);
      case "rarity":
        // Placeholder rarity sorting logic - adjust based on your data
        const rarityA = a.obverseDescription?.includes("rare") ? 3 : 
                       a.obverseDescription?.includes("common") ? 1 : 2;
        const rarityB = b.obverseDescription?.includes("rare") ? 3 : 
                       b.obverseDescription?.includes("common") ? 1 : 2;
        return rarityB - rarityA; // Higher rarity first
      default:
        return a.catalogId.localeCompare(b.catalogId);
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
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search" className="mb-2 block">Search</Label>
            <Input
              id="search"
              placeholder="Search banknotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full md:w-auto">
            <Label htmlFor="sortBy" className="mb-2 block">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pick">Pick #</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="denomination">Denomination</SelectItem>
                <SelectItem value="rarity">Rarity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile filters button */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filter Banknotes</SheetTitle>
                  <SheetDescription>
                    Apply filters to find specific banknotes.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6">
                  <div className="space-y-4">
                    {availableTypes.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Types</h3>
                        <div className="space-y-2">
                          {availableTypes.map(type => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`mobile-type-${type}`}
                                checked={selectedTypes.includes(type)}
                                onCheckedChange={() => handleTypeToggle(type)}
                              />
                              <label 
                                htmlFor={`mobile-type-${type}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {type}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {availableRarities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Rarities</h3>
                        <div className="space-y-2">
                          {availableRarities.map(rarity => (
                            <div key={rarity} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`mobile-rarity-${rarity}`}
                                checked={selectedRarities.includes(rarity)}
                                onCheckedChange={() => handleRarityToggle(rarity)}
                              />
                              <label 
                                htmlFor={`mobile-rarity-${rarity}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {rarity}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={clearFilters}
                      variant="outline" 
                      className="w-full mt-4"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          <Button 
            onClick={clearFilters}
            variant="outline" 
            className="gap-2 hidden md:flex"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>
        
        {/* Desktop filter sidebar */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 mt-6">
          <div className="space-y-6">
            {availableTypes.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Types</h3>
                <div className="space-y-2">
                  {availableTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      />
                      <label 
                        htmlFor={`type-${type}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {availableRarities.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Rarities</h3>
                <div className="space-y-2">
                  {availableRarities.map(rarity => (
                    <div key={rarity} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`rarity-${rarity}`}
                        checked={selectedRarities.includes(rarity)}
                        onCheckedChange={() => handleRarityToggle(rarity)}
                      />
                      <label 
                        htmlFor={`rarity-${rarity}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {rarity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : sortedBanknotes.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">No banknotes found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedBanknotes.map((banknote) => (
                  <BanknoteDetailCard
                    key={banknote.id}
                    banknote={banknote}
                    source="catalog"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile results (shown when filter sheet is closed) */}
        <div className="md:hidden mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : sortedBanknotes.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">No banknotes found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedBanknotes.map((banknote) => (
                <BanknoteDetailCard
                  key={banknote.id}
                  banknote={banknote}
                  source="catalog"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryDetail;
