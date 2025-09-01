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
import { updateUnlistedBanknoteWithCollectionItem, uploadCollectionImage, createMarketplaceItem, processAndUploadImage, updateCollectionItemImages } from '@/services/collectionService';
import { addToMarketplace, removeFromMarketplace } from '@/services/marketplaceService';
import { collectionItemTranslationService } from '@/services/collectionItemTranslationService';
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
import { useAuth } from '@/context/AuthContext';
import MultipleImageUpload from '@/components/admin/MultipleImageUpload';
import { uploadStampImage } from '@/services/stampsService';
import { ImageFile } from '@/types/stamps';
import SimpleImageUpload from './SimpleImageUpload';
import { useTranslation } from 'react-i18next';

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
  type: z.string().optional(),
  prefix: z.string().optional(),

  // images
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
  prefix?: string;
}

export default function EditUnlistedBanknoteDialog({
  isOpen,
  onClose,
  onUpdate,
  collectionItem
}: EditUnlistedBanknoteDialogProps) {
  const { t, i18n } = useTranslation(['collection']);

  // Don't render until i18n is initialized
  if (!i18n.isInitialized) {
    console.log('i18n not initialized, showing loading...');
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div>Loading translations...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // Create form schema with translations
  const formSchema = createFormSchema(t);

  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(collectionItem.obverseImage || null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(collectionItem.reverseImage || null);
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

  const { currencies, loading: loadingCurrencies } = useCountryCurrencies(collectionItem.banknote?.country || '');
  const { categories, loading: loadingCategories } = useCountryCategoryDefs(collectionItem.banknote?.country || '');
  const { types, loading: loadingTypes } = useCountryTypeDefs(collectionItem.banknote?.country || '');

  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useGrading: !!collectionItem.grade,
      faceValueInt: collectionItem.banknote?.denomination?.split(' ')[0] || '',
      faceValueCurrency: currencies.find(c => c.name === collectionItem.banknote?.denomination?.split(' ')[1])?.id || '',
      name: (collectionItem.banknote as any)?.name || '',
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
      location: collectionItem.location || 'In my collection',
      isForSale: collectionItem.isForSale || false,
      salePrice: collectionItem.salePrice || '',
      type: (collectionItem as any).type || '',
      prefix: (collectionItem as any).prefix || '',
      other_element_files: [],
      seal_files: [],
      signature_files: [],
      signatures_front_files: [],
      signatures_back_files: [],
      dimensions: collectionItem.banknote?.dimensions || '',
      tughra_picture: collectionItem.banknote?.tughraUrl || '',
      watermark_picture: collectionItem.banknote?.watermarkUrl || '',
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
        title: t('error'),
        description: t('failedToSaveCroppedImage'),
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

  // Image upload handlers for new fields
  const handleTughraImageUploaded = async (file: File) => {
    try {
      const url = await uploadStampImage(file);
      setTughraImageUrl(url);
      form.setValue('tughra_picture', url);
    } catch (error) {
      console.error('Error uploading tughra image:', error);
      toast({
        title: t('error'),
        description: t('failedToUploadTughraImage'),
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
        title: t('error'),
        description: t('failedToUploadWatermarkImage'),
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) {
      toast({
        title: t('authenticationError'),
        description: t('mustBeLoggedIn'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images if changed
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

      const updatedItem = await updateUnlistedBanknoteWithCollectionItem(collectionItem.id, {
        userId: user.id,
        country: collectionItem.banknote?.country || '',
        extended_pick_number: collectionItem.banknote?.extendedPickNumber || '',
        face_value: face_value,
        gregorian_year: values.gregorian_year,
        islamic_year: values.islamic_year,
        sultan_name: values.sultan_name,
        printer: values.printer,
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
        obverse_image: obverseProcessedImages?.original,
        reverse_image: reverseProcessedImages?.original,
        type: values.type,
        prefix: values.prefix,
        tughra_picture: values.tughra_picture || tughraImageUrl,
        watermark_picture: values.watermark_picture || watermarkImageUrl,
        other_element_pictures: otherElementUrls,
        seal_pictures: sealUrls,
        signature_pictures: signatureUrls,
        signatures_front: signaturesFrontUrls,
        signatures_back: signaturesBackUrls,
        dimensions: values.dimensions
      } as UnlistedBanknoteUpdateParams);

             // Handle translation for changed fields
       const normalizeVal = (v: unknown) => (v ?? '').toString().trim();

       const oldItemData = {
         public_note: collectionItem.publicNote,
         location: collectionItem.location,
         type: (collectionItem as any).type,
         name: (collectionItem.banknote as any)?.name
       };
       const newItemData = {
         public_note: values.publicNote,
         location: values.location,
         type: values.type,
         name: values.name
       };

       console.log('🔍 [EditUnlistedBanknoteDialog] Translation debugging:');
       console.log('🔍 Old item data:', oldItemData);
       console.log('🔍 New item data:', newItemData);

       // Detect changed fields for collection item translation
       const collectionItemChangedFields = {
         public_note: normalizeVal(oldItemData.public_note) !== normalizeVal(newItemData.public_note),
         location: normalizeVal(oldItemData.location) !== normalizeVal(newItemData.location),
         type: normalizeVal(oldItemData.type) !== normalizeVal(newItemData.type)
       };

       console.log('🔍 Collection item changed fields:', collectionItemChangedFields);

       // Handle collection item translation only for changed fields
       if (collectionItemChangedFields.public_note || collectionItemChangedFields.location || collectionItemChangedFields.type) {
         console.log('🔍 [EditUnlistedBanknoteDialog] Calling collection item translation service');
         const oldCollectionData: Record<string, string | null | undefined> = {};
         const newCollectionData: Record<string, string | null | undefined> = {};
         
         ['public_note', 'location', 'type'].forEach(field => {
           if (collectionItemChangedFields[field as keyof typeof collectionItemChangedFields]) {
             oldCollectionData[field] = oldItemData[field as keyof typeof oldItemData];
             newCollectionData[field] = newItemData[field as keyof typeof newItemData];
           }
         });

         console.log('🔍 Old collection data for translation:', oldCollectionData);
         console.log('🔍 New collection data for translation:', newCollectionData);

         await collectionItemTranslationService.handleCollectionItemUpdate(
           collectionItem.id,
           oldCollectionData,
           newCollectionData
         );
       } else {
         console.log('🔍 [EditUnlistedBanknoteDialog] No collection item fields changed, skipping translation');
       }

       // Handle unlisted banknote translation if name changed
       const nameChanged = normalizeVal(oldItemData.name) !== normalizeVal(newItemData.name);
       console.log('🔍 Name changed for unlisted banknote:', nameChanged);
       
       if (nameChanged) {
         console.log('🔍 [EditUnlistedBanknoteDialog] Calling unlisted banknote translation service');
         await collectionItemTranslationService.translateUnlistedBanknote(
           collectionItem.banknote?.id || '',
           { name: values.name },
           ['name']
         );
       } else {
         console.log('🔍 [EditUnlistedBanknoteDialog] Name not changed, skipping unlisted banknote translation');
       }

      // Update the collection item with watermarked and thumbnail images using the collection service
      if (obverseProcessedImages || reverseProcessedImages) {
        await updateCollectionItemImages(
          collectionItem.id,
          obverseProcessedImages,
          reverseProcessedImages
        );
      }

      // Handle marketplace listing
      if (values.isForSale && !collectionItem.isForSale) {
        // Item was just marked for sale - add to marketplace
        await addToMarketplace(collectionItem.id, user.id);
      } else if (!values.isForSale && collectionItem.isForSale) {
        // Item was removed from sale - remove from marketplace
        await removeFromMarketplace(collectionItem.id);
      }

      // If item is marked for sale, create marketplace item
      if (values.isForSale) {
        await createMarketplaceItem({
          collectionItemId: collectionItem.id,
          sellerId: user.id,
          banknoteId: collectionItem.banknote?.id || ''
        });
      }

      // Check if item was just added to marketplace for sale
      const wasJustAddedToMarketplace = values.isForSale && !collectionItem.isForSale;
      
      toast({
        title: wasJustAddedToMarketplace 
          ? t('item.itemAddedToMarketplaceSuccess', 'Item added to marketplace successfully!')
          : t('success'),
        description: wasJustAddedToMarketplace
          ? t('item.itemAddedToMarketplaceDescription', 'Your item is now available for sale in the marketplace.')
          : t('banknoteUpdatedSuccess'),
      });

      await onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating banknote:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateBanknote'),
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
          <DialogTitle> <span> {t('editUnlistedBanknote')} </span> </DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section: Public Details */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-7">
                    <h3 className="text-lg font-medium"> <span> {t('publicDetails')} </span> </h3>
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
                                <SelectItem value="XF/AU">XF/AU - Very Fine/About UNC</SelectItem>
                                <SelectItem value="XF">XF - Extremely Fine</SelectItem>
                                <SelectItem value="VF/XF">VF/XF - Very Fine/Extra Fine</SelectItem>
                                <SelectItem value="VF">VF - Very Fine</SelectItem>
                                <SelectItem value="F/VF">F/VF - Fine/Very Fine</SelectItem>
                                <SelectItem value="F">F - Fine</SelectItem>
                                <SelectItem value="VG/F">VG/F - Very Good/Fine</SelectItem>
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

                    {/* Name and Condition */}
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

                  {/* Category and Type */}
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
                    <FormField
                      control={form.control}
                      name="prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('prefix')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('prefixPlaceholder')} />
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
                      {t('extraFields')}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="gregorian_year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('gregorianYear')}</FormLabel>
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
                              <FormLabel>{t('islamicYear')}</FormLabel>
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
                              <FormLabel>{t('sultanName')}</FormLabel>
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
                              <FormLabel>{t('printer')}</FormLabel>
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
                            <FormLabel>{t('rarity')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                            <FormLabel>{t('dimensions')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t('dimensionsPlaceholder')} />
                            </FormControl>
                            <FormDescription>
                              {t('dimensionsDescription')}
                            </FormDescription>
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
                      <FormLabel>{t('publicNote')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('publicNotePlaceholder')}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('publicNoteDescription')}
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
                        <FormLabel>{t('frontImage')}</FormLabel>
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
                                      {t('editImage')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => obverseInputRef.current?.click()}
                                    >
                                      {t('changeImage')}
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
                                    {t('uploadImage')}
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
                        <FormLabel>{t('backImage')}</FormLabel>
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
                                      {t('editImage')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reverseInputRef.current?.click()}
                                    >
                                      {t('changeImage')}
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
                                    {t('uploadImage')}
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

                {/* Section: Additional Images */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-7">
                    <h3 className="text-lg font-medium"> <span> {t('additionalImages')} </span> </h3>
                    <span className="text-sm text-muted-foreground">{t('stampAndDetailImages')}</span>
                  </div>

                  {/* Special Features */}
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Tughra */}
                      <div>
                        <Label htmlFor="tughraImage">{t('tughraImage')}</Label>
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
                                  {t('editImage')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('tughraImage')?.click()}
                                >
                                  {t('changeImage')}
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('tughraImage')?.click()}
                              >
                                {t('uploadImage')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Watermark */}
                      <div>
                        <Label htmlFor="watermarkImage">{t('watermarkImage')}</Label>
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
                                  {t('editImage')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('watermarkImage')?.click()}
                                >
                                  {t('changeImage')}
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('watermarkImage')?.click()}
                              >
                                {t('uploadImage')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multiple Image Sections */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                      <div className=" p-4 border rounded-lg bg-muted/5">
                        <MultipleImageUpload
                          images={form.watch('signatures_front_files') || []}
                          onImagesChange={handleSignaturesFrontImagesChange}
                          label={t('frontSignatures')}
                          maxImages={10}
                        />
                      </div>
                      <div className=" p-4 border rounded-lg bg-muted/5">
                        <MultipleImageUpload
                          images={form.watch('signatures_back_files') || []}
                          onImagesChange={handleSignaturesBackImagesChange}
                          label={t('backSignatures')}
                          maxImages={10}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                      <div className=" p-4 border rounded-lg bg-muted/5">
                        <MultipleImageUpload
                          images={form.watch('seal_files') || []}
                          onImagesChange={handleSealImagesChange}
                          label={t('seals')}
                          maxImages={10}
                        />
                      </div>
                      <div className=" p-4 border rounded-lg bg-muted/5">
                        <MultipleImageUpload
                          images={form.watch('signature_files') || []}
                          onImagesChange={handleSignatureImagesChange}
                          label={t('otherSignatures')}
                          maxImages={10}
                        />
                      </div>
                    </div>

                    <div className=" p-4 border rounded-lg bg-muted/5">
                      <MultipleImageUpload
                        images={form.watch('other_element_files') || []}
                        onImagesChange={handleOtherElementImagesChange}
                        label={t('otherImages')}
                        maxImages={10}
                      />
                    </div>
                  </div>
                </div>

                {/* Private Section */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium"> <span> {t('privateDetails')} </span> </h3>
                  <span className="text-sm text-muted-foreground">{t('onlyVisibleToYou')}</span>
                </div>

                {/* Private Note */}
                <FormField
                  control={form.control}
                  name="privateNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('privateNote')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('privateNotePlaceholder')}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('privateNoteDescription')}
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
                      <FormLabel>{t('purchaseDate')}</FormLabel>
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
                                <span>{t('pickADate')}</span>
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
                        {t('purchaseDateDescription')}
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
                      <FormLabel>{t('purchasePrice')}</FormLabel>
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
                        {t('purchasePriceDescription')}
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
                      <FormLabel>{t('itemStatus')}</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Select
                            onValueChange={(value) => {
                              if (value !== t('other')) {
                                field.onChange(value);
                              } else {
                                field.onChange('');
                              }
                            }}
                            value={field.value === '' || ![
                              t('inMyCollection'),
                              t('atGrading'),
                              t('atTheAuctionHouse'),
                              t('inTransit'),
                              t('toBeCollected'),
                              t('other')
                            ].includes(field.value) ? t('other') : field.value || t('inMyCollection')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={t('inMyCollection')}>{t('inMyCollection')}</SelectItem>
                              <SelectItem value={t('atGrading')}>{t('atGrading')}</SelectItem>
                              <SelectItem value={t('atTheAuctionHouse')}>{t('atTheAuctionHouse')}</SelectItem>
                              <SelectItem value={t('inTransit')}>{t('inTransit')}</SelectItem>
                              <SelectItem value={t('toBeCollected')}>{t('toBeCollected')}</SelectItem>
                              <SelectItem value={t('other')}>{t('other')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {(field.value === '' || ![
                            t('inMyCollection'),
                            t('atGrading'),
                            t('atTheAuctionHouse'),
                            t('inTransit'),
                            t('toBeCollected'),
                            t('other')
                          ].includes(field.value)) && (
                            <Input
                              {...field}
                              placeholder={t('enterCustomStatus')}
                              className="mt-2"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('itemStatusDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* For Sale Switch */}
                <FormField
                  control={form.control}
                  name="isForSale"
                  render={({ field }) => (
                    <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${i18n.dir() === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <div className={`space-y-0.5 ${i18n.dir() === 'rtl' ? 'text-right' : ''}`}>
                        <FormLabel className="text-base">{t('forSale')}</FormLabel>
                        <FormDescription>
                          {isLimitedRank 
                            ? t('rankInsufficient')
                            : t('forSaleDescription')}
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

                {/* Sale Price */}
                {form.watch("isForSale") && (
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field: { onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>{t('salePrice')}</FormLabel>
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
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('updating') : t('updateBanknote')}
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
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-1">
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