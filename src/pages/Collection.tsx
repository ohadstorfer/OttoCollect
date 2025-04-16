
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
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
import { BanknoteFilterCollection } from "@/components/filter/BanknoteFilterCollection";
import { useDynamicFilter } from "@/hooks/use-dynamic-filter";
import { FilterCategoryOption, DynamicFilterState } from "@/types/filter";

// Add a type for the banknote data specific to this component
interface DetailedBanknote extends Banknote {
  gradeCounts?: { [grade: string]: number };
  averagePrice?: number;
}

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
  const [collectionCategories, setCollectionCategories] = useState<FilterCategoryOption[]>([]);
  const [collectionTypes, setCollectionTypes] = useState<FilterCategoryOption[]>([]);
  const [wishlistCategories, setWishlistCategories] = useState<FilterCategoryOption[]>([]);
  const [wishlistTypes, setWishlistTypes] = useState<FilterCategoryOption[]>([]);
  const [missingCategories, setMissingCategories] = useState<FilterCategoryOption[]>([]);
  const [missingTypes, setMissingTypes] = useState<FilterCategoryOption[]>([]);

  const [collectionFilters, setCollectionFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["newest", "extPick"]
  });
  
  const [wishlistFilters, setWishlistFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["newest", "extPick"]
  });
  
  const [missingFilters, setMissingFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"]
  });

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
          
          const categoryMap = new Map<string, { id: string; name: string; count: number }>();
          const typeMap = new Map<string, { id: string; name: string; count: number }>();
          
          collection.forEach(item => {
            if (item.banknote.category) {
              const categoryKey = item.banknote.category;
              const categoryEntry = categoryMap.get(categoryKey) || { 
                id: categoryKey,
                name: categoryKey,
                count: 0
              };
              categoryEntry.count += 1;
              categoryMap.set(categoryKey, categoryEntry);
            }
            
            if (item.banknote.type) {
              const typeKey = item.banknote.type;
              const typeEntry = typeMap.get(typeKey) || { 
                id: typeKey,
                name: typeKey,
                count: 0
              };
              typeEntry.count += 1;
              typeMap.set(typeKey, typeEntry);
            }
          });
          
          setCollectionCategories(Array.from(categoryMap.values()));
          setCollectionTypes(Array.from(typeMap.values()));
          
          const wishlistCategoryMap = new Map<string, { id: string; name: string; count: number }>();
          const wishlistTypeMap = new Map<string, { id: string; name: string; count: number }>();
          
          wishlist.forEach(item => {
            if (item.banknote.category) {
              const categoryKey = item.banknote.category;
              const categoryEntry = wishlistCategoryMap.get(categoryKey) || { 
                id: categoryKey,
                name: categoryKey,
                count: 0
              };
              categoryEntry.count += 1;
              wishlistCategoryMap.set(categoryKey, categoryEntry);
            }
            
            if (item.banknote.type) {
              const typeKey = item.banknote.type;
              const typeEntry = wishlistTypeMap.get(typeKey) || { 
                id: typeKey,
                name: typeKey,
                count: 0
              };
              typeEntry.count += 1;
              wishlistTypeMap.set(typeKey, typeEntry);
            }
          });
          
          setWishlistCategories(Array.from(wishlistCategoryMap.values()));
          setWishlistTypes(Array.from(wishlistTypeMap.values()));
          
          const collectionBanknoteIds = new Set(collection.map(item => item.banknoteId));
          const wishlistBanknoteIds = new Set(wishlist.map(item => item.banknoteId));
          
          const missingBanknotes = allBanknotes.filter(banknote => 
            !collectionBanknoteIds.has(banknote.id) && 
            banknote.isApproved && 
            !banknote.isPending
          );
          
          setMissingItems(missingBanknotes);
          console.log("Missing banknotes:", missingBanknotes.length);
          
          const missingCategoryMap = new Map<string, { id: string; name: string; count: number }>();
          const missingTypeMap = new Map<string, { id: string; name: string; count: number }>();
          
          missingBanknotes.forEach(banknote => {
            if (banknote.category) {
              const categoryKey = banknote.category;
              const categoryEntry = missingCategoryMap.get(categoryKey) || { 
                id: categoryKey,
                name: categoryKey,
                count: 0
              };
              categoryEntry.count += 1;
              missingCategoryMap.set(categoryKey, categoryEntry);
            }
            
            if (banknote.type) {
              const typeKey = banknote.type;
              const typeEntry = missingTypeMap.get(typeKey) || { 
                id: typeKey,
                name: typeKey,
                count: 0
              };
              typeEntry.count += 1;
              missingTypeMap.set(typeKey, typeEntry);
            }
          });
          
          setMissingCategories(Array.from(missingCategoryMap.values()));
          setMissingTypes(Array.from(missingTypeMap.values()));
          
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

  const { 
    filteredItems: filteredCollection, 
    groupedItems: groupedCollection,
    isLoading: collectionFilterLoading
  } = useDynamicFilter({
    items: collectionItems,
    initialFilters: collectionFilters,
    collectionCategories: collectionCategories,
    collectionTypes: collectionTypes
  });
  
  const { 
    filteredItems: filteredMissing,
    groupedItems: groupedMissing,
    isLoading: missingFilterLoading
  } = useDynamicFilter({
    items: missingItems,
    initialFilters: missingFilters,
    collectionCategories: missingCategories,
    collectionTypes: missingTypes
  });

  const { 
    filteredItems: filteredWishlist,
    groupedItems: groupedWishlist,
    isLoading: wishlistFilterLoading
  } = useDynamicFilter({
    items: wishlistItems,
    initialFilters: wishlistFilters,
    collectionCategories: wishlistCategories,
    collectionTypes: wishlistTypes
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

  const handleCollectionFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    console.log("Collection filter change:", newFilters);
    setCollectionFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleWishlistFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    setWishlistFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleMissingFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    setMissingFilters(prev => ({ ...prev, ...newFilters }));
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
            <BanknoteFilterCollection
              collectionCategories={collectionCategories}
              collectionTypes={collectionTypes}
              onFilterChange={handleCollectionFilterChange}
              currentFilters={collectionFilters}
              isLoading={loading || collectionFilterLoading}
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
                <h3 className="text-xl font-medium mb-4">
                  {collectionItems.length === 0 ? "Your collection is empty" : "No matching banknotes found"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {collectionItems.length === 0 
                    ? "Start adding banknotes to your collection by browsing the catalog." 
                    : "Try adjusting your filters to see more items."}
                </p>
                <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
              </div>
            ) : (
              <div className="mt-6">
                {groupedCollection.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`} className="space-y-4 mb-8">
                    <div className="sticky top-[184px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                      <h2 className="text-xl font-bold">{group.category}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((item, index) => {
                        const collectionItem = item as unknown as CollectionItem;
                        return (
                          <BanknoteDetailCard
                            key={`collection-item-${group.category}-${index}`}
                            banknote={collectionItem.banknote as unknown as DetailedBanknote}
                            collectionItem={collectionItem}
                            source="collection"
                            ownerId={user.id}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="wishlist">
          <div className="bg-card border rounded-lg p-6 mb-6">
            <BanknoteFilterCollection
              collectionCategories={wishlistCategories}
              collectionTypes={wishlistTypes}
              onFilterChange={handleWishlistFilterChange}
              currentFilters={wishlistFilters}
              isLoading={loading || wishlistFilterLoading}
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
              <div className="mt-6">
                {groupedWishlist.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`} className="space-y-4 mb-8">
                    <div className="sticky top-[184px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                      <h2 className="text-xl font-bold">{group.category}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((item, index) => {
                        const wishlistItem = item as unknown as WishlistItem;
                        return (
                          <Card key={wishlistItem.id} className="overflow-hidden">
                            <div className="aspect-[3/2]">
                              <img
                                src={wishlistItem.banknote.imageUrls[0] || '/placeholder.svg'}
                                alt={`${wishlistItem.banknote.country} ${wishlistItem.banknote.denomination}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardHeader className="p-4">
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="font-semibold">{wishlistItem.banknote.denomination}</h3>
                                  <p className="text-sm text-muted-foreground">{wishlistItem.banknote.country}, {wishlistItem.banknote.year}</p>
                                </div>
                                <div className={`px-2 py-1 text-xs rounded-full ${
                                  wishlistItem.priority === 'High' ? 'bg-red-100 text-red-800' :
                                  wishlistItem.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {wishlistItem.priority}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              {wishlistItem.note && (
                                <p className="text-sm text-muted-foreground">{wishlistItem.note}</p>
                              )}
                              <div className="flex justify-end mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate(`/banknote-details/${wishlistItem.banknote.id}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="missing">
          <div className="bg-card border rounded-lg p-6 mb-6">
            <BanknoteFilterCollection
              collectionCategories={missingCategories}
              collectionTypes={missingTypes}
              onFilterChange={handleMissingFilterChange}
              currentFilters={missingFilters}
              isLoading={loading || missingFilterLoading}
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
              <div className="mt-6">
                {groupedMissing.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`} className="space-y-4 mb-8">
                    <div className="sticky top-[184px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                      <h2 className="text-xl font-bold">{group.category}</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((banknote, index) => (
                        <BanknoteDetailCard
                          key={`missing-banknote-${group.category}-${index}`}
                          banknote={banknote as unknown as DetailedBanknote}
                          source="missing"
                        />
                      ))}
                    </div>
                  </div>
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

