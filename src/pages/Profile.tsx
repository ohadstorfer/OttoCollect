
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Button } from "@/components/ui/button";
import { CollectionItem, WishlistItem, Banknote } from "@/types";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchUserCollection } from "@/services/collectionService";
import { fetchUserWishlist } from "@/services/wishlistService";
import { fetchBanknotes } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BanknoteFilter } from "@/components/filter/BanknoteFilter";
import { useBanknoteFilter } from "@/hooks/use-banknote-filter";

interface CollectionProfileNewProps {
  userId: string;
  isCurrentUser: boolean;
}

const CollectionProfileNew = ({ userId, isCurrentUser }: CollectionProfileNewProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialTab = searchParams.get("tab") || "collection";
  
  const [loading, setLoading] = useState(true);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [missingItems, setMissingItems] = useState<Banknote[]>([]);

  useEffect(() => {
    const loadUserData = async () => {
      if (userId) {
        setLoading(true);
        try {
          console.log("Loading user collection and wishlist");
          
          const collection = await fetchUserCollection(userId);
          const wishlist = await fetchUserWishlist(userId);
          const allBanknotes = await fetchBanknotes();
          
          console.log("Loaded collection items:", collection.length);
          console.log("Loaded wishlist items:", wishlist.length);
          console.log("Loaded all banknotes:", allBanknotes.length);
          
          setCollectionItems(collection);
          setWishlistItems(wishlist);
          
          // Calculate missing banknotes
          const collectionBanknoteIds = new Set(collection.map(item => item.banknoteId));
          const wishlistBanknoteIds = new Set(wishlist.map(item => item.banknoteId));
          
          const missingBanknotes = allBanknotes.filter(banknote => 
            !collectionBanknoteIds.has(banknote.id) && 
            banknote.isApproved && 
            !banknote.isPending
          );
          
          setMissingItems(missingBanknotes);
          console.log("Missing banknotes:", missingBanknotes.length);
          
        } catch (error) {
          console.error("Error loading user data:", error);
          toast({
            title: "Error",
            description: "Failed to load collection. Please try again later.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, toast]);

  // Collection filter
  const { 
    filteredItems: filteredCollection, 
    filters: collectionFilters, 
    setFilters: setCollectionFilters,
    availableCategories: collectionCategories,
    availableTypes: collectionTypes
  } = useBanknoteFilter({
    items: collectionItems,
    initialFilters: {
      sort: ["newest", "extPick"]
    }
  });

  // Missing filter
  const { 
    filteredItems: filteredMissing, 
    filters: missingFilters, 
    setFilters: setMissingFilters,
    availableCategories: missingCategories,
    availableTypes: missingTypes
  } = useBanknoteFilter({
    items: missingItems,
    initialFilters: {
      sort: ["extPick"]
    }
  });

  // Wishlist filter
  const { 
    filteredItems: filteredWishlist, 
    filters: wishlistFilters, 
    setFilters: setWishlistFilters,
    availableCategories: wishlistCategories,
    availableTypes: wishlistTypes
  } = useBanknoteFilter({
    items: wishlistItems,
    initialFilters: {
      sort: ["newest", "extPick"]
    }
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleBrowseCatalog = () => {
    navigate('/catalog');
  };

  const signIn = () => {
    navigate('/auth');
  };

  const title = isCurrentUser ? "My Collection" : "User Collection";

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>

      {!userId && (
        <Alert variant="default" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to sign in to access your collection and wishlist.
          </AlertDescription>
          <Button onClick={signIn} className="mt-2" variant="outline">Sign In</Button>
        </Alert>
      )}

      <Tabs defaultValue={initialTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="collection">My Banknotes</TabsTrigger>
          <TabsTrigger value="wishlist">Wish List</TabsTrigger>
          <TabsTrigger value="missing">Missing</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collection">
          <div>
            <h2 className="text-2xl font-bold mb-4">View Collection by Country</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : collectionItems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-lg font-medium mb-2">Your collection is empty</p>
                  <p className="text-muted-foreground mb-4">
                    Start adding banknotes to your collection by browsing the catalog.
                  </p>
                  <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {/* Collection content would go here */}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="wishlist">
          {/* Wishlist content */}
        </TabsContent>
        
        <TabsContent value="missing">
          {/* Missing content */}
        </TabsContent>
        
        <TabsContent value="stats">
          {/* Stats content */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollectionProfileNew;
