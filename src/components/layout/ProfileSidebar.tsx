
import React from "react";
import { User as UserIcon, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ open, onOpenChange }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    onOpenChange(false);
  };

  const handleMessages = () => {
    if (location.pathname !== '/messaging') {
      navigate('/messaging');
    }
    onOpenChange(false);
  };

  return (
    <SheetContent 
      side="right" 
      className="w-80 p-0" 
      showX 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <SheetHeader className="p-4 border-b flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border bg-ottoman-100")}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8 text-ottoman-700" />
            )}
          </div>
          <div>
            <div className="font-semibold text-base text-ottoman-900">{user.username}</div>
            <div className="text-xs text-ottoman-600">{user.rank}</div>
          </div>
        </div>
      </SheetHeader>
      <div className="px-4 py-6 flex flex-col gap-4">
        <Link to={`/profile/${user.id}`} onClick={() => onOpenChange(false)}>
          <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
            <UserIcon className="h-5 w-5" />
            My Profile
          </Button>
        </Link>
        <Button 
          variant="outline"
          className="w-full flex items-center gap-2 justify-start"
          onClick={handleMessages}
        >
          <MessageSquare className="h-5 w-5" />
          Messages
        </Button>
        <Button 
          variant="destructive"
          className="w-full flex items-center gap-2 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </SheetContent>
  );
};

export default ProfileSidebar;

