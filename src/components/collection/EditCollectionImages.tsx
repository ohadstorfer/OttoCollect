
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CollectionItem } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Image, Save } from 'lucide-react';

// Simple image upload component that doesn't depend on the CollectionImageUpload component
const SimpleImageUpload = ({ imageUrl, onImageUploaded, side }: { 
  imageUrl?: string, 
  onImageUploaded: (url: string) => void, 
  side: 'obverse' | 'reverse' 
}) => {
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

interface EditCollectionImagesProps {
  collectionItem: CollectionItem;
  onImagesUpdated: () => void;
}

const EditCollectionImages = ({ collectionItem, onImagesUpdated }: EditCollectionImagesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [obverseImage, setObverseImage] = useState<string>(collectionItem.obverseImage || '');
  const [reverseImage, setReverseImage] = useState<string>(collectionItem.reverseImage || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImages = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('collection_items')
        .update({
          obverse_image: obverseImage || null,
          reverse_image: reverseImage || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionItem.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Images updated",
        description: "Your banknote images have been updated successfully.",
      });
      onImagesUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating images:", error);
      toast({
        title: "Error",
        description: "Failed to update images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Image className="h-4 w-4 mr-1.5" />
          Edit Images
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Images</DialogTitle>
          <DialogDescription>
            Upload or update your own images of this banknote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Obverse (Front)</p>
            <SimpleImageUpload
              imageUrl={obverseImage}
              side="obverse"
              onImageUploaded={setObverseImage}
            />
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Reverse (Back)</p>
            <SimpleImageUpload
              imageUrl={reverseImage}
              side="reverse"
              onImageUploaded={setReverseImage}
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="default"
            onClick={handleSaveImages}
            disabled={isSaving}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Images
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCollectionImages;
