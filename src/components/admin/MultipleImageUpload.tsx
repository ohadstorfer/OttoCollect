import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, GripVertical, Eye, Crop } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageCropDialog from '@/components/shared/ImageCropDialog';

interface ImageFile {
  file: File;
  previewUrl: string;
}

interface MultipleImageUploadProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  label?: string;
  maxImages?: number;
}

const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  images = [],
  onImagesChange,
  label = "Images",
  maxImages = 10
}) => {
  const { user } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (images.length >= maxImages) {
          toast.error(`Maximum ${maxImages} images allowed`);
          return;
        }

        // Create a preview URL for the file
        const previewUrl = URL.createObjectURL(file);
        const imageFile: ImageFile = { file, previewUrl };
        
        onImagesChange([...images, imageFile]);
        toast.success('Image added successfully');
      } else {
        toast.error('Please select a valid image file');
      }
    }
    // Reset the input
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // Clean up the preview URL to prevent memory leaks
    URL.revokeObjectURL(images[index].previewUrl);
    onImagesChange(newImages);
    toast.success('Image removed');
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  const handleCropClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCropImageIndex(index);
    setCropDialogOpen(true);
  };

  const handleCroppedImage = async (croppedImageUrl: string) => {
    if (cropImageIndex === null) return;

    try {
      // Convert data URL to Blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create a new file from the blob
      const newFile = new File([blob], `cropped_${cropImageIndex}.jpg`, { type: 'image/jpeg' });
      
      // Create a new preview URL for the cropped image
      const newPreviewUrl = URL.createObjectURL(newFile);
      
      // Update the image at the specific index
      const newImages = [...images];
      // Clean up the old preview URL
      URL.revokeObjectURL(newImages[cropImageIndex].previewUrl);
      
      newImages[cropImageIndex] = {
        file: newFile,
        previewUrl: newPreviewUrl
      };
      
      onImagesChange(newImages);
      toast.success('Image cropped successfully');
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast.error('Failed to save cropped image');
    } finally {
      setCropDialogOpen(false);
      setCropImageIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>
      
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="multiple-image-upload"
          disabled={images.length >= maxImages}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('multiple-image-upload')?.click()}
          disabled={images.length >= maxImages}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Add Image
        </Button>
        {images.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {images.length}/{maxImages} images
          </span>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageFile, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden bg-gray-50"
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={imageFile.previewUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage(imageFile.previewUrl)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(e) => handleCropClick(index, e)}
                      className="h-8 w-8 p-0"
                    >
                      <Crop className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image number */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>

              {/* Move buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => moveImage(index, index - 1)}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    ↑
                  </Button>
                )}
                {index < images.length - 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => moveImage(index, index + 1)}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    ↓
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      {cropDialogOpen && cropImageIndex !== null && (
        <ImageCropDialog
          imageUrl={images[cropImageIndex].previewUrl}
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setCropImageIndex(null);
          }}
          onSave={handleCroppedImage}
          title={`Edit Image ${cropImageIndex + 1}`}
        />
      )}
    </div>
  );
};

export default MultipleImageUpload; 