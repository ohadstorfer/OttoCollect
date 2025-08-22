import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollectionItem } from '@/types';
import { uploadCollectionImage } from '@/services/collectionService';
import { useTutorial } from '@/context/TutorialContext';
import { useTranslation } from 'react-i18next';

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
  const { triggerSuggestPictureGuide } = useTutorial();
  const { t } = useTranslation(['collection']);
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
        title: t('imageUpload.selectImageFile'),
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('imageUpload.imageSizeLimit'),
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadCollectionImage(file);

      // Handle both string and object responses from uploadCollectionImage
      const finalImageUrl = typeof imageUrl === 'string' ? imageUrl : imageUrl.original;
      
      if (type === 'obverse') {
        onObverseImageChange?.(finalImageUrl);
      } else if (type === 'reverse') {
        onReverseImageChange?.(finalImageUrl);
      } else if (type === 'personal') {
        const newPersonalImages = [...personalImages, finalImageUrl];
        setPersonalImages(newPersonalImages);
        onPersonalImagesChange?.(newPersonalImages);
      }

      toast({
        title: t('imageUpload.uploadSuccess', { type: t(`imageUpload.${type}Image`) }),
        variant: 'default'
      });
      
      // Trigger suggest picture guide after first image upload
      if (type === 'obverse' || type === 'reverse') {
        triggerSuggestPictureGuide();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: t('imageUpload.uploadFailed'),
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
            <Label htmlFor="obverse-image">{t('imageUpload.obverseImage')}</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => obverseFileRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-4 w-4 mr-1" />
              {t('imageUpload.upload')}
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
                alt={t('imageUpload.obverseImage')}
                className="h-24 w-auto rounded border"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="reverse-image">{t('imageUpload.reverseImage')}</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => reverseFileRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-4 w-4 mr-1" />
              {t('imageUpload.upload')}
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
                alt={t('imageUpload.reverseImage')}
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
          <Label htmlFor="obverse-image">{t('imageUpload.obverseImage')}</Label>
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex flex-col items-center justify-center text-center">
              {collectionItem.obverseImage ? (
                <div className="relative">
                  <img
                    src={collectionItem.obverseImage}
                    alt={t('imageUpload.obverseImage')}
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
                    {t('imageUpload.changeImage')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">
                    {t('imageUpload.dragAndDrop')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => obverseFileRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? t('imageUpload.uploading') : t('imageUpload.uploadObverseImage')}
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
          <Label htmlFor="reverse-image">{t('imageUpload.reverseImage')}</Label>
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="flex flex-col items-center justify-center text-center">
              {collectionItem.reverseImage ? (
                <div className="relative">
                  <img
                    src={collectionItem.reverseImage}
                    alt={t('imageUpload.reverseImage')}
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
                    {t('imageUpload.changeImage')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">
                    {t('imageUpload.dragAndDrop')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reverseFileRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? t('imageUpload.uploading') : t('imageUpload.uploadReverseImage')}
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
          <Label htmlFor="personal-images">{t('imageUpload.personalPhotos')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => personalFileRef.current?.click()}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('imageUpload.addPhoto')}
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
                alt={t('imageUpload.personalImage', { number: index + 1 })}
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
