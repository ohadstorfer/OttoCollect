
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { CountryData, CollectionItem } from "@/types";
import { fetchCountriesForCatalog } from "@/services/countryCatalogService";
import { fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext"; // <-- FIXED HERE
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";

const Catalog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const { user } = useAuth();
  const [userCollection, setUserCollection] = useState<CollectionItem[]>([]);

  useEffect(() => {
    const loadCountries = async () => {
      setLoading(true);
      try {
        const data = await fetchCountriesForCatalog();
        // Sort countries alphabetically
        const countriesArray = data.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setCountries(countriesArray);
      } catch (error) {
        console.error("Error loading countries:", error);
        toast({
          title: "Error",
          description: "Failed to load banknote catalog. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, [toast]);

  // Fetch user collection once user is signed in
  useEffect(() => {
    if (!user) {
      setUserCollection([]);
      return;
    }
    async function fetchCollection() {
      try {
        const items = await fetchUserCollection(user.id);
        setUserCollection(items);
      } catch (error) {
        setUserCollection([]);
      }
    }
    fetchCollection();
  }, [user]);

  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen animate-fade-in">
      <section className="bg-dark-600 dark:bg-dark-600 bg-ottoman-100 py-12 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] dark:bg-dark-500/40 bg-ottoman-500/10 shadow-xl dark:shadow-ottoman-900/20 shadow-ottoman-300/20 ring-1 ring-inset dark:ring-ottoman-900/10 ring-ottoman-400/10"
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-center dark:text-parchment-500 text-ottoman-900 fade-bottom">
          Ottoman Banknote Catalog
          </h1>
          <p className="mt-4 text-center dark:text-ottoman-300 text-ottoman-700 max-w-2xl mx-auto fade-bottom">
          Explore these notable Ottoman Empire banknotes from our extensive catalog
          </p>
        </div>
      </section>

      <div className="max-w-md mx-auto mb-4">
        <div className="relative">
          <SearchIcon className="mb-2 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
          <h3 className="text-xl font-medium mb-4 dark:text-white text-ottoman-900">No countries found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6">
          {filteredCountries.map((country) => (
            <Link to={`/catalog/${encodeURIComponent(country.name)}`} key={country.id}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden dark:bg-dark-600 bg-white border-ottoman-200 dark:border-ottoman-800/50">
                <div className="aspect-[4/3] overflow-hidden relative">
                  {country.imageUrl ? (
                    <img
                      src={country.imageUrl}
                      alt={country.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-ottoman-100 dark:bg-ottoman-100 bg-ottoman-50 flex items-center justify-center">
                      <span className="text-ottoman-500">{country.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div className="p-4 text-white w-full">
                      <h3 className="text-xl font-bold">{country.name}</h3>
                      <p className="text-sm opacity-80">{country.banknoteCount} banknotes</p>
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
