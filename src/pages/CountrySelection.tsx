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
import { fetchUserCollectionCountByCountry } from '@/services/collectionService';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

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
  const effectiveUserId = userId || user?.id;
  const { t, i18n } = useTranslation(['common']);
  const isArabic = i18n.language === 'ar';
  const isTurkish = i18n.language === 'tr';
  const { direction } = useLanguage();  
  // Fetch countries
  const {
    data: countries = [],
    isLoading: isLoadingCountries,
    error: countriesError,
  } = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });

  // Fetch collection counts with React Query
  const {
    data: collectionCounts = {},
    isLoading: isLoadingCounts,
  } = useQuery({
    queryKey: ['collectionCounts', effectiveUserId],
    queryFn: () => fetchUserCollectionCountByCountry(effectiveUserId!),
    enabled: !!effectiveUserId && countries.length > 0,
  });

  // Memoize filtered countries with counts
  const filteredCountries = React.useMemo(() => {
    if (!countries) return [];

    // First filter by collection count > 0
    const countriesWithCollections = countries.filter((country: CountryData) => {
      const count = collectionCounts[country.name] || 0;
      return count > 0;
    });

    // Then apply search filter if exists
    if (!searchTerm.trim()) return countriesWithCollections;

    const term = searchTerm.toLowerCase().trim();
    return countriesWithCollections.filter((country: CountryData) =>
      country.name.toLowerCase().includes(term)
    );
  }, [countries, collectionCounts, searchTerm]);

  const handleCountrySelect = (country: string) => {
    // Set the active tab to "collection" when navigating to a country collection
    sessionStorage.setItem('countryDetailActiveTab', 'collection');
    
    if (onCountrySelect) {
      onCountrySelect(country);
    } else {
      navigate(`/collectionNew/${country}`);
    }
  };

  const needsAuth = !userId && !user;

  if (needsAuth) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4"><span>{t('countrySelection.authenticationRequired')}</span></h2>
          <p className="mb-6 text-muted-foreground">
            {t('countrySelection.pleaseSignIn')}
          </p>
          <Button onClick={() => navigate('/auth')}>{t('countrySelection.signIn')}</Button>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingCountries || isLoadingCounts;

  return (
    <div>
      {/* {showHeader && (
        <CountrySelectionHeader 
          title={customTitle}
          description={customDescription}
        />
      )} */}

      <div className="  w-[90%] sm:w-[92%] mx-auto py-5 ">


        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
          </div>
        ) : countriesError ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-4 text-red-500">{t('countrySelection.errorLoadingCountries')}</h3>
            <p className="text-muted-foreground mb-6">{t('countrySelection.pleaseTryAgainLater')}</p>
          </div>
        ) : filteredCountries.length === 0 ? (
          <div className="text-center py-12">
            {searchTerm ? (
              // Search results empty state
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">
                    <span>{t('countrySelection.noCountriesFound')}</span>
                  </h3>
                  <p className="text-muted-foreground">
                    {t('countrySelection.noCountriesMatchSearch', { searchTerm })}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="mt-4"
                >
                  {t('countrySelection.clearSearch')}
                </Button>
              </div>
            ) : (
              // No collections empty state
              <div className="max-w-lg mx-auto">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-ottoman-100 dark:bg-ottoman-900 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <h3 className="text-xl font-medium mb-2">
                    {userId && userId !== user?.id ? (
                      <span>{t('countrySelection.noCollectionsYet')}</span>
                    ) : (
                      <span>{t('countrySelection.startYourCollectionJourney')}</span>
                    )}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {userId && userId !== user?.id ? (
                      t('countrySelection.collectorNoBanknotes')
                    ) : (
                      t('countrySelection.beginBuildingCollection')
                    )}
                  </p>
                </div>
                
                {(!userId || userId === user?.id) && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => navigate('/catalog')}
                      className="flex items-center gap-2"
                    >
                      <span>{t('countrySelection.browseCatalogues')}</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/marketplace')}
                      className="flex items-center gap-2"
                    >
                      <span>{t('countrySelection.visitMarketplace')}</span>
                    </Button>
                  </div>
                )}
                
                {userId && userId !== user?.id && (
                  <div className="text-sm text-muted-foreground">
                    <p>{t('countrySelection.checkBackLater')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 ">
            {filteredCountries.map((country: CountryData) => {
              const collectionCount = collectionCounts[country.name] || 0;
              return (
                <Card
                  key={country.id}
                  className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden dark:bg-dark-600 bg-white border-ottoman-200 dark:border-ottoman-800/50 cursor-pointer"
                  onClick={() => handleCountrySelect(country.name)}
                >
                  <div className="aspect-[4/2] overflow-hidden relative">
                    {country.imageUrl ? (
                      <img
                        src={country.imageUrl}
                        alt={country.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-ottoman-100 dark:bg-ottoman-100 bg-ottoman-50 flex items-center justify-center">
                        <span className="text-ottoman-500">
                          {isArabic && country.name_ar ? country.name_ar : 
                           isTurkish && country.name_tr ? country.name_tr : 
                           country.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                      <div className="w-full p-4 text-white bg-gradient-to-t from-black/70 to-transparent">
                      <h3 className={`text-xl font-bold !text-gray-200 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                      <span>
                            {isArabic && country.name_ar ? country.name_ar : 
                             isTurkish && country.name_tr ? country.name_tr : 
                             country.name}
                          </span>
                        </h3>
                        <p className={`text-sm opacity-80 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                          {collectionCount === 1 
                            ? t('countrySelection.banknote_one', { count: collectionCount })
                            : t('countrySelection.banknote_other', { count: collectionCount })
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountrySelection;
