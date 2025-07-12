
import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Send, Crop } from 'lucide-react';
import { Label } from '@/components/ui/label';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { processAndUploadImage } from '@/services/imageProcessingService';
import { submitImageSuggestion, updateImageSuggestion } from '@/services/imageSuggestionsService';

interface SuggestImageDialogProps {
  open: boolean;
  onClose: () => void;
  banknoteId: string;
  banknoteName: string;
  existingSuggestionId?: string | null;
  currentObverseImage?: string | null;
  currentReverseImage?: string | null;
}

const SuggestImageDialog: React.FC<SuggestImageDialogProps> = ({
  open,
  onClose,
  banknoteId,
  banknoteName,
  existingSuggestionId,
  currentObverseImage,
  currentReverseImage
}) => {
  const { user } = useAuth();
  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(currentObverseImage || null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(currentReverseImage || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<{
    url: string;
    type: 'obverse' | 'reverse';
  } | null>(null);

  const obverseInputRef = useRef<HTMLInputElement>(null);
  const reverseInputRef = useRef<HTMLInputElement>(null);

  const handleObverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setObverseImageFile(file);
      const fileUrl = URL.createObjectURL(file);
      setObverseImagePreview(fileUrl);
    }
  };

  const handleReverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReverseImageFile(file);
      const fileUrl = URL.createObjectURL(file);
      setReverseImagePreview(fileUrl);
    }
  };

  const handleCropClick = (imageUrl: string | null, type: 'obverse' | 'reverse') => {
    if (imageUrl) {
      setSelectedImageToCrop({ url: imageUrl, type });
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedImageUrl: string) => {
    try {
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `cropped_${selectedImageToCrop?.type}.jpg`, { type: 'image/jpeg' });

      if (selectedImageToCrop?.type === 'obverse') {
        setObverseImageFile(file);
        setObverseImagePreview(URL.createObjectURL(file));
      } else {
        setReverseImageFile(file);
        setReverseImagePreview(URL.createObjectURL(file));
      }
    } catch (error) {
      console.error('Error handling cropped image:', error);
      toast.error('Failed to process cropped image');
    } finally {
      setCropDialogOpen(false);
      setSelectedImageToCrop(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to suggest images');
      return;
    }

    if (!obverseImageFile && !reverseImageFile) {
      toast.error('Please select at least one image to suggest');
      return;
    }

    setIsSubmitting(true);
    try {
      let obverseProcessedImages = null;
      let reverseProcessedImages = null;

      // Process and upload images if they were changed
      if (obverseImageFile) {
        obverseProcessedImages = await processAndUploadImage(
          obverseImageFile, 
          'suggestions', 
          user.id
        );
      }
      if (reverseImageFile) {
        reverseProcessedImages = await processAndUploadImage(
          reverseImageFile, 
          'suggestions', 
          user.id
        );
      }

      const suggestionData = {
        banknoteId,
        userId: user.id,
        obverseImage: obverseProcessedImages?.original || null,
        reverseImage: reverseProcessedImages?.original || null,
        obverseImageWatermarked: obverseProcessedImages?.watermarked || null,
        reverseImageWatermarked: reverseProcessedImages?.watermarked || null,
        obverseImageThumbnail: obverseProcessedImages?.thumbnail || null,
        reverseImageThumbnail: reverseProcessedImages?.thumbnail || null,
      };

      if (existingSuggestionId) {
        await updateImageSuggestion({
          suggestionId: existingSuggestionId,
          ...suggestionData
        });
        toast.success('Image suggestion updated successfully!');
      } else {
        await submitImageSuggestion(suggestionData);
        toast.success('Image suggestion submitted successfully!');
      }

      onClose();
    } catch (error) {
      console.error('Error submitting image suggestion:', error);
      toast.error('Failed to submit image suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {existingSuggestionId ? 'Update Image Suggestion' : 'Suggest Images'}
            </DialogTitle>
            <DialogDescription>
              Suggest better images for "{banknoteName}" in the catalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Obverse Image */}
            <div>
              <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted">
                  {obverseImagePreview ? (
                    <img
                      src={obverseImagePreview}
                      alt="Obverse preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    id="obverseImage"
                    type="file"
                    accept="image/*"
                    onChange={handleObverseImageChange}
                    className="hidden"
                    ref={obverseInputRef}
                  />
                  {obverseImagePreview && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCropClick(obverseImagePreview, 'obverse')}
                      >
                        <Crop className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => obverseInputRef?.current?.click()}
                      >
                        Change
                      </Button>
                    </>
                  )}
                  {!obverseImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => obverseInputRef?.current?.click()}
                    >
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Reverse Image */}
            <div>
              <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted">
                  {reverseImagePreview ? (
                    <img
                      src={reverseImagePreview}
                      alt="Reverse preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    id="reverseImage"
                    type="file"
                    accept="image/*"
                    onChange={handleReverseImageChange}
                    className="hidden"
                    ref={reverseInputRef}
                  />
                  {reverseImagePreview && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCropClick(reverseImagePreview, 'reverse')}
                      >
                        <Crop className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => reverseInputRef?.current?.click()}
                      >
                        Change
                      </Button>
                    </>
                  )}
                  {!reverseImagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reverseInputRef?.current?.click()}
                    >
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!obverseImageFile && !reverseImageFile)}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {existingSuggestionId ? 'Update Suggestion' : 'Submit Suggestion'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {selectedImageToCrop && (
        <ImageCropDialog
          imageUrl={selectedImageToCrop.url}
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setSelectedImageToCrop(null);
          }}
          onSave={handleCroppedImage}
          title={`Edit ${selectedImageToCrop.type === 'obverse' ? 'Front' : 'Back'} Image`}
        />
      )}
    </>
  );
};

export default SuggestImageDialog;
