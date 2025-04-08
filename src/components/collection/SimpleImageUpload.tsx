
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud } from 'lucide-react';
import { uploadCollectionImage } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';

export interface SimpleImageUploadProps {
  image: string;
  side: string;
  onImageUploaded: (url: string) => void;
}

const SimpleImageUpload = ({ image, side, onImageUploaded }: SimpleImageUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadCollectionImage(file);
      onImageUploaded(imageUrl);
      toast({
        title: "Image Uploaded",
        description: `${side.charAt(0).toUpperCase() + side.slice(1)} image uploaded successfully.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {image ? (
        <div className="relative">
          <img 
            src={image} 
            alt={`${side} of banknote`} 
            className="w-full h-40 object-contain border rounded-md"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-white"
                onClick={() => document.getElementById(`upload-${side}`)?.click()}
                disabled={isUploading}
              >
                <UploadCloud className="h-4 w-4 mr-1" /> Change
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onImageUploaded('')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-md border-gray-300 p-4 flex flex-col items-center justify-center h-40 cursor-pointer hover:border-primary transition-colors"
          onClick={() => document.getElementById(`upload-${side}`)?.click()}
        >
          <UploadCloud className="h-8 w-8 text-gray-500 mb-2" />
          <p className="text-sm text-gray-500">
            {isUploading ? 'Uploading...' : 'Click to upload'}
          </p>
        </div>
      )}
      <input 
        type="file"
        id={`upload-${side}`}
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </div>
  );
};

export default SimpleImageUpload;
