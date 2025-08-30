import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import { BookmarkPlus, CalendarIcon, Upload, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createUnlistedBanknoteWithCollectionItem, uploadCollectionImage, createMarketplaceItem, processAndUploadImage, updateCollectionItemImages } from "@/services/collectionService";
import { addToMarketplace } from '@/services/marketplaceService';
import { useCountryCurrencies } from "@/hooks/useCountryCurrencies";
import { useCountryCategoryDefs } from "@/hooks/useCountryCategoryDefs";
import { useCountryTypeDefs } from "@/hooks/useCountryTypeDefs";
import { format } from "date-fns";
import SimpleImageUpload from './SimpleImageUpload';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { getGradeDescription } from '@/utils/grading';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { useAuth } from "@/context/AuthContext";
import MultipleImageUpload from '@/components/admin/MultipleImageUpload';
import { uploadStampImage } from '@/services/stampsService';
import { ImageFile } from '@/types/stamps';
import { useTranslation } from 'react-i18next';

interface AddUnlistedBanknoteDialogProps {
  countryName: string;
  onCreated?: () => void;
}

// Form schema
const createFormSchema = (t: any) => z.object({
  // CollectionItem fields
  useGrading: z.boolean().default(false),
  condition: z.enum(['UNC', 'AU', 'XF/AU', 'XF', 'VF/XF', 'VF', 'F/VF', 'F', 'VG/F', 'VG', 'G', 'FR'] as const).nullable(),
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

  // Our new required fields
  // These are saved to unlisted_banknotes
  faceValueInt: z.union([z.coerce.number(), z.string().regex(/^\d+$/)]),
  faceValueCurrency: z.string(),
  name: z.string().max(30),
  categoryId: z.string(),
  typeId: z.string(),
  // These are in extra fields dropdown
  gregorian_year: z.string().optional(),
  islamic_year: z.string().optional(),
  sultan_name: z.string().optional(),
  printer: z.string().optional(),
  rarity: z.string().optional(),

  // images stored only in collection_items
  front_image_file: z.any().optional(),
  reverse_image_file: z.any().optional(),
  
  // Add dimensions field
  dimensions: z.string().optional(),
  
  // Single image fields
  tughra_picture: z.string().optional(),
  watermark_picture: z.string().optional(),
  
  // Multiple image fields
  other_element_files: z.array(z.custom<ImageFile>()).optional(),
  seal_files: z.array(z.custom<ImageFile>()).optional(),
  signature_files: z.array(z.custom<ImageFile>()).optional(),
  signatures_front_files: z.array(z.custom<ImageFile>()).optional(),
  signatures_back_files: z.array(z.custom<ImageFile>()).optional(),
}).refine((data) => {
  // If isForSale is true, salePrice must be provided and greater than 0
  if (data.isForSale) {
    return data.salePrice && data.salePrice > 0;
  }
  return true;
}, {
  message: t('salePriceRequired'),
  path: ["salePrice"]
});

const AddUnlistedBanknoteDialog: React.FC<AddUnlistedBanknoteDialogProps> = ({
  countryName, onCreated
}) => {
    const { t, i18n } = useTranslation(['collection']);

    // Don't render until i18n is initialized
    if (!i18n.isInitialized) {
      return null;
    }

    // Create form schema with translations
    const formSchema = createFormSchema(t);
  
  // Fallback function for translations
  const tWithFallback = (key: string, fallback: string) => {
    if (!i18n.isInitialized) {
      return fallback;
    }
    const translation = t(key);
    return translation === key ? fallback : translation;
  };
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  // Early return if no user
  if (!user) {
    return null;
  }

  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<{
    url: string;
    type: 'obverse' | 'reverse' | 'tughra' | 'watermark';
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const obverseInputRef = useRef<HTMLInputElement>(null);
  const reverseInputRef = useRef<HTMLInputElement>(null);
  
  // State for additional image uploads
  const [tughraImageUrl, setTughraImageUrl] = useState<string>('');
  const [watermarkImageUrl, setWatermarkImageUrl] = useState<string>('');

  const { currencies, loading: loadingCurrencies } = useCountryCurrencies(countryName);
  const { categories, loading: loadingCategories } = useCountryCategoryDefs(countryName);
  const { types, loading: loadingTypes } = useCountryTypeDefs(countryName);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useGrading: false,
      isForSale: false,
      purchasePrice: '',
      salePrice: '',
      location: 'In my collection',
      dimensions: '',
      tughra_picture: '',
      watermark_picture: '',
      other_element_files: [],
      seal_files: [],
      signature_files: [],
      signatures_front_files: [],
      signatures_back_files: []
    }
  });

  // Handle image changes (front and back)
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

  // Update the handleCropClick function to handle all image types
  const handleCropClick = (imageUrl: string, type: 'obverse' | 'reverse' | 'tughra' | 'watermark') => {
    if (imageUrl) {
      setSelectedImageToCrop({ url: imageUrl, type });
      setCropDialogOpen(true);
    }
  };

  // Update the handleCroppedImage function to handle all image types
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
      } else if (selectedImageToCrop?.type === 'reverse') {
        setReverseImageFile(file);
        setReverseImagePreview(URL.createObjectURL(file));
        form.setValue("reverse_image_file", file);
      } else if (selectedImageToCrop?.type === 'tughra') {
        const url = await uploadStampImage(file);
        setTughraImageUrl(url);
        form.setValue('tughra_picture', url);
      } else if (selectedImageToCrop?.type === 'watermark') {
        const url = await uploadStampImage(file);
        setWatermarkImageUrl(url);
        form.setValue('watermark_picture', url);
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

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Handle submit
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add a banknote",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images if provided
      let obverseProcessedImages = null;
      let reverseProcessedImages = null;

      if (obverseImageFile) {
        obverseProcessedImages = await processAndUploadImage(obverseImageFile, 'collection-items', user.id);
      }
      if (reverseImageFile) {
        reverseProcessedImages = await processAndUploadImage(reverseImageFile, 'collection-items', user.id);
      }

      // Upload additional image arrays
      const otherElementUrls = [];
      for (const img of values.other_element_files || []) {
        const url = await uploadStampImage(img.file);
        otherElementUrls.push(url);
      }

      const sealUrls = [];
      for (const img of values.seal_files || []) {
        const url = await uploadStampImage(img.file);
        sealUrls.push(url);
      }

      const signatureUrls = [];
      for (const img of values.signature_files || []) {
        const url = await uploadStampImage(img.file);
        signatureUrls.push(url);
      }

      const signaturesFrontUrls = [];
      for (const img of values.signatures_front_files || []) {
        const url = await uploadStampImage(img.file);
        signaturesFrontUrls.push(url);
      }

      const signaturesBackUrls = [];
      for (const img of values.signatures_back_files || []) {
        const url = await uploadStampImage(img.file);
        signaturesBackUrls.push(url);
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


      
      const result = await createUnlistedBanknoteWithCollectionItem({
        userId: user.id,
        country: countryName,
        extended_pick_number: "",
        pick_number: "",
        turk_catalog_number: "",
        face_value: face_value,
        gregorian_year: values.gregorian_year || undefined,
        islamic_year: values.islamic_year || undefined,
        sultan_name: values.sultan_name || undefined,
        printer: values.printer || undefined,
        type: types.find(t => t.id === values.typeId)?.name || undefined,
        category: categories.find(c => c.id === values.categoryId)?.name || undefined,
        rarity: values.rarity || undefined,
        name: values.name,
        condition,
        grade_by,
        grade,
        grade_condition_description,
        public_note: values.publicNote || undefined,
        private_note: values.privateNote || undefined,
        location: values.location || undefined,
        purchase_price: values.purchasePrice === '' ? undefined : Number(values.purchasePrice),
        purchase_date: values.purchaseDate ? format(values.purchaseDate, 'yyyy-MM-dd') : undefined,
        is_for_sale: values.isForSale,
        sale_price: values.salePrice === '' ? undefined : Number(values.salePrice),
        obverse_image: obverseProcessedImages?.original || undefined,
        reverse_image: reverseProcessedImages?.original || undefined,
        dimensions: values.dimensions || undefined,
        tughra_picture: (values.tughra_picture || tughraImageUrl) || undefined,
        watermark_picture: (values.watermark_picture || watermarkImageUrl) || undefined,
        other_element_pictures: otherElementUrls.length > 0 ? otherElementUrls : undefined,
        seal_pictures: sealUrls.length > 0 ? sealUrls : undefined,
        signature_pictures: signatureUrls.length > 0 ? signatureUrls : undefined,
        signatures_front: signaturesFrontUrls.length > 0 ? signaturesFrontUrls : undefined,
        signatures_back: signaturesBackUrls.length > 0 ? signaturesBackUrls : undefined
      });

      if (result) {
        // Update the collection item with watermarked and thumbnail images
        if (obverseProcessedImages || reverseProcessedImages) {
          await updateCollectionItemImages(
            result.id,
            obverseProcessedImages,
            reverseProcessedImages
          );
        }

        // If item is marked for sale, add to marketplace
        if (values.isForSale) {
          await addToMarketplace(result.id, user.id);
        }

        // Check if item was just added to marketplace for sale
        const wasJustAddedToMarketplace = values.isForSale;
        
        toast({
          title: wasJustAddedToMarketplace 
            ? t('itemAddedToMarketplaceSuccess', 'Item added to marketplace successfully!')
            : "Success",
          description: wasJustAddedToMarketplace
            ? t('itemAddedToMarketplaceDescription', 'Your item is now available for sale in the marketplace.')
            : "Banknote added successfully",
        });

        if (onCreated) onCreated();
        form.reset();
        setObverseImageFile(null);
        setReverseImageFile(null);
        setObverseImagePreview(null);
        setReverseImagePreview(null);
        setOpen(false);
      } else {
        throw new Error("Failed to add banknote");
      }
    } catch (error) {
      console.error('Error adding banknote:', error);
      toast({
        title: "Error",
        description: "Failed to add banknote",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image upload handlers for new fields
  const handleTughraImageUploaded = async (file: File) => {
    try {
      const url = await uploadStampImage(file);
      setTughraImageUrl(url);
      form.setValue('tughra_picture', url);
    } catch (error) {
      console.error('Error uploading tughra image:', error);
      toast({
        title: "Error",
        description: "Failed to upload tughra image",
        variant: "destructive",
      });
    }
  };

  const handleWatermarkImageUploaded = async (file: File) => {
    try {
      const url = await uploadStampImage(file);
      setWatermarkImageUrl(url);
      form.setValue('watermark_picture', url);
    } catch (error) {
      console.error('Error uploading watermark image:', error);
      toast({
        title: "Error",
        description: "Failed to upload watermark image",
        variant: "destructive",
      });
    }
  };

  const handleOtherElementImagesChange = (images: ImageFile[]) => {
    form.setValue('other_element_files', images);
  };

  const handleSealImagesChange = (images: ImageFile[]) => {
    form.setValue('seal_files', images);
  };

  const handleSignatureImagesChange = (images: ImageFile[]) => {
    form.setValue('signature_files', images);
  };

  const handleSignaturesFrontImagesChange = (images: ImageFile[]) => {
    form.setValue('signatures_front_files', images);
  };

  const handleSignaturesBackImagesChange = (images: ImageFile[]) => {
    form.setValue('signatures_back_files', images);
  };

  // Don't render until i18n is initialized
  if (!i18n.isInitialized) {
    console.log('i18n not initialized, showing loading...');
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div>Loading translations...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* <Button variant="ghost" title="Add a new unlisted banknote"> */}
        <Button
                    variant="outline"
                    size="icon"
                    title="Create a new Unlisted Banknote"
                  >
          <BookmarkPlus style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mt-4">
                      <DialogTitle><span>{tWithFallback('addUnlistedBanknote', 'Add Unlisted Banknote')}</span></DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section: Public Details */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-7">
                    <h3 className="text-lg font-medium"><span>{t('publicDetails')}</span></h3>
                    <span className="text-sm text-muted-foreground">{t('visibleToEveryone')}</span>
                  </div>
                  {/* Condition/Grading Toggle Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FormLabel>{t('condition')}</FormLabel>
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
                      <FormLabel>{t('grading')}</FormLabel>
                    </div>
                  </div>
                  {/* Condition/Grading Fields */}
                  {!form.watch("useGrading") ? (
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('condition')}</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectCondition')} />
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
                            {t('selectConditionDescription')}
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
                              <FormLabel>{t('gradingBy')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  maxLength={8}
                                  placeholder={t('gradingByPlaceholder')}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('gradingByDescription')}
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
                              <FormLabel>{t('grade')}</FormLabel>
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
                                {t('gradeDescription')}
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
                              <FormLabel>{t('gradeLetters')}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  maxLength={3}
                                  placeholder={t('gradeLettersPlaceholder')}
                                />
                              </FormControl>
                              <FormDescription>
                                {t('gradeLettersDescription')}
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
                          <FormLabel>{t('faceValueNumber')}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder={t('faceValuePlaceholder')} />
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
                          <FormLabel>{t('currency')}</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingCurrencies ? t('loading') : t('selectCurrency')} />
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
                                      <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('name')}</FormLabel>
                          <FormControl>
                            <Input maxLength={30} {...field} />
                          </FormControl>
                          <FormDescription>
                            {t('nameDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {/* Category and Type Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-7">
                                      <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('category')}</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingCategories ? t('loading') : t('selectCategory')} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem value={cat.id} key={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            {t('categoryDescription')}
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
                          <FormLabel>{t('type')}</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={loadingTypes ? t('loading') : t('selectType')} />
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

                {/* Custom Images Section */}
                <Collapsible>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-muted bg-background px-4 py-3 text-sm font-medium transition-all hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span>Images</span>
                      <span className="text-xs text-muted-foreground">(Front, Back, Details, Stamps)</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 pb-6">
                    {/* Main Banknote Images */}
                    <div className="space-y-6">
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Obverse */}
                          <div>
                            <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
                            <div className="mt-2 flex items-center gap-4">
                              <div
                                onClick={() => obverseImagePreview && openImageViewer(obverseImagePreview)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                              >
                                {obverseImagePreview ? (
                                  <img src={obverseImagePreview} alt="Obverse preview" className="w-full h-full object-contain" />
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
                                {obverseImagePreview ? (
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
                                ) : (
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
                          {/* Reverse */}
                          <div>
                            <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
                            <div className="mt-2 flex items-center gap-4">
                              <div
                                onClick={() => reverseImagePreview && openImageViewer(reverseImagePreview)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                              >
                                {reverseImagePreview ? (
                                  <img src={reverseImagePreview} alt="Reverse preview" className="w-full h-full object-contain" />
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
                                {reverseImagePreview ? (
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
                                ) : (
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
                        </div>
                      </div>

                      {/* Special Features */}
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Tughra */}
                          <div>
                            <Label htmlFor="tughraImage">Tughra Image</Label>
                            <div className="mt-2 flex items-center gap-4">
                              <div
                                onClick={() => tughraImageUrl && openImageViewer(tughraImageUrl)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                              >
                                {tughraImageUrl ? (
                                  <img src={tughraImageUrl} alt="Tughra preview" className="w-full h-full object-contain" />
                                ) : (
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <input
                                  id="tughraImage"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleTughraImageUploaded(file);
                                  }}
                                  className="hidden"
                                />
                                {tughraImageUrl ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCropClick(tughraImageUrl, 'tughra')}
                                    >
                                      Edit Image
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById('tughraImage')?.click()}
                                    >
                                      Change Image
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('tughraImage')?.click()}
                                  >
                                    Upload Image
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Watermark */}
                          <div>
                            <Label htmlFor="watermarkImage">Watermark Image</Label>
                            <div className="mt-2 flex items-center gap-4">
                              <div
                                onClick={() => watermarkImageUrl && openImageViewer(watermarkImageUrl)}
                                className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                              >
                                {watermarkImageUrl ? (
                                  <img src={watermarkImageUrl} alt="Watermark preview" className="w-full h-full object-contain" />
                                ) : (
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <input
                                  id="watermarkImage"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleWatermarkImageUploaded(file);
                                  }}
                                  className="hidden"
                                />
                                {watermarkImageUrl ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCropClick(watermarkImageUrl, 'watermark')}
                                    >
                                      Edit Image
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById('watermarkImage')?.click()}
                                    >
                                      Change Image
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('watermarkImage')?.click()}
                                  >
                                    Upload Image
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Multiple Image Sections */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                          <div className=" p-4 border rounded-lg bg-muted/5">
                            <MultipleImageUpload
                              images={form.watch('signatures_front_files') || []}
                              onImagesChange={handleSignaturesFrontImagesChange}
                              label="Front Signatures"
                              maxImages={10}
                            />
                          </div>
                          <div className=" p-4 border rounded-lg bg-muted/5">
                            <MultipleImageUpload
                              images={form.watch('signatures_back_files') || []}
                              onImagesChange={handleSignaturesBackImagesChange}
                              label="Back Signatures"
                              maxImages={10}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                          <div className=" p-4 border rounded-lg bg-muted/5">
                            <MultipleImageUpload
                              images={form.watch('seal_files') || []}
                              onImagesChange={handleSealImagesChange}
                              label="Seals"
                              maxImages={10}
                            />
                          </div>
                          <div className=" p-4 border rounded-lg bg-muted/5">
                            <MultipleImageUpload
                              images={form.watch('signature_files') || []}
                              onImagesChange={handleSignatureImagesChange}
                              label="Other Signatures"
                              maxImages={10}
                            />
                          </div>
                        </div>

                        <div className=" p-4 border rounded-lg bg-muted/5">
                          <MultipleImageUpload
                            images={form.watch('other_element_files') || []}
                            onImagesChange={handleOtherElementImagesChange}
                            label="Other Images"
                            maxImages={10}
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Extra Fields Section */}
                <Collapsible>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-muted bg-background px-4 py-3 text-sm font-medium transition-all hover:bg-muted/50">
                                          <span>{t('extraFields')}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <FormField
                        control={form.control}
                        name="gregorian_year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gregorian Year</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 1923" />
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
                              <Input {...field} placeholder="e.g., 1342" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sultan_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sultan Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Sultan." />
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
                              <Input {...field} placeholder="Printer" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rarity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rarity</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rarity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. 156 x 67 mm" />
                            </FormControl>
                            <FormDescription>
                              Enter the banknote dimensions in millimeters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="py-6">
                  <div className="w-full h-px bg-muted" />
                </div>

                {/* Private Section */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium"><span>{tWithFallback('privateDetails', 'Private Details')}</span></h3>
                  <span className="text-sm text-muted-foreground">{tWithFallback('onlyVisibleToYou', 'Only visible to you')}</span>
                </div>

                {/* Private Note */}
                <FormField
                  control={form.control}
                  name="privateNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tWithFallback('privateNote', 'Private Note')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={tWithFallback('addPrivateNoteForYourReference', 'Add a private note for your reference')}
                        />
                      </FormControl>
                      <FormDescription>
                        {tWithFallback('thisNoteWillOnlyBeVisibleToYou', 'This note will only be visible to you.')}
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
                      <FormLabel>{tWithFallback('purchaseDate', 'Purchase Date')}</FormLabel>
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
                                <span>{tWithFallback('pickADate', 'Pick a date')}</span>
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
                        {tWithFallback('whenDidYouAcquireThisBanknote', 'When did you acquire this banknote?')}
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
                      <FormLabel>{tWithFallback('purchasePrice', 'Purchase Price')}</FormLabel>
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
                        {tWithFallback('howMuchDidYouPayForThisBanknote', 'How much did you pay for this banknote?')}
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
                      <FormLabel>{tWithFallback('itemStatus', 'Item Status')}</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Select
                            onValueChange={(value) => {
                              if (value !== 'Other') {
                                field.onChange(value);
                              } else {
                                field.onChange('');
                              }
                            }}
                            value={field.value === '' || ![
                              'In my collection',
                              'At Grading',
                              'At the Auction house',
                              'In Transit',
                              'To be collected',
                              'Other'
                            ].includes(field.value) ? 'Other' : field.value || 'In my collection'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={tWithFallback('selectStatus', 'Select status')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="In my collection">{tWithFallback('inMyCollection', 'In my collection')}</SelectItem>
                              <SelectItem value="At Grading">{tWithFallback('atGrading', 'At Grading')}</SelectItem>
                              <SelectItem value="At the Auction house">{tWithFallback('atTheAuctionHouse', 'At the Auction house')}</SelectItem>
                              <SelectItem value="In Transit">{tWithFallback('inTransit', 'In Transit')}</SelectItem>
                              <SelectItem value="To be collected">{tWithFallback('toBeCollected', 'To be collected')}</SelectItem>
                              <SelectItem value="Other">{tWithFallback('other', 'Other')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {(field.value === '' || ![
                            'In my collection',
                            'At Grading',
                            'At the Auction house',
                            'In Transit',
                            'To be collected',
                            'Other'
                          ].includes(field.value)) && (
                            <Input
                              {...field}
                              placeholder={tWithFallback('enterCustomStatus', 'Enter custom status')}
                              className="mt-2"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {tWithFallback('forExampleInMyCollectionAtGrading', 'For example: In my collection, At grading')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="py-6">
                  <div className="w-full h-px bg-muted" />
                </div>

                {/* For Sale Toggle */}
                <FormField
                  control={form.control}
                  name="isForSale"
                  render={({ field }) => (
                    <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${i18n.dir() === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`space-y-0.5 ${i18n.dir() === 'rtl' ? 'text-right' : ''}`}>
                        <FormLabel className="text-base">{tWithFallback('forSale', 'For Sale')}</FormLabel>
                        <FormDescription>
                          {isLimitedRank 
                            ? tWithFallback('yourRankIsNotSufficientToListItems', 'Your rank is not sufficient to list items for sale. Upgrade your rank to unlock this feature.')
                            : tWithFallback('makeThisBanknoteAvailableForSale', 'Make this banknote available for sale in the marketplace')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLimitedRank}
                          aria-readonly={isLimitedRank}
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
                        <FormLabel>{tWithFallback('salePrice', 'Sale Price')}</FormLabel>
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

                {/* Save/Cancel Buttons */}
                <DialogFooter className="pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset(); }} disabled={isSubmitting}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                                                      <>{t('item.saving')}</>
                    ) : (
                                              t('item.addBanknote')
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-1">
            <img
              src={selectedImage}
              alt="Banknote detail"
              className="w-full h-auto rounded"
            />
      </DialogContent>
        </Dialog>
      )}
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
};

export { AddUnlistedBanknoteDialog };
