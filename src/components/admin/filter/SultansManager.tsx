import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, GripVertical, Languages } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from "@/hooks/useTranslation";
import { 
  SultanOrder,
  fetchSultanOrdersByCountryId,
  createSultanOrder,
  updateSultanOrder,
  deleteSultanOrder
} from '@/services/sultanOrderService';

interface SultansManagerProps {
  countryId: string;
}

export function SultansManager({ countryId }: SultansManagerProps) {
  const [sultans, setSultans] = useState<SultanOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentSultan, setCurrentSultan] = useState<SultanOrder | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    nameTr: '',
    displayOrder: 0
  });
  const { toast } = useToast();
  const { translate, isTranslating } = useTranslation();

  useEffect(() => {
    loadSultans();
  }, [countryId]);

  const loadSultans = async () => {
    try {
      setLoading(true);
      const data = await fetchSultanOrdersByCountryId(countryId);
      setSultans(data);
    } catch (error) {
      console.error('Error loading sultans:', error);
      toast({
        title: "Error",
        description: "Failed to load sultans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSultan = async () => {
    try {
      setLoading(true);
      await createSultanOrder(
        countryId, 
        formData.name, 
        formData.displayOrder,
        formData.nameAr || undefined,
        formData.nameTr || undefined
      );
      await loadSultans();
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Sultan added successfully.",
      });
    } catch (error) {
      console.error('Error adding sultan:', error);
      toast({
        title: "Error",
        description: "Failed to add sultan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSultan = async () => {
    if (!currentSultan) return;

    try {
      setLoading(true);
      await updateSultanOrder(currentSultan.id, {
        name: formData.name,
        display_order: formData.displayOrder,
        name_ar: formData.nameAr || null,
        name_tr: formData.nameTr || null
      });
      await loadSultans();
      setShowEditDialog(false);
      resetForm();
      toast({
        title: "Success",
        description: "Sultan updated successfully.",
      });
    } catch (error) {
      console.error('Error updating sultan:', error);
      toast({
        title: "Error",
        description: "Failed to update sultan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSultan = async () => {
    if (!currentSultan) return;

    try {
      setLoading(true);
      await deleteSultanOrder(currentSultan.id);
      await loadSultans();
      setShowDeleteDialog(false);
      setCurrentSultan(null);
      toast({
        title: "Success",
        description: "Sultan deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting sultan:', error);
      toast({
        title: "Error",
        description: "Failed to delete sultan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sultans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index + 1
    }));

    setSultans(updatedItems);

    // Update in database
    try {
      await Promise.all(
        updatedItems.map(item => 
          updateSultanOrder(item.id, { display_order: item.display_order })
        )
      );
      toast({
        title: "Success",
        description: "Sultan order updated successfully.",
      });
    } catch (error) {
      console.error('Error updating sultan order:', error);
      await loadSultans(); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update sultan order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setFormData({ ...formData, displayOrder: sultans.length + 1 });
    setShowAddDialog(true);
  };

  const openEditDialog = (sultan: SultanOrder) => {
    setCurrentSultan(sultan);
    setFormData({
      name: sultan.name,
      nameAr: sultan.name_ar || '',
      nameTr: sultan.name_tr || '',
      displayOrder: sultan.display_order
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (sultan: SultanOrder) => {
    setCurrentSultan(sultan);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameAr: '',
      nameTr: '',
      displayOrder: 0
    });
    setCurrentSultan(null);
  };

  const handleTranslateAll = async () => {
    if (!sultans.length) return;
    
    setLoading(true);
    try {
      for (const sultan of sultans) {
        if (!sultan.name_ar || !sultan.name_tr) {
          const nameAr = await translate(sultan.name, 'ar');
          const nameTr = await translate(sultan.name, 'tr');
          
          await updateSultanOrder(sultan.id, {
            name_ar: nameAr,
            name_tr: nameTr
          });
        }
      }
      
      toast({
        title: "Success",
        description: "All sultans translated successfully",
      });
      
      loadSultans();
    } catch (error) {
      console.error('Error translating sultans:', error);
      toast({
        title: "Error",
        description: "Failed to translate sultans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && sultans.length === 0) {
    return <div className="text-center py-4">Loading sultans...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle><span>Manage Sultans</span></CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleTranslateAll} 
            variant="outline" 
            className="flex items-center space-x-1"
            disabled={isTranslating || loading || !sultans.length}
          >
            <Languages className="h-4 w-4" />
            <span>{isTranslating ? 'Translating...' : 'Translate All'}</span>
          </Button>
          <Button onClick={openAddDialog} disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Sultan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sultans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sultans found. Add some sultans to get started.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sultans">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Display Order</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sultans.map((sultan, index) => (
                        <Draggable key={sultan.id} draggableId={sultan.id} index={index}>
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={snapshot.isDragging ? "bg-muted" : ""}
                            >
                              <TableCell>
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </TableCell>
                              <TableCell>{sultan.name}</TableCell>
                              <TableCell>{sultan.display_order}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(sultan)}
                                    disabled={loading}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteDialog(sultan)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                    </TableBody>
                  </Table>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {/* Add Sultan Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle> <span>Add New Sultan</span></DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sultanName">Sultan Name (English)</Label>
                <Input
                  id="sultanName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter sultan name in English"
                />
              </div>
              <div>
                <Label htmlFor="sultanNameAr">Sultan Name (Arabic)</Label>
                <Input
                  id="sultanNameAr"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="Enter sultan name in Arabic"
                />
              </div>
              <div>
                <Label htmlFor="sultanNameTr">Sultan Name (Turkish)</Label>
                <Input
                  id="sultanNameTr"
                  value={formData.nameTr}
                  onChange={(e) => setFormData({ ...formData, nameTr: e.target.value })}
                  placeholder="Enter sultan name in Turkish"
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="Enter display order"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSultan} disabled={loading || !formData.name.trim()}>
                Add Sultan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sultan Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle> <span>Edit Sultan</span></DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editSultanName">Sultan Name (English)</Label>
                <Input
                  id="editSultanName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter sultan name in English"
                />
              </div>
              <div>
                <Label htmlFor="editSultanNameAr">Sultan Name (Arabic)</Label>
                <Input
                  id="editSultanNameAr"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="Enter sultan name in Arabic"
                />
              </div>
              <div>
                <Label htmlFor="editSultanNameTr">Sultan Name (Turkish)</Label>
                <Input
                  id="editSultanNameTr"
                  value={formData.nameTr}
                  onChange={(e) => setFormData({ ...formData, nameTr: e.target.value })}
                  placeholder="Enter sultan name in Turkish"
                />
              </div>
              <div>
                <Label htmlFor="editDisplayOrder">Display Order</Label>
                <Input
                  id="editDisplayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="Enter display order"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSultan} disabled={loading || !formData.name.trim()}>
                Update Sultan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Sultan Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle> <span>Delete Sultan</span></AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{currentSultan?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSultan} disabled={loading}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default SultansManager;