import { Link } from "react-router-dom";
import { Facebook, Github, Instagram, Twitter } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { t, i18n: i18nInstance } = useTranslation(['common']);
  const isHomePage = location.pathname === "/";
  const isMarginTopRequired = location.pathname !== '/' && location.pathname !== '/about' && location.pathname !== '/auth';
  
  // Check if current language is Arabic for RTL alignment
  const isArabic = i18nInstance.language === 'ar';
  
  // Remove unnecessary translation reloading - i18next handles this automatically
  
  return (
    <footer className={`${theme === 'light' ? 'bg-ottoman-950' : 'bg-dark-950'} animate-fade-in ${isMarginTopRequired ? 'mt-20' : ''}`}>
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
            <p className={`${theme === 'light' ? 'text-ottoman-300' : 'text-ottoman-400'} text-sm max-w-md mt-4 ${isArabic ? 'text-right' : 'text-left'}`}>
              {t('footer.description')}
            </p>
          </div>

          {/* Quick Links and Help & Support container - side by side on all screens */}
          <div className="col-span-1 md:col-span-6 lg:col-span-6 grid grid-cols-2 gap-8">
            {/* Quick Links */}
            <div className={isArabic ? 'text-right' : 'text-left'}>
              <h3 className="text-lg font-serif font-semibold text-ottoman-100 !important h-8 leading-8">
                <span className="text-ottoman-100 !important">{t('footer.quickLinks')}</span>
              </h3>
              <nav className="space-y-2 mt-4">
                <Link to="/" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.home')}
                </Link>
                <Link to="/catalog" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.catalog')}
                </Link>
                <Link to="/marketplace" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.marketplace')}
                </Link>
                <Link to={`/profile/${user?.id}`} className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.myCollection')}
                </Link>
                <Link to="/blog" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.blog')}
                </Link>
                <Link to="/forum" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.forum')}
                </Link>
              </nav>
            </div>

            {/* Help & Support */}
            <div className={isArabic ? 'text-right' : 'text-left'}>
              <h3 className="text-lg font-serif font-semibold text-ottoman-100 !important h-8 leading-8">
                <span className="text-ottoman-100 !important">{t('footer.helpSupport')}</span>
              </h3>
              <nav className="space-y-2 mt-4">
                <Link to="/guide" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.userGuide')}
                </Link>
                <Link to="/contact" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.contactUs')}
                </Link>
                <Link to="/privacy" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.privacyPolicy')}
            </Link>
                <Link to="/terms" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.termsOfService')}
            </Link>
                <Link to="/about" className={`block ${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}>
                  {t('footer.aboutUs')}
            </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${theme === 'light' ? 'border-ottoman-800/50' : 'border-ottoman-900/50'} px-4 py-4`}>
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className={`${theme === 'light' ? 'text-ottoman-300' : 'text-ottoman-400'} text-sm ${isArabic ? 'text-right' : 'text-left'}`}>
            {t('footer.copyright')}
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://www.facebook.com/share/g/1An224PDXp/?mibextid=wwXIfr"
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
              href="https://www.instagram.com/ottocollect?igsh=MXdnN2M2bTEwZjlwZg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className={`${theme === 'light' ? 'text-ottoman-300 hover:text-ottoman-100' : 'text-ottoman-400 hover:text-ottoman-200'} transition-colors`}
            >
              <Instagram size={20} />
            </a>
          </div>
          </div>
        </div>
    </footer>
  );
};

export default Footer;
