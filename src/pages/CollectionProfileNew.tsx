
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCollection } from '@/services/collectionService';
import { fetchUserWishlist } from '@/services/wishlistService';
import { CollectionItem, Banknote, WishlistItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ListChecks, Star, StarOff, Clock, ArrowUp, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollectionProfileProps {
  userId: string;
  isCurrentUser: boolean;
}

// Helper function to format date in a friendly way
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 8) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return new Date(dateString).toLocaleDateString();
  }
};

export default function CollectionProfileNew({ userId, isCurrentUser }: CollectionProfileProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('collection');
  
  // Fetch collection items
  const { 
    data: collectionItems, 
    isLoading: isCollectionLoading,
    refetch: refetchCollection
  } = useQuery({
    queryKey: ['userCollection', userId],
    queryFn: () => fetchUserCollection(userId),
    enabled: !!userId
  });
  
  // Fetch wishlist items
  const {
    data: wishlistItems,
    isLoading: isWishlistLoading,
    refetch: refetchWishlist
  } = useQuery({
    queryKey: ['userWishlist', userId],
    queryFn: () => fetchUserWishlist(userId),
    enabled: !!userId && activeTab === 'wishlist'
  });
  
  // Collection stats
  const collectionStats = {
    total: collectionItems?.length || 0,
    forSale: collectionItems?.filter(item => item.isForSale).length || 0
  };
  
  // Wishlist stats
  const wishlistStats = {
    total: wishlistItems?.length || 0,
    highPriority: wishlistItems?.filter(item => item.priority === 'high').length || 0
  };
  
  const handleAddToCollection = () => {
    navigate('/catalog');
  };
  
  const handleViewAll = (tab: string) => {
    if (tab === 'collection') {
      navigate(`/collection/user/${userId}`);
    } else if (tab === 'wishlist') {
      navigate(`/wishlist/user/${userId}`);
    }
  };
  
  // Prepare items for rendering
  const collectionDisplay = collectionItems?.slice(0, 6) || [];
  
  // Type-safe version of wishlist display
  const wishlistDisplay = wishlistItems?.slice(0, 6).map(item => ({
    id: item.id,
    banknote_id: item.banknote_id,
    priority: item.priority,
    note: item.note,
    banknote: item.detailed_banknotes || item.banknote
  })) || [];
  
  return (
    <div className="p-4">
      <Tabs defaultValue="collection" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="collection" className="relative">
              Collection
              {collectionStats.total > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {collectionStats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="wishlist">
              Wishlist
              {wishlistStats.total > 0 && (
                <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {wishlistStats.total}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {isCurrentUser && (
            <div>
              {activeTab === 'collection' && (
                <Button onClick={handleAddToCollection} size="sm" className="gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>
          )}
        </div>
        
        <TabsContent value="collection" className="mt-0">
          {isCollectionLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : collectionStats.total === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No items in collection yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
                  {isCurrentUser 
                    ? "Start building your collection by adding banknotes from the catalog."
                    : "This user hasn't added any banknotes to their collection yet."}
                </p>
                {isCurrentUser && (
                  <Button onClick={handleAddToCollection}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Browse Catalog
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {collectionDisplay.map((item) => (
                  <CollectionItemCard key={item.id} item={item} />
                ))}
              </div>
              
              {collectionStats.total > 6 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => handleViewAll('collection')}
                  >
                    View All ({collectionStats.total})
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="wishlist" className="mt-0">
          {isWishlistLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : wishlistStats.total === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <ListChecks className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No items in wishlist yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
                  {isCurrentUser 
                    ? "Add banknotes to your wishlist to keep track of items you want to collect."
                    : "This user hasn't added any banknotes to their wishlist yet."}
                </p>
                {isCurrentUser && (
                  <Button onClick={() => navigate('/catalog')}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Browse Catalog
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {wishlistDisplay.map((item) => (
                  <WishlistItemCard key={item.id} item={item} />
                ))}
              </div>
              
              {wishlistStats.total > 6 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => handleViewAll('wishlist')}
                  >
                    View All ({wishlistStats.total})
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Collection Item Card
interface CollectionItemCardProps {
  item: CollectionItem;
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({ item }) => {
  const navigate = useNavigate();
  const { banknote, condition, isForSale, salePrice, createdAt } = item;
  
  const handleClick = () => {
    navigate(`/banknotes/${banknote.id}?source=collection`);
  };
  
  return (
    <Card 
      className="overflow-hidden hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer"
      onClick={handleClick}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center">
        <img 
          src={item.obverseImage || (Array.isArray(banknote.imageUrls) ? banknote.imageUrls[0] : banknote.imageUrls) || '/placeholder.svg'} 
          alt={`${banknote.denomination}`}
          className="w-full h-full object-contain"
        />
        {isForSale && (
          <Badge variant="destructive" className="absolute top-2 right-2 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${salePrice}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium truncate">{banknote.denomination}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
          <span>{banknote.country}, {banknote.year}</span>
          <Badge variant="outline" className="text-xs">{condition}</Badge>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Wishlist Item Card
interface WishlistItemCardProps {
  item: {
    id: string;
    banknote_id: string;
    priority: string;
    note?: string;
    banknote?: Banknote;
  };
}

const WishlistItemCard: React.FC<WishlistItemCardProps> = ({ item }) => {
  const navigate = useNavigate();
  
  // Safety check for banknote data
  if (!item.banknote) {
    return null;
  }
  
  const { banknote, priority, note } = item;
  
  const handleClick = () => {
    navigate(`/banknotes/${banknote.id}?source=wishlist`);
  };
  
  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  
  return (
    <Card 
      className="overflow-hidden hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer"
      onClick={handleClick}
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center">
        <img 
          src={Array.isArray(banknote.imageUrls) ? banknote.imageUrls[0] : banknote.imageUrls} 
          alt={`${banknote.denomination}`}
          className="w-full h-full object-contain"
        />
        <Badge 
          className={cn(
            "absolute top-2 right-2", 
            priority === "high" ? priorityColors.high :
            priority === "medium" ? priorityColors.medium :
            priorityColors.low
          )}
        >
          {priority === "high" && <ArrowUp className="h-3 w-3 mr-1" />}
          {priority} priority
        </Badge>
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium truncate">{banknote.denomination}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
          <span>{banknote.country}, {banknote.year}</span>
        </div>
        {note && (
          <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
            Note: {note}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
