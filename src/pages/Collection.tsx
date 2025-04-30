
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { fetchUserCollectionItems, fetchBanknoteCategoriesAndTypes } from '@/services/collectionService';
import { CollectionItem, DetailedBanknote } from '@/types';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import { DynamicFilterState } from '@/types/filter';
import { useDynamicFilter } from '@/hooks/use-dynamic-filter';

const Collection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  
  // Collection data for filtering
  const [collectionCategories, setCollectionCategories] = useState<
    { id: string; name: string; count: number }[]
  >([]);
  const [collectionTypes, setCollectionTypes] = useState<
    { id: string; name: string; count: number }[]
  >([]);
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<DynamicFilterState>({
    search: '',
    categories: [],
    types: [],
    sort: ['extPick']
  });
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadUserCollection();
  }, [user, navigate]);
  
  const loadUserCollection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user?.id) return;
      
      // Fetch user's collection items
      const items = await fetchUserCollectionItems(user.id);
      console.log('Loaded collection items:', items.length);
      setCollectionItems(items);
      
      // Extract categories and types from collection items
      const { categories, types } = await fetchBanknoteCategoriesAndTypes(items);
      console.log('Extracted categories and types:', { categories, types });
      
      setCollectionCategories(categories);
      setCollectionTypes(types);
      
    } catch (err) {
      console.error('Error loading collection:', err);
      setError('Failed to load your collection. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load your collection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };
  
  const handleEditItem = (item: CollectionItem) => {
    setEditingItem(item);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };
  
  const handleSaveItem = async (item: CollectionItem) => {
    // Form component handles the actual saving
    console.log('Saving collection item:', item);
    setShowForm(false);
    setEditingItem(null);
    await loadUserCollection(); // Refresh the list
  };
  
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setCurrentFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);
  
  // Create collection items with banknote data for filtering
  const collectionItemsWithBanknote = useMemo(() => {
    return collectionItems.map(item => ({
      ...item,
      banknote: {
        id: item.banknoteId,
        series: item.banknote?.series || '',
        type: item.banknote?.type || '',
        categoryId: '', // This will be populated
        typeId: '', // This will be populated
      }
    }));
  }, [collectionItems]);
  
  // Use the dynamic filter hook
  const { 
    filteredItems,
    groupedItems,
    isLoading: filterLoading
  } = useDynamicFilter({
    items: collectionItemsWithBanknote,
    initialFilters: currentFilters,
    collectionCategories: collectionCategories,
    collectionTypes: collectionTypes
  });

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">My Collection</h1>
        <Button onClick={handleAddItem} className="flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add Item
        </Button>
      </div>
      
      {showForm && (
        <div className="mb-8">
          <CollectionItemForm
            initialItem={editingItem}
            onSave={handleSaveItem}
            onCancel={handleCloseForm}
          />
        </div>
      )}
      
      <div className="bg-card border rounded-lg p-6 mb-6">
        <BanknoteFilterCollection
          onFilterChange={handleFilterChange}
          currentFilters={currentFilters}
          isLoading={loading || filterLoading}
          collectionCategories={collectionCategories}
          collectionTypes={collectionTypes}
        />
        
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4 text-red-500">{error}</h3>
              <Button onClick={() => loadUserCollection()}>Retry</Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">
                {collectionItems.length === 0
                  ? "Your collection is empty"
                  : "No items match your filter criteria"
                }
              </h3>
              {collectionItems.length === 0 ? (
                <Button onClick={handleAddItem} className="mt-2">Add Your First Item</Button>
              ) : (
                <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {groupedItems.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="space-y-4">
                  <div className="sticky top-[184px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <h2 className="text-xl font-bold">{group.category}</h2>
                  </div>
                  
                  {group.sultanGroups ? (
                    // Group by sultan within category
                    <div className="space-y-6">
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          <div className="sticky top-[248px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                            <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                              {sultanGroup.sultan}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sultanGroup.items.map((item) => {
                              const collectionItem = item as any as CollectionItem;
                              return (
                                <CollectionItemCard
                                  key={collectionItem.id}
                                  collectionItem={collectionItem}
                                  onItemEdit={() => handleEditItem(collectionItem)}
                                  onCollectionUpdated={loadUserCollection}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Simple category grouping
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.items.map((item) => {
                        const collectionItem = item as any as CollectionItem;
                        return (
                          <CollectionItemCard
                            key={collectionItem.id}
                            collectionItem={collectionItem}
                            onItemEdit={() => handleEditItem(collectionItem)}
                            onCollectionUpdated={loadUserCollection}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collection;
