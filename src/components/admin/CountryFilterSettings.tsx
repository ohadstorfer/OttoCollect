
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { fetchCountries } from "@/services/countryService";

import CategoriesManager from "./filter/CategoriesManager";
import TypesManager from "./filter/TypesManager";
import SortOptionsManager from "./filter/SortOptionsManager";

interface Country {
  id: string;
  name: string;
}

const CountryFilterSettings: React.FC = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("categories");
  
  useEffect(() => {
    const loadCountries = async () => {
      const countriesData = await fetchCountries();
      setCountries(countriesData);
      
      // Only set default country if none selected yet
      if (countriesData.length > 0 && !selectedCountryId) {
        setSelectedCountryId(countriesData[0].id);
      }
    };
    
    loadCountries();
  }, [selectedCountryId]);
  
  const handleCountryChange = (value: string) => {
    setSelectedCountryId(value);
  };

  return (
    <div>
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

      {selectedCountryId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="categories">
              Categories
            </TabsTrigger>
            <TabsTrigger value="types">
              Types
            </TabsTrigger>
            <TabsTrigger value="sort">
              Sort Options
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>
                  Categories for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
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
                  Types for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
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
                  Sort Options for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SortOptionsManager countryId={selectedCountryId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default CountryFilterSettings;
