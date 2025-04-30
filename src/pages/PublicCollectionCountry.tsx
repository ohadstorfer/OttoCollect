
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollectionItem } from '@/types';
import { CollectionFilterCatalog } from '@/components/filter/CollectionFilterCatalog';
import { DynamicFilterState } from '@/types/filter';
import { fetchUserCollectionItemsByCountry } from '@/services/collectionService';
import CollectionView from '@/components/collection/CollectionView';
import { useCollectionGroups } from '@/hooks/use-collection-groups';

const PublicCollectionCountry = () => {
  const { userId, countryId } = useParams<{ userId: string; countryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const countryName = location.state?.countryName || 'Collection';
  const userName = location.state?.userName || 'User';
  
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [groupMode, setGroupMode] = useState<boolean>(false);
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<DynamicFilterState>({
    search: '',
    categories: [],
    types: [],
    sort: ['extPick']
  });
  
  // Load collection items for the specified country
  useEffect(() => {
    if (!countryId || !userId) return;
    loadCollectionData();
  }, [countryId, userId]);
  
  const loadCollectionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!userId || !countryId) return;
      
      const items = await fetchUserCollectionItemsByCountry(userId, countryId);
      console.log(`Loaded ${items.length} collection items for user ${userId} and country ${countryId}`);
      setCollectionItems(items);
    } catch (err) {
      console.error('Error loading collection items:', err);
      setError("Failed to load this user's collection items. Please try again later.");
      toast({
        title: 'Error',
        description: 'Failed to load collection items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setCurrentFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);
  
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, []);
  
  const handleGroupModeChange = useCallback((mode: boolean) => {
    setGroupMode(mode);
  }, []);
  
  // Use the collection groups hook
  const groups = useCollectionGroups({
    items: collectionItems,
    showSultanGroups: groupMode
  });
  
  const goBack = () => {
    navigate(`/profile/${userId}/collection`);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goBack} size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{countryName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">{userName}'s Collection</span>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg mb-6">
        {countryId && (
          <CollectionFilterCatalog
            countryId={countryId}
            onFilterChange={handleFilterChange}
            currentFilters={currentFilters}
            isLoading={loading}
            onViewModeChange={handleViewModeChange}
            viewMode={viewMode}
            groupMode={groupMode}
            onGroupModeChange={handleGroupModeChange}
          />
        )}
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4 text-red-500">{error}</h3>
              <Button onClick={() => loadCollectionData()}>Retry</Button>
            </div>
          ) : collectionItems.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">
                No collection items for this country
              </h3>
              <p className="text-muted-foreground">
                This user hasn't added any banknotes from this country to their collection yet.
              </p>
            </div>
          ) : (
            <CollectionView
              groups={groups}
              showSultanGroups={groupMode}
              viewMode={viewMode}
              isPublicView={true}
              isLoading={loading}
              onCollectionUpdated={loadCollectionData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCollectionCountry;
