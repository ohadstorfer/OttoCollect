
// Import necessary components and hooks
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileAbout } from "@/components/profile/ProfileAbout";
import ProfileCollection from "@/components/profile/ProfileCollection";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { getUserProfile } from "@/services/profileService";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/types";

function Profile() {
  const [isEditMode, setIsEditMode] = useState(false);
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  
  // Fix the type error by using the correct TanStack query syntax
  const { 
    data: profile, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => getUserProfile(id as string),
    enabled: !!id,
  });

  // Fix the refetchCollection function to return void
  const refetchCollection = async () => {
    await refetch();
    return;
  };
  
  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Check if the profile being viewed belongs to the current user
  const isOwnProfile = currentUser?.id === id;

  if (isLoading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load user profile. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {isEditMode ? (
        <ProfileEditForm 
          profile={profile as User} 
          onCancel={handleToggleEditMode} 
          onSave={() => {
            refetch().then(() => {
              setIsEditMode(false);
            });
          }}
        />
      ) : (
        <ProfileHeader 
          profile={profile as User}
          onEdit={handleToggleEditMode}
          onProfileUpdate={refetch}
        />
      )}

      {!isEditMode && (
        <Tabs defaultValue="about" className="w-full">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
          </TabsList>
          <TabsContent value="about">
            <ProfileAbout profile={profile as User} />
          </TabsContent>
          <TabsContent value="collection">
            <ProfileCollection 
              userId={id as string} 
              isOwnProfile={isOwnProfile} 
              onRetry={refetchCollection}
              username={profile.username}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default Profile;
