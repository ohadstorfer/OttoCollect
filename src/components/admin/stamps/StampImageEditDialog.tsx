import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { StampPicture, StampType } from '@/types/stamps';
import { useToast } from '@/hooks/use-toast';
import { createStampPicture, updateStampPicture } from '@/services/stampsService';
import { useImageSearch } from '@/hooks/useImageSearch';
import { ImageSelectItem } from '@/components/shared/ImageSelectItem';
import { ScrollArea } from "@/components/ui/scroll-area"

interface StampImageEditDialogProps {
  stamp?: StampPicture;
  type: StampType;
  onSave: (stamp: StampPicture) => void;
  onCancel: () => void;
}

const StampImageEditDialog = ({ stamp, type, onSave, onCancel }: StampImageEditDialogProps) => {
  const [editedStamp, setEditedStamp] = useState<StampPicture>({
    id: stamp?.id || '',
    country_id: stamp?.country_id || '',
    name: stamp?.name || '',
    image_url: stamp?.image_url || '',
    created_at: stamp?.created_at || new Date().toISOString(),
    updated_at: stamp?.updated_at || new Date().toISOString(),
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { images, searchImages } = useImageSearch();

  useEffect(() => {
    if (stamp) {
      setEditedStamp({
        id: stamp.id,
        country_id: stamp.country_id,
        name: stamp.name,
        image_url: stamp.image_url,
        created_at: stamp.created_at,
        updated_at: stamp.updated_at,
      });
    }
  }, [stamp]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedStamp(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editedStamp.id) {
        const updatedStamp = await updateStampPicture(type, editedStamp.id, {
          name: editedStamp.name,
          image_url: editedStamp.image_url,
          country_id: editedStamp.country_id,
        });
        onSave(updatedStamp);
        toast({
          title: `${capitalizeFirstLetter(type)} Stamp Updated`,
          description: 'Stamp image updated successfully.',
        });
      } else {
        const newStamp = await createStampPicture(type, {
          name: editedStamp.name,
          image_url: editedStamp.image_url,
          country_id: editedStamp.country_id,
        });
        onSave(newStamp);
        toast({
          title: `${capitalizeFirstLetter(type)} Stamp Created`,
          description: 'New stamp image created successfully.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save stamp image.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      onCancel();
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    setEditedStamp(prev => ({ ...prev, image_url: imageUrl }));
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{stamp ? `Edit ${capitalizeFirstLetter(type)} Stamp` : `New ${capitalizeFirstLetter(type)} Stamp`}</DialogTitle>
          <DialogDescription>
            {stamp ? 'Update the stamp image details.' : 'Create a new stamp image.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={editedStamp.name}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="country_id" className="text-right">
              Country ID
            </Label>
            <Input
              type="text"
              id="country_id"
              name="country_id"
              value={editedStamp.country_id}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_url" className="text-right">
              Image URL
            </Label>
            <Input
              type="text"
              id="image_url"
              name="image_url"
              value={editedStamp.image_url}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_search" className="text-right">
              Image Search
            </Label>
            <Input
              type="text"
              id="image_search"
              placeholder="Search for images..."
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchImages(e.currentTarget.value);
                }
              }}
            />
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Select Image
              </Label>
              <ScrollArea className="col-span-3 h-40 p-2 rounded-md border">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <ImageSelectItem
                      key={index}
                      imageUrl={image}
                      isSelected={image === editedStamp.image_url}
                      onSelect={handleImageSelect}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StampImageEditDialog;
