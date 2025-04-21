
import React, { useState, useEffect } from 'react';
import { CollectionItem } from '@/types';
import { fetchUserCollection } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';

interface ProfileCollectionProps {
  userId: string;
}

const ProfileCollection: React.FC<ProfileCollectionProps> = ({ userId }) => {
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCollection = async () => {
      try {
        setLoading(true);
        const items = await fetchUserCollection(userId);
        setCollectionItems(items);
      } catch (error) {
        console.error("Failed to load collection:", error);
        toast({
          title: "Error",
          description: "Failed to load user collection",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [userId, toast]);

  // Group banknotes by category
  const groupedByCategoryItems = collectionItems.reduce((acc, item) => {
    const category = item.banknote.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CollectionItem[]>);

  // Get unique categories
  const categories = Object.keys(groupedByCategoryItems);

  if (loading) {
    return <div>Loading collection...</div>;
  }

  if (collectionItems.length === 0) {
    return <div>This user has no banknotes in their collection.</div>;
  }

  return (
    <div className="space-y-8">
      {categories.map(category => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-medium">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {groupedByCategoryItems[category].map(item => (
              <div 
                key={item.id} 
                className="border rounded-md p-2 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="aspect-[3/2] overflow-hidden rounded mb-2">
                  <img 
                    src={item.obverseImage || item.banknote.imageUrls?.[0] || '/placeholder-banknote.png'} 
                    alt={item.banknote.denomination} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="font-medium truncate">{item.banknote.denomination}</p>
                <p className="text-sm text-muted-foreground truncate">{item.banknote.country}, {item.condition}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileCollection;
