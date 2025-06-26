import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/ThemeContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { getInitials } from '@/lib/utils';
import { MessageButton } from '@/components/messages/MessageButton';
import { MessageCenter } from '@/components/messages/MessageCenter';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserRank } from '@/types';
import {
  Home,
  Compass,
  Plus,
  Settings,
  LogOut,
  Sun,
  Moon,
  MessagesSquare,
  User as UserIcon,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigationItems = [
    { name: 'Home', href: '/', icon: <Home className="mr-2 h-4 w-4" /> },
    { name: 'Explore', href: '/catalog', icon: <Compass className="mr-2 h-4 w-4" /> },
    { name: 'Create', href: '/create', icon: <Plus className="mr-2 h-4 w-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <>
      <nav className={`bg-background border-b ${theme === 'dark' ? 'border-dark-700' : 'border-gray-200'} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0">
                <img
                  className="h-8 w-auto"
                  src="/img/logo.png"
                  alt="Ottoman Treasures"
                />
              </Link>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${isActive(item.href)
                        ? 'bg-gray-900 text-white'
                        : `text-gray-500 hover:bg-gray-700 hover:text-white ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : ''}`
                        } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <ModeToggle />
              {user && (
                <>
                  <NotificationBell 
                    userId={user.id} 
                    onClick={() => setShowNotifications(true)} 
                  />
                  <MessageButton 
                    userId={user.id} 
                    onClick={() => setShowMessagesDialog(true)} 
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                          <AvatarFallback>{getInitials(user?.username || 'U')}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.username}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/profile/${user?.username}`)} >
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {!user && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                    Login
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <ModeToggle />
              {user && (
                <div className="flex items-center space-x-2">
                  <NotificationBell 
                    userId={user.id} 
                    onClick={() => setShowNotifications(true)} 
                  />
                  <MessageButton 
                    userId={user.id} 
                    onClick={() => setShowMessagesDialog(true)} 
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                          <AvatarFallback>{getInitials(user?.username || 'U')}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user?.username}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/profile/${user?.username}`)} >
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {!user && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MessageCenter Dialog */}
      {user && (
        <Dialog open={showMessagesDialog} onOpenChange={(open) => setShowMessagesDialog(open)}>
          <DialogContent className="sm:max-w-[800px] w-[95vw]">
            <MessageCenter />
          </DialogContent>
        </Dialog>
      )}

      {/* Notification Panel */}
      <NotificationPanel
        userId={user?.id}
        isOpen={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </>
  );
}

export default Navbar;
