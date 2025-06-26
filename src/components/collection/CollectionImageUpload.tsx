import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollectionItem } from '@/types';
import { uploadCollectionImage } from '@/services/collectionService';

interface CollectionImageUploadProps {
  collectionItem: CollectionItem;
  onObverseImageChange?: (url: string) => void;
  onReverseImageChange?: (url: string) => void;
  onPersonalImagesChange?: (urls: string[]) => void;
  variant?: 'full' | 'compact';
  className?: string;
}

export default function CollectionImageUpload({
  collectionItem,
  onObverseImageChange,
  onReverseImageChange,
  onPersonalImagesChange,
  variant = 'full',
  className = '',
}: CollectionImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [personalImages, setPersonalImages] = useState<string[]>(
    collectionItem.personalImages || []
  );
  const obverseFileRef = useRef<HTMLInputElement>(null);
  const reverseFileRef = useRef<HTMLInputElement>(null);
  const personalFileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'obverse' | 'reverse' | 'personal'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Image size should be less than 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      const imageResponse = await uploadCollectionImage(file);
      
      // Handle the response - it might be a string or an object with URLs
      const imageUrl = typeof imageResponse === 'string' ? imageResponse : imageResponse.original;

      if (type === 'obverse') {
        onObverseImageChange?.(imageUrl);
      } else if (type === 'reverse') {
        onReverseImageChange?.(imageUrl);
      } else if (type === 'personal') {
        const newPersonalImages = [...personalImages, imageUrl];
        setPersonalImages(newPersonalImages);
        onPersonalImagesChange?.(newPersonalImages);
      }

      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded successfully.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (type === 'obverse') obverseFileRef.current!.value = '';
      else if (type === 'reverse') reverseFileRef.current!.value = '';
      else personalFileRef.current!.value = '';
    }
  };

  const removePersonalImage = (indexToRemove: number) => {
    const newImages = personalImages.filter((_, index) => index !== indexToRemove);
    setPersonalImages(newImages);
    onPersonalImagesChange?.(newImages);
  };

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-1 gap-4 ${className}`}>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="obverse-image">Obverse Image</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => obverseFileRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>
          <Input
            ref={obverseFileRef}
            id="obverse-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'obverse')}
            className="hidden"
          />
          {collectionItem.obverseImage && (
            <div className="relative inline-block">
              <img
                src={collectionItem.obverseImage}
                alt="Obverse"
                className="h-24 w-auto rounded border"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="reverse-image">Reverse Image</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => reverseFileRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>
          <Input
            ref={reverseFileRef}
            id="reverse-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'reverse')}
            className="hidden"
          />
          {collectionItem.reverseImage && (
            <div className="relative inline-block">
              <img
                src={collectionItem.reverseImage}
                alt="Reverse"
                className="h-24 w-auto rounded border"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Obverse Image */}
        <div className="space-y-2">
          <Label htmlFor="obverse-image">Obverse Image</Label>
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex flex-col items-center justify-center text-center">
              {collectionItem.obverseImage ? (
                <div className="relative">
                  <img
                    src={collectionItem.obverseImage}
                    alt="Obverse"
                    className="max-h-48 w-auto mb-4 rounded"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => obverseFileRef.current?.click()}
                    disabled={isUploading}
                    className="mt-2"
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop or click to upload
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => obverseFileRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Obverse Image'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Input
            ref={obverseFileRef}
            id="obverse-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'obverse')}
            className="hidden"
          />
        </div>

        {/* Reverse Image */}
        <div className="space-y-2">
          <Label htmlFor="reverse-image">Reverse Image</Label>
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex flex-col items-center justify-center text-center">
              {collectionItem.reverseImage ? (
                <div className="relative">
                  <img
                    src={collectionItem.reverseImage}
                    alt="Reverse"
                    className="max-h-48 w-auto mb-4 rounded"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reverseFileRef.current?.click()}
                    disabled={isUploading}
                    className="mt-2"
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop or click to upload
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reverseFileRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Reverse Image'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Input
            ref={reverseFileRef}
            id="reverse-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'reverse')}
            className="hidden"
          />
        </div>
      </div>

      {/* Personal Images */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="personal-images">Personal Photos (Optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => personalFileRef.current?.click()}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Photo
          </Button>
        </div>
        <Input
          ref={personalFileRef}
          id="personal-images"
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'personal')}
          className="hidden"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {personalImages.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`Personal ${index + 1}`}
                className="h-24 w-24 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => removePersonalImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
