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
import CollectionImageUpload from './CollectionImageUpload';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { updateCollectionItem, updateCollectionItemImages } from '@/services/collectionService';
import { addToMarketplace, removeFromMarketplace } from '@/services/marketplaceService';

interface CollectionItemFormProps {
  collectionItem: CollectionItem;
  onUpdate?: (updatedItem: CollectionItem) => void;
}

export default function CollectionItemForm({ collectionItem, onUpdate }: CollectionItemFormProps) {
  const { user } = useAuth();
  const [condition, setCondition] = useState<BanknoteCondition>(collectionItem.condition || "UNC");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    collectionItem.purchaseDate ? new Date(collectionItem.purchaseDate) : undefined
  );
  const [purchasePrice, setPurchasePrice] = useState<string>(
    collectionItem.purchasePrice ? collectionItem.purchasePrice.toString() : ''
  );
  const [privateNote, setPrivateNote] = useState<string>(collectionItem.privateNote || '');
  const [publicNote, setPublicNote] = useState<string>(collectionItem.publicNote || '');
  const [isForSale, setIsForSale] = useState(collectionItem.isForSale);
  const [salePrice, setSalePrice] = useState<string>(
    collectionItem.salePrice ? collectionItem.salePrice.toString() : ''
  );
  const [location, setLocation] = useState<string>(collectionItem.location || '');
  const [obverseImage, setObverseImage] = useState<string | null>(collectionItem.obverseImage || null);
  const [reverseImage, setReverseImage] = useState<string | null>(collectionItem.reverseImage || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsForSale(collectionItem.isForSale);
  }, [collectionItem.isForSale]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    
    setLoading(true);
    try {
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
      
      const success = await updateCollectionItem(collectionItem.id, updates);
      
      if (!success) {
        toast.error("Failed to update collection item");
        return;
      }
      
      if (obverseImage !== collectionItem.obverseImage || 
          reverseImage !== collectionItem.reverseImage) {
        await updateCollectionItemImages(
          collectionItem.id,
          obverseImage || undefined,
          reverseImage || undefined
        );
      }
      
      if (isForSale && !collectionItem.isForSale) {
        await addToMarketplace(collectionItem.id, user.id);
      } else if (!isForSale && collectionItem.isForSale) {
        await removeFromMarketplace(collectionItem.id, collectionItem.id);
      }

      if (onUpdate) {
        onUpdate({
          ...collectionItem,
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
            <CollectionImageUpload 
              userId={user?.id || ''} 
              banknoteId={collectionItem.banknoteId}
              imageUrl={obverseImage} 
              side="obverse" 
              onImageUploaded={(url) => handleImageUploaded('obverse', url)}
            />
          </div>
          <div>
            <Label className="mb-2 block">Reverse (Back)</Label>
            <CollectionImageUpload 
              userId={user?.id || ''} 
              banknoteId={collectionItem.banknoteId}
              imageUrl={reverseImage} 
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
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
