
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { Edit, Trash2, Plus, MoveUp, MoveDown } from 'lucide-react';

interface Type {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface TypesManagerProps {
  countryId: string;
}

const TypesManager: React.FC<TypesManagerProps> = ({ countryId }) => {
  const { toast } = useToast();
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<Type | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
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
        formOrder
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
  
  const handleEditType = async () => {
    if (!selectedType || !formName.trim()) {
      toast({
        title: "Error",
        description: "Type name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateType(
        selectedType.id,
        countryId,
        {
          name: formName.trim(),
          description: formDescription.trim(),
          display_order: formOrder
        }
      );
      
      toast({
        title: "Success",
        description: "Type updated successfully",
      });
      
      setShowEditDialog(false);
      resetForm();
      loadTypes();
    } catch (error) {
      console.error("Error updating type:", error);
      toast({
        title: "Error",
        description: "Failed to update type",
        variant: "destructive",
      });
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
    setFormDescription('');
    setFormOrder(types.length);
    setSelectedType(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setFormOrder(types.length);
    setShowAddDialog(true);
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
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Banknote Types</h3>
        <Button onClick={openAddDialog} className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Type</span>
        </Button>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type, index) => (
              <TableRow key={type.id}>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span>{type.display_order}</span>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === types.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
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
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* Add Type Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter type name"
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
            <DialogTitle>Edit Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter type name"
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
            <div>
              <Label htmlFor="edit-order">Display Order</Label>
              <Input
                id="edit-order"
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                placeholder="Enter display order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditType}>Update Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Type Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Type</AlertDialogTitle>
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
