import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CountryDetailCollection from '@/pages/CountryDetailCollection';
import CountryDetailMissingItems from '@/pages/CountryDetailMissingItems';
import { useQuery } from '@tanstack/react-query';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { fetchUserWishlistByCountry } from '@/services/wishlistService';
import { fetchUserCollection } from '@/services/collectionService';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { DetailedBanknote } from '@/types';
import BanknoteDetailCard from '@/components/banknotes/BanknoteDetailCard';
import BanknoteDetailCardWishList from '../banknotes/BanknoteDetailCardWishList';
import BanknoteDetailCardMissingItems from '../banknotes/BanknoteDetailCardMissingItems';
import { AddUnlistedBanknoteDialog } from '@/components/collection/AddUnlistedBanknoteDialog';
import { useAuth } from '@/context/AuthContext';

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
  const { user, logout } = useAuth();
  
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
  
  // Fetch user's wishlist items (always with full banknote info), and filter by country
  const {
    data: wishlistItems,
    isLoading: wishlistLoading,
    error: wishlistError
  } = useQuery({
    queryKey: ['user-wishlist', userId, countryName],
    queryFn: () => fetchUserWishlistByCountry(userId, countryName),
    enabled: !!userId && !!countryName,
  });

  // Calculate missing banknotes (ones in allBanknotes but not in userCollection)
  const missingBanknotes = React.useMemo(() => {
    if (!allBanknotes || !userCollection) return [];
    const userCountryCollection = userCollection.filter(
      item =>
        item.banknote &&
        item.banknote.country &&
        countryName &&
        item.banknote.country.trim().toLowerCase() === countryName.trim().toLowerCase()
    );
    const userBanknoteIds = new Set(userCountryCollection.map(item => String(item.banknoteId)));
    const filtered = allBanknotes.filter(banknote => !userBanknoteIds.has(String(banknote.id)));
    return filtered;
  }, [allBanknotes, userCollection, countryName]);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  // Wrapper component to display missing banknotes
  // REMOVE old MissingBanknotesDisplay, render CountryDetailMissingItems INSTEAD:
  
  // WishlistDisplay - updated: pass wishlist item id prop
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
          <h3 className="text-xl font-medium mb-4 text-red-500"><span>Error loading wishlist</span></h3>
          <p className="text-muted-foreground mb-6">Failed to load wishlist data.</p>
        </div>
      );
    }

    // Only show banknotes with a valid detailed_banknotes join
    const validWishlist = (wishlistItems || []).filter(item => !!item.detailed_banknotes);

    if (!validWishlist.length) {
      return (
        <Card className="p-8 text-center">
          <h3 className="text-xl font-medium mb-4"><span>No Wishlist Items</span></h3>
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
        <h3 className="text-xl font-medium mb-4"><span>Wishlist Items ({validWishlist.length})</span></h3>
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-2'
        }>
          {validWishlist.map(item =>
            <BanknoteDetailCardWishList
              key={item.id}
              banknote={item.detailed_banknotes}
              wishlistItemId={item.id} // <-- send the wishlist item id
              onDeleted={refetchCollection} // handy event for parent to act if wish
              refetchWishlist={wishlistLoading ? undefined : () => { void refetchCollection(); }} // to refresh on delete
              source="catalog"
              viewMode={viewMode}
              countryId={countryId}
              userCollection={userCollection || []}
            />
          )}
        </div>
      </div>
    );
  };


    // Check if user has admin privileges
  // const isAdmin = user?.role === 'Palestine Admin' || user?.role.includes('Palestine Admin');

  
  return (
    <Tabs defaultValue="Collection" className="w-full">
      <div className=" pl-2 max-w-5xl mx-auto mt-2">
        <TabsList className="inline-flex ">
          <TabsTrigger value="Collection">Collection</TabsTrigger>
          <TabsTrigger value="wishlist">Wish List</TabsTrigger>
          <TabsTrigger value="missing">Missing</TabsTrigger>

          {isOwner && (
            <AddUnlistedBanknoteDialog
              countryName={countryName}
              onCreated={refetchCollection}
            />
          )}

        </TabsList>       
      </div>

      <TabsContent value="Collection">
        
        <CountryDetailCollection 
          userId={userId} 
          countryName={countryName}
          profileView={true}
          onBackToCountries={() => {}}
        />
      </TabsContent>

      <TabsContent value="wishlist">
        <WishlistDisplay />
      </TabsContent>

      <TabsContent value="missing">
        {/* Pass missingBanknotes and userCollection to CountryDetailMissingItems */}
        <h3 className="text-xl font-medium  page-container max-w-5xl mx-auto "><span>Missing Banknotes ({missingBanknotes.length})</span></h3>
        <CountryDetailMissingItems
          missingBanknotes={missingBanknotes}
          userCollection={userCollection || []}
          countryId={countryId}
          countryName={countryName}
        />
      </TabsContent>
    </Tabs>
  );
};

export default CountryCollectionTabs;
