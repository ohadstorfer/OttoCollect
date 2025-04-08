
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImagePlus, X, Upload } from 'lucide-react';
import { uploadForumImage } from '@/services/forumService';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesChange,
  maxImages = 4
}) => {
  const [uploading, setUploading] = useState(false);
  
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Check if adding more images would exceed the limit
    if (images.length + e.target.files.length > maxImages) {
      toast.error(`You can only upload a maximum of ${maxImages} images`);
      return;
    }
    
    setUploading(true);
    
    try {
      const uploadPromises = Array.from(e.target.files).map(async (file) => {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
          return null;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image.`);
          return null;
        }
        
        try {
          const imageUrl = await uploadForumImage(file);
          return imageUrl;
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      });
      
      const uploadedImages = await Promise.all(uploadPromises);
      const validImages = uploadedImages.filter(url => url !== null) as string[];
      
      if (validImages.length > 0) {
        onImagesChange([...images, ...validImages]);
        toast.success(`${validImages.length} image${validImages.length > 1 ? 's' : ''} uploaded successfully`);
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("An error occurred while uploading images");
    } finally {
      setUploading(false);
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  }, [images, maxImages, onImagesChange]);
  
  const removeImage = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onImagesChange(newImages);
  };
  
  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div key={index} className="relative group rounded-md overflow-hidden border border-muted aspect-square">
              <img 
                src={image} 
                alt={`Uploaded image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {images.length < maxImages && (
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <ImagePlus size={18} />
                Add Images
              </>
            )}
          </Button>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
