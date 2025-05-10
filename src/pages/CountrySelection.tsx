
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCountries } from '@/services/countryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CountryData } from '@/types/filter';
import CountrySelectionHeader from '@/components/country/CountrySelectionHeader';

interface CountrySelectionProps {
  showHeader?: boolean;
  customTitle?: string;
  customDescription?: string;
  userId?: string;
  onCountrySelect?: (country: string) => void;
}

const CountrySelection: React.FC<CountrySelectionProps> = ({
  showHeader = true,
  customTitle,
  customDescription,
  userId,
  onCountrySelect
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');

  const {
    data: countries = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });

  // Filter countries based on search term
  const filteredCountries = React.useMemo(() => {
    if (!countries) return [];
    
    if (!searchTerm.trim()) return countries;
    
    const term = searchTerm.toLowerCase().trim();
    return countries.filter((country: CountryData) => 
      country.name.toLowerCase().includes(term)
    );
  }, [countries, searchTerm]);

  const handleCountrySelect = (country: string) => {
    if (onCountrySelect) {
      onCountrySelect(country);
    } else {
      // Original navigation behavior
      navigate(`/collectionNew/${country}`);
    }
  };

  // If we're in profile view with a userId, we don't need to check current user auth
  const needsAuth = !userId && !user;

  if (needsAuth) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Authentication Required</h2>
          <p className="mb-6 text-muted-foreground">
            Please sign in to view your collection.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <CountrySelectionHeader 
          title={customTitle}
          description={customDescription}
        />
      )}

      <div className="py-10">
        <div className="max-w-md mx-auto mb-4">
          <div className="relative">
            <Search className="mb-2 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Search by country name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-4 text-red-500">Error loading countries</h3>
            <p className="text-muted-foreground mb-6">Please try again later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6">
            {filteredCountries.map((country: CountryData) => (
              <Card 
                key={country.id}
                className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden dark:bg-dark-600 bg-white border-ottoman-200 dark:border-ottoman-800/50 cursor-pointer"
                onClick={() => handleCountrySelect(country.name)}
              >
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
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountrySelection;
