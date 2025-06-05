import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { StampPicture, StampType } from '@/types/stamps';
import { fetchStampPictures, deleteStampPicture } from '@/services/stampsService';
import { useToast } from '@/hooks/use-toast';
import StampImageEditDialog from './StampImageEditDialog';
import { Dialog, DialogContentWithScroll } from '@/components/ui/dialog';

interface StampPicturesManagerProps {
  stampType: StampType;
  countryId?: string;
  disableCountrySelect?: boolean;
}

const StampPicturesManager: React.FC<StampPicturesManagerProps> = ({
  stampType,
  countryId,
  disableCountrySelect = false
}) => {
  const { toast } = useToast();
  const [pictures, setPictures] = useState<StampPicture[]>([]);
  const [filteredPictures, setFilteredPictures] = useState<StampPicture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPicture, setEditingPicture] = useState<StampPicture | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pictureToDelete, setPictureToDelete] = useState<StampPicture | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadPictures();
  }, [stampType, countryId]);

  useEffect(() => {
    const filtered = pictures.filter(picture =>
      picture.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPictures(filtered);
  }, [pictures, searchTerm]);

  const loadPictures = async () => {
    setLoading(true);
    try {
      const data = await fetchStampPictures(stampType, countryId);
      setPictures(data);
    } catch (error) {
      console.error('Error loading pictures:', error);
      toast({
        title: "Error",
        description: "Failed to load images.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingPicture(null);
    setIsEditDialogOpen(true);
  };

  const handleEdit = (picture: StampPicture) => {
    setEditingPicture(picture);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (picture: StampPicture) => {
    setPictureToDelete(picture);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pictureToDelete) return;

    try {
      await deleteStampPicture(stampType, pictureToDelete.id);
      toast({
        title: "Success",
        description: "Image deleted successfully.",
      });
      loadPictures();
    } catch (error) {
      console.error('Error deleting picture:', error);
      toast({
        title: "Error",
        description: "Failed to delete image.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPictureToDelete(null);
    }
  };

  const handleSuccess = () => {
    loadPictures();
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {filteredPictures.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No images found matching your search.' : 'No images uploaded yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPictures.map((picture) => (
            <Card 
              key={picture.id} 
              className="group overflow-hidden transition-all duration-200 hover:shadow-lg bg-card"
            >
              <CardContent className="p-0">
                <div 
                  className="relative w-full cursor-pointer"
                  onClick={() => openImageViewer(picture.image_url)}
                >
                  <img
                    src={picture.image_url}
                    alt={picture.name}
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate flex-1" title={picture.name}>
                      {picture.name}
                    </p>
                    <div className="flex gap-2 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(picture);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(picture);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StampImageEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleSuccess}
        stampType={stampType}
        countryId={countryId || ''}
        editingStamp={editingPicture}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pictureToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContentWithScroll className="sm:max-w-[800px] p-1">
            <img
              src={selectedImage}
              alt="Stamp detail"
              className="w-full h-auto rounded"
            />
          </DialogContentWithScroll>
        </Dialog>
      )}
    </div>
  );
};

export default StampPicturesManager;
