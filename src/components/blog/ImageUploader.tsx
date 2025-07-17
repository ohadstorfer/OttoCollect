import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadBlogImage } from '@/services/blogService';
import { useToast } from "@/hooks/use-toast";
import { XCircle, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ImageUploaderProps {
  image: string;
  onChange: (image: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export const ImageUploader = ({ image, onChange, disabled = false, required = false }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please select an image file only.",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const url = await uploadBlogImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      onChange(url);
      
      toast({
        description: "Image uploaded successfully",
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveImage = () => {
    onChange('');
  };
  
  return (
    <div className="space-y-4">
      {image ? (
        <Card className="group relative aspect-video overflow-hidden max-w-md">
          <img 
            src={image} 
            alt="Blog post main image"
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-90 transition-opacity"
            onClick={handleRemoveImage}
            disabled={disabled}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </Card>
      ) : (
        <Card 
          className="flex flex-col items-center justify-center aspect-video cursor-pointer border-dashed max-w-md"
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-12 w-12 animate-spin text-ottoman-600" />
              <div className="text-sm font-medium">{uploadProgress}%</div>
              <div className="text-xs text-muted-foreground">Uploading image...</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
              <Upload className="h-12 w-12" />
              <div className="text-sm font-medium">Upload Main Image</div>
              {required && <div className="text-xs text-red-500">Required</div>}
              <div className="text-xs text-center">Click to select an image file</div>
            </div>
          )}
        </Card>
      )}
      
      <Input 
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading || disabled}
        className="hidden"
      />
    </div>
  );
};