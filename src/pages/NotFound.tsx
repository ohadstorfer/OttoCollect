
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useTheme } from "@/context/ThemeContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation(['pages']);
  const { theme } = useTheme();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-ottoman-50' : 'bg-dark-500'} p-4 animate-fade-in -mb-20`}>
      <div className="max-w-md w-full text-center">
        <div className={`mb-6 w-24 h-24 rounded-full ${theme === 'light' ? 'bg-ottoman-200' : 'bg-ottoman-800/50'} flex items-center justify-center mx-auto`}>
          <span className={`text-4xl font-serif font-bold ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'}`}>404</span>
        </div>
        <h1 className={`text-3xl font-serif font-bold mb-4 ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'}`}>
          <span>{t('notFound.title')}</span>
        </h1>
        <p className={`mb-8 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'}`}>
          {t('notFound.description')}
        </p>
        <Link to="/">
          <Button className="ottoman-button">
            <Home className="h-4 w-4 mr-2" />
            {t('notFound.returnHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
