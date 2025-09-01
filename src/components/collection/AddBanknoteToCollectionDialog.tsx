import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addToCollection } from "@/services/collectionService";
import { collectionItemTranslationService } from "@/services/collectionItemTranslationService";
import { useTranslation } from "react-i18next";

interface AddBanknoteToCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  banknoteId: string;
  onSuccess?: () => void;
}

export const AddBanknoteToCollectionDialog: React.FC<AddBanknoteToCollectionDialogProps> = ({
  isOpen,
  onClose,
  banknoteId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['collection']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [privateNote, setPrivateNote] = useState("");
  const [location, setLocation] = useState("In my collection");
  const [type, setType] = useState("");

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: t('authenticationError'),
        description: t('mustBeLoggedIn'),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Add to collection
      const collectionItem = await addToCollection({
        userId: user.id,
        banknoteId: banknoteId,
        private_note: privateNote || undefined,
        location: location || undefined,
        type: type || undefined,
      });

      // Handle translation for the new item
      if (collectionItem) {
        const newItemData = {
          private_note: privateNote,
          location: location,
          type: type
        };
        const changedFields = {
          private_note: !!privateNote,
          location: !!location,
          type: !!type
        };

        await collectionItemTranslationService.translateChangedFields(
          collectionItem.id,
          newItemData,
          changedFields
        );
      }

      toast({
        title: t('success'),
        description: t('banknoteAddedToCollection'),
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding banknote to collection:', error);
      toast({
        title: t('error'),
        description: t('failedToAddBanknote'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addToCollection')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="private-note">{t('privateNote')}</Label>
            <Textarea
              id="private-note"
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              placeholder={t('privateNotePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('location')}</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t('type')}</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder={t('typePlaceholder')}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t('adding') : t('addToCollection')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};