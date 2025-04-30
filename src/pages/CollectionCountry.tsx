
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollectionItem } from '@/types';
import { CollectionFilterCatalog } from '@/components/filter/CollectionFilterCatalog';
import { DynamicFilterState } from '@/types/filter';
import { fetchUserCollectionItemsByCountry } from '@/services/collectionService';
import CollectionView from '@/components/collection/CollectionView';
import { useCollectionGroups } from '@/hooks/use-collection-groups';
import CollectionItemForm from '@/components/collection/CollectionItemForm';

const CollectionCountry = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const countryName = location.state?.countryName || 'Collection';
  
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
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
    if (!countryId || !user?.id) return;
    loadCollectionData();
  }, [countryId, user]);
  
  const loadCollectionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user?.id || !countryId) return;
      
      const items = await fetchUserCollectionItemsByCountry(user.id, countryId);
      console.log(`Loaded ${items.length} collection items for country ${countryId}`);
      setCollectionItems(items);
    } catch (err) {
      console.error('Error loading collection items:', err);
      setError('Failed to load your collection items. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load collection items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditItem = (item: CollectionItem) => {
    setEditingItem(item);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };
  
  const handleSaveItem = async () => {
    setShowForm(false);
    setEditingItem(null);
    await loadCollectionData();
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
    navigate('/my-collection');
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
      </div>
      
      {showForm && (
        <div className="mb-8">
          <CollectionItemForm
            item={editingItem}
            onSave={handleSaveItem}
            onCancel={handleCloseForm}
          />
        </div>
      )}
      
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
              <p className="text-muted-foreground mb-4">
                You haven't added any banknotes from this country to your collection yet.
              </p>
            </div>
          ) : (
            <CollectionView
              groups={groups}
              showSultanGroups={groupMode}
              viewMode={viewMode}
              isPublicView={false}
              isLoading={loading}
              onItemEdit={handleEditItem}
              onCollectionUpdated={loadCollectionData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionCountry;
