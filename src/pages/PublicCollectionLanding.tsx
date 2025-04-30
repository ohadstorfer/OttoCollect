import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SearchIcon, Loader2, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchUserCollectionCountries } from '@/services/collectionService';
import { supabase } from '@/integrations/supabase/client';

interface CountryCollectionStats {
  id: string;
  name: string;
  imageUrl?: string | null;
  itemCount: number;
}

const PublicCollectionLanding = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<CountryCollectionStats[]>([]);
  const [userName, setUserName] = useState<string>('User');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCollectionCountries = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const data = await fetchUserCollectionCountries(userId);
        // Sort countries alphabetically
        const sortedCountries = data.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sortedCountries);
        
        // Try to fetch the username
        const { data: userData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();
          
        if (userData?.username) {
          setUserName(userData.username);
        }
      } catch (error) {
        console.error('Error loading collection countries:', error);
        toast({
          title: 'Error',
          description: 'Failed to load collection. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadCollectionCountries();
  }, [userId, toast]);

  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountrySelect = (countryId: string, countryName: string) => {
    navigate(`/profile/${userId}/collection/country/${countryId}`, { 
      state: { countryName, userName } 
    });
  };
  
  const goBack = () => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="container py-8 animate-fade-in">
      <div className="bg-ottoman-100 dark:bg-dark-600 py-12 px-6 rounded-lg mb-8">
        <div className="flex items-center gap-2 mb-4 justify-center">
          <Button variant="ghost" onClick={goBack} size="icon" className="absolute left-8">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <User className="h-6 w-6 text-ottoman-600 dark:text-ottoman-300" />
          <h1 className="text-3xl md:text-4xl font-bold text-center text-ottoman-900 dark:text-parchment-500">
            {userName}'s Collection
          </h1>
        </div>
        <p className="mt-4 text-center text-ottoman-700 dark:text-ottoman-300 max-w-2xl mx-auto">
          Browse {userName}'s collection by country
        </p>
      </div>

      <div className="max-w-md mx-auto mb-6">
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
          <Loader2 className="h-12 w-12 animate-spin text-ottoman-600" />
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4 text-ottoman-900 dark:text-white">No countries found</h3>
          {countries.length === 0 ? (
            <p className="text-muted-foreground">
              This user's collection is empty.
            </p>
          ) : (
            <p className="text-muted-foreground">Try adjusting your search criteria.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6">
          {filteredCountries.map((country) => (
            <Card
              key={country.id}
              className="h-full cursor-pointer hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              onClick={() => handleCountrySelect(country.id, country.name)}
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                {country.imageUrl ? (
                  <img
                    src={country.imageUrl}
                    alt={country.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-ottoman-50 dark:bg-ottoman-100 flex items-center justify-center">
                    <span className="text-ottoman-500">{country.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-4 text-white w-full">
                    <h3 className="text-xl font-bold">{country.name}</h3>
                    <p className="text-sm opacity-80">{country.itemCount} banknote{country.itemCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicCollectionLanding;
