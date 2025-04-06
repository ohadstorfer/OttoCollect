
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { CollectionItem } from '@/types';
import CollectionImageUpload from './CollectionImageUpload';
import { updateCollectionItemImages } from '@/services/collectionService';
import { toast } from 'sonner';

interface EditCollectionImagesProps {
  isOpen: boolean;
  onClose: () => void;
  collectionItem: CollectionItem;
  onImagesUpdated: (obverseImage?: string, reverseImage?: string) => void;
}

export default function EditCollectionImages({
  isOpen,
  onClose,
  collectionItem,
  onImagesUpdated
}: EditCollectionImagesProps) {
  const { user } = useAuth();
  const [obverseImage, setObverseImage] = useState<string | undefined>(collectionItem.obverseImage);
  const [reverseImage, setReverseImage] = useState<string | undefined>(collectionItem.reverseImage);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to update images');
      return;
    }

    setSaving(true);
    try {
      const success = await updateCollectionItemImages(
        collectionItem.id,
        obverseImage,
        reverseImage
      );

      if (success) {
        toast.success('Collection images updated successfully');
        onImagesUpdated(obverseImage, reverseImage);
        onClose();
      } else {
        toast.error('Failed to update collection images');
      }
    } catch (error) {
      console.error('Error updating collection images:', error);
      toast.error('An error occurred while updating images');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Banknote Images</DialogTitle>
        </DialogHeader>
        
        {user && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Obverse (Front)</h4>
              <CollectionImageUpload
                userId={user.id}
                imageUrl={obverseImage || null}
                side="obverse"
                onImageUploaded={(url) => setObverseImage(url || undefined)}
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Reverse (Back)</h4>
              <CollectionImageUpload
                userId={user.id}
                imageUrl={reverseImage || null}
                side="reverse"
                onImageUploaded={(url) => setReverseImage(url || undefined)}
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Images'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
