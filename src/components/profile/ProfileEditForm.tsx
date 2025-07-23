
import React, { useState } from 'react';
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
import { Loader2, Upload } from 'lucide-react';

export interface ProfileEditFormProps {
  profile: User;
  onCancel: () => void;
  onSaveComplete: () => void;
}

export function ProfileEditForm({ profile, onCancel, onSaveComplete }: ProfileEditFormProps) {
  const { user: authUser, updateUserState } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username);
  const [about, setAbout] = useState(profile.about || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(profile.facebook_url || '');
  const [instagramUrl, setInstagramUrl] = useState(profile.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(profile.twitter_url || '');
  const [isLoading, setIsLoading] = useState(false);
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
    
    try {
      await updateUserProfile(authUser.id, {
        username,
        about: about || null,
        facebook_url: facebookUrl || null,
        instagram_url: instagramUrl || null,
        twitter_url: twitterUrl || null,
      });
      
      // Update the local user state
      updateUserState({
        username,
        about,
        avatarUrl,
        facebook_url: facebookUrl,
        instagram_url: instagramUrl,
        twitter_url: twitterUrl,
      });
      
      onSaveComplete();
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="ottoman-card p-6">
        <h3 className="text-xl font-medium mb-4"><span>Edit Profile</span></h3>
        
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
              <h4 className="font-medium">Social Media Links</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook</Label>
                  <Input
                    id="facebook_url"
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/your-profile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/your-profile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter_url">Twitter/X</Label>
                  <Input
                    id="twitter_url"
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://twitter.com/your-profile"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        <Button 
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
