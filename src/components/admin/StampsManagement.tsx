
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Country } from '@/types';
import { fetchCountries } from '@/services/countryService';
import { AdminComponentProps } from '@/types/admin';
import StampPicturesManager from './stamps/StampPicturesManager';

const StampsManagement: React.FC<AdminComponentProps> = ({
  countryId,
  countryName,
  isCountryAdmin = false,
  disableCountrySelect = false
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>(countryId || '');
  const [activeTab, setActiveTab] = useState<string>('signatures-front');

  useEffect(() => {
    if (!isCountryAdmin) {
      loadCountries();
    }
  }, [isCountryAdmin]);

  useEffect(() => {
    if (countryId) {
      setSelectedCountryId(countryId);
    }
  }, [countryId]);

  const loadCountries = async () => {
    try {
      const data = await fetchCountries();
      setCountries(data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  return (
    <div className="space-y-6">
      {!disableCountrySelect && !isCountryAdmin && (
        <div className="space-y-2">
          <Label htmlFor="country-select">Country</Label>
          <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a country..." />
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

      {isCountryAdmin && countryName && (
        <div>
          <Label>Managing stamps for: {countryName}</Label>
        </div>
      )}

      {selectedCountryId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="signatures-front">Front Signatures</TabsTrigger>
            <TabsTrigger value="signatures-back">Back Signatures</TabsTrigger>
            <TabsTrigger value="seals">Seals</TabsTrigger>
            <TabsTrigger value="watermarks">Watermarks</TabsTrigger>
            <TabsTrigger value="tughras">Tughras</TabsTrigger>
          </TabsList>

          <TabsContent value="signatures-front" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Front Signature Pictures</CardTitle>
              </CardHeader>
              <CardContent>
                <StampPicturesManager
                  stampType="signatures_front"
                  countryId={selectedCountryId}
                  disableCountrySelect={disableCountrySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures-back" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Back Signature Pictures</CardTitle>
              </CardHeader>
              <CardContent>
                <StampPicturesManager
                  stampType="signatures_back"
                  countryId={selectedCountryId}
                  disableCountrySelect={disableCountrySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Seal Pictures</CardTitle>
              </CardHeader>
              <CardContent>
                <StampPicturesManager
                  stampType="seal"
                  countryId={selectedCountryId}
                  disableCountrySelect={disableCountrySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watermarks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Watermark Pictures</CardTitle>
              </CardHeader>
              <CardContent>
                <StampPicturesManager
                  stampType="watermark"
                  countryId={selectedCountryId}
                  disableCountrySelect={disableCountrySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tughras" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tughra Pictures</CardTitle>
              </CardHeader>
              <CardContent>
                <StampPicturesManager
                  stampType="tughra"
                  countryId={selectedCountryId}
                  disableCountrySelect={disableCountrySelect}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedCountryId && !isCountryAdmin && (
        <div className="text-center py-8 text-muted-foreground">
          Please select a country to manage stamp images.
        </div>
      )}
    </div>
  );
};

export default StampsManagement;
