import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Button } from "@/components/ui/button";
import { BanknoteCondition, CollectionItem, WishlistItem, Banknote } from "@/types";
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

const Collection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialTab = searchParams.get("tab") || "collection";
  
  const [loading, setLoading] = useState(true);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [missingItems, setMissingItems] = useState<Banknote[]>([]);

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        setLoading(true);
        try {
          console.log("Loading user collection and wishlist");
          
          const collection = await fetchUserCollection(user.id);
          const wishlist = await fetchUserWishlist(user.id);
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
            description: "Failed to load your collection. Please try again later.",
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
  }, [user, toast]);

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

  // Wishlist filter (assume similar structure to collection)
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

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">My Collection</h1>

      {!user && (
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
          <div className="bg-card border rounded-lg p-6 mb-6">
            <BanknoteFilter
              categories={collectionCategories}
              availableTypes={collectionTypes}
              onFilterChange={setCollectionFilters}
              isLoading={loading}
              defaultSort={["newest", "extPick"]}
            />

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : !user ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">You need to sign in to view your collection</h3>
                <Button onClick={signIn}>Sign In</Button>
              </div>
            ) : filteredCollection.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">Your collection is empty</h3>
                <p className="text-muted-foreground mb-6">Start adding banknotes to your collection by browsing the catalog.</p>
                <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in mt-6">
                {filteredCollection.map((item) => (
                  <BanknoteDetailCard
                    key={item.id}
                    banknote={item.banknote}
                    collectionItem={item}
                    source="collection"
                    ownerId={user.id}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="wishlist">
          <div className="bg-card border rounded-lg p-6 mb-6">
            <BanknoteFilter
              categories={wishlistCategories}
              availableTypes={wishlistTypes}
              onFilterChange={setWishlistFilters}
              isLoading={loading}
              defaultSort={["newest", "extPick"]}
            />
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : !user ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">You need to sign in to view your wishlist</h3>
                <Button onClick={signIn}>Sign In</Button>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">Your wishlist is empty</h3>
                <p className="text-muted-foreground mb-6">Add banknotes to your wishlist while browsing the catalog.</p>
                <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in mt-6">
                {filteredWishlist.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-[3/2]">
                      <img
                        src={item.banknote.imageUrls[0] || '/placeholder.svg'}
                        alt={`${item.banknote.country} ${item.banknote.denomination}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="p-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{item.banknote.denomination}</h3>
                          <p className="text-sm text-muted-foreground">{item.banknote.country}, {item.banknote.year}</p>
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          item.priority === 'High' ? 'bg-red-100 text-red-800' :
                          item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {item.note && (
                        <p className="text-sm text-muted-foreground">{item.note}</p>
                      )}
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/collection-item/${item.banknote.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="missing">
          <div className="bg-card border rounded-lg p-6 mb-6">
            <BanknoteFilter
              categories={missingCategories}
              availableTypes={missingTypes}
              onFilterChange={setMissingFilters}
              isLoading={loading}
              defaultSort={["extPick"]}
            />

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : !user ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">You need to sign in to view missing banknotes</h3>
                <Button onClick={signIn}>Sign In</Button>
              </div>
            ) : filteredMissing.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">You have all available banknotes in your collection!</h3>
                <p className="text-muted-foreground mb-6">Congratulations! You've collected everything in our catalog.</p>
                <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in mt-6">
                {filteredMissing.map((banknote) => (
                  <BanknoteDetailCard
                    key={banknote.id}
                    banknote={banknote}
                    source="missing"
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="stats">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Collection Statistics</h2>
            
            {!user ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-medium mb-4">Sign in to view your statistics</h3>
                <Button onClick={signIn}>Sign In</Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium">Collection Size</h3>
                  <p className="text-2xl font-bold">{collectionItems.length}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium">Countries</h3>
                  <p className="text-2xl font-bold">
                    {new Set(collectionItems.map(item => item.banknote.country)).size}
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium">Total Value</h3>
                  <p className="text-2xl font-bold">
                    ${collectionItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Collection;
