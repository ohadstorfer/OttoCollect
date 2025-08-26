import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/config';
import { useTheme } from '@/context/ThemeContext';

export const LanguageSelector = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="rounded-full">
  <Globe
    strokeWidth={1.6}
    className={`h-5 w-5 ${
      theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-100'
    }`}
  />
</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, { name }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeLanguage(code as keyof typeof LANGUAGES)}
            className={currentLanguage === code ? 'bg-accent' : ''}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 