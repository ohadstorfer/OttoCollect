import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { 
  fetchTypesByCountryId,
  createType, 
  updateType, 
  deleteType 
} from "@/services/countryService";
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
import { Edit, Trash2, Plus, MoveUp, MoveDown, Languages } from 'lucide-react';
import { updateTypeDefinition } from '@/services/adminService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Type {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  description?: string;
  display_order: number;
}

interface TypesManagerProps {
  countryId: string;
}

const TypesManager: React.FC<TypesManagerProps> = ({ countryId }) => {
  const { toast } = useToast();
  const { translate, isTranslating } = useTranslation();
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<Type | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameTr, setFormNameTr] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  
  useEffect(() => {
    if (countryId) {
      loadTypes();
    }
  }, [countryId]);
  
  const loadTypes = async () => {
    setLoading(true);
    try {
      const typesData = await fetchTypesByCountryId(countryId);
      setTypes(typesData);
    } catch (error) {
      console.error("Error loading types:", error);
      toast({
        title: "Error",
        description: "Failed to load types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddType = async () => {
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Type name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createType(
        countryId,
        formName.trim(),
        formDescription.trim(),
        formOrder,
        formNameAr.trim() || undefined,
        formNameTr.trim() || undefined
      );
      
      toast({
        title: "Success",
        description: "Type added successfully",
      });
      
      setShowAddDialog(false);
      resetForm();
      loadTypes();
    } catch (error) {
      console.error("Error adding type:", error);
      toast({
        title: "Error",
        description: "Failed to add type",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = async (id: string, newName: string, oldName: string) => {
    setLoading(true);
    try {
      // Update the type definition first (only if name changed)
      const result = await updateTypeDefinition(id, newName, oldName);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Update translation fields
      await updateType(id, countryId, {
        name: formName.trim(),
        name_ar: formNameAr.trim() || null,
        name_tr: formNameTr.trim() || null,
        description: formDescription.trim()
      });
      
      toast({
        title: "Success",
        description: "Type updated successfully",
      });
      
      setShowEditDialog(false);
      resetForm();
      loadTypes();
    } catch (error) {
      console.error('Error updating type:', error);
      toast({
        title: "Error",
        description: "Failed to update type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteType = async () => {
    if (!selectedType) {
      return;
    }
    
    try {
      await deleteType(selectedType.id, countryId);
      
      toast({
        title: "Success",
        description: "Type deleted successfully",
      });
      
      setShowDeleteDialog(false);
      loadTypes();
    } catch (error) {
      console.error("Error deleting type:", error);
      toast({
        title: "Error",
        description: "Failed to delete type",
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (type: Type) => {
    setSelectedType(type);
    setFormName(type.name);
    setFormNameAr(type.name_ar || '');
    setFormNameTr(type.name_tr || '');
    setFormDescription(type.description || '');
    setFormOrder(type.display_order);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (type: Type) => {
    setSelectedType(type);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setFormName('');
    setFormNameAr('');
    setFormNameTr('');
    setFormDescription('');
    setFormOrder(types.length);
    setSelectedType(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setFormOrder(types.length);
    setShowAddDialog(true);
  };

  const handleTranslateAll = async () => {
    if (!types.length) return;
    
    setLoading(true);
    try {
      for (const type of types) {
        if (!type.name_ar || !type.name_tr) {
          const nameAr = await translate(type.name, 'ar');
          const nameTr = await translate(type.name, 'tr');
          
          await updateType(type.id, countryId, {
            name_ar: nameAr,
            name_tr: nameTr
          });
        }
      }
      
      toast({
        title: "Success",
        description: "All types translated successfully",
      });
      
      loadTypes();
    } catch (error) {
      console.error('Error translating types:', error);
      toast({
        title: "Error",
        description: "Failed to translate types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    
    const type = types[index];
    const typeAbove = types[index - 1];
    
    try {
      await updateType(type.id, countryId, {
        display_order: typeAbove.display_order
      });
      
      await updateType(typeAbove.id, countryId, {
        display_order: type.display_order
      });
      
      loadTypes();
    } catch (error) {
      console.error("Error reordering types:", error);
      toast({
        title: "Error",
        description: "Failed to reorder types",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveDown = async (index: number) => {
    if (index >= types.length - 1) return;
    
    const type = types[index];
    const typeBelow = types[index + 1];
    
    try {
      await updateType(type.id, countryId, {
        display_order: typeBelow.display_order
      });
      
      await updateType(typeBelow.id, countryId, {
        display_order: type.display_order
      });
      
      loadTypes();
    } catch (error) {
      console.error("Error reordering types:", error);
      toast({
        title: "Error",
        description: "Failed to reorder types",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(types);
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
        await updateType(item.id, countryId, {
          display_order: item.display_order
        });
      }

      setTypes(updatedItems);
      toast({
        title: "Success",
        description: "Types reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering types:", error);
      toast({
        title: "Error",
        description: "Failed to reorder types",
        variant: "destructive",
      });
      loadTypes(); // Reload original order on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium"><span>Banknote Types</span></h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleTranslateAll} 
            variant="outline" 
            className="flex items-center space-x-1"
            disabled={isTranslating || loading || !types.length}
          >
            <Languages className="h-4 w-4" />
            <span>{isTranslating ? 'Translating...' : 'Translate All'}</span>
          </Button>
          <Button onClick={openAddDialog} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Type</span>
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading types...</p>
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No types found for this country.</p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            Add your first type
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="types">
              {(provided, snapshot) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {types.map((type, index) => (
                    <Draggable
                      key={type.id}
                      draggableId={type.id}
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
                          <TableCell>{type.name}</TableCell>
                          <TableCell>{type.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(type)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(type)}
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
      )}
      
      {/* Add Type Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Add Type</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name (English)</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter type name in English"
              />
            </div>
            <div>
              <Label htmlFor="name-ar">Name (Arabic)</Label>
              <Input
                id="name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter type name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="name-tr">Name (Turkish)</Label>
              <Input
                id="name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter type name in Turkish"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter description (optional)"
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
            <Button onClick={handleAddType}>Add Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Type Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Edit Type</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name (English)</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter type name in English"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-ar">Name (Arabic)</Label>
              <Input
                id="edit-name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter type name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-tr">Name (Turkish)</Label>
              <Input
                id="edit-name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter type name in Turkish"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={() => handleEdit(selectedType?.id || '', formName, selectedType?.name || '')}>Update Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Type Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><span>Delete Type</span></AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the type "{selectedType?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TypesManager;
