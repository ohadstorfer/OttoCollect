
import React from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileAboutProps {
  profile: User;
  onEditClick?: () => void;
}

export function ProfileAbout({ profile, onEditClick }: ProfileAboutProps) {
  const { t } = useTranslation(['profile']);
  
  return (
    <div className="ottoman-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-medium"><span>{t('about.title')}</span></h3>
        {onEditClick && (
          <Button variant="outline" size="sm" onClick={onEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            {t('about.edit')}
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
              ? t('about.noInfoSelf') 
              : t('about.noInfoOther')
            }
          </p>
        )}
        
        {profile.country && (
          <div className="pt-4 border-t">
            <div className="flex">
              <h4 className="font-medium w-32"><span>{t('about.country')}</span></h4>
              <p>{profile.country}</p>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t">
          <div className="flex">
            <h4 className="font-medium w-32"><span>{t('about.memberSince')}</span></h4>
            <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
