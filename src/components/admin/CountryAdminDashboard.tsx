
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BanknotesManagement from './BanknotesManagement';
import ImageSuggestions from './ImageSuggestions';
import CountryFilterSettings from './CountryFilterSettings';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CountryData } from '@/types';

interface BanknotesManagementProps {
  countryFilter?: string;
}

interface ImageSuggestionsProps {
  countryFilter?: string;
}

interface CountryFilterSettingsProps {
  countryId?: string;
}

const CountryAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('banknotes');
  const [adminCountry, setAdminCountry] = useState<CountryData | null>(null);

  useEffect(() => {
    if (user) {
      fetchAdminCountry();
    }
  }, [user]);

  const fetchAdminCountry = async () => {
    if (!user || !user.role_id) return;

    try {
      // First get the role details
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', user.role_id)
        .single();

      if (roleError) throw roleError;
      
      if (roleData) {
        // Extract country name from role name (remove ' Admin' suffix)
        const countryName = roleData.name.replace(' Admin', '');
        console.log('Country admin for:', countryName);
        
        // Get country details
        const { data: country, error: countryError } = await supabase
          .from('countries')
          .select('*')
          .eq('name', countryName)
          .single();

        if (countryError) {
          console.error('Error fetching country:', countryError);
          throw countryError;
        }
        
        setAdminCountry(country);
      }
    } catch (error) {
      console.error('Error fetching admin country:', error);
    }
  };

  if (!adminCountry) {
    return <div className="page-container p-8">Loading admin dashboard...</div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">{adminCountry.name} Admin Dashboard</h1>
      
      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="banknotes">Banknotes Management</TabsTrigger>
            <TabsTrigger value="images">Image Suggestions</TabsTrigger>
            <TabsTrigger value="filters">Filter Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="banknotes">
            <BanknotesManagement countryFilter={adminCountry.name} />
          </TabsContent>

          <TabsContent value="images">
            <ImageSuggestions countryFilter={adminCountry.name} />
          </TabsContent>

          <TabsContent value="filters">
            <CountryFilterSettings countryId={adminCountry.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CountryAdminDashboard;
