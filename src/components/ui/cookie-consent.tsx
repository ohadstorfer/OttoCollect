import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

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
            We use essential cookies to ensure the basic functionality of this website and to enhance your experience.
            These cookies are strictly necessary for the operation of our website. By continuing to use this site, you accept our use of essential cookies.
          </p>
          <p className="mt-1">
            <a 
              href="/privacy" 
              className="underline hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more about how we use cookies
            </a>
          </p>
        </div>
        <div className="flex items-center ">
         
          <Button
            variant="ghost"
            size="icon"
            onClick={acceptCookies}
            className="shrink-0"
            title="Close cookie notice"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close cookie notice</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 