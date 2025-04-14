
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
    // Only apply custom background in light mode
    if (theme === 'light') {
      document.body.style.backgroundColor = pageBackground;
      document.body.style.transition = 'background-color 0.3s ease-in-out';
    } else {
      document.body.style.backgroundColor = '';
    }
    
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [pageBackground, theme, location.pathname]);

  return <>{children}</>;
}
