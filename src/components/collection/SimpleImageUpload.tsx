import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Crop } from 'lucide-react';
import { uploadBanknoteImage } from '@/services/banknoteService';
import ImageCropDialog from '@/components/shared/ImageCropDialog';

interface SimpleImageUploadProps {
  image: string;
  side: 'front' | 'back';
  onImageUploaded: (url: string) => void;
}

const SimpleImageUpload: React.FC<SimpleImageUploadProps> = ({
  image,
  side,
  onImageUploaded
}) => {
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadBanknoteImage(file);
      onImageUploaded(url);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleChange = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    fileInputRef.current?.click();
  };

  const handleCropClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    if (image) {
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedImageUrl: string) => {
    try {
      // Convert data URL to Blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create a file from the blob
      const file = new File([blob], `cropped_${side}.jpg`, { type: 'image/jpeg' });

      // Upload the cropped image
      const url = await uploadBanknoteImage(file);
      onImageUploaded(url);
    } catch (error) {
      console.error('Error saving cropped image:', error);
    }
  };

  return (
    <div className="relative">
      <div className="aspect-[3/2] bg-muted rounded-lg overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={`${side} of banknote`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2 flex gap-2">
        {image && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bg-white/80 hover:bg-white"
            onClick={handleCropClick}
          >
            <Crop className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-white/80 hover:bg-white"
          onClick={handleChange}
        >
          {image ? 'Change' : 'Upload'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {cropDialogOpen && image && (
        <ImageCropDialog
          imageUrl={image}
          open={cropDialogOpen}
          onClose={() => setCropDialogOpen(false)}
          onSave={handleCroppedImage}
          title={`Edit ${side === 'front' ? 'Front' : 'Back'} Image`}
        />
      )}
    </div>
  );
};

export default SimpleImageUpload;
