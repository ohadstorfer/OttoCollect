import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud } from 'lucide-react';
import { uploadStampImage } from '@/services/stampsService';
import { useToast } from '@/hooks/use-toast';

interface StampImageUploadProps {
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  disabled?: boolean;
}

const StampImageUpload: React.FC<StampImageUploadProps> = ({ 
  imageUrl, 
  onImageUploaded,
  onUploadStart,
  onUploadEnd,
  disabled = false 
}) => {
  console.log('[StampImageUpload] Component rendered with props:', { imageUrl, disabled });
  
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[StampImageUpload] handleUpload triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('[StampImageUpload] No file selected');
      return;
    }

    console.log('[StampImageUpload] File selected:', { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    });

    if (!file.type.startsWith('image/')) {
      console.log('[StampImageUpload] Invalid file type:', file.type);
      toast({
        title: "Invalid File Type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('[StampImageUpload] File too large:', file.size);
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    console.log('[StampImageUpload] Starting upload process');
    setIsUploading(true);
    onUploadStart?.();

    try {
      console.log('[StampImageUpload] Calling uploadStampImage');
      const imageUrl = await uploadStampImage(file);
      console.log('[StampImageUpload] Upload successful, received URL:', imageUrl);
      onImageUploaded(imageUrl);
    } catch (error) {
      console.error('[StampImageUpload] Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('[StampImageUpload] Upload process completed');
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[StampImageUpload] Remove image clicked');
    onImageUploaded('');
  };

  const handleChangeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[StampImageUpload] Change button clicked');
    const input = document.getElementById('stamp-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.click();
    }
  };

  console.log('[StampImageUpload] Current state:', { isUploading });

  return (
    <div className="w-full" onClick={e => e.stopPropagation()}>
      {imageUrl ? (
        <div className="relative">
          <img 
            src={imageUrl} 
            alt="Stamp image" 
            className="w-full h-40 object-contain border rounded-md"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-white"
                onClick={handleChangeClick}
                disabled={disabled || isUploading}
                type="button"
              >
                <UploadCloud className="h-4 w-4 mr-1" />
                {isUploading ? 'Uploading...' : 'Change'}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed rounded-md border-gray-300 p-4 flex flex-col items-center justify-center h-40 cursor-pointer hover:border-primary transition-colors"
          onClick={handleChangeClick}
        >
          <UploadCloud className="h-8 w-8 text-gray-500 mb-2" />
          <p className="text-sm text-gray-500">
            {isUploading ? 'Uploading...' : 'Click to upload'}
          </p>
        </div>
      )}
      <input 
        type="file"
        id="stamp-upload"
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
        disabled={disabled || isUploading}
        onClick={(e) => {
          e.stopPropagation();
          console.log('[StampImageUpload] File input clicked');
        }}
      />
    </div>
  );
};

export default StampImageUpload;
