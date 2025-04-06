
import React, { useState } from "react";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { updateUserProfile, uploadAvatar } from "@/services/profileService";
import { Camera } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileEditFormProps {
  profile: User;
  onProfileUpdated: (updatedProfile: User) => void;
  onCancel: () => void;
}

export function ProfileEditForm({ profile, onProfileUpdated, onCancel }: ProfileEditFormProps) {
  const [username, setUsername] = useState(profile.username);
  const [about, setAbout] = useState(profile.about || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const newAvatarUrl = await uploadAvatar(profile.id, file);
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        toast.success('Profile picture updated successfully');
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const success = await updateUserProfile(profile.id, {
        username,
        about: about.trim() || null
      });

      if (success) {
        onProfileUpdated({
          ...profile,
          username,
          about: about.trim() || undefined,
          avatarUrl: avatarUrl || profile.avatarUrl
        });
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <Avatar className="h-32 w-32 border-4 border-background bg-background shadow-lg cursor-pointer group-hover:opacity-80 transition-opacity"
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={username} />
            ) : (
              <AvatarFallback className="text-3xl bg-ottoman-700 text-ottoman-100">
                {getInitials(username)}
              </AvatarFallback>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-10 w-10 text-white drop-shadow-md" />
            </div>
          </Avatar>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={uploading}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <div className="animate-spin h-8 w-8 border-4 border-ottoman-300 border-t-ottoman-600 rounded-full" />
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Click to change avatar</p>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="about">About</Label>
          <Textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Tell others about yourself..."
            rows={5}
            className="resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {about.length}/500
          </p>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
