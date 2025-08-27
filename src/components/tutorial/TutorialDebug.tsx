import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
import { Play, RotateCcw, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TutorialDebug: React.FC = () => {
  const { showGuide, resetTutorials, isNewUser, completedGuides, tutorialState } = useTutorial();
  const { user } = useAuth();
  const { t } = useTranslation('guide');
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  // Direct tutorial triggers
  const triggerAddBanknote = () => {
    console.log('🎯 Triggering Add Banknote Guide');
    showGuide('addBanknote');
  };
  
  const triggerEditBanknote = () => {
    console.log('🎯 Triggering Edit Banknote Guide');
    showGuide('editBanknote');
  };
  
  const triggerSuggestPicture = () => {
    console.log('🎯 Triggering Suggest Picture Guide');
    showGuide('suggestPicture');
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
          <h3 className="text-sm font-semibold mb-3">🎯 {t('debug.title', 'Tutorial Debug')}</h3>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerAddBanknote}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              {t('debug.welcomeGuide', 'Welcome Guide')} 🧾
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerEditBanknote}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              {t('debug.editGuide', 'Edit Guide')} ✏️
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSuggestPicture}
              className="w-full justify-start"
            >
              <Play className="h-3 w-3 mr-2" />
              {t('debug.suggestGuide', 'Suggest Guide')} 🖼️
            </Button>
            
            <div className="border-t pt-2 mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={resetTutorials}
                className="w-full justify-start"
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                {t('debug.resetAllGuides', 'Reset All Guides')}
              </Button>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            <p>{t('debug.userId', 'User ID')}: {user?.id}</p>
            <p>{t('debug.newUser', 'New User')}: {isNewUser ? t('debug.yes', 'Yes') : t('debug.no', 'No')}</p>
            <p>{t('debug.active', 'Active')}: {tutorialState.currentGuide || t('debug.none', 'None')}</p>
            <p>{t('debug.completed', 'Completed')}: {completedGuides.size}/3</p>
          </div>
        </div>
      )}
    </div>
  );
}; 