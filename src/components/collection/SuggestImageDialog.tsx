
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lightbulb, Upload } from 'lucide-react';
import { submitImageSuggestion, hasExistingImageSuggestion } from '@/services/imageSuggestionsService';
import { processAndUploadImage } from '@/services/imageProcessingService';

interface SuggestImageDialogProps {
  banknoteId: string;
  currentObverseImage?: string | null;
  currentReverseImage?: string | null;
}

const SuggestImageDialog = ({ banknoteId, currentObverseImage, currentReverseImage }: SuggestImageDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [obverseFile, setObverseFile] = useState<File | null>(null);
  const [reverseFile, setReverseFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [obverseSuggestionStatus, setObverseSuggestionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [reverseSuggestionStatus, setReverseSuggestionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  React.useEffect(() => {
    if (user && isOpen) {
      checkExistingSuggestions();
    }
  }, [user, banknoteId, isOpen]);

  const checkExistingSuggestions = async () => {
    if (!user) return;

    try {
      const [obverseCheck, reverseCheck] = await Promise.all([
        hasExistingImageSuggestion(banknoteId, user.id, 'obverse'),
        hasExistingImageSuggestion(banknoteId, user.id, 'reverse')
      ]);

      setObverseSuggestionStatus(obverseCheck.status);
      setReverseSuggestionStatus(reverseCheck.status);
    } catch (error) {
      console.error('Error checking existing suggestions:', error);
    }
  };

  const handleObverseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setObverseFile(e.target.files[0]);
    }
  };

  const handleReverseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReverseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to suggest images.",
        variant: "destructive",
      });
      return;
    }

    if (!obverseFile && !reverseFile) {
      toast({
        title: "No Images Selected",
        description: "Please select at least one image to suggest.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const suggestions = [];

      if (obverseFile) {
        const processedImages = await processAndUploadImage(obverseFile, 'suggestions', user.id);
        suggestions.push({
          banknoteId,
          userId: user.id,
          imageUrl: processedImages.original,
          type: 'obverse' as const
        });
      }

      if (reverseFile) {
        const processedImages = await processAndUploadImage(reverseFile, 'suggestions', user.id);
        suggestions.push({
          banknoteId,
          userId: user.id,
          imageUrl: processedImages.original,
          type: 'reverse' as const
        });
      }

      for (const suggestion of suggestions) {
        await submitImageSuggestion(suggestion);
      }

      toast({
        title: "Images Suggested Successfully",
        description: "Your image suggestions have been submitted and are pending review.",
      });

      setIsOpen(false);
      setObverseFile(null);
      setReverseFile(null);
      checkExistingSuggestions();
    } catch (error) {
      console.error("Error submitting image suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to submit image suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSuggestObverse = !currentObverseImage && obverseSuggestionStatus !== 'pending';
  const canSuggestReverse = !currentReverseImage && reverseSuggestionStatus !== 'pending';

  const renderStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (!canSuggestObverse && !canSuggestReverse) {
    return (
      <div className="text-sm text-muted-foreground">
        {obverseSuggestionStatus && renderStatusBadge(obverseSuggestionStatus)}
        {reverseSuggestionStatus && renderStatusBadge(reverseSuggestionStatus)}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lightbulb className="h-4 w-4 mr-1.5" />
          Suggest to Catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Images to Catalog</DialogTitle>
          <DialogDescription>
            Help improve the catalog by suggesting better images for this banknote.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {canSuggestObverse && (
            <div>
              <Label htmlFor="obverse-file">Obverse (Front) Image</Label>
              <Input
                id="obverse-file"
                type="file"
                accept="image/*"
                onChange={handleObverseFileChange}
                className="mt-1"
              />
            </div>
          )}
          
          {canSuggestReverse && (
            <div>
              <Label htmlFor="reverse-file">Reverse (Back) Image</Label>
              <Input
                id="reverse-file"
                type="file"
                accept="image/*"
                onChange={handleReverseFileChange}
                className="mt-1"
              />
            </div>
          )}

          {obverseSuggestionStatus && (
            <div className="text-sm">
              <strong>Obverse Status:</strong> {renderStatusBadge(obverseSuggestionStatus)}
            </div>
          )}

          {reverseSuggestionStatus && (
            <div className="text-sm">
              <strong>Reverse Status:</strong> {renderStatusBadge(reverseSuggestionStatus)}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || (!obverseFile && !reverseFile)}
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Suggest Images
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestImageDialog;
