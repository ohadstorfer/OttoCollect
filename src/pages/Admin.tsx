
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types';
import { Loader2, Shield, Users, Book, Image } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import BanknotesManagement from '@/components/admin/BanknotesManagement';
import ImageSuggestions from '@/components/admin/ImageSuggestions';

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('users');
  
  // Check if user has admin access
  if (!user || (user?.role !== 'Super Admin' && user?.role !== 'Admin')) {
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

  return (
    <div className="page-container">
      <h1 className="page-title">Admin Dashboard</h1>
      
      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-6">
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
