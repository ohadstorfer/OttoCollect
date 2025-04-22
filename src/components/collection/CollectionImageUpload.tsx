
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImageIcon, TrashIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CollectionImageUploadProps {
  initialImage?: string;
  onImageChange: (url: string) => void;
  side: 'obverse' | 'reverse';
}

export default function CollectionImageUpload({ initialImage, onImageChange, side }: CollectionImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(initialImage || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `collection-items/${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('collection_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('collection_images')
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
    if (!imageUrl || !window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const filePath = imageUrl.split('/').pop();
      if (!filePath) return;

      await supabase.storage
        .from('collection_images')
        .remove([`collection-items/${filePath}`]);

      setImageUrl('');
      onImageChange('');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium">{side === 'obverse' ? 'Front Image' : 'Back Image'}</div>
      
      {imageUrl ? (
        <div className="relative group">
          <img 
            src={imageUrl} 
            alt={`${side} of banknote`} 
            className="w-full aspect-[4/3] object-contain border rounded" 
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
        <label className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-gray-400" />
            <span className="text-sm text-gray-500">Click to upload {side === 'obverse' ? 'front' : 'back'} image</span>
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
