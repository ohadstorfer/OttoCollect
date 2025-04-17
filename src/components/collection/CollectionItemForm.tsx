import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CollectionItem, BanknoteCondition } from '@/types';
import { addItemToMarketplace, removeItemFromMarketplace } from '@/services/marketplaceService';
import { updateCollectionItem } from '@/services/collectionService';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency } from '@/lib/formatters';

interface CollectionItemFormProps {
  collectionItem: CollectionItem;
  onSave: (updatedItem: CollectionItem) => Promise<void>;
  onCancel: () => void;
}

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

const formSchema = z.object({
  condition: z.enum(['UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G', 'Fair', 'Poor']),
  purchasePrice: z.number().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  publicNote: z.string().nullable().optional(),
  privateNote: z.string().nullable().optional(),
  isForSale: z.boolean().default(false),
  salePrice: z.number().nullable().optional(),
});

const CollectionItemForm = ({ collectionItem, onSave, onCancel }: CollectionItemFormProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      condition: collectionItem.condition,
      purchasePrice: collectionItem.purchasePrice || null,
      purchaseDate: collectionItem.purchaseDate || '',
      location: collectionItem.location || '',
      publicNote: collectionItem.publicNote || '',
      privateNote: collectionItem.privateNote || '',
      isForSale: collectionItem.isForSale || false,
      salePrice: collectionItem.salePrice || null,
    },
  });

  const isForSale = form.watch('isForSale');

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsProcessing(true);
    
    try {
      const updatedItem: CollectionItem = {
        ...collectionItem,
        condition: values.condition,
        purchasePrice: values.purchasePrice,
        purchaseDate: values.purchaseDate || null,
        location: values.location || null,
        publicNote: values.publicNote || null,
        privateNote: values.privateNote || null,
        isForSale: values.isForSale,
        salePrice: values.salePrice,
      };
      
      await onSave(updatedItem);
    } catch (error) {
      console.error('Error saving collection item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {conditionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchasePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value === null ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="Where is this banknote stored?"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="publicNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes visible to other users"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="privateNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Private Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Private notes only visible to you"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isForSale"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">List for Sale</FormLabel>
                <FormDescription>
                  Make this item available in the marketplace
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isForSale && (
          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value === null ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="submit" disabled={isProcessing}>
            {isProcessing ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CollectionItemForm;
