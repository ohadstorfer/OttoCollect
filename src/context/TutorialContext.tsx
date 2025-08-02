import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type TutorialGuide = 'addBanknote' | 'editBanknote' | 'suggestPicture';

interface TutorialState {
  currentGuide: TutorialGuide | null;
  currentStep: number;
  totalSteps: number;
  isVisible: boolean;
}

interface TutorialContextType {
  tutorialState: TutorialState;
  showGuide: (guide: TutorialGuide) => void;
  nextStep: () => void;
  previousStep: () => void;
  hideTutorial: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  resetTutorials: () => void;
  isNewUser: boolean;
  completedGuides: Set<TutorialGuide>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    currentGuide: null,
    currentStep: 1,
    totalSteps: 0,
    isVisible: false
  });
  const [completedGuides, setCompletedGuides] = useState<Set<TutorialGuide>>(new Set());
  const [isNewUser, setIsNewUser] = useState(false);

  // Enhanced new user detection
  const checkIfNewUser = (user: any) => {
    if (!user?.created_at) return false;
    
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider user "new" if account created within last 14 days
    return daysSinceCreation <= 14;
  };

  // Get total steps for a guide from guide.json structure
  const getGuideSteps = (guide: TutorialGuide): number => {
    // These correspond to the steps in guide.json
    const stepCounts = {
      addBanknote: 6,
      editBanknote: 10,
      suggestPicture: 4
    };
    return stepCounts[guide];
  };

  // Load tutorial state from localStorage
  useEffect(() => {
    if (user) {
      const savedState = localStorage.getItem(`tutorials_${user.id}`);
      const isNew = checkIfNewUser(user);
      setIsNewUser(isNew);
      
      if (savedState) {
        const { completed } = JSON.parse(savedState);
        setCompletedGuides(new Set(completed));
      } else if (isNew) {
        // New user - show addBanknote guide (welcome) after 2 seconds
        setTimeout(() => {
          showGuide('addBanknote');
        }, 2000);
      }
    }
  }, [user]);

  // Save tutorial state to localStorage
  const saveTutorialState = (completed: Set<TutorialGuide>) => {
    if (user) {
      localStorage.setItem(`tutorials_${user.id}`, JSON.stringify({
        completed: Array.from(completed)
      }));
    }
  };

  const showGuide = (guide: TutorialGuide) => {
    // Don't show if already completed (unless manually triggered)
    if (completedGuides.has(guide)) return;
    
    const totalSteps = getGuideSteps(guide);
    setTutorialState({
      currentGuide: guide,
      currentStep: 1,
      totalSteps,
      isVisible: true
    });
  };

  const nextStep = () => {
    setTutorialState(prev => {
      if (prev.currentStep < prev.totalSteps) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  };

  const previousStep = () => {
    setTutorialState(prev => {
      if (prev.currentStep > 1) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  };

  const hideTutorial = () => {
    setTutorialState(prev => ({ ...prev, isVisible: false }));
    setTimeout(() => {
      setTutorialState(prev => ({ ...prev, currentGuide: null, currentStep: 1, totalSteps: 0 }));
    }, 300);
  };

  const completeTutorial = () => {
    if (tutorialState.currentGuide) {
      const newCompleted = new Set(completedGuides);
      newCompleted.add(tutorialState.currentGuide);
      setCompletedGuides(newCompleted);
      saveTutorialState(newCompleted);
    }
    hideTutorial();
  };

  const skipTutorial = () => {
    hideTutorial();
  };

  const resetTutorials = () => {
    setCompletedGuides(new Set());
    if (user) {
      localStorage.removeItem(`tutorials_${user.id}`);
    }
  };

  // Trigger functions for specific events
  const triggerEditBanknoteGuide = () => {
    if (!completedGuides.has('editBanknote') && user) {
      setTimeout(() => showGuide('editBanknote'), 1000);
    }
  };

  const triggerSuggestPictureGuide = () => {
    if (!completedGuides.has('suggestPicture') && user) {
      setTimeout(() => showGuide('suggestPicture'), 1000);
    }
  };

  // Debug functions for testing
  const debugShowGuide = (guide: TutorialGuide) => {
    console.log(`🎯 Debug: Showing guide: ${guide}`);
    showGuide(guide);
  };

  const debugResetTutorials = () => {
    console.log('🎯 Debug: Resetting all tutorials');
    setCompletedGuides(new Set());
    setIsNewUser(true);
    if (user) {
      localStorage.removeItem(`tutorials_${user.id}`);
    }
  };

  // Expose debug functions to window for console access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showGuide = debugShowGuide;
      (window as any).resetTutorials = debugResetTutorials;
      (window as any).triggerEditGuide = triggerEditBanknoteGuide;
      (window as any).triggerSuggestGuide = triggerSuggestPictureGuide;
    }
  }, [user]);

  return (
    <TutorialContext.Provider value={{
      tutorialState,
      showGuide,
      nextStep,
      previousStep,
      hideTutorial,
      completeTutorial,
      skipTutorial,
      resetTutorials,
      isNewUser,
      completedGuides
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};