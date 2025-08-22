
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadForumImage } from '@/services/forumService';
import { useToast } from "@/hooks/use-toast";
import { XCircle, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export const ImageUploader = ({ images, onChange }: ImageUploaderProps) => {
  const { toast } = useToast();
  const { t } = useTranslation(['forum']);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Filter for image files
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (imageFiles.length === 0) {
        toast({
          variant: "destructive",
          title: t('imageUploader.invalidFiles'),
          description: t('imageUploader.selectImagesOnly'),
        });
        return;
      }
      
      const uploadedUrls: string[] = [];
      
      // Upload each file
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const url = await uploadForumImage(file);
        uploadedUrls.push(url);
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / imageFiles.length) * 100));
      }
      
      // Add new images to the existing ones
      onChange([...images, ...uploadedUrls]);
      
      toast({
        description: t('imageUploader.uploadSuccess', { count: uploadedUrls.length }),
      });
      
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        variant: "destructive",
        title: t('imageUploader.uploadFailed'),
        description: t('imageUploader.uploadError'),
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, index) => index !== indexToRemove));
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((imageUrl, index) => (
          <Card key={index} className="group relative aspect-square overflow-hidden">
            <img 
              src={imageUrl} 
              alt={t('imageUploader.uploadedImage', { number: index + 1 })}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-90 transition-opacity"
              onClick={() => handleRemoveImage(index)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        
        <Card 
          className="flex flex-col items-center justify-center aspect-square cursor-pointer border-dashed"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
              <div className="text-sm font-medium">{uploadProgress}%</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <div className="text-sm font-medium">{t('imageUploader.upload')}</div>
            </div>
          )}
        </Card>
      </div>
      
      <Input 
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />
    </div>
  );
};
