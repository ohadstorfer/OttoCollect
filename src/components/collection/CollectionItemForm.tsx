import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CollectionItem } from '@/types';
import CollectionImageUpload from './CollectionImageUpload';

const formSchema = z.object({
  condition: z.string().optional(),
  grade_by: z.string().optional(),
  grade: z.string().optional(),
  grade_condition_description: z.string().optional(),
  salePrice: z.number().optional(),
  isForSale: z.boolean().optional(),
  publicNote: z.string().optional(),
  privateNote: z.string().optional(),
  purchasePrice: z.number().optional(),
  purchaseDate: z.string().optional(),
  location: z.string().optional(),
  obverseImage: z.string().optional(),
  reverseImage: z.string().optional(),
  orderIndex: z.number().optional(),
  type: z.string().optional(),
  prefix: z.string().optional(),
  hide_images: z.boolean().optional(),
});

interface CollectionItemFormProps {
  item?: CollectionItem;
  onSubmit: (updatedItem: CollectionItem) => Promise<void>;
  onCancel: () => void;
}

const CollectionItemForm = ({ item, onSubmit, onCancel }: CollectionItemFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      condition: item?.condition || '',
      grade_by: item?.grade_by || '',
      grade: item?.grade || '',
      grade_condition_description: item?.grade_condition_description || '',
      salePrice: item?.salePrice || undefined,
      isForSale: item?.isForSale || false,
      publicNote: item?.publicNote || '',
      privateNote: item?.privateNote || '',
      purchasePrice: item?.purchasePrice || undefined,
      purchaseDate: item?.purchaseDate || '',
      location: item?.location || '',
      obverseImage: item?.obverseImage || '',
      reverseImage: item?.reverseImage || '',
      orderIndex: item?.orderIndex || 0,
      type: item?.type || '',
      prefix: item?.prefix || '',
      hide_images: item?.hide_images || false,
    },
  });

  const handleImageUpload = async (file: File, side: 'obverse' | 'reverse') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
  
      // Simulate image upload to server
      const imageUrl = URL.createObjectURL(file);
  
      form.setValue(side === 'obverse' ? 'obverseImage' : 'reverseImage', imageUrl);
      toast({
        title: `${side === 'obverse' ? 'Obverse' : 'Reverse'} image uploaded`,
        description: `Successfully uploaded ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const updatedItem: CollectionItem = {
        ...item,
        condition: values.condition || null,
        grade_by: values.grade_by || null,
        grade: values.grade || null,
        grade_condition_description: values.grade_condition_description || null,
        salePrice: values.salePrice || null,
        isForSale: values.isForSale || false,
        publicNote: values.publicNote || null,
        privateNote: values.privateNote || null,
        purchasePrice: values.purchasePrice || null,
        purchaseDate: values.purchaseDate || null,
        location: values.location || null,
        obverseImage: values.obverseImage || null,
        reverseImage: values.reverseImage || null,
        orderIndex: values.orderIndex || 0,
        type: values.type || null,
        prefix: values.prefix || null,
        hide_images: values.hide_images || false,
      };
      await onSubmit(updatedItem);
      toast({
        title: "Collection item updated",
        description: "Your collection item has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update collection item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <FormField
        control={form.control}
        name="condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condition</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a condition" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="UNC">UNC</SelectItem>
                <SelectItem value="AU">AU</SelectItem>
                <SelectItem value="XF/AU">XF/AU</SelectItem>
                <SelectItem value="XF">XF</SelectItem>
                <SelectItem value="VF/XF">VF/XF</SelectItem>
                <SelectItem value="VF">VF</SelectItem>
                <SelectItem value="F/VF">F/VF</SelectItem>
                <SelectItem value="F">F</SelectItem>
                <SelectItem value="VG/F">VG/F</SelectItem>
                <SelectItem value="VG">VG</SelectItem>
                <SelectItem value="G">G</SelectItem>
                <SelectItem value="FR">FR</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="grade_by"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Graded By</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PCGS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 67" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="grade_condition_description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grade Condition Description</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., Cleaned" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="purchasePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 25.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="salePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 50.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="purchaseDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase Date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
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
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Safe deposit box" {...field} />
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
              <Textarea placeholder="e.g., From my grandfather's collection" {...field} />
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
              <Textarea placeholder="e.g., Sentimental value" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="orderIndex"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Order Index</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g., 1"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Commemorative" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="prefix"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Prefix</FormLabel>
            <FormControl>
              <Input placeholder="e.g., A" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="hide_images"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Hide Images</FormLabel>
              <FormDescription>
                This will hide the images from public view.
              </FormDescription>
            </div>
            <FormControl>
              <Input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Obverse Image</Label>
          <CollectionImageUpload
            currentImage={form.getValues("obverseImage") || undefined}
            side="front"
            onImageUploaded={(file) => handleImageUpload(file, 'obverse')}
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label>Reverse Image</Label>
          <CollectionImageUpload
            currentImage={form.getValues("reverseImage") || undefined}
            side="back"
            onImageUploaded={(file) => handleImageUpload(file, 'reverse')}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
};

export default CollectionItemForm;
