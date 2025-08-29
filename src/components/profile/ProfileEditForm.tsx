
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateUserProfile, uploadAvatar } from '@/services/profileService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Loader2, Upload, Check, ExternalLink, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface ProfileEditFormProps {
  profile: User;
  onCancel: () => void;
  onSaveComplete: () => Promise<void>;
}

export function ProfileEditForm({ profile, onCancel, onSaveComplete }: ProfileEditFormProps) {
  const navigate = useNavigate();
  const { user: authUser, updateUserState } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['profile']);
  const [username, setUsername] = useState(profile.username);
  const [about, setAbout] = useState(profile.about || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(profile.facebook_url || '');
  const [instagramUrl, setInstagramUrl] = useState(profile.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(profile.twitter_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { direction } = useLanguage();

  // Clean up object URL when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUser) {
      toast({
        title: t('editForm.authenticationRequired'),
        description: t('editForm.mustBeLoggedIn'),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setIsSuccess(false);
    
    try {
      // Upload avatar first if a new file is selected
      let newAvatarUrl = avatarUrl;
      if (selectedFile && authUser) {
        console.log('🚀 [ProfileEditForm] Starting avatar upload process...');
        const uploadedAvatarUrl = await uploadAvatar(authUser.id, selectedFile);
        if (uploadedAvatarUrl) {
          newAvatarUrl = uploadedAvatarUrl;
          console.log('✅ [ProfileEditForm] Avatar uploaded successfully:', newAvatarUrl);
        } else {
          throw new Error('Failed to upload avatar');
        }
      }
      
      // Update profile data
      await updateUserProfile(authUser.id, {
        username,
        about: about || null,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      });
      
      // Update the local user state
      updateUserState({
        username,
        about,
        avatarUrl: newAvatarUrl,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      });
      
      setIsSuccess(true);
      
      // Show success toast
      toast({
        title: t('editForm.profileUpdatedSuccessfully'),
        description: t('editForm.profileChangesSaved'),
        className: "bg-green-50 border-green-200 text-green-800",
      });
      
      // Clear selected file after successful submission
      setSelectedFile(null);
      setSelectedFileName('');
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
      
      // Call onSaveComplete first to trigger refetch
      await onSaveComplete();
      
      // Small delay to ensure refetch completes and UI updates
      setTimeout(() => {
        // Navigate back to close the form after refetch is complete
        navigate(-1);
      }, 100);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      
      // Clear selected file on error
      setSelectedFile(null);
      setSelectedFileName('');
      
      toast({
        title: t('editForm.error'),
        description: t('editForm.failedToUpdateProfile'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const clearSocialLink = (platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin') => {
    switch (platform) {
      case 'facebook':
        setFacebookUrl('');
        break;
      case 'instagram':
        setInstagramUrl('');
        break;
      case 'twitter':
        setTwitterUrl('');
        break;
      case 'linkedin':
        setLinkedinUrl('');
        break;
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Set the selected file name for user feedback
    setSelectedFileName(file.name);
    setSelectedFile(file);
    
    console.log('🔍 [ProfileEditForm] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    // Check file type
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    console.log('🔍 [ProfileEditForm] File type check:', {
      isHeic,
      fileType: file.type,
      fileName: file.name,
      startsWithImage: file.type.startsWith('image/')
    });
    
    if (!file.type.startsWith('image/') && !isHeic) {
      console.log('❌ [ProfileEditForm] File type rejected');
      toast({
        title: t('editForm.invalidFileType'),
        description: t('editForm.selectImageFile'),
        variant: "destructive",
      });
      setSelectedFile(null);
      setSelectedFileName('');
      return;
    }
    
    // Show info for HEIC files
    if (isHeic) {
      console.log('✅ [ProfileEditForm] HEIC file detected, showing conversion message');
      toast({
        title: t('editForm.heicFileDetected'),
        description: t('editForm.convertingHeicToJpeg'),
      });
    }
    
    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: t('editForm.fileTooLarge'),
        description: t('editForm.profileImageSize'),
        variant: "destructive",
      });
      setSelectedFile(null);
      setSelectedFileName('');
      return;
    }
    
    // Show preview toast
    toast({
      title: t('editForm.fileSelected'),
      description: t('editForm.clickSaveToUpload'),
    });
  };

  const SocialMediaInput = ({ 
    platform, 
    value, 
    onChange, 
    placeholder, 
    label 
  }: {
    platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
  }) => {
    const hasValue = value.trim().length > 0;
    const originalValue = profile[`${platform}_url` as keyof User] as string;
    const isNewlyAdded = hasValue && !originalValue;
    const isModified = hasValue && originalValue && value !== originalValue;

    return (
      <div className="space-y-2 ">
        <Label htmlFor={`${platform}_url`} className="flex items-center gap-2">
          {label}
          {hasValue && (
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600 font-normal">
                {isNewlyAdded ? t('editForm.added') : isModified ? t('editForm.modified') : t('editForm.connected')}
              </span>
            </div>
          )}
        </Label>
        <div className="flex items-center gap-2">
  <Input
    id={`${platform}_url`}
    type="url"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`flex-1 ${hasValue ? 'border-green-300 bg-green-50/50' : ''}`}
  />
  {hasValue && (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-red-100"
        onClick={() => clearSocialLink(platform)}
        title="Remove link"
      >
        <X className="h-3 w-3 text-red-500" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-blue-100"
        onClick={() => window.open(value, '_blank')}
        title="Open link"
      >
        <ExternalLink className="h-3 w-3 text-blue-500" />
      </Button>
    </div>
  )}
</div>

      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-5">
      <div className="ottoman-card p-6 ">
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-24 w-24">
              {previewUrl ? (
                <AvatarImage 
                  src={previewUrl} 
                  alt={username} 
                />
              ) : avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username} />
              ) : (
                <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                  {getInitials(username)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="space-y-3">
              <input
                type="file"
                id="profile-picture-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isLoading}
              />
              
              <label
                htmlFor="profile-picture-upload"
                className={`
                  inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                  border border-gray-300 bg-white text-gray-700
                  hover:bg-gray-50 hover:border-gray-400
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ottoman-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer transition-colors duration-200
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('editForm.changeProfilePicture')}
              </label>
              
              {selectedFileName && (
                <div className="text-center">
                  <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {selectedFileName}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
              <div className={`space-y-2 ${direction === 'rtl' ? 'text-right' : ''}`}>
                <Label 
                  className={direction === 'rtl' ? 'text-right block' : ''} 
                  htmlFor="username"
                  style={direction === 'rtl' ? { textAlign: 'right', display: 'block' } : {}}
                >
                  {t('editForm.username')}
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('editForm.username')}
                  required
                  className={direction === 'rtl' ? 'text-right' : ''}
                  dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                />
              </div>
              
              <div className={`space-y-2 ${direction === 'rtl' ? 'text-right' : ''}`}>
                <Label className={direction === 'rtl' ? 'text-right block' : ''} htmlFor="about">{t('editForm.about')}</Label>
                <Textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder={t('editForm.aboutPlaceholder')}
                  className={`min-h-[120px] ${direction === 'rtl' ? 'text-right' : ''}`}
                  dir={direction === 'rtl' ? 'rtl' : 'ltr'}
                />
              </div>

            <div className="space-y-4">
              <h4 className={`font-medium ${direction === 'rtl' ? 'text-right' : ''}`}> <span>{t('editForm.socialMediaLinks')}</span> </h4>
              <div className="grid grid-cols-1 gap-4">
                <SocialMediaInput
                  platform="facebook"
                  value={facebookUrl}
                  onChange={setFacebookUrl}
                  placeholder={t('editForm.facebookPlaceholder')}
                  label={t('editForm.facebook')}
                />
                <SocialMediaInput
                  platform="instagram"
                  value={instagramUrl}
                  onChange={setInstagramUrl}
                  placeholder={t('editForm.instagramPlaceholder')}
                  label={t('editForm.instagram')}
                />
                <SocialMediaInput
                  platform="twitter"
                  value={twitterUrl}
                  onChange={setTwitterUrl}
                  placeholder={t('editForm.twitterPlaceholder')}
                  label={t('editForm.twitter')}
                />
                <SocialMediaInput
                  platform="linkedin"
                  value={linkedinUrl}
                  onChange={setLinkedinUrl}
                  placeholder={t('editForm.linkedinPlaceholder')}
                  label={t('editForm.linkedin')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleCancel}
          disabled={isLoading}
        >
          {t('editForm.cancel')}
        </Button>
        
        <Button 
          type="submit"
          disabled={isLoading}
          className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('editForm.saving')}
            </>
          ) : isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t('editForm.saved')}
            </>
          ) : (
            t('editForm.saveChanges')
          )}
        </Button>
      </div>
    </form>
  );
}
