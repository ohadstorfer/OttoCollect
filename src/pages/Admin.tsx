
import React from 'react';
import { useAuth } from '@/context/AuthContext';

const Admin = () => {
  const { user } = useAuth();
  
  // Check if user has admin access
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
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
        <div className="ottoman-card p-8">
          <h2 className="text-2xl font-serif mb-6">Admin Controls</h2>
          
          <div className="space-y-6">
            {/* Admin content will go here */}
            <p className="text-muted-foreground">Welcome, {user?.username}. You have administrative access.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
