
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type ThemeMode = 'light' | 'dark';
type ThemeContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
  pageBackground: string;
};

// Light mode page-specific background colors
const lightModeTheme = {
  default: '#F9FAFB', // Soft Gray (fallback)
  '/': '#FFF9F0',     // Peach Tint (home)
  '/marketplace': '#F0F9FF', // Powder Blue
  '/collection': '#F3FAF4', // Mint Cream
  '/profile': '#FFF1F3',  // Blush Pink
  '/forum': '#F8F4FF',    // Lavender Mist
  '/community/forum': '#F8F4FF', // Lavender Mist
  '/messages': '#F0F9FF', // Powder Blue
  '/catalog': '#F3FAF4', // Mint Cream
  '/members': '#FFF1F3',  // Blush Pink
  '/auth': '#FFF9F0',    // Peach Tint
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  pageBackground: '#1A1A1A',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme from localStorage or default to dark
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('ottoman-theme');
    return (savedTheme as ThemeMode) || 'dark';
  });

  const location = useLocation();
  const [pageBackground, setPageBackground] = useState<string>('#1A1A1A');

  // Set the page-specific background based on the current route
  useEffect(() => {
    if (theme === 'dark') {
      setPageBackground('#1A1A1A');
      return;
    }

    // Find the most specific matching route
    const paths = Object.keys(lightModeTheme);
    const matchingPath = paths.find(path => 
      path !== 'default' && location.pathname.startsWith(path)
    );

    // Use the matching path or default
    const background = matchingPath 
      ? (lightModeTheme as Record<string, string>)[matchingPath]
      : lightModeTheme.default;
      
    setPageBackground(background);
  }, [location.pathname, theme]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('ottoman-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Set the theme attribute on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Make sure the proper theme class is also added to the html element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, pageBackground }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
