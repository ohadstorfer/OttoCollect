
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Menu, X, Search, User, LogIn, ShoppingCart, BookOpen, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageButton } from "@/components/messages/MessageButton";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleMessageClick = () => {
    navigate('/messaging');
    closeMenu();
  };

  // Navigation links that appear in both desktop and mobile views
  const navLinks = [
    
    { path: '/catalog', label: 'Catalog' },
    { path: '/collection', label: 'My Collection' },
    { path: '/marketplace', label: 'Marketplace' },
    { path: '/community', label: 'Community' },
  ];

  return (
    <nav className="bg-dark-600 border-b border-ottoman-900/50 sticky top-0 z-50 shadow-md animate-fade-in">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and site name */}
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            
            <div>
              <h1 className="text-xl font-serif text-ottoman-100 font-semibold tracking-tight">
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
                    ? "bg-ottoman-600/30 text-ottoman-100"
                    : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right section */}
          <div className="hidden md:flex items-center gap-3">
           
            
            {user ? (
              <div className="flex items-center gap-3">
                {location.pathname !== '/messaging' && (
                  <MessageButton 
                    userId={user.id} 
                    onClick={handleMessageClick} 
                  />
                )}
                
                
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-ottoman-700 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-ottoman-100" />
                    )}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-sm font-medium text-ottoman-100">{user.username}</p>
                    <p className="text-xs text-ottoman-300">{user.rank}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="ml-2 text-ottoman-100 border-ottoman-700 hover:bg-ottoman-700/50"
                    onClick={logout}
                  >
                    Logout
                  </Button>
                </Link>
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
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="text-ottoman-200 hover:text-ottoman-100"
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
          <div className="flex flex-col space-y-1 px-4 pb-4 pt-2 bg-dark-600">
            <div className="flex items-center justify-between py-2 border-b border-ottoman-900/30">
              
              
              {user ? (
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2" onClick={closeMenu}>
                  <div className="w-8 h-8 rounded-full bg-ottoman-700 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-ottoman-100" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-ottoman-100">{user.username}</p>
                    <p className="text-xs text-ottoman-300">{user.rank}</p>
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
                    ? "bg-ottoman-600/30 text-ottoman-100"
                    : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
                )}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            
            {user && (
              <>
                <div className="border-t border-ottoman-900/30 my-1 pt-1">
                  <div
                    onClick={handleMessageClick}
                    className="px-3 py-2 rounded-md text-sm transition-colors flex items-center text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100 cursor-pointer"
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
                    className="w-full px-3 py-2 rounded-md text-sm text-left transition-colors flex items-center text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
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
