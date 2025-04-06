
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { fetchBanknotes } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { SearchIcon } from "lucide-react";

const Catalog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [banknotes, setBanknotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [countries, setCountries] = useState([]);

  // Fetch banknotes on component mount
  useEffect(() => {
    const loadBanknotes = async () => {
      setLoading(true);
      try {
        const data = await fetchBanknotes();
        setBanknotes(data);
        
        // Extract unique countries and count banknotes for each
        const countryMap = data.reduce((acc, banknote) => {
          if (!acc[banknote.country]) {
            acc[banknote.country] = {
              name: banknote.country,
              count: 0,
              imageUrl: null
            };
          }
          
          acc[banknote.country].count += 1;
          
          // Use the first banknote image as the country image if not set yet
          if (!acc[banknote.country].imageUrl && banknote.imageUrls && banknote.imageUrls.length > 0) {
            acc[banknote.country].imageUrl = banknote.imageUrls[0];
          }
          
          return acc;
        }, {});
        
        // Convert to array and sort by country name
        const countriesArray = Object.values(countryMap).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        setCountries(countriesArray);
      } catch (error) {
        console.error("Error loading banknotes:", error);
        toast({
          title: "Error",
          description: "Failed to load banknote catalog. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBanknotes();
  }, [toast]);

  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Ottoman Banknote Catalog</h1>

      
        <div className="max-w-md mx-auto mb-4">
          <Label htmlFor="search" className="mb-2 block">Search Countries</Label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Search by country name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4">No countries found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCountries.map((country) => (
            <Link to={`/catalog/${encodeURIComponent(country.name)}`} key={country.name}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden relative">
                  {country.imageUrl ? (
                    <img
                      src={country.imageUrl}
                      alt={country.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-ottoman-100 flex items-center justify-center">
                      <span className="text-ottoman-500">{country.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div className="p-4 text-white w-full">
                      <h3 className="text-xl font-bold">{country.name}</h3>
                      <p className="text-sm opacity-80">{country.count} banknotes</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
