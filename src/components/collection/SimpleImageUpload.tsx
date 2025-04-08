
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Image } from 'lucide-react';

interface SimpleImageUploadProps {
  imageUrl?: string;
  onImageUploaded: (url: string) => void;
  side: 'obverse' | 'reverse';
}

const SimpleImageUpload = ({ imageUrl, onImageUploaded, side }: SimpleImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    
    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/images/${side}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('banknote_images')
        .upload(filePath, file);
        
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('banknote_images')
        .getPublicUrl(filePath);
        
      onImageUploaded(data.publicUrl);
      
      toast({
        title: "Image uploaded",
        description: `Your ${side} image has been uploaded successfully.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };
  
  return (
    <div className="relative aspect-[3/2] border rounded-md overflow-hidden bg-muted/20">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`Banknote ${side}`}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
          No image
        </div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-center hover:bg-black/40 transition-colors">
        <label className="cursor-pointer p-2 rounded-full bg-white shadow">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-b-transparent border-ottoman-600 rounded-full animate-spin"></div>
          ) : (
            <Image className="h-5 w-5 text-muted-foreground" />
          )}
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
};

export default SimpleImageUpload;
