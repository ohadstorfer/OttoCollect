
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CollectionItem, BanknoteCondition } from '@/types';
import { updateCollectionItem } from '@/services/collectionService';
import { useAuth } from '@/context/AuthContext';
import { UploadImage } from '../UploadImage';

interface CollectionItemFormProps {
  collectionItem: CollectionItem;
  onSave: (updatedItem: CollectionItem) => void;
  onCancel: () => void;
}

const CollectionItemForm: React.FC<CollectionItemFormProps> = ({ collectionItem, onSave, onCancel }) => {
  const { user } = useAuth();
  const [item, setItem] = useState<CollectionItem>({ ...collectionItem });
  const [condition, setCondition] = useState<BanknoteCondition>(collectionItem.condition);
  const [isForSale, setIsForSale] = useState(collectionItem.isForSale);
  const [salePrice, setSalePrice] = useState(collectionItem.salePrice || 0);
  const [purchasePrice, setPurchasePrice] = useState(collectionItem.purchasePrice || 0);
  const [purchaseDate, setPurchaseDate] = useState<string>(collectionItem.purchaseDate || '');
  const [publicNote, setPublicNote] = useState(collectionItem.publicNote || '');
  const [privateNote, setPrivateNote] = useState(collectionItem.privateNote || '');
  const [location, setLocation] = useState(collectionItem.location || '');

  useEffect(() => {
    setItem({
      ...collectionItem,
      condition,
      isForSale,
      salePrice,
      purchasePrice,
      purchaseDate,
      publicNote,
      privateNote,
      location,
    });
  }, [
    condition,
    isForSale,
    salePrice,
    purchasePrice,
    purchaseDate,
    publicNote,
    privateNote,
    location,
    collectionItem,
  ]);

  const handleObverseImageUpload = (url: string) => {
    setItem({ ...item, obverseImage: url });
  };

  const handleReverseImageUpload = (url: string) => {
    setItem({ ...item, reverseImage: url });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item);
  };

  const handleConditionChange = (value: string) => {
    setCondition(value as BanknoteCondition);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select 
              value={condition} 
              onValueChange={handleConditionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNC">UNC - Uncirculated</SelectItem>
                <SelectItem value="AU">AU - Almost Uncirculated</SelectItem>
                <SelectItem value="XF">XF - Extremely Fine</SelectItem>
                <SelectItem value="VF">VF - Very Fine</SelectItem>
                <SelectItem value="F">F - Fine</SelectItem>
                <SelectItem value="VG">VG - Very Good</SelectItem>
                <SelectItem value="G">G - Good</SelectItem>
                <SelectItem value="FAIR">Fair</SelectItem>
                <SelectItem value="POOR">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Storage Location</Label>
            <Input 
              id="location" 
              value={location || ''} 
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Album 2, Page 5" 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
            <Input 
              id="purchasePrice" 
              type="number" 
              min="0" 
              step="0.01" 
              value={purchasePrice || ''} 
              onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input 
              id="purchaseDate" 
              type="date" 
              value={purchaseDate || ''} 
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            checked={isForSale} 
            onCheckedChange={setIsForSale}
          />
          <Label htmlFor="isForSale">List for sale</Label>
        </div>
        
        {isForSale && (
          <div className="space-y-2">
            <Label htmlFor="salePrice">Sale Price ($)</Label>
            <Input 
              id="salePrice" 
              type="number" 
              min="0" 
              step="0.01"
              value={salePrice || ''} 
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
              className="w-full" 
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="publicNote">Public Note (visible to others)</Label>
          <Textarea 
            id="publicNote" 
            value={publicNote || ''} 
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="Add details visible to other collectors" 
            className="h-20" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="privateNote">Private Note (only visible to you)</Label>
          <Textarea 
            id="privateNote" 
            value={privateNote || ''} 
            onChange={(e) => setPrivateNote(e.target.value)}
            placeholder="Add private notes for your reference" 
            className="h-20" 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Obverse (Front) Image</Label>
            <UploadImage 
              id="obverse-upload" 
              userId={user?.id || ''} 
              onUpload={handleObverseImageUpload}
              existingImageUrl={item.obverseImage}
            />
          </div>
          <div className="space-y-2">
            <Label>Reverse (Back) Image</Label>
            <UploadImage 
              id="reverse-upload" 
              userId={user?.id || ''}
              onUpload={handleReverseImageUpload}
              existingImageUrl={item.reverseImage}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </CardFooter>
    </form>
  );
};

export default CollectionItemForm;
