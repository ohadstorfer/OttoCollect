
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
  console.log('[StampImageEditDialog] Initializing with props:', { isOpen, stampType, countryId, editingStamp });
  
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    image_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  useEffect(() => {
    console.log('[StampImageEditDialog] useEffect triggered:', { editingStamp, isOpen });
    if (editingStamp) {
      console.log('[StampImageEditDialog] Setting form data from editingStamp:', { 
        name: editingStamp.name, 
        image_url: editingStamp.image_url 
      });
      setFormData({
        name: editingStamp.name,
        image_url: editingStamp.image_url
      });
    } else {
      console.log('[StampImageEditDialog] Resetting form data');
      setFormData({
        name: '',
        image_url: ''
      });
    }
  }, [editingStamp, isOpen]);

  const getStampTypeDisplayName = (type: StampType): string => {
    switch (type) {
      case 'signatures_front':
        return 'Front Signature';
      case 'signatures_back':
        return 'Back Signature';
      case 'seal':
        return 'Seal';
      case 'watermark':
        return 'Watermark';
      case 'tughra':
        return 'Tughra';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[StampImageEditDialog] handleSubmit called with formData:', formData);
    console.log('[StampImageEditDialog] Current states:', { isSubmitting, isImageUploading });
    
    if (!formData.name.trim()) {
      console.log('[StampImageEditDialog] Name validation failed');
      toast({
        title: "Name Required",
        description: "Please enter a name for the image.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image_url.trim()) {
      console.log('[StampImageEditDialog] Image URL validation failed');
      toast({
        title: "Image Required",
        description: "Please upload an image.",
        variant: "destructive",
      });
      return;
    }

    if (isImageUploading) {
      console.log('[StampImageEditDialog] Attempted to submit while image is uploading');
      toast({
        title: "Wait for Upload",
        description: "Please wait for the image to finish uploading.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log('[StampImageEditDialog] Starting submission process');

    try {
      if (editingStamp) {
        console.log('[StampImageEditDialog] Updating existing stamp:', { id: editingStamp.id, formData });
        await updateStampPicture(stampType, editingStamp.id, formData);
        console.log('[StampImageEditDialog] Update successful');
        toast({
          title: "Success",
          description: "Image updated successfully.",
        });
      } else {
        console.log('[StampImageEditDialog] Creating new stamp:', { formData, countryId });
        const data: StampUploadData = {
          ...formData,
          country_id: countryId
        };
        await createStampPicture(stampType, data);
        console.log('[StampImageEditDialog] Creation successful');
        toast({
          title: "Success",
          description: "Image created successfully.",
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('[StampImageEditDialog] Error in submission:', error);
      toast({
        title: "Error",
        description: "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('[StampImageEditDialog] Submission process completed');
      setIsSubmitting(false);
    }
  };

  const handleImageUploaded = (url: string) => {
    console.log('[StampImageEditDialog] Image uploaded callback received with URL:', url);
    setFormData(prev => {
      console.log('[StampImageEditDialog] Updating form data with new image URL. Previous:', prev);
      return { ...prev, image_url: url };
    });
  };

  const handleImageUploadStart = () => {
    console.log('[StampImageEditDialog] Image upload started');
    setIsImageUploading(true);
  };

  const handleImageUploadEnd = () => {
    console.log('[StampImageEditDialog] Image upload ended');
    setIsImageUploading(false);
  };

  const handleClose = () => {
    console.log('[StampImageEditDialog] Handling close');
    if (isImageUploading) {
      console.log('[StampImageEditDialog] Preventing close during upload');
      toast({
        title: "Wait for Upload",
        description: "Please wait for the image to finish uploading.",
        variant: "destructive",
      });
      return;
    }
    onClose();
  };

  console.log('[StampImageEditDialog] Rendering with states:', { formData, isSubmitting, isImageUploading });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('[StampImageEditDialog] Dialog onOpenChange:', open);
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {editingStamp ? 'Edit' : 'Add'} {getStampTypeDisplayName(stampType)} Image
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                console.log('[StampImageEditDialog] Name input changed:', e.target.value);
                setFormData(prev => ({ ...prev, name: e.target.value }));
              }}
              placeholder="Enter image name"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label>Image</Label>
            <StampImageUpload
              imageUrl={formData.image_url}
              onImageUploaded={handleImageUploaded}
              onUploadStart={handleImageUploadStart}
              onUploadEnd={handleImageUploadEnd}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[StampImageEditDialog] Cancel button clicked');
                handleClose();
              }}
              disabled={isSubmitting || isImageUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isImageUploading}
              onClick={(e) => e.stopPropagation()}
            >
              {isSubmitting ? 'Saving...' : (isImageUploading ? 'Uploading...' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StampImageEditDialog;
