import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation(['common']);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="container mx-auto p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-muted-foreground">
          <p>
            {t('cookieConsent.description')}
          </p>
          <p className="mt-1">
            <a 
              href="/privacy" 
              className="underline hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('cookieConsent.learnMore')}
            </a>
          </p>
        </div>
        <div className="flex items-center ">
         
          <Button
            variant="ghost"
            size="icon"
            onClick={acceptCookies}
            className="shrink-0"
            title={t('cookieConsent.closeButton')}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('cookieConsent.closeButton')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 