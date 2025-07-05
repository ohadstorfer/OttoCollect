import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BanknotesManagement from './BanknotesManagement';
import ImageSuggestions from './ImageSuggestions';
import CountryFilterSettings from './CountryFilterSettings';
import StampsManagement from './StampsManagement';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CountryData } from '@/types';

interface CountryAdminDashboardProps {
  countryId: string;
  countryName?: string;
}

const CountryAdminDashboard = ({ countryId, countryName }: CountryAdminDashboardProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('banknotes');
  const [adminCountry, setAdminCountry] = useState<CountryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (countryId) {
      fetchCountryData(countryId);
    } else {
      setLoading(false);
    }
  }, [countryId]);

  const fetchCountryData = async (id: string) => {
    try {
      setLoading(true);
      console.log("Fetching country data for ID:", id);
      
      // Get country details
      const { data: country, error: countryError } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .single();

      if (countryError) {
        console.error('Error fetching country:', countryError);
        throw countryError;
      }
      
      console.log("Country data retrieved:", country);
      setAdminCountry(country);
    } catch (error) {
      console.error('Error fetching admin country:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container p-8">Loading admin dashboard...</div>;
  }

  if (!adminCountry) {
    return (
      <div className="page-container p-8">
        <h2 className="text-xl"><span>Unable to load country data for admin dashboard</span></h2>
        <p className="text-muted-foreground mt-2">Please contact support if this issue persists.</p>
      </div>
    );
  }

  const displayName = countryName || adminCountry.name;

  return (
    <div className="page-container">
      <h1 className="page-title"><span>{displayName} Admin Dashboard</span></h1>
      
      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="banknotes">Banknotes Management</TabsTrigger>
            <TabsTrigger value="images">Image Suggestions</TabsTrigger>
            <TabsTrigger value="stamps">Stamps Management</TabsTrigger>
            <TabsTrigger value="filters">Filter Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="banknotes">
            <Card>
              <CardHeader>
                <CardTitle><span>Banknotes Management</span></CardTitle>
              </CardHeader>
              <CardContent>
                <BanknotesManagement 
                  countryId={countryId}
                  countryName={adminCountry.name}
                  isCountryAdmin={true}
                  disableCountrySelect={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle><span>Image Suggestions</span></CardTitle>
              </CardHeader>
              <CardContent>
                <ImageSuggestions 
                  countryId={countryId}
                  countryName={adminCountry.name}
                  isCountryAdmin={true}
                  disableCountrySelect={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stamps">
            <Card>
              <CardHeader>
                <CardTitle><span>Stamps Management</span></CardTitle>
              </CardHeader>
              <CardContent>
                <StampsManagement 
                  countryId={countryId}
                  countryName={adminCountry?.name}
                  isCountryAdmin={true}
                  disableCountrySelect={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters">
            <Card>
              <CardHeader>
                <CardTitle><span>Country Filter Settings</span></CardTitle>
              </CardHeader>
              <CardContent>
                <CountryFilterSettings 
                  countryId={adminCountry.id}
                  isCountryAdmin={true}
                  disableCountrySelect={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CountryAdminDashboard;
