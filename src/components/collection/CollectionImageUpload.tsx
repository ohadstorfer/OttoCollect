
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CollectionImageUploadProps {
  userId: string;
  imageUrl: string | null;
  side: 'obverse' | 'reverse';
  onImageUploaded: (url: string) => void;
}

export default function CollectionImageUpload({ 
  userId, 
  imageUrl, 
  side, 
  onImageUploaded 
}: CollectionImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${side}.${fileExt}`;

      // Upload the file to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('banknote_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading banknote image:", uploadError);
        toast.error("Failed to upload image");
        return;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('banknote_images')
        .getPublicUrl(fileName);

      const newImageUrl = urlData.publicUrl;
      onImageUploaded(newImageUrl);
      toast.success(`${side === 'obverse' ? 'Obverse' : 'Reverse'} image uploaded successfully`);
    } catch (error) {
      console.error("Error uploading banknote image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageUploaded('');
  };

  return (
    <div className="relative">
      {!imageUrl ? (
        <div 
          className="w-full aspect-[4/3] bg-muted rounded-md border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={handleImageClick}
        >
          <Camera className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            Upload {side === 'obverse' ? 'Obverse' : 'Reverse'} Image
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Click to browse
          </p>
        </div>
      ) : (
        <div className="relative group">
          <img 
            src={imageUrl} 
            alt={`${side} banknote`} 
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleImageClick}
            >
              <Camera className="h-4 w-4 mr-1" /> Change
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={uploading}
      />
      
      {uploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
          <div className="animate-spin h-8 w-8 border-4 border-ottoman-300 border-t-ottoman-600 rounded-full" />
        </div>
      )}
    </div>
  );
}
