import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserProfile } from '@/services/profileService';
import { Button } from '@/components/ui/button';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import ProfileCountrySelection from '@/components/profile/ProfileCountrySelection';
import { useTheme } from "@/context/ThemeContext";
import { Card } from '@/components/ui/card';
import { fetchCountryByName, fetchCountryById } from '@/services/countryService';
import { useLanguage } from '@/context/LanguageContext';

const Profile: React.FC = () => {
  const { username: routeUsername, country: routeCountry } = useParams<{ username?: string; country?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const { t } = useTranslation(['profile']);
  const { currentLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [showCountryDetail, setShowCountryDetail] = React.useState(false);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isLoadingCountry, setIsLoadingCountry] = React.useState(false);
  const { theme } = useTheme();

  // Check if we should show badges dialog from URL parameter
  const showBadges = searchParams.get('showBadges') === 'true';

  const username = routeUsername || authUser?.username;

  // Scroll position management for smooth loading
  React.useEffect(() => {
    // Keep page at top during country loading
    if (routeCountry && isLoadingCountry) {
      window.scrollTo(0, 0);
    }
  }, [routeCountry, isLoadingCountry]);

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile', username, currentLanguage],
    queryFn: () => getUserProfile(username || '', currentLanguage),
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
      routeCountry,
      'authUser?.id': authUser?.id,
      'profile?.id': profile?.id,
      'profile?.avatarUrl': profile?.avatarUrl,
      'authUser?.avatarUrl': authUser?.avatarUrl,
      isOwnProfile,
      selectedCountry,
      showCountryDetail,
      isLoadingCountry
    });
  }, [routeUsername, routeCountry, authUser, profile, isOwnProfile, selectedCountry, showCountryDetail, isLoadingCountry]);

  // Handle country selection from URL parameter
  React.useEffect(() => {
    if (routeCountry && profile?.id) {
      setIsLoadingCountry(true);
      
      // Check if routeCountry is a UUID (country ID) or country name
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(routeCountry);
      
      const fetchCountryData = async () => {
        try {
          if (isUuid) {
            // It's a country ID, fetch the country name
            const countryData = await fetchCountryById(routeCountry);
            if (countryData) {
              setSelectedCountry(routeCountry);
              setShowCountryDetail(true);
            }
          } else {
            // It's a country name, fetch the country ID
            const countryData = await fetchCountryByName(decodeURIComponent(routeCountry));
            if (countryData) {
              setSelectedCountry(countryData.id);
              setShowCountryDetail(true);
            }
          }
        } catch (error) {
          console.error('Error fetching country data:', error);
        } finally {
          setIsLoadingCountry(false);
        }
      };
      
      fetchCountryData();
    } else if (profile?.id) {
      // No country in URL, reset to country selection view
      setSelectedCountry(null);
      setShowCountryDetail(false);
      setIsLoadingCountry(false);
    }
  }, [routeCountry, profile?.id]);

  // Handlers for country selection and back navigation
  const handleCountrySelect = (countryId: string, countryName: string) => {
    setSelectedCountry(countryId);
    setShowCountryDetail(true);
    
    // Update URL to include the country
    const encodedCountryName = encodeURIComponent(countryName);
    navigate(`/profile/${username}/${encodedCountryName}`, { replace: true });
  };

  const handleBackToCountries = () => {
    setShowCountryDetail(false);
    setSelectedCountry(null);
    
    // Update URL to remove the country parameter
    navigate(`/profile/${username}`, { replace: true });
  };

  // Handle save completion for profile edit
  const handleSaveComplete = async () => {
    setIsEditingProfile(false);
    
    // Invalidate and refetch the profile data
    await queryClient.invalidateQueries({ queryKey: ['profile', username] });
    await refetchProfile();
    
    // Also invalidate any other profile-related queries
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  if (profileLoading || (routeCountry && isLoadingCountry)) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10 mb-20">
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
          <h2 className="text-2xl font-serif mb-4"><span>{t('errors.profileNotFound')}</span></h2>
          <p className="mb-6 text-muted-foreground">
            {t('errors.profileNotFoundDescription')}
          </p>
          <Button onClick={() => navigate('/')}>{t('errors.goHome')}</Button>
        </div>
      </div>
    );
  }

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
    <div className='mb-20'>
      <section className={`${theme === 'light' ? 'bg-ottoman-100/50' : 'bg-dark-600'} py-0 sm:py-6 relative overflow-hidden `}>
      <div className="w-[90%] sm:w-[92%] mx-auto py-5">
     
        <ProfileHeader 
          profile={profile} 
          isEditingProfile={isEditingProfile} 
          onEditProfileClick={() => setIsEditingProfile(true)}
          showBadges={showBadges}
        />
        
      </div>
      </section>

      {/* Directly render the country selection/collection view */}
      <div className="mt-4">
        {authUser ? (
          <ProfileCountrySelection
            userId={profile.id}
            isOwnProfile={isOwnProfile}
            selectedCountry={selectedCountry}
            showCountryDetail={showCountryDetail}
            onCountrySelect={handleCountrySelect}
            onBackToCountries={handleBackToCountries}
            profileId={profile.id}
            profile={profile}
          />
        ) : (
          <div className="flex justify-center w-full mb-4">
            <Card className="p-8 text-center bg-card w-[90%] sm:w-[600px]">
              <h3 className="text-2xl font-semibold mb-4"><span>{t('auth.authenticationRequired')}</span></h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                {t('auth.authenticationRequiredDescription')}
              </p>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate('/auth?mode=login')}
                  className="font-semibold"
                >
                  {t('auth.logIn')}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

