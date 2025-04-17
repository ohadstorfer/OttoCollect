
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { uploadCollectionImage } from '@/services/collectionService';

interface UploadImageProps {
  id: string;
  userId: string;
  onUpload: (url: string) => void;
  existingImageUrl?: string | null;
}

export const UploadImage: React.FC<UploadImageProps> = ({
  id,
  userId,
  onUpload,
  existingImageUrl
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const imageUrl = await uploadCollectionImage(file);
      setPreviewUrl(imageUrl);
      onUpload(imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {previewUrl && (
        <div className="relative w-full h-32 mb-2">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-full h-full object-contain border rounded"
          />
        </div>
      )}
      <input
        type="file"
        id={id}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <label htmlFor={id} className="w-full">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isUploading || !userId}
        >
          {isUploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Upload Image'}
        </Button>
      </label>
    </div>
  );
};
