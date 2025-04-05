
import { useState, useEffect } from "react";
import { MOCK_BANKNOTES, OTTOMAN_REGIONS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BanknoteCard from "@/components/banknotes/BanknoteCard";
import { Banknote } from "@/types";
import { Search, Filter, X, Plus } from "lucide-react";

const Catalog = () => {
  const [banknotes, setBanknotes] = useState<Banknote[]>(MOCK_BANKNOTES);
  const [filteredBanknotes, setFilteredBanknotes] = useState<Banknote[]>(MOCK_BANKNOTES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [currentTab, setCurrentTab] = useState("grid");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Get unique years from the banknotes
  const years = Array.from(new Set(MOCK_BANKNOTES.map(b => b.year)));

  // Filter banknotes when search or filters change
  useEffect(() => {
    let results = banknotes;
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(
        b => 
          b.catalogId.toLowerCase().includes(lowerSearchTerm) ||
          b.country.toLowerCase().includes(lowerSearchTerm) ||
          b.denomination.toLowerCase().includes(lowerSearchTerm) ||
          b.year.toLowerCase().includes(lowerSearchTerm) ||
          (b.description && b.description.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply country filter
    if (selectedCountry && selectedCountry !== "all") {
      results = results.filter(b => b.country === selectedCountry);
    }
    
    // Apply year filter
    if (selectedYear && selectedYear !== "all") {
      results = results.filter(b => b.year === selectedYear);
    }
    
    setFilteredBanknotes(results);
  }, [searchTerm, selectedCountry, selectedYear, banknotes]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCountry("all");
    setSelectedYear("all");
  };

  // Animation observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.reveal');
    hiddenElements.forEach(el => observer.observe(el));
    
    return () => {
      hiddenElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-500 animate-fade-in">
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
            Ottoman Empire Banknote Catalog
          </h1>
          <p className="mt-4 text-center text-ottoman-300 max-w-2xl mx-auto reveal fade-bottom" style={{ animationDelay: '100ms' }}>
            Explore our comprehensive collection of Ottoman banknotes spanning different regions and eras
          </p>
          
          {/* Search bar */}
          <div className="mt-8 max-w-2xl mx-auto reveal fade-bottom" style={{ animationDelay: '200ms' }}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by country, denomination, year, or catalog ID..."
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
      
      {/* Catalog Content */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          {/* Filter section */}
          <div className="mb-8 bg-dark-600/50 rounded-lg p-4 reveal fade-bottom">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif font-semibold text-ottoman-200">
                Filters
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
            
            <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 ${isFilterExpanded || window.innerWidth >= 1024 ? 'block' : 'hidden lg:block'}`}>
              <div>
                <label className="text-sm font-medium text-ottoman-300 mb-1 block">
                  Country/Region
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
                    {OTTOMAN_REGIONS.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-ottoman-300 mb-1 block">
                  Year
                </label>
                <Select 
                  value={selectedYear} 
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger className="ottoman-input">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
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
          </div>
          
          {/* Results header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 reveal fade-bottom">
            <p className="text-ottoman-300 mb-4 sm:mb-0">
              Showing <span className="font-semibold text-ottoman-100">{filteredBanknotes.length}</span> banknotes
            </p>
            
            <div className="flex items-center gap-4">
              <Tabs 
                value={currentTab} 
                onValueChange={setCurrentTab}
                className="inline-flex"
              >
                <TabsList>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button className="ottoman-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Banknote
              </Button>
            </div>
          </div>
          
          {/* Banknote grid/list */}
          <TabsContent value="grid" className="mt-0">
            {filteredBanknotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBanknotes.map((banknote, index) => (
                  <div 
                    key={banknote.id} 
                    className="reveal fade-bottom"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BanknoteCard banknote={banknote} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 reveal fade-bottom">
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  No banknotes found
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
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            {filteredBanknotes.length > 0 ? (
              <div className="bg-dark-600/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ottoman-800">
                      <th className="text-left py-4 px-6 text-ottoman-300 font-medium">Catalog ID</th>
                      <th className="text-left py-4 px-6 text-ottoman-300 font-medium">Country</th>
                      <th className="text-left py-4 px-6 text-ottoman-300 font-medium">Denomination</th>
                      <th className="text-left py-4 px-6 text-ottoman-300 font-medium">Year</th>
                      <th className="text-right py-4 px-6 text-ottoman-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBanknotes.map((banknote) => (
                      <tr 
                        key={banknote.id}
                        className="border-b border-ottoman-800/50 hover:bg-dark-500/40 transition-colors"
                      >
                        <td className="py-4 px-6 text-ottoman-200">{banknote.catalogId}</td>
                        <td className="py-4 px-6 text-ottoman-200">{banknote.country}</td>
                        <td className="py-4 px-6 text-ottoman-200">{banknote.denomination}</td>
                        <td className="py-4 px-6 text-ottoman-200">{banknote.year}</td>
                        <td className="py-4 px-6 text-right">
                          <Button variant="ghost" size="sm" className="text-ottoman-300 hover:text-ottoman-100 hover:bg-ottoman-700/50">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 reveal fade-bottom">
                <h3 className="text-2xl font-serif font-semibold text-ottoman-200 mb-2">
                  No banknotes found
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
          </TabsContent>
        </div>
      </section>
    </div>
  );
};

export default Catalog;
