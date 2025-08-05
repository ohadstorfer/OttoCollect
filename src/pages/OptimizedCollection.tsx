import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { fetchCountryById } from '@/services/countryService';
import { CollectionItem, CountryData } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { updateCollectionItem } from '@/services/collectionService';
import { Dialog, DialogContentWithScroll } from '@/components/ui/dialog';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import SEOHead from '@/components/seo/SEOHead';
import { SEO_CONFIG } from '@/config/seoConfig';
import { useEnhancedCollectionData } from '@/hooks/use-collection-query';
import { useOptimizedCollectionSorting } from '@/hooks/use-optimized-collection-sorting';
import { useOptimizedCollectionGroups } from '@/hooks/use-optimized-collection-groups';
import { useDynamicFilter } from '@/hooks/use-dynamic-filter';

const OptimizedCollection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { countryId } = useParams<{ countryId: string }>();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [groupMode, setGroupMode] = useState(false);
  const [country, setCountry] = useState<CountryData | null>(null);
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist' | 'missing' | 'sale'>('collection');
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<DynamicFilterState>({
    search: '',
    categories: [],
    types: [],
    sort: ['extPick']
  });
  
  // Load country information if countryId is provided
  React.useEffect(() => {
    if (countryId) {
      fetchCountryById(countryId)
        .then(countryData => {
          if (countryData) {
            setCountry(countryData);
            document.title = `${countryData.name} Collection - Ottoman Banknotes`;
          } else {
            setError(`Country with ID ${countryId} not found`);
          }
        })
        .catch(err => {
          console.error("Error fetching country:", err);
          setError("Failed to load country information");
        });
    } else {
      document.title = "My Collection - Ottoman Banknotes";
    }
  }, [countryId]);
  
  // Use the optimized collection data hook
  const {
    collectionItems,
    categories: collectionCategories,
    types: collectionTypes,
    loading: collectionLoading,
    error: collectionError,
    refetch
  } = useEnhancedCollectionData(
    user?.id || '',
    countryId,
    currentFilters
  );

  // Use optimized sorting hook
  const sortedCollectionItems = useOptimizedCollectionSorting({
    collectionItems,
    sortFields: currentFilters.sort
  });

  // Use optimized grouping hook  
  const groupedItems = useOptimizedCollectionGroups({
    collectionItems: sortedCollectionItems,
    sortFields: currentFilters.sort,
    categoryOrder: [], // Could be fetched from country data
    groupMode
  });

  // Use dynamic filter for client-side filtering
  const { 
    filteredItems,
    groupedItems: dynamicGroupedItems
  } = useDynamicFilter({
    items: collectionItems,
    initialFilters: currentFilters,
    collectionCategories,
    collectionTypes
  });

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
  
  const handleSaveItem = async (updatedItem: CollectionItem) => {
    try {
      await updateCollectionItem(updatedItem.id, updatedItem);
      setEditingItem(null);
      refetch();
      toast({
        title: "Success",
        description: "Collection item updated successfully",
      });
    } catch (error) {
      console.error("Error updating collection item:", error);
      toast({
        title: "Error",
        description: "Failed to update collection item",
        variant: "destructive",
      });
    }
  };
  
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setCurrentFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);
  
  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      sessionStorage.setItem(`collectionViewMode-${user?.id}`, JSON.stringify(mode));
    } catch (e) {
      console.error("Unable to store view mode preference:", e);
    }
  }, [user]);
  
  // Handle group mode changes
  const handleGroupModeChange = useCallback((mode: boolean) => {
    setGroupMode(mode);
    try {
      sessionStorage.setItem(`collectionGroupMode-${user?.id}`, JSON.stringify(mode));
    } catch (e) {
      console.error("Unable to store group mode preference:", e);
    }
  }, [user]);

  const handlePreferencesLoaded = () => {
    // Handle preferences loaded
  };

  const handleTabChange = (tab: 'collection' | 'wishlist' | 'missing' | 'sale') => {
    setActiveTab(tab);
  };

  const handleBackToCountries = () => {
    navigate('/collection');
  };

  // Show loading or error states
  if (!user) {
    navigate('/auth');
    return null;
  }

  if (collectionError) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4 text-red-500">
          {collectionError.message || 'Failed to load collection'}
        </h3>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // Use the grouped items from either optimized grouping or dynamic filtering
  const finalGroupedItems = groupMode ? groupedItems : dynamicGroupedItems;
  const finalFilteredItems = groupMode ? sortedCollectionItems : filteredItems;

  return (
    <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
      <SEOHead
        title={SEO_CONFIG.pages.collection.title}
        description={SEO_CONFIG.pages.collection.description}
        keywords={SEO_CONFIG.pages.collection.keywords}
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        {country ? (
          <div className="flex flex-col gap-2 mb-4 md:mb-0">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/collection')}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Countries
              </Button>
            </div>
            <h1 className="text-3xl font-bold">
              <span>{country.name} Collection</span>
            </h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold mb-4 md:mb-0"><span>My Collection</span></h1>
        )}
        
        <Button onClick={handleAddItem} className="flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add Item
        </Button>
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
      
      <div className="bg-card border rounded-lg p-6 mb-6">
        <BanknoteFilterCollection
          countryId={countryId || ''}
          countryName={country?.name || ''}
          onFilterChange={handleFilterChange}
          currentFilters={currentFilters}
          isLoading={collectionLoading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
          onPreferencesLoaded={handlePreferencesLoaded}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOwner={true}
          profileUser={user ? {
            id: user.id,
            username: user.email || '',
            avatarUrl: user.user_metadata?.avatar_url,
            rank: user.user_metadata?.rank
          } : null}
          onBackToCountries={handleBackToCountries}
          user={user}
          collectionItems={collectionItems}
        />
        
        <div className="mt-6">
          {collectionLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : finalFilteredItems.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">
                {collectionItems.length === 0
                  ? country 
                    ? `Your collection doesn't have any items from ${country.name}` 
                    : "Your collection is empty"
                  : "No items match your filter criteria"
                }
              </h3>
              {collectionItems.length === 0 ? (
                <div className="flex flex-col gap-4 items-center">
                  <Button onClick={handleAddItem} className="mt-2">Add Your First Item</Button>
                  {country && (
                    <Button variant="outline" onClick={() => navigate(`/catalog/${countryId}`)}>
                      Browse {country.name} Catalog
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {finalGroupedItems.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="space-y-4">
                  <div className="sticky top-[100px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <h2 className="text-xl font-bold"><span>{group.category}</span></h2>
                  </div>
                  
                  {group.sultanGroups ? (
                    // Group by sultan within category
                    <div className="space-y-6">
                      {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                        <div key={`sultan-${sultanIndex}`} className="space-y-4">
                          <div className="sticky top-[150px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                            <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                              {sultanGroup.sultan}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {sultanGroup.items.map((item) => {
                              const collectionItem = item as CollectionItem;
                              return (
                                <CollectionItemCard
                                  key={collectionItem.id}
                                  item={collectionItem}
                                  onEdit={() => handleEditItem(collectionItem)}
                                  onUpdate={refetch}
                                  viewMode={viewMode}
                                  isOwner={true}
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
                        const collectionItem = item as CollectionItem;
                        return (
                          <CollectionItemCard
                            key={collectionItem.id}
                            item={collectionItem}
                            onEdit={() => handleEditItem(collectionItem)}
                            onUpdate={refetch}
                            viewMode={viewMode}
                            isOwner={true}
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
      
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContentWithScroll className="sm:max-w-[600px]">
          {editingItem && (
            <CollectionItemForm
              item={editingItem}
              onCancel={() => setEditingItem(null)}
              onSaveComplete={() => {
                setEditingItem(null);
                refetch();
                toast({
                  title: "Success",
                  description: "Collection item updated successfully",
                });
              }}
            />
          )}
        </DialogContentWithScroll>
      </Dialog>
    </div>
  );
};

export default OptimizedCollection;