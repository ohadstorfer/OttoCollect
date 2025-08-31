import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Menu, X, Search, User, LogIn, ShoppingCart, BookOpen, MessageCircle, Sun, Moon, Shield } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageButton } from "@/components/messages/MessageButton";
import { useTheme } from "@/context/ThemeContext";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from '@/components/layout/NotificationBell';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { direction } = useLanguage();
  const { t } = useTranslation(['navigation']);

  const closeMenu = () => setIsOpen(false);
  
  const isActive = (path: string) => {
    if (path === '/catalog') {
      // Match both /catalog and /catalog/:country
      return location.pathname === path || location.pathname.startsWith('/catalog/');
    }
    return location.pathname === path;
  };
  
  const handleMessageClick = () => {
    navigate('/messaging');
    closeMenu();
  };

  // Check if user has admin privileges
  const isAdmin = user?.role === 'Super Admin' || user?.role.includes('Admin');

  // Navigation links that appear in both desktop and mobile views
  const navLinks = [
    { path: '/catalog', label: t('nav.catalog') },
    { path: `/profile/${user?.id}`, label: t('nav.myCollection') },
    { path: '/marketplace', label: t('nav.marketplace') },
    { path: '/community/forum', label: t('nav.forum') },
    { path: '/blog', label: t('nav.blog') },
    // ...(isAdmin ? [{ path: '/admin', label: 'Admin Dashboard' }] : []),
  ];

  return (
    <nav className={`${theme === 'light' ? 'bg-white border-ottoman-200' : 'bg-dark-600 border-ottoman-900/50'} border-b sticky top-0 z-50 shadow-md animate-fade-in`}>
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between">
          {/* Logo and site name */}
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <div className="flex items-center gap-2">
              <img 
                src="/favicon.PNG" 
                alt="OttoCollect Logo" 
                className="w-14 h-14 object-contain"
              />
              <h1 className={`text-xl font-serif ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-100'} font-semibold tracking-tight`}>
                <span className="text-gradient">OttoCollect</span> 
              </h1>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1" style={{ gap: 'var(--space-1)' }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-4 py-2 rounded-md text-sm transition-colors",
                  isActive(link.path)
                    ? theme === 'light' 
                      ? "bg-ottoman-100 text-ottoman-900" 
                      : "bg-ottoman-600/30 text-ottoman-100"
                    : theme === 'light'
                      ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
                      : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                )}
                style={{ 
                  paddingInlineStart: '1rem',
                  paddingInlineEnd: '1rem'
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>


          {/* Right section (both desktop and mobile) */}
          <div className="flex items-center gap-3" style={{ gap: '0.75rem' }}>
            {/* <LanguageSelector /> */}
            {user && <NotificationBell />}

            {user ? (
              <Sheet open={profileSidebarOpen} onOpenChange={setProfileSidebarOpen}>
                <SheetTrigger asChild>
                  <button
                    className={`w-8 h-8 rounded-full ${theme === 'light' ? 'bg-ottoman-100' : 'bg-ottoman-700'} flex items-center justify-center overflow-hidden focus:outline-none`}
                    onClick={() => setProfileSidebarOpen(true)}
                    tabIndex={0}
                    type="button"
                    aria-label="Open profile menu"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className={`h-5 w-5 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-100'}`} />
                    )}
                  </button>
                </SheetTrigger>
                <ProfileSidebar isOpen={profileSidebarOpen} onOpenChange={setProfileSidebarOpen} />
              </Sheet>
            ) : (
              <Link to="/auth">
                <Button className="bg-ottoman-600 hover:bg-ottoman-700 text-white flex items-center gap-2">
                  <LogIn className={`h-4 w-4 ${direction === 'rtl' ? 'transform rotate-180' : ''}`} />
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
