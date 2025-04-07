
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  checkImageSuggestion, 
  updateImageSuggestion, 
  createImageSuggestion 
} from '@/services/imageService';

interface CollectionImageUploadProps {
  userId: string;
  banknoteId: string; // Required prop
  imageUrl: string | null;
  side: 'obverse' | 'reverse';
  onImageUploaded: (url: string) => void;
}

export default function CollectionImageUpload({ 
  userId, 
  banknoteId,
  imageUrl, 
  side, 
  onImageUploaded 
}: CollectionImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
      // Check if storage bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const banknoteImagesBucketExists = buckets?.some(bucket => bucket.name === 'banknote_images');
      
      if (!banknoteImagesBucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('banknote_images', {
          public: true
        });
        
        if (bucketError) {
          console.error("Error creating bucket:", bucketError);
          toast.error("Failed to create storage bucket");
          return;
        }
      }

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

  const handleSuggestImage = async () => {
    if (!imageUrl || !banknoteId) return;
    
    setSuggesting(true);
    try {
      // Check if there's an existing suggestion
      const existingSuggestion = await checkImageSuggestion(banknoteId, userId, side);
      
      if (existingSuggestion) {
        // Update existing suggestion
        const success = await updateImageSuggestion(existingSuggestion.id, imageUrl);
        
        if (!success) {
          toast.error("Failed to update your suggestion");
          return;
        }
        
        toast.success('Your image suggestion has been updated and will be reviewed by admins');
      } else {
        // Create new suggestion
        const success = await createImageSuggestion(banknoteId, userId, imageUrl, side);
        
        if (!success) {
          toast.error("Failed to submit your suggestion");
          return;
        }
        
        toast.success('Your image suggestion has been submitted and will be reviewed by admins');
      }
      
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Error suggesting image:", error);
      toast.error("Failed to suggest image");
    } finally {
      setSuggesting(false);
    }
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
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <div className="flex gap-2">
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
            
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 mt-2"
              onClick={() => setShowConfirmDialog(true)}
            >
              <Check className="h-4 w-4 mr-1" /> Suggest for Catalog
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
      
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Image for Catalog</DialogTitle>
            <DialogDescription>
              Are you sure you want to suggest this {side === 'obverse' ? 'obverse (front)' : 'reverse (back)'} image 
              to be used as the official catalog image for this banknote? Administrators will review your suggestion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2 border rounded p-2">
            <img
              src={imageUrl || ''}
              alt={`${side} image preview`}
              className="w-full h-auto max-h-48 object-contain"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={suggesting}>
              Cancel
            </Button>
            <Button onClick={handleSuggestImage} disabled={suggesting}>
              {suggesting ? 'Submitting...' : 'Submit Suggestion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
