import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Menu, X, Search, User, LogIn, ShoppingCart, BookOpen, MessageCircle, Sun, Moon, Shield } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageButton } from "@/components/messages/MessageButton";
import { useTheme } from "@/context/ThemeContext";
import { Sheet } from "@/components/ui/sheet";
import ProfileSidebar from "./ProfileSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false); // mobile nav
  const [profileSheetOpen, setProfileSheetOpen] = useState(false); // desktop profile sidebar
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  const openProfileSheet = () => setProfileSheetOpen(true);
  const closeProfileSheet = () => setProfileSheetOpen(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMessageClick = () => {
    navigate('/messaging');
    closeMenu();
  };

  // Check if user has admin privileges
  const isAdmin = user?.role === 'Super Admin' || user?.role?.includes('Admin');

  // Navigation links that appear in both desktop and mobile views
  const navLinks = [
    { path: '/catalog', label: 'Catalog' },
    { path: '/collection', label: 'My Collection' },
    { path: '/marketplace', label: 'Marketplace' },
    { path: '/community', label: 'Community' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin Dashboard' }] : []),
  ];

  return (
    <nav className={`${theme === 'light' ? 'bg-white border-ottoman-200' : 'bg-dark-600 border-ottoman-900/50'} border-b sticky top-0 z-50 shadow-md animate-fade-in`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and site name */}
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <div>
              <h1 className={`text-xl font-serif ${theme === 'light' ? 'text-ottoman-800' : 'text-ottoman-100'} font-semibold tracking-tight`}>
                <span className="text-gradient">Ottoman</span> Banknotes
              </h1>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1">
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
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right section */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                {location.pathname !== '/messaging' && (
                  <MessageButton 
                    userId={user.id} 
                    onClick={handleMessageClick} 
                  />
                )}
                {/* Avatar triggers profile sidebar only on desktop */}
                <button
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full overflow-hidden ring-ottoman-300 flex items-center justify-center border focus:outline-none border-ottoman-200",
                    theme === "light" ? "bg-ottoman-100" : "bg-ottoman-700"
                  )}
                  onClick={openProfileSheet}
                  aria-label="Open profile menu"
                  tabIndex={0}
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
                {/* The profile drawer/sidebar */}
                <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
                  <ProfileSidebar open={profileSheetOpen} onOpenChange={setProfileSheetOpen} />
                </Sheet>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="bg-ottoman-600 hover:bg-ottoman-700 text-white flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-200'}`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            <button
              type="button"
              className={`${theme === 'light' ? 'text-ottoman-800 hover:text-ottoman-900' : 'text-ottoman-200 hover:text-ottoman-100'}`}
              onClick={toggleMenu}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile navigation */}
      {isOpen && (
        <div className="md:hidden animate-fade-in">
          <div className={`flex flex-col space-y-1 px-4 pb-4 pt-2 ${theme === 'light' ? 'bg-white' : 'bg-dark-600'}`}>
            <div className={`flex items-center justify-between py-2 border-b ${theme === 'light' ? 'border-ottoman-200' : 'border-ottoman-900/30'}`}>
              {user ? (
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2" onClick={closeMenu}>
                  <div className={`w-8 h-8 rounded-full ${theme === 'light' ? 'bg-ottoman-100' : 'bg-ottoman-700'} flex items-center justify-center overflow-hidden`}>
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className={`h-5 w-5 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-100'}`} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${theme === 'light' ? 'text-ottoman-900' : 'text-ottoman-100'}`}>{user.username}</p>
                    <p className={`text-xs ${theme === 'light' ? 'text-ottoman-600' : 'text-ottoman-300'}`}>{user.rank}</p>
                  </div>
                </Link>
              ) : (
                <Link to="/auth" onClick={closeMenu}>
                  <Button 
                    size="sm" 
                    className="bg-ottoman-600 hover:bg-ottoman-700 text-white"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
            
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-3 py-2 rounded-md text-sm transition-colors flex items-center",
                  isActive(link.path)
                    ? theme === 'light'
                      ? "bg-ottoman-100 text-ottoman-900"
                      : "bg-ottoman-600/30 text-ottoman-100"
                    : theme === 'light'
                      ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
                      : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                )}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            

            
            {user && (
              <>
                <div className={`border-t ${theme === 'light' ? 'border-ottoman-200' : 'border-ottoman-900/30'} my-1 pt-1`}>
                  <div
                    onClick={handleMessageClick}
                    className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                      theme === 'light' 
                        ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900" 
                        : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                    } cursor-pointer`}
                  >
                    <span className="ml-1">Messages</span>
                    {location.pathname !== '/messaging' && (
                      <div className="ml-auto">
                        <MessageButton 
                          userId={user.id} 
                          onClick={handleMessageClick} 
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className={`w-full px-3 py-2 rounded-md text-sm text-left transition-colors flex items-center ${
                      theme === 'light'
                        ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
                        : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                    }`}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
