import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollectionItem, BanknoteCondition } from "@/types";
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { updateCollectionItem, updateCollectionItemImages } from '@/services/collectionService';
import { addToMarketplace, removeFromMarketplace } from '@/services/marketplaceService';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Simple image upload component 
const SimpleImageUpload = ({ imageUrl, onImageUploaded, side }: { 
  imageUrl?: string, 
  onImageUploaded: (url: string) => void, 
  side: 'obverse' | 'reverse' 
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    
    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/images/${side}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('banknote_images')
        .upload(filePath, file);
        
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('banknote_images')
        .getPublicUrl(filePath);
        
      onImageUploaded(data.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };
  
  return (
    <div className="relative aspect-[3/2] border rounded-md overflow-hidden bg-muted/20">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`Banknote ${side}`}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
          Click to upload
        </div>
      )}
      
      <div className="absolute inset-0 hover:bg-black/40 transition-colors flex items-center justify-center">
        <label className="cursor-pointer w-full h-full flex items-center justify-center">
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading && (
            <div className="bg-white rounded-full p-2">
              <div className="w-5 h-5 border-2 border-b-transparent border-ottoman-600 rounded-full animate-spin"></div>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

interface CollectionItemFormProps {
  collectionItem: CollectionItem;
  initialItem?: CollectionItem; // Add optional initialItem prop
  onUpdate?: (updatedItem: CollectionItem) => void;
  onSave?: (item: CollectionItem) => Promise<void>; // Add onSave prop
  onCancel?: () => void; // Add onCancel prop
}

export default function CollectionItemForm({ collectionItem, initialItem, onUpdate, onSave, onCancel }: CollectionItemFormProps) {
  const { user } = useAuth();
  const [condition, setCondition] = useState<BanknoteCondition>(
    initialItem?.condition || collectionItem.condition || "UNC"
  );
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    initialItem?.purchaseDate 
      ? new Date(initialItem.purchaseDate) 
      : collectionItem.purchaseDate 
        ? new Date(collectionItem.purchaseDate)
        : undefined
  );
  const [purchasePrice, setPurchasePrice] = useState<string>(
    (initialItem?.purchasePrice || collectionItem.purchasePrice)
      ? (initialItem?.purchasePrice || collectionItem.purchasePrice).toString()
      : ''
  );
  const [privateNote, setPrivateNote] = useState<string>(
    initialItem?.privateNote || collectionItem.privateNote || ''
  );
  const [publicNote, setPublicNote] = useState<string>(
    initialItem?.publicNote || collectionItem.publicNote || ''
  );
  const [isForSale, setIsForSale] = useState(
    initialItem?.isForSale !== undefined ? initialItem.isForSale : collectionItem.isForSale
  );
  const [salePrice, setSalePrice] = useState<string>(
    (initialItem?.salePrice || collectionItem.salePrice)
      ? (initialItem?.salePrice || collectionItem.salePrice).toString()
      : ''
  );
  const [location, setLocation] = useState<string>(
    initialItem?.location || collectionItem.location || ''
  );
  const [obverseImage, setObverseImage] = useState<string | null>(
    initialItem?.obverseImage || collectionItem.obverseImage || null
  );
  const [reverseImage, setReverseImage] = useState<string | null>(
    initialItem?.reverseImage || collectionItem.reverseImage || null
  );
  const [loading, setLoading] = useState(false);

  // If the item's "forSale" status changes, we need to make sure the form reflects this
  useEffect(() => {
    if (initialItem?.isForSale !== undefined) {
      setIsForSale(initialItem.isForSale);
    } else {
      setIsForSale(collectionItem.isForSale);
    }
  }, [initialItem?.isForSale, collectionItem.isForSale]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    
    setLoading(true);
    try {
      const itemToUpdate = initialItem || collectionItem;
      
      // Update main collection item details
      const updates = {
        condition,
        purchaseDate: purchaseDate ? purchaseDate.toISOString() : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        privateNote,
        publicNote,
        isForSale,
        salePrice: isForSale && salePrice ? parseFloat(salePrice) : null,
        location
      };
      
      // If onSave is provided, use it (for new items)
      if (onSave) {
        const updatedItem = {
          ...itemToUpdate,
          ...updates,
          obverseImage: obverseImage || undefined,
          reverseImage: reverseImage || undefined
        };
        await onSave(updatedItem);
        if (onCancel) onCancel();
        return;
      }
      
      // Otherwise update existing item
      const success = await updateCollectionItem(itemToUpdate.id, updates);
      
      if (!success) {
        toast.error("Failed to update collection item");
        return;
      }
      
      // Update images separately if they changed
      if (obverseImage !== itemToUpdate.obverseImage || 
          reverseImage !== itemToUpdate.reverseImage) {
        await updateCollectionItemImages(
          itemToUpdate.id,
          obverseImage || undefined,
          reverseImage || undefined
        );
      }
      
      // Handle marketplace listing
      if (isForSale && !itemToUpdate.isForSale) {
        // Item wasn't for sale before but now is
        await addToMarketplace(itemToUpdate.id, user.id);
      } else if (!isForSale && itemToUpdate.isForSale) {
        // Item was for sale before but now isn't
        await removeFromMarketplace(itemToUpdate.id);
      }

      // Update the local state in the parent component
      if (onUpdate) {
        onUpdate({
          ...itemToUpdate,
          condition,
          purchaseDate: purchaseDate ? purchaseDate.toISOString() : undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          privateNote,
          publicNote,
          isForSale,
          salePrice: isForSale && salePrice ? parseFloat(salePrice) : null,
          location,
          obverseImage: obverseImage || undefined,
          reverseImage: reverseImage || undefined
        });
      }
      
      toast.success("Collection item updated successfully");
    } catch (error) {
      console.error("Error updating collection item:", error);
      toast.error("Something went wrong while updating");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUploaded = (side: 'obverse' | 'reverse', url: string) => {
    if (side === 'obverse') {
      setObverseImage(url);
    } else {
      setReverseImage(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Images</h3>
        <p className="text-sm text-muted-foreground">
          Add your own images of this banknote for your collection
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="mb-2 block">Obverse (Front)</Label>
            <SimpleImageUpload
              imageUrl={obverseImage || undefined}
              side="obverse"
              onImageUploaded={(url) => handleImageUploaded('obverse', url)}
            />
          </div>
          <div>
            <Label className="mb-2 block">Reverse (Back)</Label>
            <SimpleImageUpload
              imageUrl={reverseImage || undefined}
              side="reverse"
              onImageUploaded={(url) => handleImageUploaded('reverse', url)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Condition & Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="condition" className="mb-2 block">Condition/Grade</Label>
            <Select value={condition} onValueChange={(value) => setCondition(value as BanknoteCondition)}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNC">Uncirculated (UNC)</SelectItem>
                <SelectItem value="AU">About Uncirculated (AU)</SelectItem>
                <SelectItem value="XF">Extremely Fine (XF)</SelectItem>
                <SelectItem value="VF">Very Fine (VF)</SelectItem>
                <SelectItem value="F">Fine (F)</SelectItem>
                <SelectItem value="VG">Very Good (VG)</SelectItem>
                <SelectItem value="G">Good (G)</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="purchase-date" className="mb-2 block">Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label htmlFor="purchase-price" className="mb-2 block">Purchase Price</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
              <Input
                id="purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                step="0.01"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="location" className="mb-2 block">Storage Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where do you keep this banknote?"
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notes</h3>
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <Label htmlFor="private-note" className="mb-2 block">Private Notes (only visible to you)</Label>
            <Textarea
              id="private-note"
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              placeholder="Add your private notes here"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="public-note" className="mb-2 block">Public Notes (visible to others)</Label>
            <Textarea
              id="public-note"
              value={publicNote}
              onChange={(e) => setPublicNote(e.target.value)}
              placeholder="Add notes that others can see"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {publicNote.length}/500
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Marketplace</h3>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
          <div className="space-y-0.5">
            <Label htmlFor="for-sale" className="text-base cursor-pointer">List on Marketplace</Label>
            <p className="text-sm text-muted-foreground">Make this item available for sale in the marketplace</p>
          </div>
          <Switch
            id="for-sale"
            checked={isForSale}
            onCheckedChange={setIsForSale}
          />
        </div>
        
        {isForSale && (
          <div className="p-4 border rounded-md mt-2">
            <Label htmlFor="sale-price" className="mb-2 block">Sale Price</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
              <Input
                id="sale-price"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                step="0.01"
                required={isForSale}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
