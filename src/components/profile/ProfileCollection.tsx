
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserCollection } from '@/services/collectionService';
import { User, CollectionItem, BanknoteDetailSource } from '@/types';
import { Button } from '@/components/ui/button';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid3X3, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

interface ProfileCollectionProps {
  user: User;
  isOwnProfile: boolean;
}

const ProfileCollection: React.FC<ProfileCollectionProps> = ({ user, isOwnProfile }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  
  useEffect(() => {
    const loadCollection = async () => {
      setIsLoading(true);
      try {
        if (user && user.id) {
          const userCollection = await fetchUserCollection(user.id);
          setCollection(userCollection);
        }
      } catch (error) {
        console.error('Error fetching collection:', error);
        toast({
          variant: "destructive",
          title: "Error loading collection",
          description: "There was a problem loading the collection. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCollection();
  }, [user, toast]);

  const filteredCollection = () => {
    switch (activeTab) {
      case 'forsale':
        return collection.filter(item => item.isForSale);
      case 'notsale':
        return collection.filter(item => !item.isForSale);
      default:
        return collection;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleAddItem = () => {
    navigate('/collection/add');
  };

  const handleItemClick = (itemId: string) => {
    navigate(`/collection/${itemId}`);
  };

  if (collection.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-4">
          {isOwnProfile ? "You don't have any banknotes in your collection yet." : `${user.username} doesn't have any banknotes in their collection yet.`}
        </h3>
        {isOwnProfile && (
          <Button onClick={handleAddItem}>
            Add Your First Banknote
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          {isOwnProfile ? "My Collection" : `${user.username}'s Collection`}
        </h3>
        <div className="flex items-center space-x-2">
          {isOwnProfile && (
            <Button 
              onClick={handleAddItem}
              variant="outline" 
              size="sm"
              className="mr-2"
            >
              Add Item
            </Button>
          )}
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8"
          >
            <Grid3X3 size={16} />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="h-8 w-8"
          >
            <List size={16} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6" onValueChange={(value) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="all">All ({collection.length})</TabsTrigger>
          <TabsTrigger value="forsale">For Sale ({collection.filter(item => item.isForSale).length})</TabsTrigger>
          <TabsTrigger value="notsale">Not for Sale ({collection.filter(item => !item.isForSale).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CollectionGrid 
            items={filteredCollection()} 
            viewMode={viewMode} 
            onClick={handleItemClick} 
            source={isOwnProfile ? "collection" : "catalog"}
          />
        </TabsContent>
        <TabsContent value="forsale">
          <CollectionGrid 
            items={filteredCollection()} 
            viewMode={viewMode} 
            onClick={handleItemClick} 
            source={isOwnProfile ? "collection" : "catalog"}
          />
        </TabsContent>
        <TabsContent value="notsale">
          <CollectionGrid 
            items={filteredCollection()} 
            viewMode={viewMode} 
            onClick={handleItemClick} 
            source={isOwnProfile ? "collection" : "catalog"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CollectionGridProps {
  items: CollectionItem[];
  viewMode: 'grid' | 'list';
  onClick: (id: string) => void;
  source: BanknoteDetailSource;
}

const CollectionGrid: React.FC<CollectionGridProps> = ({ items, viewMode, onClick, source }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No items in this category.</p>
      </div>
    );
  }

  return (
    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" : "space-y-4"}>
      {items.map((item) => (
        <CollectionItemCard 
          key={item.id} 
          item={item} 
          onClick={() => onClick(item.id)}
          source="collection"
        />
      ))}
    </div>
  );
};

export default ProfileCollection;
