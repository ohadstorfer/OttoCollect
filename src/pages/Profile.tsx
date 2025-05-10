
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileAbout } from '@/components/profile/ProfileAbout';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/services/profileService';
import { fetchUserCollection } from '@/services/collectionService';
import CountrySelection from '@/pages/CountrySelection';
import { DynamicFilterState } from '@/types/filter';
import CountryDetailCollection from './CountryDetailCollection';
import { ChevronLeft } from 'lucide-react';

const Profile: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  const username = routeUsername || authUser?.username;
  const isOwnProfile = authUser?.username === username;

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getUserProfile(username || ''),
    enabled: !!username,
    retry: false,
  });

  // Handle save completion for profile edit
  const handleSaveComplete = async () => {
    await refetchProfile();
    setIsEditMode(false);
  };

  // Handle country selection
  const handleCountrySelect = (countryId: string, countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedCountryId(countryId);
  };

  // Handle going back to country selection
  const handleBackToCountries = () => {
    setSelectedCountry(null);
    setSelectedCountryId(null);
  };

  if (profileLoading) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="flex justify-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-gray-200 h-24 w-24 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Profile Not Found</h2>
          <p className="mb-6 text-muted-foreground">
            The profile you are looking for does not exist.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-5xl mx-auto py-10">
      <ProfileHeader profile={profile} />

      <Tabs defaultValue="collection" className="w-full mt-8">
        <TabsList>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="space-y-4">
          {selectedCountry ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToCountries}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Countries
                </Button>
                <h2 className="text-xl font-semibold">{selectedCountry} Collection</h2>
              </div>
              
              {selectedCountryId && (
                <CountryDetailCollection 
                  key={`${profile.id}-${selectedCountryId}`} 
                  userId={profile.id}
                  isOwner={isOwnProfile}
                />
              )}
            </div>
          ) : (
            <CountrySelection 
              showHeader={false}
              customTitle={`${isOwnProfile ? "My" : `${profile.username}'s`} Collection`}
              customDescription={`Browse ${isOwnProfile ? "your" : `${profile.username}'s`} collection by country`}
              profileId={profile.id}
              isOwnProfile={isOwnProfile}
              onCountrySelect={handleCountrySelect}
            />
          )}
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          {isEditMode ? (
            <ProfileEditForm 
              profile={profile} 
              onCancel={() => setIsEditMode(false)} 
              onSaveComplete={handleSaveComplete} 
            />
          ) : (
            <ProfileAbout 
              profile={profile} 
              onEditClick={isOwnProfile ? () => setIsEditMode(true) : undefined} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
