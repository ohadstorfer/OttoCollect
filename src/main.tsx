
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { LanguageProvider } from '@/context/LanguageContext';
import { TutorialProvider } from '@/context/TutorialContext';
import '@/i18n/config';

createRoot(document.getElementById("root")!).render(
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
);
