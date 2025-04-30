
import React from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface ProfileAboutProps {
  profile: User;
  onEditClick?: () => void;
}

export function ProfileAbout({ profile, onEditClick }: ProfileAboutProps) {
  return (
    <div className="ottoman-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium">About</h3>
        {onEditClick && (
          <Button variant="outline" size="sm" onClick={onEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {profile.about ? (
          <div>
            <p className="whitespace-pre-line">{profile.about}</p>
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            {onEditClick 
              ? "You haven't added any information about yourself yet." 
              : "This user hasn't added any information about themselves yet."
            }
          </p>
        )}
        
        {profile.country && (
          <div className="pt-4 border-t">
            <div className="flex">
              <h4 className="font-medium w-32">Country:</h4>
              <p>{profile.country}</p>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t">
          <div className="flex">
            <h4 className="font-medium w-32">Member since:</h4>
            <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
