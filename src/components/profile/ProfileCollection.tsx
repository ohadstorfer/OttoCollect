
import React, { useState } from 'react';
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
import { CollectionItem, Banknote } from '@/types';

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
  userCollection = [], 
  banknotes = [], 
  wishlistItems = [], 
  collectionLoading = false,
  isCurrentUser
}: ProfileCollectionProps) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({ searchTerm: '', isMissingOnly: false });
  const [activeTab, setActiveTab] = useState<"collection" | "missing" | "catalog" | "wishlist">("collection");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const toggleMissingOnly = () => {
    setFilter(prev => ({ ...prev, isMissingOnly: !prev.isMissingOnly }));
  };

  const handleItemClick = (banknoteId: string) => {
    // Navigate to different routes based on if viewing own collection or someone else's
    if (isCurrentUser) {
      navigate(`/collection-banknote/${banknoteId}`);
    } else {
      navigate(`/user/${userId}/collection-banknote/${banknoteId}`);
    }
  };

  // Filter collection items
  const filteredCollection = userCollection.filter(item => {
    const banknote = banknotes.find(b => b.id === item.banknoteId);
    if (!banknote) return false;

    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Determine missing items
  const missingItems = banknotes.filter(banknote => !userCollection.find(item => item.banknoteId === banknote.id));

  // Filter missing items
  const filteredMissing = missingItems.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Filter catalog
  const filteredCatalog = banknotes.filter(banknote => {
    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Empty state messages
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
                <div key={item.id} onClick={() => handleItemClick(banknote.id)}>
                  <CollectionItemCard
                    item={item}
                    banknote={banknote}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p>{emptyStateMessages.collection}</p>
            {isCurrentUser && (
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
            {isCurrentUser && (
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
          <Card className="p-6 text-center">
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
