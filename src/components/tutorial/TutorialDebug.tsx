import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
import { Play, RotateCcw, Eye } from 'lucide-react';

export const TutorialDebug: React.FC = () => {
  const { showTutorial, resetTutorial, isNewUser } = useTutorial();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  // Direct tutorial triggers that bypass the new user check
  const triggerWelcome = () => {
    console.log('🎯 Triggering Welcome Tutorial');
    (window as any).debugShowTutorial('welcome');
  };
  
  const triggerCatalogue = () => {
    console.log('🎯 Triggering Catalogue Tutorial');
    (window as any).debugShowTutorial('firstCatalogueVisit');
  };
  
  const triggerCollection = () => {
    console.log('🎯 Triggering Collection Tutorial');
    (window as any).debugShowTutorial('firstCollectionVisit');
  };
  
  const triggerEdit = () => {
    console.log('🎯 Triggering Edit Tutorial');
    (window as any).debugShowTutorial('firstEditClick');
  };
  
  const triggerMarketplace = () => {
    console.log('🎯 Triggering Marketplace Tutorial');
    (window as any).debugShowTutorial('firstMarketplaceVisit');
  };
  
  const triggerForum = () => {
    console.log('🎯 Triggering Forum Tutorial');
    (window as any).debugShowTutorial('firstForumVisit');
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="bg-white/80 backdrop-blur-sm shadow-lg"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Debug panel */}
      {isVisible && (
        <div className="mt-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border p-4 w-64">
          <h3 className="text-sm font-semibold mb-3">🎯 Tutorial Debug</h3>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerWelcome}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Welcome Tutorial
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerCatalogue}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Catalogue Tutorial
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerCollection}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Collection Tutorial
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerEdit}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Edit Tutorial
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerMarketplace}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Marketplace Tutorial
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerForum}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              Forum Tutorial
            </Button>
            
            <div className="border-t pt-2 mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={resetTutorial}
                className="w-full justify-start"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset All Tutorials
              </Button>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            <p>User ID: {user?.id}</p>
            <p>New User: {isNewUser ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}
    </div>
  );
}; 