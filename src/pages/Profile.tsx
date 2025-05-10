import React from 'react';
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
import ProfileCollection from '@/components/profile/ProfileCollection';
import { DynamicFilterState } from '@/types/filter';
import CountrySelection from '@/pages/CountrySelection';
import CountryDetailCollection from '@/pages/CountryDetailCollection';

const Profile: React.FC = () => {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [showCountryDetail, setShowCountryDetail] = React.useState(false);
  const [filters, setFilters] = React.useState<DynamicFilterState>({
    search: '',
    categories: [],
    types: [],
    sort: [],
  });

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

  const {
    data: collectionItems,
    isLoading: collectionLoading,
    error: collectionError,
    refetch: refetchCollection,
  } = useQuery({
    queryKey: ['collection', profile?.id],
    queryFn: () => (profile?.id ? fetchUserCollection(profile.id) : Promise.resolve([])),
    enabled: !!profile?.id,
  });

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  // Custom handler for country selection
  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setShowCountryDetail(true);
  };

  // Handler to go back to country selection
  const handleBackToCountries = () => {
    setShowCountryDetail(false);
    setSelectedCountry(null);
  };

  // Prepare filtered items
  const filteredItems = React.useMemo(() => {
    if (!collectionItems) return [];
    
    return collectionItems.filter((item) => {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch =
        (item.banknote?.denomination || "").toLowerCase().includes(searchTerm) ||
        (item.banknote?.country || "").toLowerCase().includes(searchTerm) ||
        (item.banknote?.year || "").toLowerCase().includes(searchTerm);

      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(item.banknote?.category || '');

      const matchesType = filters.types.length === 0 || filters.types.includes(item.banknote?.type || '');

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [collectionItems, filters]);

  // Process collection categories
  const collectionCategories = React.useMemo(() => {
    if (!collectionItems || collectionItems.length === 0) return [];

    const categoryCounts: { [key: string]: number } = {};
    collectionItems.forEach((item) => {
      const category = item.banknote?.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectionItems]);

  // Process collection types
  const collectionTypes = React.useMemo(() => {
    if (!collectionItems || collectionItems.length === 0) return [];

    const typeCounts: { [key: string]: number } = {};
    collectionItems.forEach((item) => {
      const type = item.banknote?.type || 'Unknown Type';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectionItems]);

  // Handle save completion for profile edit
  const handleSaveComplete = async () => {
    await refetchProfile();
    setIsEditMode(false);
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
          {showCountryDetail && selectedCountry ? (
            <div>
              <Button 
                variant="outline" 
                onClick={handleBackToCountries} 
                className="mb-4"
              >
                ← Back to Countries
              </Button>
              <CountryDetailCollection 
                key={`${profile.id}-${selectedCountry}`} 
                userId={profile.id}
                countryName={selectedCountry}
              />
            </div>
          ) : (
            <CountrySelection 
              showHeader={false}
              customTitle={`${isOwnProfile ? 'My' : `${profile.username}'s`} Collection`}
              customDescription="Browse your banknote collection by country" 
              userId={profile.id}
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
