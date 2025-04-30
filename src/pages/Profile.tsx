import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileAbout from '@/components/profile/ProfileAbout';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '@/services/profileService';
import { fetchUserCollection } from '@/services/collectionService';
import ProfileCollection from '@/components/profile/ProfileCollection';
import { DynamicFilterState } from '@/types/filter';

interface ProfileParams {
  username?: string;
}

const Profile: React.FC = () => {
  const { username: routeUsername } = useParams<ProfileParams>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isEditMode, setIsEditMode] = React.useState(false);
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
  } = useQuery(
    ['profile', username],
    () => fetchUserProfile(username || ''),
    {
      enabled: !!username,
      retry: false,
    }
  );

  const {
    data: collectionItems,
    isLoading: collectionLoading,
    error: collectionError,
    refetch: refetchCollection,
  } = useQuery(
    ['collection', profile?.id],
    () => (profile?.id ? fetchUserCollection(profile.id) : Promise.resolve([])),
    {
      enabled: !!profile?.id,
    }
  );

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const filteredItems = React.useMemo(() => {
    return collectionItems
      ? collectionItems.filter((item) => {
          const searchTerm = filters.search.toLowerCase();
          const matchesSearch =
            item.banknote.denomination.toLowerCase().includes(searchTerm) ||
            item.banknote.country.toLowerCase().includes(searchTerm) ||
            item.banknote.year.toLowerCase().includes(searchTerm);

          const matchesCategory =
            filters.categories.length === 0 || filters.categories.includes(item.banknote.category || '');

          const matchesType = filters.types.length === 0 || filters.types.includes(item.banknote.type || '');

          return matchesSearch && matchesCategory && matchesType;
        })
      : [];
  }, [collectionItems, filters]);

  const collectionCategories = React.useMemo(() => {
    if (!collectionItems) return [];

    const categoryCounts: { [key: string]: number } = {};
    collectionItems.forEach((item) => {
      const category = item.banknote.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectionItems]);

  const collectionTypes = React.useMemo(() => {
    if (!collectionItems) return [];

    const typeCounts: { [key: string]: number } = {};
    collectionItems.forEach((item) => {
      const type = item.banknote.type || 'Unknown Type';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collectionItems]);

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

  if (profileError) {
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
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onProfileUpdate={refetchProfile}
      />

      <Tabs defaultValue="collection" className="w-full mt-8">
        <TabsList>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="space-y-4">
          <ProfileCollection
            userId={profile.id}
            username={profile.username}
            isOwnProfile={isOwnProfile}
            collectionItems={collectionItems || []}
            isLoading={collectionLoading}
            error={collectionError?.message || null}
            onRetry={() => refetchCollection()}
            filters={filters}
            onFilterChange={handleFilterChange}
            filteredItems={filteredItems}
            collectionCategories={collectionCategories}
            collectionTypes={collectionTypes}
          />
        </TabsContent>
        <TabsContent value="about" className="space-y-4">
          {isEditMode ? (
            <ProfileEditForm profile={profile} onCancel={() => setIsEditMode(false)} onSave={refetchProfile} />
          ) : (
            <ProfileAbout profile={profile} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
