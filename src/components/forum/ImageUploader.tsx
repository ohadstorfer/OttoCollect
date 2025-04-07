import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Let's create a utility function to upload forum images
const uploadForumImage = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Check file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return null;
    }

    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload the file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('forum_images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading forum image:", uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('forum_images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

interface ImageUploaderProps {
  onImageUpload: (url: string) => void;
  onError?: (message: string) => void;
}

const ImageUploader = ({ onImageUpload, onError }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const userId = supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          uploadForumImage(file, user.id)
            .then(url => {
              if (url) {
                onImageUpload(url);
                toast.success('Image uploaded successfully!');
              } else {
                onError?.('Failed to upload image.');
              }
            })
            .catch(err => {
              console.error('Upload error:', err);
              onError?.('Failed to upload image.');
            })
            .finally(() => setUploading(false));
        } else {
          console.error('No user found.');
          onError?.('No user session found.');
          setUploading(false);
        }
      });
    } catch (error) {
      console.error('Error during upload:', error);
      onError?.('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageUpload('');
  };

  return (
    <div className="relative">
      <div
        className="w-full aspect-square bg-muted rounded-md border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={handleImageClick}
      >
        {onImageUpload ? (
          <img
            src={onImageUpload}
            alt="Uploaded"
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <>
            <Image className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">
              Upload Image
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click to browse
            </p>
          </>
        )}
      </div>

      {onImageUpload && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2"
          onClick={handleRemoveImage}
        >
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
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
};

export default ImageUploader;
