// Note: react-beautiful-dnd generates a warning about defaultProps in React 18+
// This is a known issue with the library and cannot be fixed from our code
// The warning: "Support for defaultProps will be removed from memo components in a future major release"
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { 
  fetchCategoriesByCountryId,
  createCategory, 
  updateCategory, 
  deleteCategory 
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
import { updateCategoryDefinition } from '@/services/adminService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Category {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  description?: string;
  display_order: number;
}

interface CategoriesManagerProps {
  countryId: string;
}

const CategoriesManager: React.FC<CategoriesManagerProps> = ({ countryId }) => {
  const { toast } = useToast();
  const { translate, isTranslating } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameTr, setFormNameTr] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  
  useEffect(() => {
    if (countryId) {
      loadCategories();
    }
  }, [countryId]);
  
  const loadCategories = async () => {
    setLoading(true);
    try {
      const categoriesData = await fetchCategoriesByCountryId(countryId);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCategory = async () => {
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createCategory(
        countryId,
        formName.trim(),
        formDescription.trim(),
        formOrder,
        formNameAr.trim() || undefined,
        formNameTr.trim() || undefined
      );
      
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      
      setShowAddDialog(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = async (id: string, newName: string, oldName: string) => {
    setLoading(true);
    try {
      // Update the category definition first (only if name changed)
      const result = await updateCategoryDefinition(id, newName, oldName);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Update translation fields
      await updateCategory(id, countryId, {
        name: formName.trim(),
        name_ar: formNameAr.trim() || null,
        name_tr: formNameTr.trim() || null,
        description: formDescription.trim()
      });
      
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      
      setShowEditDialog(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCategory = async () => {
    if (!selectedCategory) {
      return;
    }
    
    try {
      await deleteCategory(selectedCategory.id, countryId);
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      
      setShowDeleteDialog(false);
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormName(category.name);
    setFormNameAr(category.name_ar || '');
    setFormNameTr(category.name_tr || '');
    setFormDescription(category.description || '');
    setFormOrder(category.display_order);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setFormName('');
    setFormNameAr('');
    setFormNameTr('');
    setFormDescription('');
    setFormOrder(categories.length);
    setSelectedCategory(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setFormOrder(categories.length);
    setShowAddDialog(true);
  };

  const handleTranslateAll = async () => {
    if (!categories.length) return;
    
    setLoading(true);
    try {
      for (const category of categories) {
        if (!category.name_ar || !category.name_tr) {
          const nameAr = await translate(category.name, 'ar');
          const nameTr = await translate(category.name, 'tr');
          
          await updateCategory(category.id, countryId, {
            name_ar: nameAr,
            name_tr: nameTr
          });
        }
      }
      
      toast({
        title: "Success",
        description: "All categories translated successfully",
      });
      
      loadCategories();
    } catch (error) {
      console.error('Error translating categories:', error);
      toast({
        title: "Error",
        description: "Failed to translate categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    
    const category = categories[index];
    const categoryAbove = categories[index - 1];
    
    try {
      await updateCategory(category.id, countryId, {
        display_order: categoryAbove.display_order
      });
      
      await updateCategory(categoryAbove.id, countryId, {
        display_order: category.display_order
      });
      
      loadCategories();
    } catch (error) {
      console.error("Error reordering categories:", error);
      toast({
        title: "Error",
        description: "Failed to reorder categories",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return;
    
    const category = categories[index];
    const categoryBelow = categories[index + 1];
    
    try {
      await updateCategory(category.id, countryId, {
        display_order: categoryBelow.display_order
      });
      
      await updateCategory(categoryBelow.id, countryId, {
        display_order: category.display_order
      });
      
      loadCategories();
    } catch (error) {
      console.error("Error reordering categories:", error);
      toast({
        title: "Error",
        description: "Failed to reorder categories",
        variant: "destructive",
      });
    }
  };
  
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(categories);
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
        await updateCategory(item.id, countryId, {
          display_order: item.display_order
        });
      }

      setCategories(updatedItems);
      toast({
        title: "Success",
        description: "Categories reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering categories:", error);
      toast({
        title: "Error",
        description: "Failed to reorder categories",
        variant: "destructive",
      });
      loadCategories(); // Reload original order on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium"><span>Categories</span></h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleTranslateAll} 
            variant="outline" 
            className="flex items-center space-x-1"
            disabled={isTranslating || loading || !categories.length}
          >
            <Languages className="h-4 w-4" />
            <span>{isTranslating ? 'Translating...' : 'Translate All'}</span>
          </Button>
          <Button onClick={openAddDialog} className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">No categories found for this country.</p>
          <Button onClick={openAddDialog} variant="outline" className="mt-4">
            Add your first category
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
            <Droppable droppableId="categories">
              {(provided, snapshot) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {categories.map((category, index) => (
                    <Draggable
                      key={category.id}
                      draggableId={category.id}
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
                          <TableCell>{category.name}</TableCell>
                          <TableCell>{category.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(category)}
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
      
      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Add Category</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name (English)</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter category name in English"
              />
            </div>
            <div>
              <Label htmlFor="name-ar">Name (Arabic)</Label>
              <Input
                id="name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter category name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="name-tr">Name (Turkish)</Label>
              <Input
                id="name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter category name in Turkish"
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
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>Edit Category</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name (English)</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter category name in English"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-ar">Name (Arabic)</Label>
              <Input
                id="edit-name-ar"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="Enter category name in Arabic"
              />
            </div>
            <div>
              <Label htmlFor="edit-name-tr">Name (Turkish)</Label>
              <Input
                id="edit-name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Enter category name in Turkish"
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
            <Button onClick={() => handleEdit(selectedCategory?.id || '', formName, selectedCategory?.name || '')}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Category Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><span>Delete Category</span></AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{selectedCategory?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesManager;
