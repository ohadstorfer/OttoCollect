import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { FileInput } from "@/components/ui/file-input"
import { X } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

const ImageUploader = ({ images, onChange, disabled = false }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'banknote_images'); // Replace with your upload preset

      const response = await fetch('https://api.cloudinary.com/v1_1/djv90epnq/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newImages = [...images, data.secure_url];
        onChange(newImages);
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  }, [images, onChange]);

  const handleRemoveImage = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove);
    onChange(newImages);
  };

  return (
    <div>
      <FileInput
        onFileChange={(file) => {
          if (file) {
            handleImageUpload(file);
          }
        }}
        disabled={disabled || uploading}
      />

      {uploading && <p>Uploading...</p>}

      <div className="flex flex-wrap mt-2">
        {images.map((image, index) => (
          <div key={index} className="relative w-32 h-32 m-1">
            <img src={image} alt={`Uploaded ${index}`} className="object-cover w-full h-full rounded" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 p-0 m-0 bg-white/50 hover:bg-white rounded-full"
              onClick={() => handleRemoveImage(index)}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;
