import React from 'react';
import { useTranslation } from 'react-i18next';
import AuthForm from '../components/auth/AuthForm';
import { AuthRequiredDialog } from '../components/auth/AuthRequiredDialog';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

const Auth: React.FC = () => {
  const { t } = useTranslation(['pages']);
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const showRequiredDialog = searchParams.get('required') === 'true';
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  if (user && !showRequiredDialog) {
    navigate(-1);
    return null;
  }

  if (showRequiredDialog) {
    return <AuthRequiredDialog />;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-900'} py-12 px-4 sm:px-6 lg:px-8 animate-fade-in`}>
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-dark-600/40 shadow-xl shadow-ottoman-900/20 ring-1 ring-inset ring-ottoman-900/10"
          aria-hidden="true"
        />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif font-bold tracking-tight text-gradient sm:text-5xl">
            <span>OttoCollect</span>
          </h2>
          <p className="mt-4 text-lg text-ottoman-300">
            {t('auth.description')}
          </p>
        </div>
        
        <AuthForm mode={mode as 'login' | 'register' | 'reset'} />
      </div>
    </div>
  );
};

export default Auth;
