
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionItem } from '@/types';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { Button } from '@/components/ui/button';
import { Grid2X2, Grid3X3, List, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { groupCollectionItemsByCategory } from '@/utils/collectionUtils';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import { DynamicFilterState } from '@/types/filter';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCollection } from '@/services/collectionService';
import { useState, useCallback } from 'react';

interface ProfileCollectionProps {
  userId: string;
  username?: string;
  isOwnProfile: boolean;
  onRetry: () => Promise<void>;
}

const ProfileCollection: React.FC<ProfileCollectionProps> = ({
  userId,
  username,
  isOwnProfile,
  onRetry,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'grid' | 'compact' | 'list'>('grid');
  const [showFilters, setShowFilters] = React.useState(false);
  const [groupMode, setGroupMode] = React.useState(false);
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  
  // Fetch collection items
  const { 
    data: collectionItems = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['collection', userId],
    queryFn: () => fetchUserCollection(userId),
  });
  
  // Extract categories and types from collection items
  const collectionCategories = React.useMemo(() => {
    if (!collectionItems || collectionItems.length === 0) return [];
    
    const categoriesMap = new Map<string, { id: string; name: string; count: number }>();
    
    collectionItems.forEach(item => {
      if (item?.banknote?.category) {
        const categoryId = item.banknote.category;
        const categoryName = item.banknote.category;
        
        if (categoriesMap.has(categoryId)) {
          const category = categoriesMap.get(categoryId)!;
          category.count++;
          categoriesMap.set(categoryId, category);
        } else {
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            count: 1
          });
        }
      }
    });
    
    return Array.from(categoriesMap.values()).sort((a, b) => b.count - a.count);
  }, [collectionItems]);
  
  const collectionTypes = React.useMemo(() => {
    if (!collectionItems || collectionItems.length === 0) return [];
    
    const typesMap = new Map<string, { id: string; name: string; count: number }>();
    
    collectionItems.forEach(item => {
      if (item?.banknote?.type) {
        const typeId = item.banknote.type;
        const typeName = item.banknote.type;
        
        if (typesMap.has(typeId)) {
          const type = typesMap.get(typeId)!;
          type.count++;
          typesMap.set(typeId, type);
        } else {
          typesMap.set(typeId, {
            id: typeId,
            name: typeName,
            count: 1
          });
        }
      }
    });
    
    return Array.from(typesMap.values()).sort((a, b) => b.count - a.count);
  }, [collectionItems]);
  
  // Filter items based on filters
  const filteredItems = React.useMemo(() => {
    if (!collectionItems || collectionItems.length === 0) return [];
    
    return collectionItems.filter(item => {
      if (!item) return false;
      
      // Search filter
      const searchLower = (filters.search || "").toLowerCase();
      const matchesSearch = !filters.search || 
        (item.banknote && Object.values(item.banknote)
          .filter(value => value !== null && value !== undefined && typeof value === 'string')
          .some(value => (value as string).toLowerCase().includes(searchLower))) ||
        (item.publicNote && item.publicNote.toLowerCase().includes(searchLower)) ||
        (item.privateNote && item.privateNote.toLowerCase().includes(searchLower)) ||
        (item.condition && item.condition.toLowerCase().includes(searchLower));
      
      // Category filter
      const matchesCategory = !filters.categories || filters.categories.length === 0 || 
        (item.banknote?.category && filters.categories.includes(item.banknote.category));
      
      // Type filter
      const matchesType = !filters.types || filters.types.length === 0 || 
        (item.banknote?.type && filters.types.includes(item.banknote.type));
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [collectionItems, filters]);
  
  // Group items by category if groupMode is enabled
  const groupedItems = React.useMemo(() => {
    return groupMode
      ? groupCollectionItemsByCategory(filteredItems)
      : [{ category: 'All Items', items: filteredItems }];
  }, [filteredItems, groupMode]);
  
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode === 'list' ? 'list' : 'grid');
  };
  
  const handleGroupModeChange = (mode: boolean) => {
    setGroupMode(mode);
  };
  
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-4 text-red-500">Error loading collection</h3>
        <Button onClick={() => onRetry()}>Retry</Button>
      </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      );
    }

    if (!collectionItems || collectionItems.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-6">
            {isOwnProfile 
              ? "You haven't added any banknotes to your collection yet." 
              : `${username || 'This user'} hasn't added any banknotes to their collection yet.`
            }
          </h3>
          {isOwnProfile && (
            <Button onClick={() => navigate('/collection')}>
              Manage My Collection
            </Button>
          )}
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-4">No items match your filter criteria</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      );
    }

    if (groupMode) {
      return (
        <div className="space-y-10">
          {groupedItems.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">{group.category}</h2>
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                viewMode === 'compact' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
                viewMode === 'list' && "grid-cols-1"
              )}>
                {group.items.map((item) => (
                  <CollectionItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => {}}
                    onUpdate={onRetry}
                    isPublic={!isOwnProfile}
                    viewMode={viewMode === 'list' ? 'list' : 'grid'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={cn(
        "grid gap-4",
        viewMode === 'grid' && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        viewMode === 'compact' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        viewMode === 'list' && "grid-cols-1"
      )}>
        {filteredItems.map((item) => (
          <CollectionItemCard
            key={item.id}
            item={item}
            onEdit={() => {}}
            onUpdate={onRetry}
            isPublic={!isOwnProfile}
            viewMode={viewMode === 'list' ? 'list' : 'grid'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold">
          {isOwnProfile ? 'My Collection' : `${username}'s Collection`}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({collectionItems ? collectionItems.length : 0} {collectionItems && collectionItems.length === 1 ? 'item' : 'items'})
          </span>
        </h2>
        
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'compact' ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setViewMode('compact')}
            title="Compact grid view"
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={showFilters ? 'default' : 'outline'} 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showFilters && (
        <BanknoteFilterCollection
          onFilterChange={handleFilterChange}
          currentFilters={filters}
          isLoading={isLoading}
          collectionCategories={collectionCategories}
          collectionTypes={collectionTypes}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
        />
      )}
      
      {renderContent()}
    </div>
  );
};

export default ProfileCollection;
