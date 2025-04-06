
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CollectionItem, WishlistItem, Banknote } from "@/types";
import { fetchUserCollection } from "@/services/collectionService";
import { fetchUserWishlist } from "@/services/wishlistService";
import { fetchBanknotes } from "@/services/banknoteService";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProfileCollectionProps {
  profile: User;
  isOwnProfile: boolean;
}

export function ProfileCollection({ profile, isOwnProfile }: ProfileCollectionProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("collection");
  const [loading, setLoading] = useState(true);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [missingItems, setMissingItems] = useState<Banknote[]>([]);

  useEffect(() => {
    const loadUserCollectionData = async () => {
      setLoading(true);
      try {
        const collection = await fetchUserCollection(profile.id);
        setCollectionItems(collection);
        
        if (isOwnProfile) {
          const wishlist = await fetchUserWishlist(profile.id);
          setWishlistItems(wishlist);
          
          const allBanknotes = await fetchBanknotes();
          
          // Calculate missing banknotes
          const collectionBanknoteIds = new Set(collection.map(item => item.banknoteId));
          const wishlistBanknoteIds = new Set(wishlist.map(item => item.banknoteId));
          
          const missingBanknotes = allBanknotes.filter(banknote => 
            !collectionBanknoteIds.has(banknote.id) && 
            banknote.isApproved && 
            !banknote.isPending
          );
          
          setMissingItems(missingBanknotes);
        }
      } catch (error) {
        console.error("Error loading user collection data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserCollectionData();
  }, [profile.id, isOwnProfile]);
  
  const handleViewAllCollection = () => {
    if (isOwnProfile) {
      navigate('/collection?tab=collection');
    }
  };

  const handleViewAllWishlist = () => {
    if (isOwnProfile) {
      navigate('/collection?tab=wishlist');
    }
  };

  const handleViewAllMissing = () => {
    if (isOwnProfile) {
      navigate('/collection?tab=missing');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{isOwnProfile ? "My Collection" : `${profile.username}'s Collection`}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          {isOwnProfile && (
            <>
              <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              <TabsTrigger value="missing">Missing</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="collection">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : collectionItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No banknotes in collection yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {collectionItems.slice(0, 6).map((item) => (
                  <BanknoteDetailCard
                    key={item.id}
                    banknote={item.banknote}
                    collectionItem={item}
                    source="collection"
                    ownerId={profile.id}
                  />
                ))}
              </div>
              
              {collectionItems.length > 6 && isOwnProfile && (
                <div className="flex justify-center mt-6">
                  <Button onClick={handleViewAllCollection}>
                    View All ({collectionItems.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        {isOwnProfile && (
          <>
            <TabsContent value="wishlist">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No items in wishlist yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {wishlistItems.slice(0, 6).map((item) => (
                      <BanknoteDetailCard
                        key={item.id}
                        banknote={item.banknote}
                        source="wish-list"
                      />
                    ))}
                  </div>
                  
                  {wishlistItems.length > 6 && (
                    <div className="flex justify-center mt-6">
                      <Button onClick={handleViewAllWishlist}>
                        View All ({wishlistItems.length})
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="missing">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
                </div>
              ) : missingItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You've collected all available banknotes!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {missingItems.slice(0, 6).map((banknote) => (
                      <BanknoteDetailCard
                        key={banknote.id}
                        banknote={banknote}
                        source="missing"
                      />
                    ))}
                  </div>
                  
                  {missingItems.length > 6 && (
                    <div className="flex justify-center mt-6">
                      <Button onClick={handleViewAllMissing}>
                        View All ({missingItems.length})
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
