
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_COLLECTION_ITEMS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import BanknoteDetailCard from "@/components/banknotes/BanknoteDetailCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BanknoteCondition } from "@/types";
import { useSearchParams } from "react-router-dom";

const Collection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const initialTab = searchParams.get("tab") || "collection";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [condition, setCondition] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");

  // Get the current user's collection
  const userCollection = user ? MOCK_COLLECTION_ITEMS.filter(item => item.userId === user.id) : [];

  // Filter the collection based on search parameters
  const filteredCollection = userCollection.filter(item => {
    const banknote = item.banknote;
    
    // Search filter
    const matchesSearch = searchQuery
      ? banknote.catalogId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.denomination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        banknote.year.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Condition filter
    const matchesCondition = condition ? item.condition === condition : true;
    
    return matchesSearch && matchesCondition;
  });
  
  // Sort the collection
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

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">My Collection</h1>

      <Tabs defaultValue={initialTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="collection">My Banknotes</TabsTrigger>
          <TabsTrigger value="wishlist">Wish List</TabsTrigger>
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

          {!user ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">You need to sign in to view your collection</h3>
              <Button>Sign In</Button>
            </div>
          ) : sortedCollection.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">Your collection is empty</h3>
              <p className="text-muted-foreground mb-6">Start adding banknotes to your collection by browsing the catalog.</p>
              <Button>Browse Catalog</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedCollection.map((item) => (
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
        </TabsContent>
        
        <TabsContent value="wishlist">
          <div className="text-center py-8">
            <h3 className="text-xl font-medium mb-4">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Add banknotes to your wishlist while browsing the catalog.</p>
            <Button>Browse Catalog</Button>
          </div>
        </TabsContent>
        
        <TabsContent value="stats">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Collection Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium">Collection Size</h3>
                <p className="text-2xl font-bold">{userCollection.length}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium">Countries</h3>
                <p className="text-2xl font-bold">
                  {new Set(userCollection.map(item => item.banknote.country)).size}
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium">Total Value</h3>
                <p className="text-2xl font-bold">
                  ${userCollection.reduce((sum, item) => sum + (item.purchasePrice || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Collection;
