import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Home, BookOpen, ShoppingBag, Users, MessageSquare, Heart, Shield, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface ProfileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onOpenChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n: i18nInstance } = useTranslation(['profile']);
  const isAdmin = user?.role === 'Super Admin' || user?.role?.includes('Admin');
  const isSuperAdmin = user?.role === 'Super Admin';
  const { direction } = useLanguage();

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Check if current language is Arabic for RTL behavior
  const isArabic = i18nInstance.language === 'ar';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isArabic ? "left" : "right"} 
        className="w-80"
        onInteractOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <SheetHeader
          className="pb-6 cursor-pointer hover:opacity-80 active:scale-95 transition"
          onClick={() => handleNavigation(`/profile/${user.id}`)}
        >
          <div
    className={`flex items-center ${
      direction === "rtl" ? "flex-row-reverse space-x-reverse space-x-3" : "flex-row space-x-3"
    }`}
  >
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl} alt={user.username} />
              <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <SheetTitle > <span> {user.username} </span> </SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="user" rank={user.rank} role={user.role} originalRole={user.originalRole} showIcon />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-2">
          {/* Mobile-only buttons */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/catalog')}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.catalogues', 'Catalogues')}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation(`/profile/${user.id}`)}
            >
              <User className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.myCollection', 'My Collection')}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/marketplace')}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.marketplace', 'Marketplace')}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/community/forum')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.forum', 'Forum')}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/blog')}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.blog', 'Blog')}
            </Button>

          </div>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/messaging')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {tWithFallback('sidebar.messages', 'Messages')}
          </Button>

          {isSuperAdmin && (
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/members')}
          >
            <Users className="mr-2 h-4 w-4" />
            {tWithFallback('sidebar.allUsers', 'All Users')}
          </Button>
          )}

          <div className="border-t pt-2 mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.settings', 'Settings')}
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation('/admin')}
              >
                <Shield className="mr-2 h-4 w-4" />
                {tWithFallback('sidebar.adminDashboard', 'Admin Dashboard')}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === 'dark' 
                ? tWithFallback('sidebar.switchToLightMode', 'Switch to Light Mode')
                : tWithFallback('sidebar.switchToDarkMode', 'Switch to Dark Mode')
              }
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {tWithFallback('sidebar.signOut', 'Sign Out')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileSidebar;
