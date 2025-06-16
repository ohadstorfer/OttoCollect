import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollectionItem } from '@/types';
import { updateUnlistedBanknoteWithCollectionItem, uploadCollectionImage, createMarketplaceItem } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Upload, CalendarIcon } from 'lucide-react';
import { BANKNOTE_CONDITIONS } from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useCountryCurrencies } from '@/hooks/useCountryCurrencies';
import { useCountryCategoryDefs } from '@/hooks/useCountryCategoryDefs';
import { useCountryTypeDefs } from '@/hooks/useCountryTypeDefs';
import { getGradeDescription } from '@/utils/grading';
import ImageCropDialog from '@/components/shared/ImageCropDialog';

const formSchema = z.object({
  // CollectionItem fields
  useGrading: z.boolean().default(false),
  condition: z.enum(['UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G', 'FR'] as const).nullable(),
  gradeBy: z.string().max(8, { message: "Maximum 8 characters allowed" }).optional(),
  gradeNumber: z.union([
    z.coerce.number().min(1).max(70),
    z.literal('')
  ]).optional(),
  gradeLetters: z.string().max(3, { message: "Maximum 3 characters allowed" }).optional(),
  publicNote: z.string().optional(),
  privateNote: z.string().optional(),
  purchasePrice: z.union([z.coerce.number().optional(), z.literal('')]),
  purchaseDate: z.date().optional(),
  location: z.string().optional(),
  isForSale: z.boolean().default(false),
  salePrice: z.union([z.coerce.number().optional(), z.literal('')]),

  // Banknote fields
  faceValueInt: z.union([z.coerce.number(), z.string().regex(/^\d+$/)]),
  faceValueCurrency: z.string(),
  name: z.string().max(30),
  categoryId: z.string(),
  typeId: z.string(),
  gregorian_year: z.string().optional(),
  islamic_year: z.string().optional(),
  sultan_name: z.string().optional(),
  printer: z.string().optional(),
  rarity: z.string().optional(),

  // images
  front_image_file: z.any().optional(),
  reverse_image_file: z.any().optional(),
});

interface EditUnlistedBanknoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  collectionItem: CollectionItem;
}

// Add type definition for updateUnlistedBanknoteWithCollectionItem parameters
interface UnlistedBanknoteUpdateParams {
  userId: string;
  country: string;
  extended_pick_number: string;
  pick_number?: string;
  turk_catalog_number?: string;
  face_value: string;
  gregorian_year?: string;
  islamic_year?: string;
  sultan_name?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  name?: string;
  condition?: string;
  grade_by?: string;
  grade?: string;
  grade_condition_description?: string;
  public_note?: string;
  private_note?: string;
  location?: string;
  purchase_price?: number;
  purchase_date?: string;
  is_for_sale?: boolean;
  sale_price?: number;
  obverse_image?: string;
  reverse_image?: string;
  seal_names?: string;
}

export default function EditUnlistedBanknoteDialog({
  isOpen,
  onClose,
  onUpdate,
  collectionItem
}: EditUnlistedBanknoteDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(collectionItem.obverseImage || null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(collectionItem.reverseImage || null);
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

  const { currencies, loading: loadingCurrencies } = useCountryCurrencies(collectionItem.banknote?.country || '');
  const { categories, loading: loadingCategories } = useCountryCategoryDefs(collectionItem.banknote?.country || '');
  const { types, loading: loadingTypes } = useCountryTypeDefs(collectionItem.banknote?.country || '');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useGrading: !!collectionItem.grade,
      faceValueInt: collectionItem.banknote?.denomination?.split(' ')[0] || '',
      faceValueCurrency: currencies.find(c => c.name === collectionItem.banknote?.denomination?.split(' ')[1])?.id || '',
      name: collectionItem.banknote?.name || '',
      categoryId: categories.find(c => c.name === collectionItem.banknote?.category)?.id || '',
      typeId: types.find(t => t.name === collectionItem.banknote?.type)?.id || '',
      gregorian_year: collectionItem.banknote?.year || '',
      islamic_year: '',
      sultan_name: collectionItem.banknote?.sultanName || '',
      printer: '',
      rarity: collectionItem.banknote?.rarity || '',
      condition: collectionItem.condition as any,
      gradeBy: collectionItem.grade_by || '',
      gradeNumber: collectionItem.grade ? parseInt(collectionItem.grade.split(' ')[0]) : undefined,
      gradeLetters: collectionItem.grade ? collectionItem.grade.split(' ')[1] : '',
      publicNote: collectionItem.publicNote || '',
      privateNote: collectionItem.privateNote || '',
      purchasePrice: collectionItem.purchasePrice || '',
      purchaseDate: collectionItem.purchaseDate ? new Date(collectionItem.purchaseDate) : undefined,
      location: collectionItem.location || '',
      isForSale: collectionItem.isForSale || false,
      salePrice: collectionItem.salePrice || '',
    }
  });

  // Handle image changes
  const handleObverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setObverseImageFile(file);
      setObverseImagePreview(URL.createObjectURL(file));
      form.setValue("front_image_file", file);
    }
  };

  const handleReverseImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReverseImageFile(file);
      setReverseImagePreview(URL.createObjectURL(file));
      form.setValue("reverse_image_file", file);
    }
  };

  const handleCropClick = (imageUrl: string | null, type: 'obverse' | 'reverse') => {
    if (imageUrl) {
      setSelectedImageToCrop({ url: imageUrl, type });
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedImageUrl: string) => {
    try {
      // Convert data URL to Blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create a file from the blob
      const file = new File([blob], `cropped_${selectedImageToCrop?.type}.jpg`, { type: 'image/jpeg' });

      if (selectedImageToCrop?.type === 'obverse') {
        setObverseImageFile(file);
        setObverseImagePreview(URL.createObjectURL(file));
        form.setValue("front_image_file", file);
      } else {
        setReverseImageFile(file);
        setReverseImagePreview(URL.createObjectURL(file));
        form.setValue("reverse_image_file", file);
      }
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast({
        title: "Error",
        description: "Failed to save cropped image",
        variant: "destructive",
      });
    } finally {
      setCropDialogOpen(false);
      setSelectedImageToCrop(null);
    }
  };

  const handleImageClick = (imageUrl: string, alt: string) => {
    setPreviewImage({ url: imageUrl, alt });
    setImagePreviewDialogOpen(true);
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Upload images if changed
      let obverseImageUrl = collectionItem.obverseImage;
      let reverseImageUrl = collectionItem.reverseImage;

      if (obverseImageFile) {
        obverseImageUrl = await uploadCollectionImage(obverseImageFile);
      }
      if (reverseImageFile) {
        reverseImageUrl = await uploadCollectionImage(reverseImageFile);
      }

      // Build the update data
      const face_value = `${values.faceValueInt} ${currencies.find(c => c.id === values.faceValueCurrency)?.name || ''}`;
      
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

      const updatedItem = await updateUnlistedBanknoteWithCollectionItem(collectionItem.id, {
        userId: collectionItem.userId,
        country: collectionItem.banknote?.country || '',
        extended_pick_number: collectionItem.banknote?.extendedPickNumber || '',
        face_value: face_value,
        gregorian_year: values.gregorian_year,
        islamic_year: values.islamic_year,
        sultan_name: values.sultan_name,
        printer: values.printer,
        type: types.find(t => t.id === values.typeId)?.name,
        category: categories.find(c => c.id === values.categoryId)?.name,
        rarity: values.rarity,
        name: values.name,
        condition,
        grade_by,
        grade,
        grade_condition_description,
        public_note: values.publicNote,
        private_note: values.privateNote,
        location: values.location,
        purchase_price: values.purchasePrice === '' ? undefined : Number(values.purchasePrice),
        purchase_date: values.purchaseDate ? format(values.purchaseDate, 'yyyy-MM-dd') : undefined,
        is_for_sale: values.isForSale,
        sale_price: values.salePrice === '' ? undefined : Number(values.salePrice),
        obverse_image: obverseImageUrl,
        reverse_image: reverseImageUrl,
      });

      // If item is marked for sale, create marketplace item
      if (values.isForSale) {
        await createMarketplaceItem({
          collectionItemId: collectionItem.id,
          sellerId: collectionItem.userId,
          banknoteId: collectionItem.banknote?.id || ''
        });
      }

      toast({
        title: "Success",
        description: "Banknote updated successfully",
      });

      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating banknote:', error);
      toast({
        title: "Error",
        description: "Failed to update banknote",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mt-4">
          <DialogTitle>Edit Unlisted Banknote</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section: Public Details */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-7">
                    <h3 className="text-lg font-medium">Public Details</h3>
                    <span className="text-sm text-muted-foreground">Visible to everyone</span>
                  </div>

                  {/* Condition/Grading Toggle Row */}
                  <div className="flex items-center justify-between mb-4">
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

                  {/* Condition/Grading Fields */}
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

                  {/* Face Value, Currency, Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-7">
                    <FormField
                      control={form.control}
                      name="faceValueInt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Face Value (Number)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Enter value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="faceValueCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingCurrencies ? "Loading..." : "Select currency"} />
                              </SelectTrigger>
                              <SelectContent>
                                {currencies.map((currency) => (
                                  <SelectItem value={currency.id} key={currency.id}>
                                    {currency.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Name and Condition */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input maxLength={30} {...field} />
                          </FormControl>
                          <FormDescription>
                            For example: Check
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Category and Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-7">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem value={cat.id} key={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Default to Unlisted Banknotes.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="typeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingTypes ? "Loading..." : "Select type"} />
                              </SelectTrigger>
                              <SelectContent>
                                {types.map((type) => (
                                  <SelectItem value={type.id} key={type.id}>{type.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Extra Fields */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-4 w-4" />
                      Extra Fields
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="gregorian_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gregorian Year</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="islamic_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Islamic Year</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="sultan_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sultan Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="printer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Printer</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="rarity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rarity</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>

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

                {/* Custom Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="front_image_file"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Front Image</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4">
                              <div
                                onClick={() => obverseImagePreview && openImageViewer(obverseImagePreview)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
                              >
                                {obverseImagePreview ? (
                                  <img src={obverseImagePreview} alt="Front preview" className="w-full h-full object-contain" />
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
                                      onClick={() => obverseInputRef.current?.click()}
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
                                    onClick={() => obverseInputRef.current?.click()}
                                  >
                                    Upload Image
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reverse_image_file"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Back Image</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4">
                              <div
                                onClick={() => reverseImagePreview && openImageViewer(reverseImagePreview)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
                              >
                                {reverseImagePreview ? (
                                  <img src={reverseImagePreview} alt="Back preview" className="w-full h-full object-contain" />
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
                                      onClick={() => reverseInputRef.current?.click()}
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
                                    onClick={() => reverseInputRef.current?.click()}
                                  >
                                    Upload Image
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Private Section */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">Private Details</h3>
                  <span className="text-sm text-muted-foreground">Only visible to you</span>
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

                {/* Purchase Date */}
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
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
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

                {/* For Sale Toggle */}
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

                {/* Sale Price */}
                {form.watch("isForSale") && (
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field: { onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Sale Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
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

                {/* Save/Cancel Buttons */}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Banknote'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>

      {/* Add Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-[800px] p-1">
            <img
              src={selectedImage}
              alt="Banknote detail"
              className="w-full h-auto rounded"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add the ImageCropDialog */}
      {cropDialogOpen && selectedImageToCrop && (
        <ImageCropDialog
          imageUrl={selectedImageToCrop.url}
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setSelectedImageToCrop(null);
          }}
          onSave={handleCroppedImage}
          title={`Edit ${selectedImageToCrop.type === 'obverse' ? 'Front' : 'Back'} Image`}
        />
      )}
    </Dialog>
  );
} 