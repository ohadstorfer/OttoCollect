
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Grid, PlusSquare, Search, Star, Info } from 'lucide-react';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { Input } from '@/components/ui/input';
import BanknoteCard from '@/components/banknotes/BanknoteCard';
import { Spinner } from '@/components/ui/spinner';
import { CollectionItem, Banknote, User } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCollection } from '@/services/collectionService';
import { fetchBanknotes } from '@/services/banknoteService';
import { fetchUserWishlist } from '@/services/wishlistService';

interface ProfileCollectionProps {
  userId: string;
  userCollection?: CollectionItem[];
  banknotes?: Banknote[];
  wishlistItems?: any[];
  collectionLoading?: boolean;
  isCurrentUser: boolean;
  // For backward compatibility with Profile.tsx
  profile?: User;
  isOwnProfile?: boolean;
}

interface FilterState {
  searchTerm: string;
  isMissingOnly: boolean;
}

const ProfileCollection = ({ 
  userId, 
  userCollection: initialCollection, 
  banknotes: initialBanknotes, 
  wishlistItems: initialWishlist, 
  collectionLoading: initialLoading,
  isCurrentUser,
  profile,
  isOwnProfile
}: ProfileCollectionProps) => {
  // If props are passed from the old Profile.tsx format, extract userId and isCurrentUser
  const effectiveUserId = userId || (profile?.id || '');
  const isEffectiveCurrentUser = isCurrentUser || isOwnProfile || false;

  // Use React Query to fetch data if not provided via props
  const { data: fetchedCollection, isLoading: collectionQueryLoading } = useQuery({
    queryKey: ['userCollection', effectiveUserId],
    queryFn: () => fetchUserCollection(effectiveUserId),
    enabled: !initialCollection && !!effectiveUserId
  });

  const { data: fetchedBanknotes, isLoading: banknotesQueryLoading } = useQuery({
    queryKey: ['banknotes'],
    queryFn: fetchBanknotes,
    enabled: !initialBanknotes
  });

  const { data: fetchedWishlist, isLoading: wishlistQueryLoading } = useQuery({
    queryKey: ['userWishlist', effectiveUserId],
    queryFn: () => fetchUserWishlist(effectiveUserId),
    enabled: !initialWishlist && !!effectiveUserId
  });

  // Use either the props or fetched data
  const userCollection = initialCollection || fetchedCollection || [];
  const banknotes = initialBanknotes || fetchedBanknotes || [];
  const wishlistItems = initialWishlist || fetchedWishlist || [];
  const collectionLoading = initialLoading || collectionQueryLoading || banknotesQueryLoading || wishlistQueryLoading;

  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ searchTerm: '', isMissingOnly: false });
  const [activeTab, setActiveTab] = useState<"collection" | "missing" | "catalog" | "wishlist">("collection");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const toggleMissingOnly = () => {
    setFilter(prev => ({ ...prev, isMissingOnly: !prev.isMissingOnly }));
  };

  const filteredCollection = userCollection.filter(item => {
    const banknote = banknotes.find(b => b.id === item.banknoteId);
    if (!banknote) return false;

    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  const missingItems = banknotes.filter(banknote => !userCollection.find(item => item.banknoteId === banknote.id));

  const filteredMissing = missingItems.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  const filteredCatalog = banknotes.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  const emptyStateMessages = {
    collection: "No items in collection yet.",
    missing: "No missing items are being tracked.",
    catalog: "No catalog entries match the current filters.",
    wishlist: "No items on the wishlist yet."
  };

  return (
    <Tabs defaultValue="collection" className="w-full" onValueChange={(value) => setActiveTab(value as "collection" | "missing" | "catalog" | "wishlist")}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="collection">
          <Grid className="h-4 w-4 mr-2" />
          Collection ({userCollection.length})
        </TabsTrigger>
        <TabsTrigger value="missing">
          <PlusSquare className="h-4 w-4 mr-2" />
          Missing ({missingItems.length})
        </TabsTrigger>
        <TabsTrigger value="catalog">
          <Info className="h-4 w-4 mr-2" />
          Catalog ({banknotes.length})
        </TabsTrigger>
        <TabsTrigger value="wishlist">
          <Star className="h-4 w-4 mr-2" />
          Wishlist ({wishlistItems.length})
        </TabsTrigger>
      </TabsList>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search denomination, country, year..."
            value={filter.searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        {activeTab === "missing" && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={toggleMissingOnly}
          >
            {filter.isMissingOnly ? "Show All" : "Show Missing Only"}
          </Button>
        )}
      </div>

      <TabsContent value="collection" className="mt-6">
        {collectionLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : filteredCollection.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCollection.map(item => {
              const banknote = banknotes.find(b => b.id === item.banknoteId);
              if (!banknote) return null;

              return (
                <CollectionItemCard
                  key={item.id}
                  item={item}
                  banknote={banknote}
                />
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p>{emptyStateMessages.collection}</p>
            {isEffectiveCurrentUser && (
              <Button onClick={() => navigate('/catalog')}>
                Browse Catalog
              </Button>
            )}
          </Card>
        )}
      </TabsContent>

      <TabsContent value="missing" className="mt-6">
        {collectionLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : filteredMissing.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMissing.map(banknote => (
              <BanknoteCard
                key={banknote.id}
                banknote={banknote}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p>{emptyStateMessages.missing}</p>
            {isEffectiveCurrentUser && (
              <Button onClick={() => navigate('/catalog')}>
                Browse Catalog
              </Button>
            )}
          </Card>
        )}
      </TabsContent>

      <TabsContent value="catalog" className="mt-6">
        {collectionLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : filteredCatalog.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCatalog.map(banknote => (
              <BanknoteCard
                key={banknote.id}
                banknote={banknote}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p>{emptyStateMessages.catalog}</p>
            {isEffectiveCurrentUser && (
              <Button onClick={() => navigate('/catalog')}>
                Browse Catalog
              </Button>
            )}
          </Card>
        )}
      </TabsContent>

      <TabsContent value="wishlist" className="mt-6">
        {collectionLoading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : wishlistItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlistItems.map((item: any) => {
              const banknote = item.detailed_banknotes;
              if (!banknote) return null;

              return (
                <BanknoteCard
                  key={item.id}
                  banknote={banknote}
                />
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p>{emptyStateMessages.wishlist}</p>
            {isEffectiveCurrentUser && (
              <Button onClick={() => navigate('/catalog')}>
                Browse Catalog
              </Button>
            )}
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};

export { ProfileCollection };
