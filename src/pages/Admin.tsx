import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, Book, Image, Globe, Settings } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import BanknotesManagement from '@/components/admin/BanknotesManagement';
import ImageSuggestions from '@/components/admin/ImageSuggestions';
import CountryManagement from '@/components/admin/CountryManagement';
import CountryFilterSettings from '@/components/admin/CountryFilterSettings';
import CountryAdminDashboard from '@/components/admin/CountryAdminDashboard';

const Admin = () => {
  const { user } = useAuth();
  const [isCountryAdmin, setIsCountryAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('users');
  
  useEffect(() => {
    if (user) {
      checkIfCountryAdmin();
    }
  }, [user]);

  const checkIfCountryAdmin = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('country_admins')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      setIsCountryAdmin(!!data);
    } catch (error) {
      console.error('Error checking country admin status:', error);
    }
  };

  // Check if user has admin access
  if (!user || (user?.role !== 'Super Admin' && user?.role !== 'Admin' && !isCountryAdmin)) {
    return (
      <div className="page-container">
        <h1 className="page-title">Admin</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Access Restricted</h2>
            <p className="mb-6 text-muted-foreground">
              This area is restricted to administrators only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user is a country admin, show the country-specific dashboard
  if (isCountryAdmin) {
    return <CountryAdminDashboard />;
  }

  // Otherwise show the full admin dashboard for super admins
  return (
    <div className="page-container">
      <h1 className="page-title">Admin Dashboard</h1>
      
      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="banknotes">
              <Book className="mr-2 h-4 w-4" />
              Banknotes Management
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <Image className="mr-2 h-4 w-4" />
              Image Suggestions
            </TabsTrigger>
            <TabsTrigger value="countries">
              <Globe className="mr-2 h-4 w-4" />
              Country Settings
            </TabsTrigger>
            <TabsTrigger value="filter-settings">
              <Settings className="mr-2 h-4 w-4" />
              Filter Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement isSuperAdmin={user?.role === 'Super Admin'} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="banknotes">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Banknotes Management</CardTitle>
              </CardHeader>
              <CardContent>
                <BanknotesManagement />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Image Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageSuggestions />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="countries">
            <CountryManagement />
          </TabsContent>

          <TabsContent value="filter-settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Country Filter Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <CountryFilterSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
