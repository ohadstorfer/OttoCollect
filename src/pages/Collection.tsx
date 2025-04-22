import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CollectionItem, BanknoteCondition } from '@/types';
import { 
  fetchUserCollectionItems, 
  createCollectionItem, 
  updateCollectionItem, 
  deleteCollectionItem,
  fetchBanknoteCategoriesAndTypes
} from '@/services/collectionService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { Skeleton } from "@/components/ui/skeleton"
import { useDynamicFilter } from '@/hooks/use-dynamic-filter';
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const CollectionItemForm = ({ item, onSave, onCancel }: {
  item: CollectionItem | null;
  onSave: (item: CollectionItem) => void;
  onCancel: () => void;
}) => {
  const [condition, setCondition] = useState(item?.condition || 'Good');
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate || '');
  const [location, setLocation] = useState(item?.location || '');
  const [publicNote, setPublicNote] = useState(item?.publicNote || '');
  const [privateNote, setPrivateNote] = useState(item?.privateNote || '');
  const [isForSale, setIsForSale] = useState(item?.isForSale || false);
  const [salePrice, setSalePrice] = useState(item?.salePrice?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      ...item,
      condition,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseDate,
      location,
      publicNote,
      privateNote,
      isForSale,
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
    } as CollectionItem;
    onSave(newItem);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mint">Mint</SelectItem>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              type="number"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Enter purchase price"
            />
          </div>
          <div>
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              type="date"
              id="purchaseDate"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
            />
          </div>
          <div>
            <Label htmlFor="publicNote">Public Note</Label>
            <Textarea
              id="publicNote"
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
              placeholder="Enter public note"
            />
          </div>
          <div>
            <Label htmlFor="privateNote">Private Note</Label>
            <Textarea
              id="privateNote"
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              placeholder="Enter private note"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="isForSale">For Sale</Label>
            <Switch
              id="isForSale"
              checked={isForSale}
              onCheckedChange={setIsForSale}
            />
          </div>
          {isForSale && (
            <div>
              <Label htmlFor="salePrice">Sale Price</Label>
              <Input
                type="number"
                id="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Enter sale price"
              />
            </div>
          )}
          <div className="flex justify-between">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const Collection = () => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<{ id: string; name: string; count?: number }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; count?: number }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const userId = user?.id;

  const {
    filteredItems,
    filters,
    setFilters,
    groupedItems,
    isLoading
  } = useDynamicFilter({
    items,
    collectionCategories: categories,
    collectionTypes: types
  });

  const fetchCollectionItems = useCallback(async () => {
    if (!userId) {
      console.log("No user ID, can't fetch collection");
      return;
    }
    setLoading(true);
    try {
      const collectionItems = await fetchUserCollectionItems(userId);
      setItems(collectionItems);
      
      // Fetch categories and types
      const { categories, types } = await fetchBanknoteCategoriesAndTypes(collectionItems);
      setCategories(categories);
      setTypes(types);
    } catch (error) {
      console.error('Error fetching collection items:', error);
      toast({
        title: "Error",
        description: "Failed to load collection items. Please try again later.",
        variant: "destructive",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchCollectionItems();
  }, [fetchCollectionItems]);

  const handleCreateItem = () => {
    navigate('/catalog');
  };

  const handleEditItem = (item: CollectionItem) => {
    setSelectedItem(item);
    setIsEditing(true);
  };

  const handleSaveItem = async (item: CollectionItem) => {
    setLoading(true);
    try {
      if (item.id) {
        // Update existing item
        const success = await updateCollectionItem(item.id, {
          condition: item.condition,
          purchasePrice: item.purchasePrice,
          purchaseDate: item.purchaseDate,
          publicNote: item.publicNote,
          privateNote: item.privateNote,
          isForSale: item.isForSale,
          salePrice: item.salePrice,
          location: item.location
        });
        if (success) {
          toast({
            title: "Success",
            description: "Collection item updated successfully.",
          });
          fetchCollectionItems();
        } else {
          toast({
            title: "Error",
            description: "Failed to update collection item.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error saving collection item:', error);
      toast({
        title: "Error",
        description: "Failed to save collection item. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSelectedItem(null);
      setIsEditing(false);
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setLoading(true);
    try {
      const success = await deleteCollectionItem(itemId);
      if (success) {
        toast({
          title: "Success",
          description: "Collection item deleted successfully.",
        });
        fetchCollectionItems();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete collection item.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting collection item:', error);
      toast({
        title: "Error",
        description: "Failed to delete collection item. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedItem(null);
    setIsEditing(false);
  };

  const handleFilterChange = (newFilters: Partial<any>) => {
    setFilters(newFilters);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <Button onClick={handleCreateItem}>
          <Plus className="h-4 w-4 mr-2" /> Add New Item
        </Button>
      </div>

      {isEditing && selectedItem && (
        <CollectionItemForm
          item={selectedItem}
          onSave={handleSaveItem}
          onCancel={handleCancelEdit}
        />
      )}

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Collection Overview</h2>
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-gray-500">Total Items:</span>
            <span className="font-medium ml-1">{items.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Unique Categories:</span>
            <span className="font-medium ml-1">{categories.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Unique Types:</span>
            <span className="font-medium ml-1">{types.length}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Filter & Sort</h2>
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              type="text"
              id="search"
              placeholder="Search..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            {categories.map(category => (
              <div key={category.id}>
                <label>
                  <input
                    type="checkbox"
                    value={category.id}
                    checked={filters.categories?.includes(category.id) || false}
                    onChange={(e) => {
                      const categoryId = category.id;
                      const isChecked = e.target.checked;
                      let updatedCategories = [...(filters.categories || [])];
                      if (isChecked) {
                        updatedCategories.push(categoryId);
                      } else {
                        updatedCategories = updatedCategories.filter(id => id !== categoryId);
                      }
                      handleFilterChange({ categories: updatedCategories });
                    }}
                  />
                  {category.name}
                </label>
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            {types.map(type => (
              <div key={type.id}>
                <label>
                  <input
                    type="checkbox"
                    value={type.id}
                    checked={filters.types?.includes(type.id) || false}
                    onChange={(e) => {
                      const typeId = type.id;
                      const isChecked = e.target.checked;
                      let updatedTypes = [...(filters.types || [])];
                      if (isChecked) {
                        updatedTypes.push(typeId);
                      } else {
                        updatedTypes = updatedTypes.filter(id => id !== typeId);
                      }
                      handleFilterChange({ types: updatedTypes });
                    }}
                  />
                  {type.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Collection Items</h2>
        <div>
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            Switch to {viewMode === 'grid' ? 'List' : 'Grid'} View
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-[40%]" />
                <Skeleton className="h-4 w-[90%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-xl font-medium mb-4">No items found in your collection</h3>
          <p className="text-muted-foreground">Add items to your collection or adjust your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <CollectionItemCard
              key={`item-${item.id}`}
              item={item}
              banknote={item.banknote}
              onItemEdit={() => handleEditItem(item)}
              onCollectionUpdated={fetchCollectionItems}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(item => (
            <CollectionItemCard
              key={`list-${item.id}`}
              item={item}
              banknote={item.banknote}
              onItemEdit={() => handleEditItem(item)}
              onCollectionUpdated={fetchCollectionItems}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Collection;
