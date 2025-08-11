import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CountryFilterSection } from '@/components/country/CountryFilterSection';
import { CollectionItem } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { Loader2, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import CollectionItemCard from '@/components/collection/CollectionItemCard';

interface ProfileCollectionProps {
  userId: string;
  username: string;
  isOwnProfile: boolean;
  collectionItems: CollectionItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  filters: DynamicFilterState;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  filteredItems: CollectionItem[];
  collectionCategories: { id: string; name: string; count: number }[];
  collectionTypes: { id: string; name: string; count: number }[];
  countryId?: string;
}

const ProfileCollection: React.FC<ProfileCollectionProps> = ({
  userId,
  username,
  isOwnProfile,
  collectionItems,
  isLoading,
  error,
  onRetry,
  filters,
  onFilterChange,
  filteredItems,
  collectionCategories = [],
  collectionTypes = [],
  countryId
}) => {
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [groupMode, setGroupMode] = React.useState(false);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const handleGroupModeChange = (mode: boolean) => {
    setGroupMode(mode);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4 text-red-500"><span>Error loading collection</span></h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => onRetry()}>Try Again</Button>
      </div>
    );
  }

  if (collectionItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-medium mb-4"><span>No Items in Collection</span></h3>
        <p className="text-muted-foreground mb-6">
          {isOwnProfile 
            ? "You haven't added any banknotes to your collection yet." 
            : `${username} hasn't added any banknotes to their collection yet.`}
        </p>
        {isOwnProfile && (
          <Button asChild>
            <Link to="/catalog">
              <Plus className="mr-2 h-4 w-4" />
              Browse Catalogues
            </Link>
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <CountryFilterSection
          countryId={countryId || ""}
          filters={filters}
          onFilterChange={onFilterChange}
          isLoading={isLoading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
          source="collection"
          collectionCategories={collectionCategories}
          collectionTypes={collectionTypes}
        />
        
        {filteredItems.length > 0 ? (
          <div className={`grid ${viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-1'} gap-4`}>
            {filteredItems.map(item => (
              <CollectionItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingItemId(item.id)}
                onUpdate={onRetry}
                viewMode={viewMode}
                isOwner={isOwnProfile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-xl font-medium mb-4"><span>No Matching Items</span></h3>
            <p className="text-muted-foreground mb-6">
              No items match your current filter criteria.
            </p>
            <Button 
              variant="outline" 
              onClick={() => onFilterChange({
                search: '',
                categories: [],
                types: [],
                sort: []
              })}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCollection;
