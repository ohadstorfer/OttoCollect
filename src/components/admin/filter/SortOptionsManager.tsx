
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchSortOptionsByCountryId,
  createSortOption, 
  updateSortOption, 
  deleteSortOption 
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

interface SortOption {
  id: string;
  name: string;
  field_name: string;
  description?: string;
  is_default: boolean;
  is_required: boolean;
  display_order: number;
}

interface SortOptionsManagerProps {
  countryId: string;
}

const SortOptionsManager: React.FC<SortOptionsManagerProps> = ({ countryId }) => {
  const { toast } = useToast();
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formFieldName, setFormFieldName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formOrder, setFormOrder] = useState(0);
  
  useEffect(() => {
    if (countryId) {
      loadSortOptions();
    }
  }, [countryId]);
  
  const loadSortOptions = async () => {
    setLoading(true);
    try {
      const sortOptionsData = await fetchSortOptionsByCountryId(countryId);
      setSortOptions(sortOptionsData);
    } catch (error) {
      console.error("Error loading sort options:", error);
      toast({
        title: "Error",
        description: "Failed to load sort options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSortOption = async () => {
    if (!formName.trim() || !formFieldName.trim()) {
      toast({
        title: "Error",
        description: "Name and field name are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createSortOption(
        countryId,
        formName.trim(),
        formFieldName.trim(),
        formIsDefault,
        formIsRequired,
        formOrder
      );
      
      toast({
        title: "Success",
        description: "Sort option added successfully",
      });
      
      setShowAddDialog(false);
      resetForm();
      loadSortOptions();
    } catch (error) {
      console.error("Error adding sort option:", error);
      toast({
        title: "Error",
        description: "Failed to add sort option",
        variant: "destructive",
      });
    }
  };
  
  const handleEditSortOption = async () => {
    if (!selectedSortOption || !formName.trim() || !formFieldName.trim()) {
      toast({
        title: "Error",
        description: "Name and field name are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateSortOption(
        selectedSortOption.id,
        countryId,
        {
          name: formName.trim(),
          field_name: formFieldName.trim(),
          description: formDescription.trim(),
          is_default: formIsDefault,
          is_required: formIsRequired,
          display_order: formOrder
        }
      );
      
      toast({
        title: "Success",
        description: "Sort option updated successfully",
      });
      
      setShowEditDialog(false);
      resetForm();
      loadSortOptions();
    } catch (error) {
      console.error("Error updating sort option:", error);
      toast({
        title: "Error",
        description: "Failed to update sort option",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSortOption = async () => {
    if (!selectedSortOption) {
      return;
    }
    
    try {
      await deleteSortOption(selectedSortOption.id, countryId);
      
      toast({
        title: "Success",
        description: "Sort option deleted successfully",
      });
      
      setShowDeleteDialog(false);
      loadSortOptions();
    } catch (error) {
      console.error("Error deleting sort option:", error);
      toast({
        title: "Error",
        description: "Failed to delete sort option",
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (sortOption: SortOption) => {
    setSelectedSortOption(sortOption);
    setFormName(sortOption.name);
    setFormFieldName(sortOption.field_name);
    setFormDescription(sortOption.description || '');
    setFormIsDefault(sortOption.is_default);
    setFormIsRequired(sortOption.is_required);
    setFormOrder(sortOption.display_order);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (sortOption: SortOption) => {
    setSelectedSortOption(sortOption);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setFormName('');
    setFormFieldName('');
    setFormDescription('');
    setFormIsDefault(false);
    setFormIsRequired(false);
    setFormOrder(sortOptions.length);
    setSelectedSortOption(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setFormOrder(sortOptions.length);
    setShowAddDialog(true);
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    
    const sortOption = sortOptions[index];
    const sortOptionAbove = sortOptions[index - 1];
    
    try {
      await updateSortOption(sortOption.id, countryId, {
        display_order: sortOptionAbove.display_order
      });
      
      await updateSortOption(sortOptionAbove.id, countryId, {
        display_order: sortOption.display_order
      });
      
      loadSortOptions();
    } catch (error) {
      console.error("Error reordering sort options:", error);
      toast({
        title: "Error",
        description: "Failed to reorder sort options",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveDown = async (index: number) => {
    if (index >= sortOptions.length - 1) return;
    
    const sortOption = sortOptions[index];
    const sortOptionBelow = sortOptions[index + 1];
    
    try {
      await updateSortOption(sortOption.id, countryId, {
        display_order: sortOptionBelow.display_order
      });
      
      await updateSortOption(sortOptionBelow.id, countryId, {
        display_order: sortOption.display_order
      });
      
      loadSortOptions();
    } catch (error) {
      console.error("Error reordering sort options:", error);
      toast({
        title: "Error",
        description: "Failed to reorder sort options",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Sort Options</h3>
        <Button onClick={openAddDialog} className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Sort Option</span>
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading sort options...</p>
        </div>
      ) : sortOptions.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No sort options found for this country.</p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            Add your first sort option
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Field Name</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Required</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortOptions.map((sortOption, index) => (
              <TableRow key={sortOption.id}>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span>{sortOption.display_order}</span>
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
                        disabled={index === sortOptions.length - 1}
                        onClick={() => handleMoveDown(index)}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{sortOption.name}</TableCell>
                <TableCell>{sortOption.field_name}</TableCell>
                <TableCell>{sortOption.is_default ? 'Yes' : 'No'}</TableCell>
                <TableCell>{sortOption.is_required ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(sortOption)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(sortOption)}
                      className="text-destructive"
                      disabled={sortOption.is_required} // Can't delete required sort options
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
      
      {/* Add Sort Option Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sort Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter sort option name"
              />
            </div>
            <div>
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                value={formFieldName}
                onChange={(e) => setFormFieldName(e.target.value)}
                placeholder="Enter field name (e.g., 'extPick', 'faceValue')"
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={formIsDefault}
                onCheckedChange={(checked) => setFormIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault">Default Sort Option</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={formIsRequired}
                onCheckedChange={(checked) => setFormIsRequired(checked === true)}
              />
              <Label htmlFor="isRequired">Required Sort Option</Label>
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
            <Button onClick={handleAddSortOption}>Add Sort Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Sort Option Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sort Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter sort option name"
              />
            </div>
            <div>
              <Label htmlFor="edit-fieldName">Field Name</Label>
              <Input
                id="edit-fieldName"
                value={formFieldName}
                onChange={(e) => setFormFieldName(e.target.value)}
                placeholder="Enter field name"
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isDefault"
                checked={formIsDefault}
                onCheckedChange={(checked) => setFormIsDefault(checked === true)}
              />
              <Label htmlFor="edit-isDefault">Default Sort Option</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isRequired"
                checked={formIsRequired}
                onCheckedChange={(checked) => setFormIsRequired(checked === true)}
                disabled={selectedSortOption?.is_required}
              />
              <Label htmlFor="edit-isRequired">Required Sort Option</Label>
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
            <Button onClick={handleEditSortOption}>Update Sort Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Sort Option Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sort Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the sort option "{selectedSortOption?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSortOption} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SortOptionsManager;
