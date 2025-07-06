import { Link } from "react-router-dom";
import { Facebook, Github, Twitter } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export const Footer = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <footer className={`${theme === 'light' ? 'bg-ottoman-950' : 'bg-dark-950'} animate-fade-in `}>
      <div className="container mx-auto px-4 py-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Column - full width on mobile */}
          <div className="col-span-1 md:col-span-6 lg:col-span-6">
            <div className="flex items-center gap-2 h-8 relative">
              <div className="absolute -top-2">
                <img
                  src="/favicon.PNG"
                  alt="OttoCollect Logo"
                  className="w-14 h-14 object-contain -mt-2"
                />
              </div>
              <div className="w-14"></div> {/* Spacer to reserve logo space */}
              <h2 className="text-xl font-serif font-bold text-ottoman-100 !important leading-14">
                <span className="text-ottoman-100 !important">OttoCollect</span>
              </h2>
            </div>
            <p className={`${theme === 'light' ? 'text-ottoman-300' : 'text-ottoman-400'} text-sm max-w-md mt-4`}>
              The premier platform for Ottoman empire and its successor countries banknotes collectors and historians, enthusiasts.
            </p>
          </div>

          {/* Quick Links and Help & Support container - side by side on all screens */}
          <div className="col-span-1 md:col-span-6 lg:col-span-6 grid grid-cols-2 gap-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-serif font-semibold text-ottoman-100 !important h-8 leading-8">
                <span className="text-ottoman-100 !important">Quick Links</span>
              </h3>
              <nav className="space-y-2 mt-4">
                <Link to="/" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Home
                </Link>
                <Link to="/catalog" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Catalogue
                </Link>
                <Link to="/marketplace" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Marketplace
                </Link>
                <Link to={`/profile/${user?.id}`} className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  My Collection
                </Link>
                <Link to="/blog" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Blog
                </Link>
                <Link to="/community/forum" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Forum
                </Link>
              </nav>
            </div>

            {/* Help & Support */}
            <div>
              <h3 className="text-lg font-serif font-semibold text-ottoman-100 !important h-8 leading-8">
                <span className="text-ottoman-100 !important">Help & Support</span>
              </h3>
              <nav className="space-y-2 mt-4">
                <Link to="/guide" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  User Guide
                </Link>
                <Link to="/contact" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Contact Us
                </Link>
                <Link to="/privacy" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Privacy Policy
                </Link>
                <Link to="/terms" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  Terms of Service
                </Link>
                <Link to="/about" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  About Us
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${theme === 'light' ? 'border-ottoman-800/50' : 'border-ottoman-900/50'} px-4 py-4`}>
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className={`${theme === 'light' ? 'text-ottoman-300' : 'text-ottoman-400'} text-sm`}>
            © 2025 Otto Collect. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}
            >
              <Twitter size={20} />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
