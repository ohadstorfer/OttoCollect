import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type TutorialStep = 
  | 'welcome'
  | 'firstCatalogueVisit'
  | 'firstCollectionVisit'
  | 'firstEditClick'
  | 'completed';

interface TutorialContextType {
  currentStep: TutorialStep | null;
  isVisible: boolean;
  showTutorial: (step: TutorialStep) => void;
  hideTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<TutorialStep>>(new Set());

  // Check if user is new (created within last 7 days)
  const isNewUser = (user: any) => {
    if (!user?.created_at) return false;
    const userCreatedAt = new Date(user.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return userCreatedAt > sevenDaysAgo;
  };

  // Load tutorial state from localStorage
  useEffect(() => {
    if (user) {
      const tutorialState = localStorage.getItem(`tutorial_${user.id}`);
      if (tutorialState) {
        const { completed } = JSON.parse(tutorialState);
        setCompletedSteps(new Set(completed));
      } else if (isNewUser(user)) {
        // New user - show welcome tutorial after 1 second
        setTimeout(() => showTutorial('welcome'), 1000);
      }
    }
  }, [user]);

  // Save tutorial state to localStorage
  const saveTutorialState = (completed: Set<TutorialStep>) => {
    if (user) {
      localStorage.setItem(`tutorial_${user.id}`, JSON.stringify({
        completed: Array.from(completed)
      }));
    }
  };

  const showTutorial = (step: TutorialStep) => {
    // Only show tutorials for new users (except manual triggers)
    if (!user || (!isNewUser(user) && step !== 'firstEditClick')) return;
    
    if (!completedSteps.has(step) && step !== 'completed') {
      setCurrentStep(step);
      setIsVisible(true);
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
      saveTutorialState(newCompleted);
    }
    hideTutorial();
  };

  const resetTutorial = () => {
    setCompletedSteps(new Set());
    if (user) {
      localStorage.removeItem(`tutorial_${user.id}`);
    }
  };

  return (
    <TutorialContext.Provider value={{
      currentStep,
      isVisible,
      showTutorial,
      hideTutorial,
      completeTutorial,
      resetTutorial
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