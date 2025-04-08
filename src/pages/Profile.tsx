
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileAbout from '@/components/profile/ProfileAbout';
import ProfileCollection from '@/components/profile/ProfileCollection';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import MessageButton from '@/components/messages/MessageButton';
import { useAuth } from '@/context/AuthContext';
import { fetchUserProfile } from '@/services/profileService';
import { User } from '@/types';

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  
  // Default to current user if no ID is provided
  const userId = id || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) {
        navigate('/auth', { replace: true });
        return;
      }

      setLoading(true);
      try {
        const userData = await fetchUserProfile(userId);
        if (userData) {
          setUser(userData);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'User not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleProfileSaved = (updatedUser: User) => {
    setUser(updatedUser);
    setIsEditing(false);
  };

  return (
    <div className="page-container py-8">
      <div className="mb-8">
        <ProfileHeader 
          user={user} 
          isOwnProfile={isOwnProfile} 
          onEditClick={() => setIsEditing(true)} 
        />
        
        {!isOwnProfile && (
          <div className="mt-4">
            <MessageButton userId={user.id} username={user.username} variant="outline" />
          </div>
        )}
      </div>

      {isEditing ? (
        <ProfileEditForm 
          user={user} 
          onCancel={() => setIsEditing(false)}
          onSave={handleProfileSaved}
        />
      ) : (
        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="collection">
            <ProfileCollection userId={user.id} isOwnProfile={isOwnProfile} />
          </TabsContent>
          <TabsContent value="about">
            <ProfileAbout user={user} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Profile;
