
import React, { useState, useCallback } from 'react';
import { CollectionItem, BanknoteCondition } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateCollectionItem } from '@/services/collectionService';
import { useAuth } from '@/context/AuthContext';
import { UploadImage } from '../UploadImage';

interface CollectionItemFormProps {
  collectionItem: CollectionItem;
  onSave?: (item: CollectionItem) => void;
  onCancel?: () => void;
  onUpdate?: (item: CollectionItem) => void;
}

const CollectionItemForm: React.FC<CollectionItemFormProps> = ({ 
  collectionItem,
  onSave,
  onCancel,
  onUpdate
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [condition, setCondition] = useState<BanknoteCondition>(collectionItem.condition);
  const [purchasePrice, setPurchasePrice] = useState<string>(collectionItem.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    collectionItem.purchaseDate 
      ? typeof collectionItem.purchaseDate === 'string' 
        ? collectionItem.purchaseDate 
        : new Date(collectionItem.purchaseDate).toISOString().split('T')[0] 
      : ''
  );
  const [salePrice, setSalePrice] = useState<string>(collectionItem.salePrice?.toString() || '');
  const [isForSale, setIsForSale] = useState<boolean>(collectionItem.isForSale);
  const [publicNote, setPublicNote] = useState<string>(collectionItem.publicNote || '');
  const [privateNote, setPrivateNote] = useState<string>(collectionItem.privateNote || '');
  const [obverseImage, setObverseImage] = useState<string>(collectionItem.obverseImage || '');
  const [reverseImage, setReverseImage] = useState<string>(collectionItem.reverseImage || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleObverseImageUpload = useCallback((url: string) => {
    setObverseImage(url);
  }, []);

  const handleReverseImageUpload = useCallback((url: string) => {
    setReverseImage(url);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedItem: CollectionItem = {
      ...collectionItem,
      condition,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      purchaseDate: purchaseDate || null,
      salePrice: salePrice ? parseFloat(salePrice) : null,
      isForSale,
      publicNote: publicNote || null,
      privateNote: privateNote || null,
      obverseImage: obverseImage || null,
      reverseImage: reverseImage || null,
    };

    try {
      const success = await updateCollectionItem(collectionItem.id, updatedItem);
      if (success) {
        toast({
          title: "Success",
          description: "Collection item updated successfully.",
        });
        if (onSave) {
          onSave(updatedItem);
        } else if (onUpdate) {
          onUpdate(updatedItem);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update collection item.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating collection item:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <CardContent className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select 
              defaultValue={condition} 
              onValueChange={(value) => setCondition(value as BanknoteCondition)}
            >
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNC">UNC</SelectItem>
                <SelectItem value="AU">AU</SelectItem>
                <SelectItem value="XF">XF</SelectItem>
                <SelectItem value="VF">VF</SelectItem>
                <SelectItem value="F">F</SelectItem>
                <SelectItem value="VG">VG</SelectItem>
                <SelectItem value="G">G</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              type="number"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Purchase Price"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input
            type="date"
            id="purchaseDate"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            placeholder="Purchase Date"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="salePrice">Sale Price</Label>
            <Input
              type="number"
              id="salePrice"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Sale Price"
            />
          </div>

          <div>
            <Label htmlFor="isForSale">For Sale</Label>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="isForSale"
                checked={isForSale}
                onChange={(e) => setIsForSale(e.target.checked)}
                className="mr-2"
              />
              <Label htmlFor="isForSale">List for sale</Label>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="publicNote">Public Note</Label>
          <Textarea
            id="publicNote"
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="Public Note"
          />
        </div>

        <div>
          <Label htmlFor="privateNote">Private Note</Label>
          <Textarea
            id="privateNote"
            value={privateNote}
            onChange={(e) => setPrivateNote(e.target.value)}
            placeholder="Private Note"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="obverseImage">Obverse Image</Label>
            <UploadImage
              id="obverseImage"
              userId={user?.id || ''}
              onUpload={handleObverseImageUpload}
              existingImageUrl={obverseImage}
            />
          </div>

          <div>
            <Label htmlFor="reverseImage">Reverse Image</Label>
            <UploadImage
              id="reverseImage"
              userId={user?.id || ''}
              onUpload={handleReverseImageUpload}
              existingImageUrl={reverseImage}
            />
          </div>
        </div>

        <CardFooter className="justify-between p-4">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </CardContent>
  );
};

export default CollectionItemForm;
