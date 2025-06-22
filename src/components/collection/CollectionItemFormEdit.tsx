import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getGradeDescription } from '@/utils/grading';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { BanknoteCondition, DetailedBanknote, CollectionItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { addToCollection, updateCollectionItem, uploadCollectionImage, createMarketplaceItem } from '@/services/collectionService';
import { fetchBanknoteById, searchBanknotes } from '@/services/banknoteService';

// Define props for CollectionItemForm
export interface CollectionItemFormProps {
  item?: CollectionItem | null;
  collectionItem?: CollectionItem | null;  // Adding this to match usage in components
  onSave?: (item: CollectionItem) => Promise<void>;
  onUpdate?: (item: CollectionItem) => void;  // Adding this to match usage in components
  onCancel?: () => void;
}

// Create a schema for form validation with coerced number types
const formSchema = z.object({
  banknoteId: z.string().min(1, { message: "Banknote must be selected" }),
  useGrading: z.boolean().default(false),
  condition: z.enum(['UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G', 'FR'] as const).nullable(),
  gradeBy: z.string().max(8, { message: "Maximum 8 characters allowed" }).optional(),
  gradeNumber: z.union([
    z.coerce.number().min(1).max(70),
    z.literal('')
  ]).optional(),
  gradeLetters: z.string().max(3, { message: "Maximum 3 characters allowed" }).optional(),
  purchasePrice: z.union([z.coerce.number().optional(), z.literal('')]),
  purchaseDate: z.date().optional(),
  location: z.string().optional(),
  publicNote: z.string().optional(),
  privateNote: z.string().optional(),
  isForSale: z.boolean().default(false),
  salePrice: z.union([z.coerce.number().optional(), z.literal('')])
});

interface ImageVersions {
  original: string;
  watermarked: string;
  thumbnail: string;
}

const CollectionItemFormEdit: React.FC<CollectionItemFormProps> = ({
  item,
  collectionItem,
  onSave,
  onUpdate,
  onCancel
}) => {
  // Use collectionItem prop if provided, otherwise use item
  const currentItem = collectionItem || item;

  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DetailedBanknote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBanknote, setSelectedBanknote] = useState<DetailedBanknote | null>(
    currentItem?.banknote || null
  );
  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(
    currentItem?.obverseImage || null
  );
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(
    currentItem?.reverseImage || null
  );
  const [useGrading, setUseGrading] = useState(!!currentItem?.grade);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<{
    url: string;
    type: 'obverse' | 'reverse';
  } | null>(null);
  const [imagePreviewDialogOpen, setImagePreviewDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const obverseInputRef = useRef<HTMLInputElement>(null);
  const reverseInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [obverseImageVersions, setObverseImageVersions] = useState<ImageVersions | null>(
    currentItem ? {
      original: currentItem.obverseImage || '',
      watermarked: currentItem.obverse_image_watermarked || '',
      thumbnail: currentItem.obverse_image_thumbnail || ''
    } : null
  );
  const [reverseImageVersions, setReverseImageVersions] = useState<ImageVersions | null>(
    currentItem ? {
      original: currentItem.reverseImage || '',
      watermarked: currentItem.reverse_image_watermarked || '',
      thumbnail: currentItem.reverse_image_thumbnail || ''
    } : null
  );

  // Initialize form with existing values if editing
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banknoteId: currentItem?.banknoteId || '',
      useGrading: !!currentItem?.grade,
      condition: currentItem?.condition as 'UNC' | 'AU' | 'XF' | 'VF' | 'F' | 'VG' | 'G' | 'FR' | undefined,
      gradeBy: currentItem?.grade_by || '',
      gradeNumber: currentItem?.grade ? parseInt(currentItem.grade.split(' ')[0]) : undefined,
      gradeLetters: currentItem?.grade ? currentItem.grade.split(' ')[1] : '',
      purchasePrice: currentItem?.purchasePrice || '',
      purchaseDate: currentItem?.purchaseDate ? new Date(currentItem.purchaseDate) : undefined,
      location: currentItem?.location || '',
      publicNote: currentItem?.publicNote || '',
      privateNote: currentItem?.privateNote || '',
      isForSale: currentItem?.isForSale || false,
      salePrice: currentItem?.salePrice || ''
    }
  });

  // Search for banknotes as user types
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchBanknotes(searchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching banknotes:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Handle banknote selection
  const handleBanknoteSelect = async (id: string) => {
    try {
      const banknote = await fetchBanknoteById(id);
      if (banknote) {
        setSelectedBanknote(banknote);
        form.setValue('banknoteId', banknote.id);
      }
    } catch (error) {
      console.error('Error fetching banknote details:', error);
    }
  };

  // Handle image file selection for obverse
  const handleObverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setObverseImageFile(file);
      const fileUrl = URL.createObjectURL(file);
      setObverseImagePreview(fileUrl);
    }
  };

  // Handle image file selection for reverse
  const handleReverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReverseImageFile(file);
      const fileUrl = URL.createObjectURL(file);
      setReverseImagePreview(fileUrl);
    }
  };

  const handleCropClick = (imageUrl: string | null, type: 'obverse' | 'reverse') => {
    console.log('handleCropClick called with:', { imageUrl, type });
    if (imageUrl) {
      console.log('Setting selectedImageToCrop and opening crop dialog');
      setSelectedImageToCrop({ url: imageUrl, type });
      setCropDialogOpen(true);
      console.log('Current state after setting:', { cropDialogOpen: true, selectedImageToCrop: { url: imageUrl, type } });
    } else {
      console.log('No imageUrl provided to handleCropClick');
    }
  };

  const handleCroppedImage = async (croppedImageUrl: string) => {
    console.log('handleCroppedImage called with:', croppedImageUrl);
    try {
      console.log('Converting data URL to Blob');
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      console.log('Blob created successfully');

      console.log('Creating File from blob');
      const file = new File([blob], `cropped_${selectedImageToCrop?.type}.jpg`, { type: 'image/jpeg' });
      console.log('File created successfully');

      if (selectedImageToCrop?.type === 'obverse') {
        console.log('Updating obverse image');
        setObverseImageFile(file);
        setObverseImagePreview(URL.createObjectURL(file));
      } else {
        console.log('Updating reverse image');
        setReverseImageFile(file);
        setReverseImagePreview(URL.createObjectURL(file));
      }
    } catch (error) {
      console.error('Error in handleCroppedImage:', error);
      toast({
        title: "Error",
        description: "Failed to save cropped image",
        variant: "destructive",
      });
    } finally {
      console.log('Cleaning up crop dialog state');
      setCropDialogOpen(false);
      setSelectedImageToCrop(null);
    }
  };

  const handleImageClick = (imageUrl: string, alt: string) => {
    setPreviewImage({ url: imageUrl, alt });
    setImagePreviewDialogOpen(true);
  };

  const openImageViewer = (imageUrl: string) => {
    console.log('openImageViewer called with:', imageUrl);
    setSelectedImage(imageUrl);
    console.log('selectedImage state set to:', imageUrl);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save collection items.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let obverseImages = obverseImageVersions;
      let reverseImages = reverseImageVersions;

      // Upload new images if provided
      if (obverseImageFile) {
        obverseImages = await uploadCollectionImage(obverseImageFile);
      }

      if (reverseImageFile) {
        reverseImages = await uploadCollectionImage(reverseImageFile);
      }

      // Handle grading vs condition
      let condition = undefined;
      let grade = undefined;
      let grade_by = undefined;
      let grade_condition_description = undefined;

      if (values.useGrading && values.gradeNumber) {
        grade_by = values.gradeBy || null;
        grade = values.gradeNumber + (values.gradeLetters ? ` ${values.gradeLetters}` : '');
        grade_condition_description = getGradeDescription(values.gradeNumber);
        condition = null; // Explicitly clear condition
      } else if (!values.useGrading) {
        condition = values.condition || null;
        grade_by = null;
        grade = null;
        grade_condition_description = null;
      }

      // Convert empty strings to null for numeric fields
      const purchasePrice = values.purchasePrice === '' ? null : Number(values.purchasePrice);
      const salePrice = values.salePrice === '' ? null : Number(values.salePrice);

      const updateData = {
        condition,
        grade,
        grade_by,
        grade_condition_description,
        purchase_price: purchasePrice,
        purchase_date: values.purchaseDate ? values.purchaseDate.toISOString() : null,
        location: values.location || null,
        public_note: values.publicNote || null,
        private_note: values.privateNote || null,
        is_for_sale: values.isForSale,
        sale_price: salePrice,
        obverse_image: obverseImages?.original || null,
        obverse_image_watermarked: obverseImages?.watermarked || null,
        obverse_image_thumbnail: obverseImages?.thumbnail || null,
        reverse_image: reverseImages?.original || null,
        reverse_image_watermarked: reverseImages?.watermarked || null,
        reverse_image_thumbnail: reverseImages?.thumbnail || null,
      };

      if (currentItem?.id) {
        await updateCollectionItem(currentItem.id, updateData);
        if (onUpdate) {
          // Create updated item for callback
          const updatedItem = {
            ...currentItem,
            ...updateData,
            // Map database fields back to frontend property names for compatibility
            purchasePrice,
            purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : null,
            publicNote: values.publicNote || null,
            privateNote: values.privateNote || null,
            isForSale: values.isForSale,
            salePrice,
            obverseImage: obverseImages?.original || null,
            reverseImage: reverseImages?.original || null,
          };
          onUpdate(updatedItem);
        }
      } else {
        const newItemData = {
          user_id: user.id,
          banknote_id: values.banknoteId,
          ...updateData,
        };
        const savedItem = await addToCollection(newItemData);
        if (onSave) {
          await onSave(savedItem);
        }
      }

      toast({
        title: "Success",
        description: `Collection item ${currentItem?.id ? 'updated' : 'added'} successfully.`,
      });

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error("Error saving collection item:", error);
      toast({
        title: "Error",
        description: "Failed to save collection item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Edit Collection Item
          </h2>
          <p className="text-muted-foreground">
            Update the details of this banknote in your collection.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {/* Banknote selection */}
              <div className="w-full h-px bg-muted my-6" />

              <div className="grid grid-cols-1 gap-y-4">

                <div className="flex items-center gap-2 mb-7 ">
                  <h3 className="text-lg font-medium">Public Details</h3>
                  <span className="text-sm text-muted-foreground">Visible to everyone</span>
                </div>

                
                <div className="flex items-center justify-between mb-0">
                  <div className="flex items-center gap-2">
                    <FormLabel>Condition</FormLabel>

                    <FormField
                      control={form.control}
                      name="useGrading"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">

                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue('condition', null);
                              } else {
                                form.setValue('gradeBy', undefined);
                                form.setValue('gradeNumber', undefined);
                                form.setValue('gradeLetters', undefined);
                              }
                            }}
                          />
                        </FormItem>
                      )}
                    />
                    <FormLabel>Grading</FormLabel>
                  </div>
                </div>



                {/* Condition or Grading Fields */}
                {!form.watch("useGrading") ? (
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNC">UNC - Uncirculated</SelectItem>
                              <SelectItem value="AU">AU - About Uncirculated</SelectItem>
                              <SelectItem value="XF">XF - Extremely Fine</SelectItem>
                              <SelectItem value="VF">VF - Very Fine</SelectItem>
                              <SelectItem value="F">F - Fine</SelectItem>
                              <SelectItem value="VG">VG - Very Good</SelectItem>
                              <SelectItem value="G">G - Good</SelectItem>
                              <SelectItem value="FR">FR - Fair</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the condition of your banknote.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="space-y-4 mb-8">
                    <FormField
                      control={form.control}
                      name="gradeBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grading By</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={8}
                              placeholder="e.g. PMG"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the grading company or authority (max 8 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gradeNumber"
                      render={({ field: { onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 70)) {
                                  onChange(val);
                                }
                              }}
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter a numeric grade between 1 and 70
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gradeLetters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade Letters</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={3}
                              placeholder="e.g. EPQ"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter up to 3 letters for additional grade information
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}


<div className="mt-7 mb-7 ">
                {/* Public Note */}
                <FormField
                  control={form.control}
                  name="publicNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Note</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add a note visible to other collectors"
                        />
                      </FormControl>
                      <FormDescription>
                        This note will be visible to other users.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                {/* Custom Images Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Custom Images</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your own images of the banknote (optional)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                      <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div
                          onClick={() => obverseImagePreview && openImageViewer(obverseImagePreview)}
                          className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
                        >
                          {obverseImagePreview ? (
                            <img
                              src={obverseImagePreview}
                              alt="Obverse preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <input
                            id="obverseImage"
                            type="file"
                            accept="image/*"
                            onChange={handleObverseImageChange}
                            className="hidden"
                            ref={obverseInputRef}
                          />
                          {obverseImagePreview && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCropClick(obverseImagePreview, 'obverse')}
                              >
                                Edit Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => obverseInputRef?.current?.click()}
                              >
                                Change Image
                              </Button>
                            </>
                          )}
                          {!obverseImagePreview && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => obverseInputRef?.current?.click()}
                            >
                              Upload Image
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reverse Image */}
                    <div>
                      <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div
                          onClick={() => reverseImagePreview && openImageViewer(reverseImagePreview)}
                          className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
                        >
                          {reverseImagePreview ? (
                            <img
                              src={reverseImagePreview}
                              alt="Reverse preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <input
                            id="reverseImage"
                            type="file"
                            accept="image/*"
                            onChange={handleReverseImageChange}
                            className="hidden"
                            ref={reverseInputRef}
                          />
                          {reverseImagePreview && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleCropClick(reverseImagePreview, 'reverse')}
                              >
                                Edit Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => reverseInputRef?.current?.click()}
                              >
                                Change Image
                              </Button>
                            </>
                          )}
                          {!reverseImagePreview && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => reverseInputRef?.current?.click()}
                            >
                              Upload Image
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="w-full h-px bg-muted my-6" />

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">Private Details</h3>
                  <span className="text-sm text-muted-foreground">Only visible to you</span>
                </div>

                
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Purchase Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"
                                }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When did you acquire this banknote?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Purchase Price */}
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">
                            $
                          </span>
                          <Input
                            {...field}
                            className="pl-6"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                onChange(val);
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        How much did you pay for this banknote?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Where is this banknote stored?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Private Note */}
              <FormField
                control={form.control}
                name="privateNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Private Note</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add a private note for your reference"
                      />
                    </FormControl>
                    <FormDescription>
                      This note will only be visible to you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="w-full h-px bg-muted my-6" />

              {/* For Sale Switch */}
              <FormField
                control={form.control}
                name="isForSale"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">For Sale</FormLabel>
                      <FormDescription>
                        Mark this banknote as available for sale
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

              {/* Sale Price - Only show if For Sale is checked */}
              {form.watch("isForSale") && (
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">
                            $
                          </span>
                          <Input
                            {...field}
                            className="pl-6"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                onChange(val);
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : item
                    ? 'Update Item'
                    : 'Update Item'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Image Preview Dialog - Moved outside Form */}
        {selectedImage && (
          <Dialog 
            open={!!selectedImage} 
            onOpenChange={(open) => {
              console.log('Image preview dialog onOpenChange:', { open });
              if (!open) setSelectedImage(null);
            }}
          >
            <DialogContent className="sm:max-w-[800px] p-1">
              <img
                src={selectedImage}
                alt="Banknote detail"
                className="w-full h-auto rounded"
                onLoad={() => console.log('Preview image loaded successfully')}
                onError={(e) => console.error('Error loading preview image:', e)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Image Crop Dialog - Moved outside Form */}
        {cropDialogOpen && selectedImageToCrop && (
          <ImageCropDialog
            imageUrl={selectedImageToCrop.url}
            open={cropDialogOpen}
            onClose={() => {
              console.log('ImageCropDialog onClose called');
              setCropDialogOpen(false);
              setSelectedImageToCrop(null);
            }}
            onSave={async (url) => {
              console.log('ImageCropDialog onSave called with url:', url);
              await handleCroppedImage(url);
            }}
            title={`Edit ${selectedImageToCrop.type === 'obverse' ? 'Front' : 'Back'} Image`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CollectionItemFormEdit;
