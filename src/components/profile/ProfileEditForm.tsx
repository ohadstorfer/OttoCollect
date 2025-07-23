
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export interface ProfileEditFormProps {
  profile: User;
  onCancel: () => void;
  onSaveComplete: () => void;
}

export function ProfileEditForm({ profile, onCancel, onSaveComplete }: ProfileEditFormProps) {
  const navigate = useNavigate();
  const { user: authUser, updateUserState } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username);
  const [about, setAbout] = useState(profile.about || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(profile.facebook_url || '');
  const [instagramUrl, setInstagramUrl] = useState(profile.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(profile.twitter_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authUser) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setIsSuccess(false);
    
    try {
      await updateUserProfile(authUser.id, {
        username,
        about: about || null,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
      });
      
      // Update the local user state
      updateUserState({
        username,
        about,
        avatarUrl,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
      });
      
      setIsSuccess(true);
      
      // Show success toast
      toast({
        title: "Profile updated successfully!",
        description: "Your profile changes have been saved.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
      
      onSaveComplete();
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const clearSocialLink = (platform: 'facebook' | 'instagram' | 'twitter') => {
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
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "File too large",
        description: "Profile image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newAvatarUrl = await uploadAvatar(authUser.id, file);
      
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        // Update the local user state
        updateUserState({
          avatarUrl: newAvatarUrl,
        });
        
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SocialMediaInput = ({ 
    platform, 
    value, 
    onChange, 
    placeholder, 
    label 
  }: {
    platform: 'facebook' | 'instagram' | 'twitter';
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
      <div className="space-y-2">
        <Label htmlFor={`${platform}_url`} className="flex items-center gap-2">
          {label}
          {hasValue && (
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600 font-normal">
                {isNewlyAdded ? 'Added' : isModified ? 'Modified' : 'Connected'}
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
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username} />
              ) : (
                <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                  {getInitials(username)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Change profile picture
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Tell us a bit about yourself and your collection interests..."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium"> <span> Social Media Links </span> </h4>
              <div className="grid grid-cols-1 gap-4">
                <SocialMediaInput
                  platform="facebook"
                  value={facebookUrl}
                  onChange={setFacebookUrl}
                  placeholder="https://facebook.com/your-profile"
                  label="Facebook"
                />
                <SocialMediaInput
                  platform="instagram"
                  value={instagramUrl}
                  onChange={setInstagramUrl}
                  placeholder="https://instagram.com/your-profile"
                  label="Instagram"
                />
                <SocialMediaInput
                  platform="twitter"
                  value={twitterUrl}
                  onChange={setTwitterUrl}
                  placeholder="https://twitter.com/your-profile"
                  label="Twitter/X"
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
          Cancel
        </Button>
        
        <Button 
          type="submit"
          disabled={isLoading}
          className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
