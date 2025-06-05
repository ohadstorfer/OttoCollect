
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StampPicture, StampType, StampUploadData } from '@/types/stamps';
import { createStampPicture, updateStampPicture } from '@/services/stampsService';
import { useToast } from '@/hooks/use-toast';
import StampImageUpload from './StampImageUpload';

interface StampImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stampType: StampType;
  countryId: string;
  editingStamp?: StampPicture | null;
}

const StampImageEditDialog: React.FC<StampImageEditDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stampType,
  countryId,
  editingStamp
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    image_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingStamp) {
      setFormData({
        name: editingStamp.name,
        image_url: editingStamp.image_url
      });
    } else {
      setFormData({
        name: '',
        image_url: ''
      });
    }
  }, [editingStamp, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the image.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image_url.trim()) {
      toast({
        title: "Image Required",
        description: "Please upload an image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStamp) {
        await updateStampPicture(stampType, editingStamp.id, formData);
        toast({
          title: "Success",
          description: "Image updated successfully.",
        });
      } else {
        const data: StampUploadData = {
          ...formData,
          country_id: countryId
        };
        await createStampPicture(stampType, data);
        toast({
          title: "Success",
          description: "Image created successfully.",
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving stamp image:', error);
      toast({
        title: "Error",
        description: "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingStamp ? 'Edit' : 'Add'} {stampType.charAt(0).toUpperCase() + stampType.slice(1)} Image
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter image name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label>Image</Label>
            <StampImageUpload
              imageUrl={formData.image_url}
              onImageUploaded={handleImageUploaded}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StampImageEditDialog;
