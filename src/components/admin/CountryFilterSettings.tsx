import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { fetchCountries } from "@/services/countryService";
import { AdminComponentProps } from '@/types/admin';
import { supabase } from '@/integrations/supabase/client';

import CategoriesManager from "./filter/CategoriesManager";
import TypesManager from "./filter/TypesManager";
import SortOptionsManager from "./filter/SortOptionsManager";
import CurrenciesManager from "./filter/CurrenciesManager";
import SultansManager from "./filter/SultansManager";
import { fetchSortOptionsByCountryId } from "@/services/countryService";
import { useTranslation } from 'react-i18next';

interface Country {
  id: string;
  name: string;
}

interface CountryFilterSettingsProps extends AdminComponentProps {}

const CountryFilterSettings: React.FC<CountryFilterSettingsProps> = ({
  countryId: initialCountryId,
  isCountryAdmin,
  disableCountrySelect
}) => {
  const { t } = useTranslation(['admin']);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("categories");
  const [hasSultanSort, setHasSultanSort] = useState<boolean>(false);
  
  useEffect(() => {
    const loadCountries = async () => {
      if (isCountryAdmin && initialCountryId) {
        // For country admins, only fetch their assigned country
        const { data: country, error } = await supabase
          .from('countries')
          .select('*')
          .eq('id', initialCountryId)
          .single();
        
        if (!error && country) {
          setCountries([country]);
          setSelectedCountryId(country.id);
        }
      } else {
        // For super admins, fetch all countries
        const countriesData = await fetchCountries();
        setCountries(countriesData);
        
        if (countriesData.length > 0 && !selectedCountryId) {
          setSelectedCountryId(countriesData[0].id);
        }
      }
    };
    
    loadCountries();
  }, [initialCountryId, isCountryAdmin, selectedCountryId]);

  useEffect(() => {
    const checkSultanSort = async () => {
      if (selectedCountryId) {
        try {
          const sortOptions = await fetchSortOptionsByCountryId(selectedCountryId);
          const hasSultan = sortOptions.some(option => option.field_name === 'sultan');
          setHasSultanSort(hasSultan);
        } catch (error) {
          console.error('Error checking sultan sort option:', error);
          setHasSultanSort(false);
        }
      }
    };

    checkSultanSort();
  }, [selectedCountryId]);
  
  const handleCountryChange = (value: string) => {
    setSelectedCountryId(value);
  };

  return (
    <div>
      {!disableCountrySelect && (
        <div className="mb-6">
          
          <Select 
            value={selectedCountryId}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder={t('countryFilterSettings.selectCountryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCountryId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid ${hasSultanSort ? 'grid-cols-5' : 'grid-cols-4'} mb-6`}>
            <TabsTrigger value="categories">
              {t('countryFilterSettings.tabs.categories')}
            </TabsTrigger>
            <TabsTrigger value="types">
              {t('countryFilterSettings.tabs.types')}
            </TabsTrigger>
            <TabsTrigger value="sort">
              {t('countryFilterSettings.tabs.sortOptions')}
            </TabsTrigger>
            <TabsTrigger value="currencies">
              {t('countryFilterSettings.tabs.currencies')}
            </TabsTrigger>
            {hasSultanSort && (
              <TabsTrigger value="sultans">
                {t('countryFilterSettings.tabs.sultans')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>{t('countryFilterSettings.cardTitles.categoriesFor', { countryName: countries.find(c => c.id === selectedCountryId)?.name || t('countryFilterSettings.cardTitles.selectedCountry') })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoriesManager countryId={selectedCountryId} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="types">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>{t('countryFilterSettings.cardTitles.typesFor', { countryName: countries.find(c => c.id === selectedCountryId)?.name || t('countryFilterSettings.cardTitles.selectedCountry') })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TypesManager countryId={selectedCountryId} />
              </CardContent>
            </Card>
          </TabsContent>
          
          
          <TabsContent value="sort">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>{t('countryFilterSettings.cardTitles.sortOptionsFor', { countryName: countries.find(c => c.id === selectedCountryId)?.name || t('countryFilterSettings.cardTitles.selectedCountry') })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SortOptionsManager countryId={selectedCountryId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currencies">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>{t('countryFilterSettings.cardTitles.currenciesFor', { countryName: countries.find(c => c.id === selectedCountryId)?.name || t('countryFilterSettings.cardTitles.selectedCountry') })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CurrenciesManager countryId={selectedCountryId} />
              </CardContent>
            </Card>
          </TabsContent>

          {hasSultanSort && (
            <TabsContent value="sultans">
              <Card>
                <CardHeader>
                                  <CardTitle>
                  <span>{t('countryFilterSettings.cardTitles.sultansFor', { countryName: countries.find(c => c.id === selectedCountryId)?.name || t('countryFilterSettings.cardTitles.selectedCountry') })}</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                  <SultansManager countryId={selectedCountryId} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
        </Tabs>
      )}
    </div>
  );
};

export default CountryFilterSettings;
