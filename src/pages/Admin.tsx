import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, Book, Image, Globe, Settings, Stamp, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserManagement from '@/components/admin/UserManagement';
import BanknotesManagement from '@/components/admin/BanknotesManagement';
import ImageSuggestions from '@/components/admin/ImageSuggestions';
import CountryManagement from '@/components/admin/CountryManagement';
import CountryFilterSettings from '@/components/admin/CountryFilterSettings';
import CountryAdminDashboard from '@/components/admin/CountryAdminDashboard';
import StampsManagement from '@/components/admin/StampsManagement';
import { AdminStatistics } from '@/components/admin/AdminStatistics';

const Admin = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['admin', 'common']);
  const [isCountryAdmin, setIsCountryAdmin] = useState<boolean>(false);
  const [countryAdminName, setCountryAdminName] = useState<string>("");
  const [countryId, setCountryId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>('users');
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      console.log("Checking admin status for user:", user.id, "Role ID:", user.role_id);
      
      if (user.role_id) {
        // First get the role details including is_country_admin flag
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('name, is_country_admin')
          .eq('id', user.role_id)
          .single();
          
        if (roleError) {
          console.error("Error fetching role:", roleError);
          setLoading(false);
          return;
        }
        
        if (!roleData) {
          console.error("No role data found");
          setLoading(false);
          return;
        }
        
        console.log('Role data:', roleData);
        
        const isAdmin = roleData.is_country_admin === true;
        console.log('Is country admin flag from database:', isAdmin);
        setIsCountryAdmin(isAdmin);
        
        // If they are a country admin, extract country name from role name and get country ID
        if (isAdmin) {
          const countryName = roleData.name.replace(' Admin', '');
          setCountryAdminName(countryName);
          
          // Get country ID for the country name
          const { data: countryData, error: countryError } = await supabase
            .from('countries')
            .select('id')
            .eq('name', countryName)
            .single();
            
          if (countryError) {
            console.error("Error fetching country:", countryError);
          } else if (countryData) {
            console.log("Country data:", countryData);
            setCountryId(countryData.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-2xl mx-auto text-center p-8">
          <p>{t('admin:loading')}</p>
        </div>
      </div>
    );
  }

  // Check if user has admin access
  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title"><span>{t('admin:title')}</span></h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4"><span>{t('admin:accessRestricted')}</span></h2>
            <p className="mb-6 text-muted-foreground">
              {t('admin:mustBeLoggedIn')}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if the user has any admin privileges
  const isSuperAdmin = user.role === 'Super Admin';
  
  console.log("Admin checks - isSuperAdmin:", isSuperAdmin, "isCountryAdmin:", isCountryAdmin);
  
  if (!isSuperAdmin && !isCountryAdmin) {
    console.log("User has no admin privileges:", user);
    return (
      <div className="page-container">
        <h1 className="page-title"><span>{t('admin:title')}</span></h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4"><span>{t('admin:accessRestricted')}</span></h2>
            <p className="mb-6 text-muted-foreground">
              {t('admin:administratorsOnly')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user is a country admin, show the country-specific dashboard
  if (isCountryAdmin && !isSuperAdmin && countryId) {
    console.log("Showing country admin dashboard for:", countryAdminName, "ID:", countryId);
    return <CountryAdminDashboard countryId={countryId} countryName={countryAdminName} />;
  }

  const handleGenerateCatalogPages = async () => {
    try {
      toast.loading('Generating catalog pages...');
      
      const { data, error } = await supabase.functions.invoke('generate-catalog-pages');
      
      if (error) throw error;
      
      toast.dismiss();
      toast.success(`Generated ${data?.generated || 0} catalog pages successfully!`);
      console.log('Catalog generation result:', data);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate catalog pages: ' + error.message);
      console.error('Error generating catalog pages:', error);
    }
  };

  // Full admin dashboard for super admins
  return (
    <div className="page-container mb-20">
      <h1 className="page-title"><span>{t('admin:dashboardTitle')}</span></h1>
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={handleGenerateCatalogPages} variant="outline">
            Generate Catalog Pages
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full">
            
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              {t('admin:tabs.users')}
            </TabsTrigger>
            <TabsTrigger value="banknotes">
              <Book className="mr-2 h-4 w-4" />
              {t('admin:tabs.banknotes')}
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <Image className="mr-2 h-4 w-4" />
              {t('admin:tabs.imageSuggestions')}
            </TabsTrigger>
            <TabsTrigger value="stamps">
              <Stamp className="mr-2 h-4 w-4" />
              {t('admin:tabs.stamps')}
            </TabsTrigger>
            <TabsTrigger value="countries">
              <Globe className="mr-2 h-4 w-4" />
              {t('admin:tabs.countries')}
            </TabsTrigger>
            <TabsTrigger value="filter-settings">
              <Settings className="mr-2 h-4 w-4" />
              {t('admin:tabs.filters')}
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t('admin:tabs.statistics')}
            </TabsTrigger>
          </TabsList>

         

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif"><span>{t('admin:sections.userManagement')}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement isSuperAdmin={isSuperAdmin} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="banknotes">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif"><span>{t('admin:sections.banknotesManagement')}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <BanknotesManagement />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif"><span>{t('admin:sections.imageSuggestions')}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <ImageSuggestions />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stamps">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif"><span>{t('admin:sections.stamps')}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <StampsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="countries">
            <CountryManagement />
          </TabsContent>

          <TabsContent value="filter-settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif"><span>{t('admin:sections.countryFilterSettings')}</span></CardTitle>
              </CardHeader>
              <CardContent>
                <CountryFilterSettings />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="statistics">
            <AdminStatistics />
          </TabsContent>
          
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
