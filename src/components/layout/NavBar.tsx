
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const NavBar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              BankNote Collector
            </Link>
            <nav className="ml-8 hidden md:flex space-x-4">
              <Link to="/catalog" className="text-foreground hover:text-primary transition-colors">
                Catalog
              </Link>
              {user && (
                <Link to="/my-collection" className="text-foreground hover:text-primary transition-colors">
                  My Collection
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to={`/profile/${user.id}`} className="text-foreground hover:text-primary transition-colors">
                  Profile
                </Link>
                <Link to="/settings" className="text-foreground hover:text-primary transition-colors">
                  Settings
                </Link>
                <button 
                  onClick={logout}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="text-foreground hover:text-primary transition-colors">
                Login / Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
