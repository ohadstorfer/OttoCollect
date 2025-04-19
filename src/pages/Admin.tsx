
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
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (user) {
      checkIfCountryAdmin();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkIfCountryAdmin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // If the user has a role_id, check if it's a country admin role
      if (user.role_id) {
        console.log("Checking role for user:", user.id, "Role ID:", user.role_id);
        
        const { data, error } = await supabase
          .from('roles')
          .select('name')
          .eq('id', user.role_id)
          .single();
          
        if (!error && data) {
          // Check if the role name ends with ' Admin' but is not 'Super Admin'
          const isAdmin = data.name.endsWith(' Admin') && data.name !== 'Super Admin';
          console.log('Role name:', data.name, 'Is country admin:', isAdmin);
          setIsCountryAdmin(isAdmin);
        } else {
          console.error("Error fetching role:", error);
        }
      }
    } catch (error) {
      console.error('Error checking country admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="max-w-2xl mx-auto text-center p-8">
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin access
  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title">Admin</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Access Restricted</h2>
            <p className="mb-6 text-muted-foreground">
              You must be logged in to access this area.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if the user has any admin privileges
  const isSuperAdmin = user.role === 'Super Admin';
  
  if (!isSuperAdmin && !isCountryAdmin) {
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
  if (isCountryAdmin && !isSuperAdmin) {
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
