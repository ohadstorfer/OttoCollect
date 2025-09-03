import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Plus, Languages } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Currency {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  country_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface CurrenciesManagerProps {
  countryId: string;
}

const CurrenciesManager: React.FC<CurrenciesManagerProps> = ({ countryId }) => {
  const { toast } = useToast();
  const { translate, isTranslating } = useTranslation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameTr, setFormNameTr] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  
  useEffect(() => {
    if (countryId) {
      loadCurrencies();
    }
  }, [countryId]);
  
  const loadCurrencies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('country_id', countryId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error("Error loading currencies:", error);
      toast({
        title: "Error",
        description: "Failed to load currencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCurrency = async () => {
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Currency name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('currencies')
        .insert({
          name: formName.trim(),
          name_ar: formNameAr.trim() || null,
          name_tr: formNameTr.trim() || null,
          country_id: countryId,
          display_order: formOrder
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Currency added successfully",
      });
      
      setShowAddDialog(false);
      resetForm();
      loadCurrencies();
    } catch (error) {
      console.error("Error adding currency:", error);
      toast({
        title: "Error",
        description: "Failed to add currency",
        variant: "destructive",
      });
    }
  };
  
  const handleEditCurrency = async () => {
    if (!selectedCurrency || !formName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('currencies')
        .update({ 
          name: formName.trim(),
          name_ar: formNameAr.trim() || null,
          name_tr: formNameTr.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCurrency.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Currency updated successfully",
      });
      
      setShowEditDialog(false);
      loadCurrencies();
    } catch (error) {
      console.error("Error updating currency:", error);
      toast({
        title: "Error",
        description: "Failed to update currency",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteCurrency = async () => {
    if (!selectedCurrency) return;
    
    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', selectedCurrency.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Currency deleted successfully",
      });
      
      setShowDeleteDialog(false);
      loadCurrencies();
    } catch (error) {
      console.error("Error deleting currency:", error);
      toast({
        title: "Error",
        description: "Failed to delete currency",
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (currency: Currency) => {
    setSelectedCurrency(currency);
    setFormName(currency.name);
    setFormNameAr(currency.name_ar || '');
    setFormNameTr(currency.name_tr || '');
    setFormOrder(currency.display_order);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setFormName('');
    setFormNameAr('');
    setFormNameTr('');
    setFormOrder(currencies.length);
    setSelectedCurrency(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setFormOrder(currencies.length);
    setShowAddDialog(true);
  };

  const handleTranslateAll = async () => {
    if (!currencies.length) return;
    
    setLoading(true);
    try {
      for (const currency of currencies) {
        if (!currency.name_ar || !currency.name_tr) {
          const nameAr = await translate(currency.name, 'ar');
          const nameTr = await translate(currency.name, 'tr');
          
          const { error } = await supabase
            .from('currencies')
            .update({ 
              name_ar: nameAr,
              name_tr: nameTr,
              updated_at: new Date().toISOString()
            })
            .eq('id', currency.id);
          
          if (error) throw error;
        }
      }
      
      toast({
        title: "Success",
        description: "All currencies translated successfully",
      });
      
      loadCurrencies();
    } catch (error) {
      console.error('Error translating currencies:', error);
      toast({
        title: "Error",
        description: "Failed to translate currencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(currencies);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setLoading(true);
    try {
      // Update all items with new display orders
      for (const item of updatedItems) {
        const { error } = await supabase
          .from('currencies')
          .update({ 
            display_order: item.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (error) throw error;
      }

      setCurrencies(updatedItems);
      toast({
        title: "Success",
        description: "Currencies reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering currencies:", error);
      toast({
        title: "Error",
        description: "Failed to reorder currencies",
        variant: "destructive",
      });
      loadCurrencies(); // Reload original order on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium"><span>Currencies</span></h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleTranslateAll} 
            variant="outline" 
            className="flex items-center space-x-1"
            disabled={isTranslating || loading || !currencies.length}
          >
            <Languages className="h-4 w-4" />
            <span>{isTranslating ? 'Translating...' : 'Translate All'}</span>
          </Button>
          <Button onClick={openAddDialog} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Currency</span>
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading currencies...</p>
        </div>
      ) : currencies.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No currencies found for this country.</p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            Add your first currency
          </Button>
        </div>
      ) :
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="currencies">
              {(provided, snapshot) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {currencies.map((currency, index) => (
                    <Draggable
                      key={currency.id}
                      draggableId={currency.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? "bg-muted" : ""}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{currency.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(currency)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(currency)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </DragDropContext>
      }
      
      {/* Add Currency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Add Currency</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name (English)</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter currency name in English"
              />
            </div>
            <div>
              <Label htmlFor="name-ar">Name (Arabic)</Label>
              <Input
                id="name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter currency name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="name-tr">Name (Turkish)</Label>
              <Input
                id="name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter currency name in Turkish"
              />
            </div>
            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                placeholder="Enter display order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCurrency}>Add Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Currency Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Edit Currency</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name (English)</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter currency name in English"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-ar">Name (Arabic)</Label>
              <Input
                id="edit-name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter currency name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-tr">Name (Turkish)</Label>
              <Input
                id="edit-name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter currency name in Turkish"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditCurrency}>Update Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Currency Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><span>Delete Currency</span></AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the currency "{selectedCurrency?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCurrency} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CurrenciesManager; 