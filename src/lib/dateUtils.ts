import { format, formatDistanceToNow } from 'date-fns';
import { enUS, tr, ar } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';

// Locale mapping for date-fns
const localeMap = {
  en: enUS,
  tr: tr,
  ar: ar,
};

// Get the appropriate locale for date formatting
export const getDateLocale = (language: string) => {
  return localeMap[language as keyof typeof localeMap] || enUS;
};

// Format date with locale support
export const formatDate = (date: Date | string, formatString: string, language: string = 'en') => {
  const locale = getDateLocale(language);
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return format(dateObj, formatString, { locale });
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback to English format
    return format(dateObj, formatString, { locale: enUS });
  }
};

// Format relative time with locale support
export const formatRelativeTime = (date: Date | string, language: string = 'en') => {
  const locale = getDateLocale(language);
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatDistanceToNow(dateObj, { 
      addSuffix: true,
      locale 
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    // Fallback to English format
    return formatDistanceToNow(dateObj, { 
      addSuffix: true,
      locale: enUS 
    });
  }
};

// Common date format patterns
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',        // Jan 15, 2024
  MEDIUM: 'PPP',               // January 15th, 2024
  LONG: 'PPpp',                // January 15th, 2024 at 12:00 PM
  TIME_ONLY: 'p',              // 12:00 PM
  DATE_ONLY: 'PP',             // January 15th, 2024
  COMPACT: 'MMM d',            // Jan 15
  YEAR_MONTH: 'MMMM yyyy',     // January 2024
} as const;

// Hook for getting current language from context
export const useDateLocale = () => {
  const { currentLanguage } = useLanguage();
  
  return {
    formatDate: (date: Date | string, formatString: string) => 
      formatDate(date, formatString, currentLanguage),
    formatRelativeTime: (date: Date | string) => 
      formatRelativeTime(date, currentLanguage),
    getDateLocale: () => getDateLocale(currentLanguage),
    currentLanguage,
  };
}; 