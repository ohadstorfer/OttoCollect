import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/services/profileService';
import { Button } from '@/components/ui/button';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import ProfileCountrySelection from '@/components/profile/ProfileCountrySelection';

const Profile: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [showCountryDetail, setShowCountryDetail] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);

  const username = routeUsername || authUser?.username;

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

  // Determine if this is the user's own profile by comparing IDs
  const isOwnProfile = React.useMemo(() => {
    if (!authUser || !profile) return false;
    return authUser.id === profile.id;
  }, [authUser, profile]);
  
  // Add debug logging to help troubleshoot
  React.useEffect(() => {
    console.log('Profile component state:', {
      routeUsername,
      'authUser?.id': authUser?.id,
      'profile?.id': profile?.id,
      isOwnProfile
    });
  }, [routeUsername, authUser, profile, isOwnProfile]);

  // Store and restore the selected country when navigating back to profile
  React.useEffect(() => {
    // When the component mounts, try to restore the selected country
    if (profile?.id) {
      const storedCountry = sessionStorage.getItem(`profile-selected-country-${profile.id}`);
      const wasShowingDetail = sessionStorage.getItem(`profile-showing-detail-${profile.id}`) === 'true';
      
      if (storedCountry) {
        setSelectedCountry(storedCountry);
        setShowCountryDetail(wasShowingDetail);
      }
    }
  }, [profile?.id]);
  
  // Update session storage when selected country changes
  React.useEffect(() => {
    if (profile?.id && selectedCountry !== null) {
      sessionStorage.setItem(`profile-selected-country-${profile.id}`, selectedCountry);
      sessionStorage.setItem(`profile-showing-detail-${profile.id}`, String(showCountryDetail));
    }
  }, [profile?.id, selectedCountry, showCountryDetail]);

  // Handlers for country selection and back navigation
  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setShowCountryDetail(true);
  };

  const handleBackToCountries = () => {
    setShowCountryDetail(false);
  };

  // Handle save completion for profile edit
  const handleSaveComplete = async () => {
    setIsEditingProfile(false);
    await refetchProfile();
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

  // Add explicit debug log for userId at the point of passing as prop
  React.useEffect(() => {
    if (profile?.id) {
      console.log("[DEBUG][Profile] Passing userId prop to ProfileCountrySelection:", profile.id, "| typeof:", typeof profile.id);
    }
  }, [profile?.id]);

  // Render profile edit form if editing and is owner
  if (isEditingProfile && isOwnProfile) {
    return (
      <div className="page-container max-w-5xl mx-auto py-5">
        <ProfileEditForm
          profile={profile}
          onCancel={() => setIsEditingProfile(false)}
          onSaveComplete={handleSaveComplete}
        />
      </div>
    );
  }

  return ( 
    <div>
      <div className="page-container max-w-5xl mx-auto py-5">
        <ProfileHeader 
          profile={profile} 
          isEditingProfile={isEditingProfile} 
          onEditProfileClick={() => setIsEditingProfile(true)}
        />
      </div>

      {/* Directly render the country selection/collection view */}
      <div className="  mx-auto py-5">
        <ProfileCountrySelection
          userId={profile.id}
          isOwnProfile={isOwnProfile}
          selectedCountry={selectedCountry}
          showCountryDetail={showCountryDetail}
          onCountrySelect={handleCountrySelect}
          onBackToCountries={handleBackToCountries}
          profileId={profile.id}
        />
      </div>
    </div>
  );
};

export default Profile;
