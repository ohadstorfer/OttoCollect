import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { 
  fetchUserCollectionItems, 
  fetchBanknoteCategoriesAndTypes, 
  fetchUserCollectionByCountry
} from '@/services/collectionService';
import { fetchCountryById } from '@/services/countryService';
import { CollectionItem, DetailedBanknote, CountryData } from '@/types';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import { DynamicFilterState } from '@/types/filter';
import { useDynamicFilter } from '@/hooks/use-dynamic-filter';

const Collection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { countryId } = useParams<{ countryId: string }>();
  const { toast } = useToast();
  
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [groupMode, setGroupMode] = useState(false);
  const [country, setCountry] = useState<CountryData | null>(null);
  
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
  
  // Load country information if countryId is provided
  useEffect(() => {
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
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadUserCollection();
  }, [user, navigate, countryId]);
  
  const loadUserCollection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user?.id) return;
      
      let items: CollectionItem[];
      
      // Fetch user's collection items based on whether we have a countryId
      if (countryId) {
        items = await fetchUserCollectionByCountry(user.id, countryId);
        console.log(`Loaded ${items.length} collection items for country ${countryId}`);
      } else {
        items = await fetchUserCollectionItems(user.id);
        console.log('Loaded all collection items:', items.length);
      }
      
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
  
  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    // Save preference in session storage
    try {
      sessionStorage.setItem(`collectionViewMode-${user?.id}`, JSON.stringify(mode));
    } catch (e) {
      console.error("Unable to store view mode preference:", e);
    }
  }, [user]);
  
  // Handle group mode changes
  const handleGroupModeChange = useCallback((mode: boolean) => {
    setGroupMode(mode);
    // Save preference in session storage
    try {
      sessionStorage.setItem(`collectionGroupMode-${user?.id}`, JSON.stringify(mode));
    } catch (e) {
      console.error("Unable to store group mode preference:", e);
    }
  }, [user]);
  
  // Create collection items with banknote data for filtering, but preserve ALL banknote data
  const collectionItemsWithBanknote = useMemo(() => {
    console.log("Collection - Creating collectionItemsWithBanknote with", collectionItems.length, "items");
    
    return collectionItems.map(item => {
      // Log the original banknote data
      console.log("Collection - Original banknote data for item", item.id, {
        hasFullBanknote: !!item.banknote,
        banknoteId: item.banknoteId,
        country: item.banknote?.country,
        denomination: item.banknote?.denomination,
        year: item.banknote?.year,
        series: item.banknote?.series,
        type: item.banknote?.type,
      });
      
      // Create a new object for filtering that preserves the original banknote
      const result = {
        ...item,
        // Only add type info fields for filtering, but keep the original banknote intact
        banknote: item.banknote ? {
          ...item.banknote,
          categoryId: '', // This will be populated
          typeId: '', // This will be populated
        } : {
          id: item.banknoteId,
          series: '',
          type: '',
          categoryId: '',
          typeId: '',
        }
      };
      
      // Log the created item
      console.log("Collection - Created item for filtering:", {
        id: result.id,
        banknoteId: result.banknoteId,
        hasOriginalBanknoteData: !!result.banknote,
        banknoteType: result.banknote?.type,
        banknoteSeries: result.banknote?.series,
      });
      
      return result;
    });
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
    <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
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
              {country.name} Collection
            </h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold mb-4 md:mb-0">My Collection</h1>
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
          onFilterChange={handleFilterChange}
          currentFilters={currentFilters}
          isLoading={loading || filterLoading}
          collectionCategories={collectionCategories}
          collectionTypes={collectionTypes}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
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
              {groupedItems.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="space-y-4">
                  <div className="sticky top-[100px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <h2 className="text-xl font-bold">{group.category}</h2>
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
                              const collectionItem = item as any as CollectionItem;
                              return (
                                <CollectionItemCard
                                  key={collectionItem.id}
                                  item={collectionItem}
                                  onEdit={() => handleEditItem(collectionItem)}
                                  onUpdate={loadUserCollection}
                                  viewMode={viewMode}
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
                            item={collectionItem}
                            onEdit={() => handleEditItem(collectionItem)}
                            onUpdate={loadUserCollection}
                            viewMode={viewMode}
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
