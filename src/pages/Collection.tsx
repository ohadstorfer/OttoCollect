
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  fetchUserCollection, 
  updateCollectionItem,
  deleteCollectionItem,
} from '@/services/collectionService';
import { fetchBanknotes } from '@/services/banknoteService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CollectionItem, Banknote } from '@/types';
import { toast } from 'sonner';
import { Grid, Search, Filter, PlusCircle } from 'lucide-react';

interface FilterState {
  searchTerm: string;
  isForSaleOnly: boolean;
}

const CollectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [filter, setFilter] = useState<FilterState>({ searchTerm: '', isForSaleOnly: false });

  const { data: collection, isLoading: collectionLoading, refetch: refreshCollection } = useQuery({
    queryKey: ['userCollection', user?.id],
    queryFn: () => fetchUserCollection(user?.id || ''),
    enabled: !!user?.id,
  });

  const { data: banknotes, isLoading: banknotesLoading } = useQuery({
    queryKey: ['banknotes'],
    queryFn: () => fetchBanknotes(),
  });

  const handleAddItem = () => {
    setIsAdding(true);
  };

  const handleEditItem = (item: CollectionItem) => {
    setEditingItem(item);
    setIsEditing(true);
  };

  const handleSaveEdit = async (updatedItem: CollectionItem) => {
    if (!user) return;

    try {
      await updateCollectionItem(updatedItem.id, updatedItem);
      toast.success('Collection item updated successfully!');
      setIsEditing(false);
      setEditingItem(null);
      refreshCollection();
    } catch (error) {
      console.error('Error updating collection item:', error);
      toast.error('Failed to update collection item.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;

    try {
      await deleteCollectionItem(itemId);
      toast.success('Collection item deleted successfully!');
      refreshCollection();
    } catch (error) {
      console.error('Error deleting collection item:', error);
      toast.error('Failed to delete collection item.');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const toggleForSaleOnly = () => {
    setFilter(prev => ({ ...prev, isForSaleOnly: !prev.isForSaleOnly }));
  };

  const filteredItems = collection?.filter(item => {
    const banknote = banknotes?.find(b => b.id === item.banknoteId);
    if (!banknote) return false;

    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch && !item.isForSale;
  }) || [];

  const filteredForSaleItems = collection?.filter(item => {
    const banknote = banknotes?.find(b => b.id === item.banknoteId);
    if (!banknote) return false;

    const matchesSearch = banknote.denomination.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.country.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      banknote.year.toLowerCase().includes(filter.searchTerm.toLowerCase());

    return matchesSearch && item.isForSale;
  }) || [];

  return (
    <div className="collection-page">
      {editingItem && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Collection Item</DialogTitle>
              <DialogDescription>Update details for this item in your collection</DialogDescription>
            </DialogHeader>
            <CollectionItemForm 
              collectionItem={editingItem} 
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          </DialogContent>
        </Dialog>
      )}

      <Container>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">My Collection</h1>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="flex-1 mb-2 md:mb-0">
            <Input
              type="search"
              placeholder="Search denomination, country, year..."
              value={filter.searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collection">Collection ({filteredItems.length})</TabsTrigger>
            <TabsTrigger value="forSale">For Sale ({filteredForSaleItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="mt-6">
            {collectionLoading || banknotesLoading ? (
              <div className="flex justify-center">Loading collection...</div>
            ) : filteredItems.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map(item => {
                  const banknote = banknotes?.find(b => b.id === item.banknoteId);
                  if (!banknote) return null;
                  
                  return (
                    <div key={item.id} className="collection-item">
                      <CollectionItemCard
                        key={item.id}
                        item={item}
                        banknote={banknote}
                        onItemEdit={() => handleEditItem(item)}
                        onCollectionUpdated={refreshCollection}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p>No items in collection yet.</p>
                <Button onClick={() => navigate('/catalog')} className="mt-4">
                  Browse Catalog
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="forSale" className="mt-6">
            {collectionLoading || banknotesLoading ? (
              <div className="flex justify-center">Loading for sale items...</div>
            ) : filteredForSaleItems.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredForSaleItems.map(item => {
                  const banknote = banknotes?.find(b => b.id === item.banknoteId);
                  if (!banknote) return null;
                  
                  return (
                    <CollectionItemCard
                      key={item.id}
                      item={item}
                      banknote={banknote}
                      onItemEdit={() => handleEditItem(item)}
                      onCollectionUpdated={refreshCollection}
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p>No items listed for sale yet.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
};

export default CollectionPage;
