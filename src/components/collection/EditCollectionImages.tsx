
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CollectionItem } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Image, Save } from 'lucide-react';
import SimpleImageUpload from './SimpleImageUpload';

interface EditCollectionImagesProps {
  collectionItem: CollectionItem;
  onImagesUpdated: () => void;
}

const EditCollectionImages = ({ collectionItem, onImagesUpdated }: EditCollectionImagesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [obverseImage, setObverseImage] = useState<string>(collectionItem.obverseImage || '');
  const [reverseImage, setReverseImage] = useState<string>(collectionItem.reverseImage || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImages = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('collection_items')
        .update({
          obverse_image: obverseImage || null,
          reverse_image: reverseImage || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionItem.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Images updated",
        description: "Your banknote images have been updated successfully.",
      });
      onImagesUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating images:", error);
      toast({
        title: "Error",
        description: "Failed to update images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Image className="h-4 w-4 mr-1.5" />
          Edit Images
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Images</DialogTitle>
          <DialogDescription>
            Upload or update your own images of this banknote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Obverse (Front)</p>
            <SimpleImageUpload
              image={obverseImage}
              side="obverse"
              onImageUploaded={setObverseImage}
            />
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Reverse (Back)</p>
            <SimpleImageUpload
              image={reverseImage}
              side="reverse"
              onImageUploaded={setReverseImage}
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="default"
            onClick={handleSaveImages}
            disabled={isSaving}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Images
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCollectionImages;
