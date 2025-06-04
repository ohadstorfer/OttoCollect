
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Home, BookOpen, ShoppingBag, Users, MessageSquare, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onOpenChange }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
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
        side="right" 
        className="w-80"
        onInteractOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <SheetHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl} alt={user.username} />
              <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <SheetTitle className="text-left">{user.username}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="user" rank={user.rank}>
                  {user.rank}
                </Badge>
                <span className="text-sm text-muted-foreground">{user.points} pts</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/catalog')}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Catalog
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/collection')}
          >
            <User className="mr-2 h-4 w-4" />
            My Collection
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/wishlist')}
          >
            <Heart className="mr-2 h-4 w-4" />
            My Wishlist
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/marketplace')}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Marketplace
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/forum')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Forum
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation('/members')}
          >
            <Users className="mr-2 h-4 w-4" />
            Members
          </Button>

          <div className="border-t pt-2 mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation(`/profile/${user.id}`)}
            >
              <User className="mr-2 h-4 w-4" />
              View Profile
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileSidebar;
