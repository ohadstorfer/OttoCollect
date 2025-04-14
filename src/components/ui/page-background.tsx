
import { useTheme } from "@/context/ThemeContext";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

interface PageBackgroundProps {
  children: React.ReactNode;
}

export function PageBackground({ children }: PageBackgroundProps) {
  const { theme, pageBackground } = useTheme();
  const location = useLocation();
  
  useEffect(() => {
    // Apply the background color based on theme
    if (theme === 'light') {
      document.body.style.backgroundColor = pageBackground;
    } else {
      document.body.style.backgroundColor = '#1A1A1A'; // Dark mode default
    }
    
    document.body.style.transition = 'background-color 0.3s ease-in-out';
    
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [pageBackground, theme, location.pathname]);

  return <>{children}</>;
}
