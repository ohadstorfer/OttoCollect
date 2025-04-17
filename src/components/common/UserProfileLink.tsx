
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { User as UserType, UserRank } from '@/types';

interface UserProfileLinkProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  rank?: UserRank;
  size?: 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  showRank?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function UserProfileLink({
  userId,
  username,
  avatarUrl,
  rank,
  size = 'md',
  showAvatar = true,
  showRank = false,
  className = '',
  children,
}: UserProfileLinkProps) {
  const getAvatarSize = () => {
    switch (size) {
      case 'sm': return 'w-6 h-6';
      case 'lg': return 'w-12 h-12';
      default: return 'w-8 h-8';
    }
  };
  
  const getFontSize = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getRankColor = (userRank?: UserRank) => {
    if (!userRank) return '';
    
    if (userRank.includes('Newbie')) {
      return 'text-gray-500';
    } else if (userRank.includes('Beginner')) {
      return 'text-green-600';
    } else if (userRank.includes('Casual')) {
      return 'text-blue-600';
    } else if (userRank.includes('Known')) {
      return 'text-purple-600';
    } else if (userRank.includes('Advance')) {
      return 'text-indigo-600';
    } else if (userRank.includes('Admin')) {
      return 'text-red-600';
    } else {
      return 'text-gray-500';
    }
  };

  // Return children if provided, otherwise render the default link content
  if (children) {
    return (
      <Link to={`/profile/${userId}`} className={`hover:underline ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <Link 
      to={`/profile/${userId}`} 
      className={`flex items-center gap-2 hover:underline ${className}`}
    >
      {showAvatar && (
        <div className={`rounded-full bg-muted flex items-center justify-center overflow-hidden ${getAvatarSize()}`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={username} 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} text-muted-foreground`} />
          )}
        </div>
      )}
      <div className={`flex ${showRank ? 'flex-col' : 'items-center'}`}>
        <span className={`${getFontSize()} font-medium`}>{username}</span>
        {showRank && rank && (
          <span className={`text-xs ${getRankColor(rank)}`}>{rank}</span>
        )}
      </div>
    </Link>
  );
}
