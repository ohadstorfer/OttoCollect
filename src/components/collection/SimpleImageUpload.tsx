
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadCollectionImage } from "@/services/collectionService";

export interface SimpleImageUploadProps {
  currentUrl?: string;
  side: string;
  onImageUploaded: (url: string) => void;
}

export default function SimpleImageUpload({ 
  currentUrl,
  side,
  onImageUploaded 
}: SimpleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState(currentUrl || '');
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const url = await uploadCollectionImage(file);
      setImageUrl(url);
      onImageUploaded(url);
      toast({
        title: "Image uploaded",
        description: `The ${side} image was uploaded successfully.`,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {imageUrl ? (
          <div className="relative group">
            <img 
              src={imageUrl} 
              alt={`${side} side`} 
              className="w-full aspect-video object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="sm"
                onClick={handleClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Change Image
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-sm min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleClick}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Click to upload {side} image</p>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF</p>
              </>
            )}
          </div>
        )}
      </CardContent>
      <Input 
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </Card>
  );
}
