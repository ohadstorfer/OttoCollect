
import React, { useState, useEffect } from 'react';
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

import { BanknoteCondition, DetailedBanknote, CollectionItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { addToCollection, uploadCollectionImage } from '@/services/collectionService';
import { fetchBanknoteById, searchBanknotes } from '@/services/banknoteService';

// Define props for CollectionItemForm - simplified for adding only
export interface CollectionItemFormProps {
  item?: { banknote: DetailedBanknote } | null;
  collectionItem?: { banknote: DetailedBanknote } | null;
  onUpdate?: (item: CollectionItem) => void;
  onCancel?: () => void;
}

// Create a schema for form validation with coerced number types
const formSchema = z.object({
  banknoteId: z.string().min(1, { message: "Banknote must be selected" }),
  condition: z.enum(['UNC', 'AU', 'XF', 'VF', 'F', 'VG', 'G', 'FR'] as const),
  purchasePrice: z.union([z.coerce.number().optional(), z.literal('')]),
  purchaseDate: z.date().optional(),
  location: z.string().optional(),
  publicNote: z.string().optional(),
  privateNote: z.string().optional(),
  isForSale: z.boolean().default(false),
  salePrice: z.union([z.coerce.number().optional(), z.literal('')])
});

const CollectionItemForm: React.FC<CollectionItemFormProps> = ({
  item,
  collectionItem,
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
  const [obverseImagePreview, setObverseImagePreview] = useState<string | null>(null);
  const [reverseImagePreview, setReverseImagePreview] = useState<string | null>(null);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banknoteId: currentItem?.banknote?.id || '',
      condition: 'UNC' as BanknoteCondition,
      purchasePrice: '',
      purchaseDate: undefined,
      location: '',
      publicNote: '',
      privateNote: '',
      isForSale: false,
      salePrice: ''
    }
  });

  // Set banknoteId when selectedBanknote changes
  useEffect(() => {
    if (selectedBanknote?.id) {
      form.setValue('banknoteId', selectedBanknote.id);
    }
  }, [selectedBanknote, form]);

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

  // Simplified onSubmit function to only handle creating new items
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save collection items."
      });
      return;
    }

    // Make sure we have a valid banknoteId
    if (!values.banknoteId) {
      toast({
        title: "Error",
        description: "No banknote selected."
      });
      return;
    }

    console.log("Starting collection item creation with values:", values);
    setIsSubmitting(true);

    try {
      let obverseImageUrl = null;
      let reverseImageUrl = null;

      // Upload new images if provided
      if (obverseImageFile) {
        console.log("Uploading obverse image...");
        obverseImageUrl = await uploadCollectionImage(obverseImageFile);
      }

      if (reverseImageFile) {
        console.log("Uploading reverse image...");
        reverseImageUrl = await uploadCollectionImage(reverseImageFile);
      }

      // Convert form values to correct types for collection data
      const collectionData = {
        userId: user.id,
        banknoteId: values.banknoteId,
        condition: values.condition as BanknoteCondition,
        purchasePrice: values.purchasePrice === '' ? undefined : Number(values.purchasePrice),
        purchaseDate: values.purchaseDate ? format(values.purchaseDate, 'yyyy-MM-dd') : undefined,
        location: values.location || undefined,
        publicNote: values.publicNote || undefined,
        privateNote: values.privateNote || undefined,
        isForSale: values.isForSale,
        salePrice: values.salePrice === '' ? undefined : Number(values.salePrice),
        obverseImage: obverseImageUrl,
        reverseImage: reverseImageUrl,
      };

      console.log("Adding item to collection with data:", collectionData);
      
      // Add new item to collection
      const savedItem = await addToCollection(collectionData);
      
      if (savedItem) {
        console.log("Item successfully added to collection:", savedItem);
        toast({
          title: "Success",
          description: "Banknote added to your collection."
        });
        
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(savedItem);
        }
      } else {
        throw new Error("Failed to add to collection");
      }

    } catch (error) {
      console.error('Error saving collection item:', error);
      toast({
        title: "Error",
        description: "Failed to add item to collection. Please try again."
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
            Add to your Collection
          </h2>
          <p className="text-muted-foreground">
            Add a banknote to your personal collection.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {/* Banknote selection section - we don't need this unless we're not passing a banknote */}
              {!selectedBanknote && (
                <>
                  <FormField
                    control={form.control}
                    name="banknoteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Banknote</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Search for a banknote..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isSearching ? (
                    <div className="text-center p-4">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                      {searchResults.map((banknote) => (
                        <div 
                          key={banknote.id}
                          className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2 border-b"
                          onClick={() => handleBanknoteSelect(banknote.id)}
                        >
                          {banknote.imageUrls && banknote.imageUrls.length > 0 && (
                            <img 
                              src={banknote.imageUrls[0]} 
                              alt={banknote.denomination} 
                              className="w-10 h-10 object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{banknote.denomination}</div>
                            <div className="text-sm text-muted-foreground">
                              {banknote.country} ({banknote.year})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchTerm.length > 0 && (
                    <div className="text-center p-4 text-muted-foreground">No results found</div>
                  )}
                </>
              )}

              <div className="w-full h-px bg-muted my-6" />

              <div className="grid grid-cols-1 gap-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">Public Details</h3>
                  <span className="text-sm text-muted-foreground">Visible to everyone</span>
                </div>

                {/* Condition */}
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Custom Images</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your own images of the banknote (optional)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Obverse (Front) Image */}
                    <div>
                      <Label htmlFor="obverseImage">Obverse (Front) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <label
                          htmlFor="obverseImage"
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
                        </label>

                        <input
                          id="obverseImage"
                          type="file"
                          accept="image/*"
                          onChange={handleObverseImageChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Reverse Image */}
                    <div>
                      <Label htmlFor="reverseImage">Reverse (Back) Image</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <label
                          htmlFor="reverseImage"
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
                        </label>

                        <input
                          id="reverseImage"
                          type="file"
                          accept="image/*"
                          onChange={handleReverseImageChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-muted my-6" />

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">Private Details</h3>
                  <span className="text-sm text-muted-foreground">Only visible to you</span>
                </div>

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
                {isSubmitting ? 'Adding...' : 'Add to Collection'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CollectionItemForm;
