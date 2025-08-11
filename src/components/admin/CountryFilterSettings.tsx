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
          <Label htmlFor="country-select" className="text-lg font-medium mb-2 block">
            Select Country
          </Label>
          <Select 
            value={selectedCountryId}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Select a country" />
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
              Categories
            </TabsTrigger>
            <TabsTrigger value="types">
              Types
            </TabsTrigger>
            <TabsTrigger value="sort">
              Sort Options
            </TabsTrigger>
            <TabsTrigger value="currencies">
              Currencies
            </TabsTrigger>
            {hasSultanSort && (
              <TabsTrigger value="sultans">
                Sultans
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span>Categories for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}</span>
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
                  <span>Types for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}</span>
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
                  <span>Sort Options for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}</span>
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
                  <span>Currencies for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}</span>
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
                    <span>Sultans for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}</span>
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
