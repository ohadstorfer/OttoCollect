
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Crop } from 'lucide-react';
import { processAndUploadImage } from '@/services/imageProcessingService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CollectionImageUploadProps {
  currentImage?: string;
  side: 'obverse' | 'reverse';
  onImageUploaded: (imageVersions: { original: string; watermarked: string; thumbnail: string }) => void;
  disabled?: boolean;
}

const CollectionImageUpload: React.FC<CollectionImageUploadProps> = ({
  currentImage,
  side,
  onImageUploaded,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const imageVersions = await processAndUploadImage(file, 'collection-items', user.id);
      onImageUploaded(imageVersions);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageUploaded({ original: '', watermarked: '', thumbnail: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={`${side} preview`}
              className="w-full h-48 object-contain border rounded-lg bg-muted"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled || uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Upload {side} image
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1"
        >
          {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  );
};

export default CollectionImageUpload;
