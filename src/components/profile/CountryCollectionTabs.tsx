
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CountryDetailCollection from '@/pages/CountryDetailCollection';
import { useQuery } from '@tanstack/react-query';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { fetchUserWishlist } from '@/services/wishlistService';
import { fetchUserCollection } from '@/services/collectionService';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { DetailedBanknote } from '@/types';

interface CountryCollectionTabsProps {
  userId: string;
  countryId: string;
  countryName: string;
  isOwner: boolean;
}

const CountryCollectionTabs: React.FC<CountryCollectionTabsProps> = ({
  userId,
  countryId,
  countryName,
  isOwner
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Fetch all banknotes for this country (for the "Missing" tab)
  const {
    data: allBanknotes,
    isLoading: banknotesLoading,
    error: banknotesError
  } = useQuery({
    queryKey: ['country-banknotes', countryId],
    queryFn: () => fetchBanknotesByCountryId(countryId),
    enabled: !!countryId
  });
  
  // Fetch user's collection for this country
  const {
    data: userCollection,
    isLoading: collectionLoading,
    error: collectionError,
    refetch: refetchCollection
  } = useQuery({
    queryKey: ['user-collection', userId, countryId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId && !!countryId,
    select: (data) => data.filter(item => item.banknote?.country === countryName)
  });
  
  // Fetch user's wishlist items
  const {
    data: wishlistItems,
    isLoading: wishlistLoading,
    error: wishlistError
  } = useQuery({
    queryKey: ['user-wishlist', userId],
    queryFn: () => fetchUserWishlist(userId),
    enabled: !!userId,
    select: (data) => data.filter(item => item.detailed_banknotes?.country === countryName)
  });
  
  // Calculate missing banknotes (ones in allBanknotes but not in userCollection)
  const missingBanknotes = React.useMemo(() => {
    if (!allBanknotes || !userCollection) return [];
    
    const userBanknoteIds = new Set(userCollection.map(item => item.banknoteId));
    return allBanknotes.filter(banknote => !userBanknoteIds.has(banknote.id));
  }, [allBanknotes, userCollection]);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  // Wrapper component to display missing banknotes
  const MissingBanknotesDisplay: React.FC<{ banknotes: DetailedBanknote[] }> = ({ banknotes }) => {
    if (banknotesLoading || collectionLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      );
    }
    
    if (banknotesError || collectionError) {
      return (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4 text-red-500">Error loading data</h3>
          <p className="text-muted-foreground mb-6">Failed to load banknotes data.</p>
        </div>
      );
    }
    
    if (!banknotes || banknotes.length === 0) {
      return (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-medium mb-4">No Missing Banknotes</h3>
          <p className="text-muted-foreground mb-6">
            {isOwner 
              ? "Congratulations! You've collected all banknotes from this country." 
              : "This collector has all banknotes from this country!"}
          </p>
        </Card>
      );
    }
    
    return (
      <div className="page-container max-w-5xl mx-auto">
        <h3 className="text-xl font-medium mb-4">Missing Banknotes ({banknotes.length})</h3>
        <div className={`grid ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
          : 'grid-cols-1'} gap-4`}>
          {banknotes.map(banknote => (
            <div key={banknote.id} className="border rounded-lg p-4">
              <div className="font-medium">{banknote.denomination}</div>
              <div className="text-sm text-muted-foreground">
                {banknote.year} · {banknote.type || 'Standard Issue'}
              </div>
              <div className="text-sm mt-1">{banknote.pickNumber || banknote.extendedPickNumber}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Wrapper component to display wishlist items
  const WishlistDisplay: React.FC = () => {
    if (wishlistLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      );
    }
    
    if (wishlistError) {
      return (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4 text-red-500">Error loading wishlist</h3>
          <p className="text-muted-foreground mb-6">Failed to load wishlist data.</p>
        </div>
      );
    }
    
    if (!wishlistItems || wishlistItems.length === 0) {
      return (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-medium mb-4">No Wishlist Items</h3>
          <p className="text-muted-foreground mb-6">
            {isOwner 
              ? "You haven't added any banknotes from this country to your wishlist yet." 
              : "This collector doesn't have any banknotes from this country in their wishlist."}
          </p>
          {isOwner && (
            <Button asChild>
              <a href={`/catalog/${countryName}`}>Browse Catalog</a>
            </Button>
          )}
        </Card>
      );
    }
    
    return (
      <div className="page-container max-w-5xl mx-auto">
        <h3 className="text-xl font-medium mb-4">Wishlist Items ({wishlistItems.length})</h3>
        <div className={`grid ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
          : 'grid-cols-1'} gap-4`}>
          {wishlistItems.map(item => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="font-medium">{item.detailed_banknotes?.denomination}</div>
              <div className="text-sm text-muted-foreground">
                {item.detailed_banknotes?.year} · {item.detailed_banknotes?.type || 'Standard Issue'}
              </div>
              <div className="text-sm mt-1">{item.detailed_banknotes?.pickNumber || item.detailed_banknotes?.extendedPickNumber}</div>
              <div className="text-sm font-medium mt-2">Priority: {item.priority}</div>
              {item.note && <div className="text-sm mt-1">{item.note}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="my-banknotes" className="w-full">
      <div className=" pl-4 max-w-5xl mx-auto">
        <TabsList className="inline-flex ">
          <TabsTrigger value="my-banknotes">My Banknotes</TabsTrigger>
          <TabsTrigger value="wishlist">Wish List</TabsTrigger>
          {/* <TabsTrigger value="missing">Missing</TabsTrigger> */}
        </TabsList>
      </div>

      <TabsContent value="my-banknotes">
        <CountryDetailCollection 
          userId={userId} 
          countryName={countryName}
          profileView={true}
        />
      </TabsContent>

      <TabsContent value="wishlist">
        <WishlistDisplay />
      </TabsContent>

      <TabsContent value="missing">
        <MissingBanknotesDisplay banknotes={missingBanknotes || []} />
      </TabsContent>
    </Tabs>
  );
};

export default CountryCollectionTabs;
