
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';

interface SimpleImageUploadProps {
  onImageSelected: (imageUrl: string) => void;
  uploadFunction: (file: File) => Promise<string>;
  label?: string;
  buttonText?: string;
  className?: string;
  showPreview?: boolean;
}

export default function SimpleImageUpload({
  onImageSelected,
  uploadFunction,
  label = 'Upload Image',
  buttonText = 'Choose Image',
  className = '',
  showPreview = true
}: SimpleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB.');
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await uploadFunction(file);
      setPreviewUrl(imageUrl);
      onImageSelected(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <label className="font-medium text-sm">{label}</label>
        
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex-1"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : buttonText}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {showPreview && previewUrl && (
          <div className="relative mt-2 inline-block">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="h-24 w-auto rounded border" 
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
