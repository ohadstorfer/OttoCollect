
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataImporter from "@/components/admin/DataImporter";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("import");
  
  const isAdmin = user && (user.role === 'Admin' || user.role === 'SuperAdmin');
  
  if (!user) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to sign in to access admin functions.
          </AlertDescription>
          <Button onClick={() => navigate('/auth')} className="mt-2" variant="outline">Sign In</Button>
        </Alert>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Admin privileges are required.
          </AlertDescription>
          <Button onClick={() => navigate('/')} className="mt-2" variant="outline">Return to Home</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="banknotes">Banknote Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-4">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Import Banknote Data</h2>
            <p className="mb-6 text-muted-foreground">
              Use this tool to import banknote data from CSV into the database.
              Make sure your CSV is properly formatted with the required columns.
            </p>
            
            <DataImporter />
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            <p className="text-muted-foreground">
              User management features coming soon.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="banknotes" className="space-y-4">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Banknote Management</h2>
            <p className="text-muted-foreground">
              Banknote management features coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
