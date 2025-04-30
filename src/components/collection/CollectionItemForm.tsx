
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SimpleImageUpload from './SimpleImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { addToCollection, updateCollectionItem } from '@/services/collectionService';
import { BanknoteCondition, CollectionItem } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export interface CollectionItemFormProps {
  item?: CollectionItem | null;
  onSave?: (item: CollectionItem) => void;
  onCancel?: () => void;
  collectionItem?: CollectionItem | null;
  onUpdate?: (item: CollectionItem) => void;
}

const CollectionItemForm: React.FC<CollectionItemFormProps> = ({ 
  item, 
  onSave, 
  onCancel,
  collectionItem,
  onUpdate
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use either item or collectionItem based on what's provided
  const activeItem = item || collectionItem || null;

  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState<BanknoteCondition>(activeItem?.condition || 'VF');
  const [purchasePrice, setPurchasePrice] = useState<string>(activeItem?.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    activeItem?.purchaseDate ? new Date(activeItem.purchaseDate) : undefined
  );
  const [publicNote, setPublicNote] = useState<string>(activeItem?.publicNote || '');
  const [privateNote, setPrivateNote] = useState<string>(activeItem?.privateNote || '');
  const [isForSale, setIsForSale] = useState<boolean>(activeItem?.isForSale || false);
  const [salePrice, setSalePrice] = useState<string>(activeItem?.salePrice?.toString() || '');
  const [obverseImage, setObverseImage] = useState<string | null>(activeItem?.obverseImage || null);
  const [reverseImage, setReverseImage] = useState<string | null>(activeItem?.reverseImage || null);
  
  // Update form when item changes
  useEffect(() => {
    if (activeItem) {
      setCondition(activeItem.condition);
      setPurchasePrice(activeItem.purchasePrice?.toString() || '');
      setPurchaseDate(activeItem.purchaseDate ? new Date(activeItem.purchaseDate) : undefined);
      setPublicNote(activeItem.publicNote || '');
      setPrivateNote(activeItem.privateNote || '');
      setIsForSale(activeItem.isForSale || false);
      setSalePrice(activeItem.salePrice?.toString() || '');
      setObverseImage(activeItem.obverseImage || null);
      setReverseImage(activeItem.reverseImage || null);
    } else {
      // Reset form for new item
      setCondition('VF');
      setPurchasePrice('');
      setPurchaseDate(undefined);
      setPublicNote('');
      setPrivateNote('');
      setIsForSale(false);
      setSalePrice('');
      setObverseImage(null);
      setReverseImage(null);
    }
  }, [activeItem]);
  
  const handleSave = async () => {
    try {
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to save collection items',
          variant: 'destructive',
        });
        return;
      }
      
      if (!activeItem?.banknoteId) {
        toast({
          title: 'Error',
          description: 'No banknote selected',
          variant: 'destructive',
        });
        return;
      }
      
      setLoading(true);
      
      // Parse numeric values
      const parsedPurchasePrice = purchasePrice ? parseFloat(purchasePrice) : undefined;
      const parsedSalePrice = salePrice ? parseFloat(salePrice) : undefined;
      
      let savedItem: CollectionItem | null = null;
      
      if (activeItem?.id) {
        // Update existing item
        const success = await updateCollectionItem(activeItem.id, {
          condition,
          purchasePrice: parsedPurchasePrice,
          purchaseDate,
          publicNote,
          privateNote,
          isForSale,
          salePrice: parsedSalePrice,
          obverseImage: obverseImage || undefined,
          reverseImage: reverseImage || undefined,
        });
        
        if (success) {
          toast({
            title: 'Success',
            description: 'Collection item updated',
          });
          
          // Return updated item
          savedItem = {
            ...activeItem,
            condition,
            purchasePrice: parsedPurchasePrice,
            purchaseDate: purchaseDate?.toISOString(),
            publicNote,
            privateNote,
            isForSale,
            salePrice: parsedSalePrice,
            obverseImage: obverseImage || undefined,
            reverseImage: reverseImage || undefined,
          };
        } else {
          throw new Error('Failed to update collection item');
        }
      } else {
        // Create new item
        savedItem = await addToCollection({
          userId: user.id,
          banknoteId: activeItem.banknoteId,
          condition,
          purchasePrice: parsedPurchasePrice,
          purchaseDate: purchaseDate?.toISOString(),
          publicNote,
          privateNote,
          isForSale,
          salePrice: parsedSalePrice,
        });
        
        if (savedItem) {
          // Update saved item with images
          if (obverseImage || reverseImage) {
            const success = await updateCollectionItem(savedItem.id, {
              obverseImage: obverseImage || undefined,
              reverseImage: reverseImage || undefined,
            });
            
            if (success) {
              savedItem.obverseImage = obverseImage || undefined;
              savedItem.reverseImage = reverseImage || undefined;
            }
          }
          
          toast({
            title: 'Success',
            description: 'Item added to collection',
          });
        } else {
          throw new Error('Failed to add to collection');
        }
      }
      
      if (savedItem) {
        if (onUpdate) {
          onUpdate(savedItem);
        }
        if (onSave) {
          onSave(savedItem);
        }
      }
      
    } catch (error) {
      console.error('Error saving collection item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save collection item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const conditionOptions: { value: BanknoteCondition; label: string }[] = [
    { value: 'UNC', label: 'Uncirculated (UNC)' },
    { value: 'AU', label: 'About Uncirculated (AU)' },
    { value: 'XF', label: 'Extremely Fine (XF)' },
    { value: 'VF', label: 'Very Fine (VF)' },
    { value: 'F', label: 'Fine (F)' },
    { value: 'VG', label: 'Very Good (VG)' },
    { value: 'G', label: 'Good (G)' },
    { value: 'Fair', label: 'Fair' },
    { value: 'Poor', label: 'Poor' },
  ];
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        {activeItem?.id ? 'Edit Collection Item' : 'Add to Collection'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select 
              value={condition} 
              onValueChange={(value) => setCondition(value as BanknoteCondition)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter purchase price"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="purchaseDate"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label htmlFor="publicNote">Public Note</Label>
            <Textarea
              id="publicNote"
              placeholder="Public note (visible to others)"
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
              className="h-24"
            />
          </div>
          
          <div>
            <Label htmlFor="privateNote">Private Note</Label>
            <Textarea
              id="privateNote"
              placeholder="Private note (only visible to you)"
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              className="h-24"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isForSale"
              checked={isForSale}
              onCheckedChange={setIsForSale}
            />
            <Label htmlFor="isForSale">List for Sale</Label>
          </div>
          
          {isForSale && (
            <div>
              <Label htmlFor="salePrice">Sale Price</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter sale price"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          )}
          
          <div className="mt-4">
            <Label>Images</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="obverseImage" className="text-sm mb-1 block">
                  Obverse (Front)
                </Label>
                <SimpleImageUpload 
                  image={obverseImage || ""}
                  side="obverse"
                  onImageUploaded={setObverseImage}
                />
              </div>
              <div>
                <Label htmlFor="reverseImage" className="text-sm mb-1 block">
                  Reverse (Back)
                </Label>
                <SimpleImageUpload 
                  image={reverseImage || ""}
                  side="reverse"
                  onImageUploaded={setReverseImage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : activeItem?.id ? 'Update' : 'Add to Collection'}
        </Button>
      </div>
    </div>
  );
};

export default CollectionItemForm;
