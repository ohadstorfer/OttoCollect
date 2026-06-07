
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { LanguageProvider } from '@/context/LanguageContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/i18n/config';

// Top-level ErrorBoundary so a render-phase throw (e.g. React #185 "Maximum
// update depth exceeded") shows a fallback + logs the component stack instead
// of blanking the page silently.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <LanguageProvider>
            <TutorialProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </TutorialProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
