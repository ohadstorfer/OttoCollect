
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

interface ProfileCollectionProps {
  userId: string;
  username?: string;
  isOwnProfile: boolean;
  collectionItems: CollectionItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  // Filter props
  filters: DynamicFilterState;
  onFilterChange: (newFilters: Partial<DynamicFilterState>) => void;
  filteredItems: CollectionItem[];
  collectionCategories: { id: string; name: string; count: number }[];
  collectionTypes: { id: string; name: string; count: number }[];
}

const ProfileCollection: React.FC<ProfileCollectionProps> = ({
  userId,
  username,
  isOwnProfile,
  collectionItems = [],
  isLoading,
  error,
  onRetry,
  filters,
  onFilterChange,
  filteredItems = [],
  collectionCategories = [],
  collectionTypes = []
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'grid' | 'compact' | 'list'>('grid');
  const [showFilters, setShowFilters] = React.useState(false);
  const [groupMode, setGroupMode] = React.useState(false);
  
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

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-4 text-red-500">{error}</h3>
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

    if (!filteredItems || filteredItems.length === 0) {
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
            ({collectionItems?.length || 0} {(collectionItems?.length || 0) === 1 ? 'item' : 'items'})
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
          onFilterChange={onFilterChange}
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
