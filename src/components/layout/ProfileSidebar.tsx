import React from "react";
import { SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { User, LogOut, MessageSquare } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MessageButton } from "@/components/messages/MessageButton";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
    navigate("/");
  };

  const handleMessages = () => {
    onOpenChange(false);
    navigate("/messaging");
  };

  return (
    <SheetContent
      side="right"
      className={`max-w-xs w-[320px] p-0 border-l ${
        theme === "light" ? "bg-white border-ottoman-200" : "bg-dark-600 border-ottoman-900/50"
      }`}
      onInteractOutside={() => onOpenChange(false)}
      onEscapeKeyDown={() => onOpenChange(false)}
      onOpenChange={onOpenChange}
    >
      {/* Profile Block */}
      <div className="flex flex-col gap-4 border-b px-6 py-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center overflow-hidden",
              theme === "light" ? "bg-ottoman-100" : "bg-ottoman-700"
            )}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User
                className={cn(
                  "h-6 w-6",
                  theme === "light" ? "text-ottoman-700" : "text-ottoman-100"
                )}
              />
            )}
          </div>
          <div className="flex flex-col">
            <span
              className={cn(
                "text-base font-medium",
                theme === "light" ? "text-ottoman-900" : "text-ottoman-100"
              )}
            >
              {user.username}
            </span>
            <span
              className={cn(
                "text-xs",
                theme === "light" ? "text-ottoman-600" : "text-ottoman-300"
              )}
            >
              {user.rank}
            </span>
          </div>
        </div>
      </div>
      {/* Menu Section */}
      <div className="flex flex-col gap-1 p-4">
        {/* Profile */}
        <Link
          to={`/profile/${user.id}`}
          className={cn(
            "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
            theme === "light"
              ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
              : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
          )}
          onClick={() => onOpenChange(false)}
        >
          <User className="h-4 w-4" /> Profile
        </Link>
        {/* Messages */}
        <button
          onClick={handleMessages}
          className={cn(
            "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 cursor-pointer",
            theme === "light"
              ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
              : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Messages
          {location.pathname !== "/messaging" && (
            <div className="ml-auto">
              <MessageButton userId={user.id} onClick={handleMessages} />
            </div>
          )}
        </button>
        {/* Log out */}
        <button
          onClick={handleLogout}
          className={cn(
            "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 mt-2",
            theme === "light"
              ? "text-ottoman-700 hover:bg-ottoman-50 hover:text-ottoman-900"
              : "text-ottoman-200 hover:bg-ottoman-600/20 hover:text-ottoman-100"
          )}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </SheetContent>
  );
};
