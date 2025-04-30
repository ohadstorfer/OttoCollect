
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container py-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold mb-4">Ottoman Banknotes Collection</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore and manage your collection of historical Ottoman banknotes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <Card className="border border-ottoman-200 hover:border-ottoman-500 transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-ottoman-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ottoman-600">
                  <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-2">Catalog</h2>
              <p className="text-muted-foreground mb-6">
                Browse a comprehensive catalog of Ottoman banknotes
              </p>
              <Button 
                onClick={() => navigate('/catalog')}
                className="w-full"
              >
                Explore Catalog
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-ottoman-200 hover:border-ottoman-500 transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-ottoman-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ottoman-600">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-2">My Collection</h2>
              <p className="text-muted-foreground mb-6">
                Manage and organize your personal collection
              </p>
              <Button 
                onClick={() => navigate('/my-collection')}
                className="w-full"
              >
                View Collection
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-ottoman-200 hover:border-ottoman-500 transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-ottoman-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ottoman-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-2">Profile</h2>
              <p className="text-muted-foreground mb-6">
                View and edit your profile information
              </p>
              <Button 
                onClick={() => navigate('/profile')} 
                className="w-full"
              >
                Go to Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
