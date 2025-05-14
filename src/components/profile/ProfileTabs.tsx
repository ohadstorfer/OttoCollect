
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { User } from '@/types';
import ProfileCountrySelection from './ProfileCountrySelection';

interface ProfileTabsProps {
  profile: User;
  isOwnProfile: boolean;
  onSaveComplete: () => Promise<void>;
  userId: string;
  selectedCountry: string | null;
  showCountryDetail: boolean;
  setSelectedCountry: (country: string | null) => void;
  setShowCountryDetail: (show: boolean) => void;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  profile,
  isOwnProfile,
  onSaveComplete,
  userId,
  selectedCountry,
  showCountryDetail,
  setSelectedCountry,
  setShowCountryDetail
}) => {
  // Handle country selection
  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setShowCountryDetail(true);
  };

  // Handler to go back to country selection
  const handleBackToCountries = () => {
    setShowCountryDetail(false);
    setSelectedCountry(null);
    
    // Clear the session storage when explicitly going back to country selection
    if (profile?.id) {
      sessionStorage.removeItem(`profile-selected-country-${profile.id}`);
      sessionStorage.removeItem(`profile-showing-detail-${profile.id}`);
    }
  };

  return (
    <Tabs defaultValue="collection" className="w-full">
      <div className="page-container max-w-5xl mx-auto">
        <TabsList className="inline-flex">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="editProfile">Edit Profile</TabsTrigger>}
        </TabsList>
      </div>

      <TabsContent value="collection" >
        <ProfileCountrySelection
          userId={userId}
          isOwnProfile={isOwnProfile}
          selectedCountry={selectedCountry}
          showCountryDetail={showCountryDetail}
          onCountrySelect={handleCountrySelect}
          onBackToCountries={handleBackToCountries}
          profileId={profile.id}
        />
      </TabsContent>

      {isOwnProfile && (
        <TabsContent value="editProfile" >
          <ProfileEditForm 
            profile={profile} 
            onCancel={() => {}} 
            onSaveComplete={onSaveComplete} 
          />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default ProfileTabs;
