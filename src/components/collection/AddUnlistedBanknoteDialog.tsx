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
import { useCountryCurrencies } from "@/hooks/useCountryCurrencies";
import { useCountryCategoryDefs } from "@/hooks/useCountryCategoryDefs";
import { useCountryTypeDefs } from "@/hooks/useCountryTypeDefs";
import { format } from "date-fns";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { getGradeDescription } from '@/utils/grading';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { useAuth } from "@/context/AuthContext";

interface AddUnlistedBanknoteDialogProps {
  userId: string;
  countryName: string;
  onCreated?: () => void;
}

// Form schema
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
});

const AddUnlistedBanknoteDialog: React.FC<AddUnlistedBanknoteDialogProps> = ({
  userId, countryName, onCreated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

  const [obverseImageFile, setObverseImageFile] = useState<File | null>(null);
  const [reverseImageFile, setReverseImageFile] = useState<File | null>(null);
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<{
    url: string;
    type: 'obverse' | 'reverse';
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const obverseInputRef = useRef<HTMLInputElement>(null);
  const reverseInputRef = useRef<HTMLInputElement>(null);

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

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Handle submit
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Upload images if provided
      let obverseProcessedImages = null;
      let reverseProcessedImages = null;

      if (obverseImageFile) {
        obverseProcessedImages = await processAndUploadImage(obverseImageFile, 'collection-items', userId);
      }
      if (reverseImageFile) {
        reverseProcessedImages = await processAndUploadImage(reverseImageFile, 'collection-items', userId);
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
        userId: userId,
        country: countryName,
        extended_pick_number: "",
        pick_number: "",
        turk_catalog_number: "",
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
        obverse_image: obverseProcessedImages?.original,
        reverse_image: reverseProcessedImages?.original,
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

        // If item is marked for sale, create marketplace item
        if (values.isForSale) {
          await createMarketplaceItem({
            collectionItemId: result.id,
            sellerId: userId,
            banknoteId: result.banknoteId
          });
        }

        toast({
          title: "Success",
          description: "Banknote added successfully",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* <Button variant="ghost" title="Add a new unlisted banknote"> */}
        <Button
                    variant="outline"
                    size="icon"
                    aria-label={"Add a new unlisted banknote"}
                  >
          <BookmarkPlus style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mt-4">
          <DialogTitle>Add Unlisted Banknote</DialogTitle>
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
                  {/* Category and Type Row */}
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
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Custom Images</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your own images of the banknote (optional)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Obverse */}
                    <div>
                      <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div
                          onClick={() => obverseImagePreview && openImageViewer(obverseImagePreview)}
                          className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
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
                    {/* Reverse */}
                    <div>
                      <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div
                          onClick={() => reverseImagePreview && openImageViewer(reverseImagePreview)}
                          className="relative w-24 h-24 border rounded flex items-center justify-center overflow-hidden bg-muted cursor-pointer"
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
                  </div>
                </div>

                {/* Extra Fields Dropdown */}
                <div>
                  <Collapsible>
                    <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-muted bg-background px-4 py-3 text-sm font-medium transition-all hover:bg-muted/50">
                      <span>Extra Fields</span>
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
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="py-6">
                  <div className="w-full h-px bg-muted" />
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

                <div className="py-6">
                  <div className="w-full h-px bg-muted" />
                </div>

                {/* For Sale Toggle */}
                <FormField
                  control={form.control}
                  name="isForSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">For Sale</FormLabel>
                        <FormDescription>
                          {isLimitedRank 
                            ? "Your rank is not sufficient to list items for sale. Upgrade your rank to unlock this feature."
                            : "Make this banknote available for sale in the marketplace"}
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

                {/* Save/Cancel Buttons */}
                <DialogFooter className="pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset(); }} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Saving...</>
                    ) : (
                      "Add Banknote"
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
          <DialogContent className="sm:max-w-[800px] p-1">
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
