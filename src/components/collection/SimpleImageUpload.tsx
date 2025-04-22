
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImageIcon, TrashIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SimpleImageUploadProps {
  onImageChange: (url: string) => void;
  initialImage?: string;
  label?: string;
}

export default function SimpleImageUpload({ onImageChange, initialImage, label = 'Image' }: SimpleImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(initialImage || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `suggestions/${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('image_suggestions')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('image_suggestions')
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;
      setImageUrl(url);
      onImageChange(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageUrl) return;
    
    try {
      setImageUrl('');
      onImageChange('');
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">{label}</div>
      
      {imageUrl ? (
        <div className="relative group">
          <img 
            src={imageUrl} 
            alt={label} 
            className="w-full max-h-60 object-contain border rounded" 
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDeleteImage}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Click to upload image</span>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
            disabled={isUploading} 
          />
        </label>
      )}
    </div>
  );
}
