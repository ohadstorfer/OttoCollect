
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserProfile } from "@/services/profileService";
import { Spinner } from "@/components/ui/spinner";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileAbout } from "@/components/profile/ProfileAbout";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { SendMessage } from "@/components/messages/SendMessage";
import { toast } from "sonner";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

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
        <div className="ottoman-card overflow-hidden shadow-lg">
          {isOwnProfile && !isEditing && (
            <div className="absolute top-4 right-4 z-10">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-ottoman-700/50 text-ottoman-100 border-ottoman-600"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}

          {isEditing ? (
            <ProfileEditForm 
              profile={profile} 
              onProfileUpdated={handleProfileUpdated} 
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <ProfileHeader profile={profile} />
              
              <div className="p-6">
                <ProfileAbout profile={profile} />
                
                {!isOwnProfile && currentUser && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      onClick={() => setShowMessageDialog(true)}
                      className="w-full max-w-sm"
                    >
                      Send Message
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isOwnProfile && currentUser && (
        <SendMessage 
          receiverId={profile.id} 
          receiverName={profile.username}
          isOpen={showMessageDialog}
          onOpenChange={setShowMessageDialog}
        />
      )}
    </div>
  );
}
