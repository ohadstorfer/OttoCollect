
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Github, Mail } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export const Footer = () => {
  const { theme } = useTheme();
  
  return (
    <footer className={`${theme === 'light' ? 'bg-ottoman-800' : 'bg-dark-600'} } animate-fade-in`}>        

        <div className={`   px-4 py-6 mt-8 pt-6 border-t ${theme === 'light' ? 'border-ottoman-700/50' : 'border-ottoman-900/50'} flex flex-col md:flex-row justify-between items-center`}>
          <p className={`${theme === 'light' ? 'text-ottoman-300' : 'text-ottoman-400'} text-xs md:text-sm`}>
            &copy; {new Date().getFullYear()} Otto Collect. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-200' : 'text-ottoman-400 hover:text-ottoman-200'} text-xs md:text-sm transition-colors`}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-200' : 'text-ottoman-400 hover:text-ottoman-200'} text-xs md:text-sm transition-colors`}>
              Terms of Service
            </Link>
            <Link to="/contactUs" className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-200' : 'text-ottoman-400 hover:text-ottoman-200'} text-xs md:text-sm transition-colors`}>
              Contact Us
            </Link>
          </div>
        </div>
    </footer>
  );
};

export default Footer;
