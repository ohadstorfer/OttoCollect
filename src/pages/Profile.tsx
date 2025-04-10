
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserProfile } from "@/services/profileService";
import { Spinner } from "@/components/ui/spinner";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ProfileCollection } from "@/components/profile/ProfileCollection";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchUserCollection } from "@/services/collectionService";
import { fetchBanknotes } from "@/services/banknoteService";
import { fetchUserWishlist } from "@/services/wishlistService";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id;
  const userId = profile?.id || '';

  // Fetch profile data
  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        // If no ID is provided in the URL, and user is logged in, show own profile
        if (currentUser) {
          navigate(`/profile/${currentUser.id}`);
        } else {
          navigate('/auth');
        }
        return;
      }

      setLoading(true);
      const profileData = await getUserProfile(id);
      
      if (profileData) {
        setProfile(profileData);
      } else {
        toast.error("Could not load profile");
        navigate('/');
      }
      
      setLoading(false);
    }

    loadProfile();
  }, [id, currentUser, navigate]);

  // Fetch collection data is now handled by ProfileCollection component

  const handleProfileUpdated = (updatedProfile: User) => {
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-3xl font-serif mb-4">Profile Not Found</h1>
          <p className="text-ottoman-300 mb-6">The requested profile could not be found.</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header is always visible */}
        <ProfileHeader profile={profile} />
        
        {isEditing ? (
          <Card className="mt-6">
            <ProfileEditForm 
              profile={profile} 
              onProfileUpdated={handleProfileUpdated} 
              onCancel={() => setIsEditing(false)}
            />
          </Card>
        ) : (
          <div className="mt-6">
            <Card>
              <ProfileCollection 
                userId={profile.id}
                isCurrentUser={isOwnProfile || false}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
