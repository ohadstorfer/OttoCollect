import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BanknoteCondition, CollectionItem, WishlistItem, Banknote } from "@/types";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchUserCollection } from "@/services/collectionService";
import { fetchUserWishlist } from "@/services/wishlistService";
import { fetchBanknotes } from "@/services/banknoteService";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CollectionItemCard from "@/components/collection/CollectionItemCard";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [condition, setCondition] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");

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

  const filteredCollection = collectionItems.filter(item => {
    const banknote = item.banknote;
    
    const matchesSearch = searchQuery
      ? banknote.catalogId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.year.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesCondition = condition !== "all" ? item.condition === condition : true;
    
    return matchesSearch && matchesCondition;
  });
  
  const sortedCollection = [...filteredCollection].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "a-z":
        return a.banknote.denomination.localeCompare(b.banknote.denomination);
      case "z-a":
        return b.banknote.denomination.localeCompare(a.banknote.denomination);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const filteredMissing = missingItems.filter(banknote => {
    const matchesSearch = searchQuery
      ? banknote.catalogId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.year.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesSearch;
  });
  
  const sortedMissing = [...filteredMissing].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "a-z":
        return a.denomination.localeCompare(b.denomination);
      case "z-a":
        return b.denomination.localeCompare(a.denomination);
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search" className="mb-2 block">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name, country, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="condition" className="mb-2 block">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="UNC">UNC</SelectItem>
                    <SelectItem value="AU">AU</SelectItem>
                    <SelectItem value="XF">XF</SelectItem>
                    <SelectItem value="VF">VF</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="VG">VG</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sortBy" className="mb-2 block">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="a-z">A-Z</SelectItem>
                    <SelectItem value="z-a">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">You need to sign in to view your collection</h3>
              <Button onClick={signIn}>Sign In</Button>
            </div>
          ) : sortedCollection.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">Your collection is empty</h3>
              <p className="text-muted-foreground mb-6">Start adding banknotes to your collection by browsing the catalog.</p>
              <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
              {sortedCollection.map((item) => (
                <BanknoteDetailCard
                  key={item.id}
                  banknote={item.banknote}
                  collectionItem={item}
                  source="collection"
                  ownerId={user.id}
                  onClick={() => navigate(`/collection-item/${item.banknote.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="wishlist">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">You need to sign in to view your wishlist</h3>
              <Button onClick={signIn}>Sign In</Button>
            </div>
          ) : wishlistItems.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-6">Add banknotes to your wishlist while browsing the catalog.</p>
              <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
              {wishlistItems.map((item) => (
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
        </TabsContent>
        
        <TabsContent value="missing">
          <div className="bg-card border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search-missing" className="mb-2 block">Search</Label>
                <Input
                  id="search-missing"
                  placeholder="Search by name, country, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sortBy-missing" className="mb-2 block">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="a-z">A-Z</SelectItem>
                    <SelectItem value="z-a">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">You need to sign in to view missing banknotes</h3>
              <Button onClick={signIn}>Sign In</Button>
            </div>
          ) : sortedMissing.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">You have all available banknotes in your collection!</h3>
              <p className="text-muted-foreground mb-6">Congratulations! You've collected everything in our catalog.</p>
              <Button onClick={handleBrowseCatalog}>Browse Catalog</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
              {sortedMissing.map((banknote) => (
                <BanknoteDetailCard
                  key={banknote.id}
                  banknote={banknote}
                  source="missing"
                />
              ))}
            </div>
          )}
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
