import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type TutorialStep = 
  | 'welcome'
  | 'firstCatalogueVisit'
  | 'firstCollectionVisit'
  | 'firstEditClick'
  | 'firstMarketplaceVisit'
  | 'firstForumVisit'
  | 'completed';

interface TutorialContextType {
  currentStep: TutorialStep | null;
  isVisible: boolean;
  showTutorial: (step: TutorialStep) => void;
  hideTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  isNewUser: boolean;
  hasSeenWelcome: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<TutorialStep>>(new Set());
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Enhanced new user detection
  const checkIfNewUser = (user: any) => {
    if (!user?.created_at) return false;
    
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider user "new" if:
    // 1. Account created within last 14 days
    // 2. Has less than 5 banknotes in collection
    // 3. Hasn't completed most tutorials
    return daysSinceCreation <= 14;
  };

  // Load tutorial state from localStorage
  useEffect(() => {
    if (user) {
      const tutorialState = localStorage.getItem(`tutorial_${user.id}`);
      const isNew = checkIfNewUser(user);
      setIsNewUser(isNew);
      
      if (tutorialState) {
        const { completed, seenWelcome } = JSON.parse(tutorialState);
        setCompletedSteps(new Set(completed));
        setHasSeenWelcome(seenWelcome || false);
      } else if (isNew) {
        // New user - show welcome tutorial after 2 seconds
        setTimeout(() => {
          if (!hasSeenWelcome) {
            showTutorial('welcome');
          }
        }, 2000);
      }
    }
  }, [user]);

  // Save tutorial state to localStorage
  const saveTutorialState = (completed: Set<TutorialStep>, seenWelcome: boolean) => {
    if (user) {
      localStorage.setItem(`tutorial_${user.id}`, JSON.stringify({
        completed: Array.from(completed),
        seenWelcome
      }));
    }
  };

  const showTutorial = (step: TutorialStep) => {
    // Allow manual triggers for all users (from debug panel or console)
    if (step === 'firstEditClick' || step === 'welcome' || step === 'firstCatalogueVisit' || 
        step === 'firstCollectionVisit' || step === 'firstMarketplaceVisit' || step === 'firstForumVisit') {
      setCurrentStep(step);
      setIsVisible(true);
      
      // Mark welcome as seen if it's the welcome tutorial
      if (step === 'welcome') {
        setHasSeenWelcome(true);
        saveTutorialState(completedSteps, true);
      }
      return;
    }
    
    // For automatic triggers, only show tutorials for new users
    if (!user || (!isNewUser && step !== 'firstEditClick')) return;
    
    if (!completedSteps.has(step) && step !== 'completed') {
      setCurrentStep(step);
      setIsVisible(true);
      
      // Mark welcome as seen
      if (step === 'welcome') {
        setHasSeenWelcome(true);
        saveTutorialState(completedSteps, true);
      }
    }
  };

  const hideTutorial = () => {
    setIsVisible(false);
    setTimeout(() => setCurrentStep(null), 300);
  };

  const completeTutorial = () => {
    if (currentStep && currentStep !== 'completed') {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(currentStep);
      setCompletedSteps(newCompleted);
      saveTutorialState(newCompleted, hasSeenWelcome);
      
      // Auto-advance to next tutorial for new users
      if (isNewUser) {
        const nextStep = getNextTutorialStep(currentStep);
        if (nextStep) {
          setTimeout(() => showTutorial(nextStep), 500);
        }
      }
    }
    hideTutorial();
  };

  const getNextTutorialStep = (currentStep: TutorialStep): TutorialStep | null => {
    const tutorialFlow: TutorialStep[] = [
      'welcome',
      'firstCatalogueVisit',
      'firstCollectionVisit',
      'firstEditClick',
      'firstMarketplaceVisit',
      'firstForumVisit'
    ];
    
    const currentIndex = tutorialFlow.indexOf(currentStep);
    if (currentIndex < tutorialFlow.length - 1) {
      return tutorialFlow[currentIndex + 1];
    }
    return null;
  };

  const resetTutorial = () => {
    setCompletedSteps(new Set());
    setHasSeenWelcome(false);
    if (user) {
      localStorage.removeItem(`tutorial_${user.id}`);
    }
  };

  // Debug function for testing tutorials
  const debugTriggerTutorials = () => {
    console.log('🎯 Debug: Triggering tutorials for testing...');
    setCompletedSteps(new Set());
    setHasSeenWelcome(false);
    setIsNewUser(true);
    if (user) {
      localStorage.removeItem(`tutorial_${user.id}`);
    }
    // Show welcome tutorial immediately
    setTimeout(() => {
      setCurrentStep('welcome');
      setIsVisible(true);
    }, 500);
  };

  // Direct debug method that bypasses all checks
  const debugShowTutorial = (step: TutorialStep) => {
    console.log(`🎯 Debug: Directly showing tutorial: ${step}`);
    setCurrentStep(step);
    setIsVisible(true);
  };

  // Expose debug function to window for console access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugTutorials = debugTriggerTutorials;
      (window as any).resetTutorials = resetTutorial;
      (window as any).showTutorial = showTutorial;
      (window as any).debugShowTutorial = debugShowTutorial;
    }
  }, [user]);

  return (
    <TutorialContext.Provider value={{
      currentStep,
      isVisible,
      showTutorial,
      hideTutorial,
      completeTutorial,
      resetTutorial,
      isNewUser,
      hasSeenWelcome
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