
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid, PlusSquare, Search, Star, Info } from 'lucide-react';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { Input } from '@/components/ui/input';
import BanknoteCard from '@/components/banknotes/BanknoteCard';
import { Spinner } from '@/components/ui/spinner';
import { CollectionItem, Banknote } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCollection } from '@/services/collectionService';
import { fetchBanknotes } from '@/services/banknoteService';
import { fetchUserWishlist } from '@/services/wishlistService';
import { useTheme } from '@/context/ThemeContext';

interface ProfileCollectionProps {
  userId: string;
  userCollection?: CollectionItem[];
  banknotes?: Banknote[];
  wishlistItems?: any[];
  collectionLoading?: boolean;
  isCurrentUser: boolean;
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
  isCurrentUser
}: ProfileCollectionProps) => {
  const { theme } = useTheme();
  
  const { data: fetchedCollection, isLoading: collectionQueryLoading } = useQuery({
    queryKey: ['userCollection', userId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !initialCollection && !!userId
  });

  const { data: fetchedBanknotes, isLoading: banknoteLoading } = useQuery({
    queryKey: ['banknotes'],
    queryFn: async () => {
      return await fetchBanknotes();
    }
  });

  const { data: fetchedWishlist, isLoading: wishlistQueryLoading } = useQuery({
    queryKey: ['userWishlist', userId],
    queryFn: () => fetchUserWishlist(userId),
    enabled: !initialWishlist && !!userId
  });

  const collection = initialCollection || fetchedCollection || [];
  const banknoteList = initialBanknotes || fetchedBanknotes || [];
  const wishlist = initialWishlist || fetchedWishlist || [];
  const collectionLoading = initialLoading || collectionQueryLoading || banknoteLoading || wishlistQueryLoading;

  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ searchTerm: '', isMissingOnly: false });
  const [activeTab, setActiveTab] = useState<"collection" | "missing" | "catalog" | "wishlist">("collection");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const toggleMissingOnly = () => {
    setFilter(prev => ({ ...prev, isMissingOnly: !prev.isMissingOnly }));
  };

  const filteredCollection = collection.filter(item => {
    const banknote = banknoteList?.find(b => b.id === item.banknoteId);
    if (!banknote) return false;

    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  const missingItems = banknoteList?.filter(banknote => 
    !collection.some(item => item.banknoteId === banknote.id)
  ) || [];

  const filteredMissing = missingItems.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  const filteredCatalog = banknoteList?.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

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
          Catalog ({banknotes?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="wishlist">
          <Star className="h-4 w-4 mr-2" />
          Wishlist ({wishlistItems?.length || 0})
        </TabsTrigger>
      </TabsList>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search denomination, country, year..."
            value={filter.searchTerm}
            onChange={handleSearchChange}
            className={theme === 'light' ? 'bg-white/80' : ''}
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
              const banknote = banknotes?.find(b => b.id === item.banknoteId);
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
          <Card className={`p-6 text-center ${theme === 'light' ? 'bg-white/90' : ''}`}>
            <p>{emptyStateMessages.collection}</p>
            {isCurrentUser && (
              <Button onClick={() => navigate('/catalog')} className="mt-4">
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
              <div 
                key={banknote.id} 
                onClick={() => navigate(`/banknote-details/${banknote.id}`)}
                className="cursor-pointer"
              >
                <BanknoteCard banknote={banknote} />
              </div>
            ))}
          </div>
        ) : (
          <Card className={`p-6 text-center ${theme === 'light' ? 'bg-white/90' : ''}`}>
            <p>{emptyStateMessages.missing}</p>
            {isCurrentUser && (
              <Button onClick={() => navigate('/catalog')} className="mt-4">
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
          <Card className={`p-6 text-center ${theme === 'light' ? 'bg-white/90' : ''}`}>
            <p>{emptyStateMessages.catalog}</p>
            {isCurrentUser && (
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
          <Card className={`p-6 text-center ${theme === 'light' ? 'bg-white/90' : ''}`}>
            <p>{emptyStateMessages.wishlist}</p>
            {isCurrentUser && (
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
