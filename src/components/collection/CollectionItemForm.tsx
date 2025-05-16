
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select'; // <-- Add SelectGroup here!
import { CollectionItem } from '@/types';
import { updateCollectionItem } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import CollectionImageUpload from './CollectionImageUpload';

export interface CollectionItemFormProps {
  item: CollectionItem;
  onCancel: () => void;
  onSaveComplete?: () => void;
  onUpdate?: () => void;  // Add this prop to fix the build error
}

const CollectionItemForm: React.FC<CollectionItemFormProps> = ({ item, onCancel, onSaveComplete, onUpdate }) => {
  const [formData, setFormData] = useState({
    condition: item.condition || "VF",
    purchasePrice: item.purchasePrice || undefined,
    purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
    location: item.location || "",
    publicNote: item.publicNote || "",
    privateNote: item.privateNote || "",
    isForSale: item.isForSale || false,
    salePrice: item.salePrice || undefined,
    obverseImage: item.obverseImage || "",
    reverseImage: item.reverseImage || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSalePrice, setShowSalePrice] = useState(!!item.salePrice);

  const handleChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedItem = {
        ...item,
        ...formData,
        salePrice: formData.isForSale ? formData.salePrice : null,
      };
      await updateCollectionItem(updatedItem);
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error("Error saving collection item:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Banknote details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-1">{item.banknote.denomination}</div>
            <div className="text-sm text-muted-foreground">
              {item.banknote.country}, {item.banknote.year}
            </div>
            <div className="mt-1 text-sm">
              Pick: {item.banknote.pickNumber || item.banknote.extendedPickNumber}
            </div>
          </div>
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={formData.condition}
              onValueChange={(value) => handleChange("condition", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="UNC">UNC (Uncirculated)</SelectItem>
                  <SelectItem value="AU">AU (About Uncirculated)</SelectItem>
                  <SelectItem value="XF">XF (Extremely Fine)</SelectItem>
                  <SelectItem value="VF">VF (Very Fine)</SelectItem>
                  <SelectItem value="F">F (Fine)</SelectItem>
                  <SelectItem value="VG">VG (Very Good)</SelectItem>
                  <SelectItem value="G">G (Good)</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Purchase information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              value={formData.purchasePrice || ""}
              onChange={(e) => handleChange("purchasePrice", e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={isSubmitting}
              placeholder="Enter purchase price"
            />
          </div>
          <div>
            <Label htmlFor="purchaseDateInput">Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="purchaseDateInput"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.purchaseDate && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.purchaseDate ? (
                    format(formData.purchaseDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.purchaseDate}
                  onSelect={(date) => handleChange("purchaseDate", date)}
                  disabled={isSubmitting}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="location">Purchase Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              disabled={isSubmitting}
              placeholder="Where did you buy it?"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Banknote Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Obverse (Front)</Label>
            <CollectionImageUpload
              imageUrl={formData.obverseImage}
              onImageUpload={(url) => handleChange("obverseImage", url)}
              imageType="obverse"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label>Reverse (Back)</Label>
            <CollectionImageUpload
              imageUrl={formData.reverseImage}
              onImageUpload={(url) => handleChange("reverseImage", url)}
              imageType="reverse"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Notes</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="publicNote">Public Note</Label>
            <Textarea
              id="publicNote"
              value={formData.publicNote}
              onChange={(e) => handleChange("publicNote", e.target.value)}
              disabled={isSubmitting}
              placeholder="This note will be visible to everyone"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="privateNote">Private Note</Label>
            <Textarea
              id="privateNote"
              value={formData.privateNote}
              onChange={(e) => handleChange("privateNote", e.target.value)}
              disabled={isSubmitting}
              placeholder="This note will only be visible to you"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-medium">Marketplace</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="isForSale"
            checked={formData.isForSale}
            onCheckedChange={(checked) => {
              handleChange("isForSale", checked);
              setShowSalePrice(checked);
            }}
            disabled={isSubmitting}
          />
          <Label htmlFor="isForSale">List this banknote for sale</Label>
        </div>

        {showSalePrice && (
          <div>
            <Label htmlFor="salePrice">Sale Price</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              value={formData.salePrice || ""}
              onChange={(e) => handleChange("salePrice", e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={isSubmitting}
              placeholder="Enter sale price"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
};

export default CollectionItemForm;
