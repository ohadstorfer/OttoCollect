
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote } from '@/types';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleImageUpload from '@/components/collection/SimpleImageUpload';
import MultipleImageUpload from './MultipleImageUpload';
import { uploadBanknoteImage } from '@/services/banknoteService';
import { fetchStampPictures } from '@/services/stampsService';
import { StampPicture, StampType } from '@/types/stamps';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multiselect';
import { processAndUploadImage } from '@/services/imageProcessingService';
import { useAuth } from '@/context/AuthContext';


interface BanknoteEditDialogProps {
  open: boolean;
  banknote: DetailedBanknote | null;
  isNew: boolean;
  onClose: () => void;
  onUpdate: (banknote: DetailedBanknote) => void;
  onCreate: (banknote: DetailedBanknote) => void;
}

const BanknoteEditDialog = ({ 
  open, 
  banknote, 
  isNew, 
  onClose, 
  onUpdate,
  onCreate
}: BanknoteEditDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<any>({
    extended_pick_number: '',
    pick_number: '',
    country: '',
    face_value: '',
    gregorian_year: '',
    islamic_year: '',
    sultan_name: '',
    printer: '',
    type: '',
    category: '',
    rarity: '',
    banknote_description: '',
    historical_description: '',
    front_picture: '',
    front_picture_watermarked: '',
    front_picture_thumbnail: '',
    back_picture: '',
    back_picture_watermarked: '',
    back_picture_thumbnail: '',
    signatures_front: [],
    signatures_back: [],
    signature_pictures: [],
    seal_pictures: [],
    seal_names: '',
    watermark_picture: '',
    tughra_picture: '',
    other_element_pictures: [],
    other_element_files: [], // This is for the UI only, not saved to DB
    turk_catalog_number: '',
    security_element: '',
    colors: '',
    serial_numbering: '',
    dimensions: '',
    is_approved: true,
    is_pending: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [signaturesFront, setSignaturesFront] = useState<StampPicture[]>([]);
  const [signaturesBack, setSignaturesBack] = useState<StampPicture[]>([]);
  const [sealPictures, setSealPictures] = useState<StampPicture[]>([]);
  const [watermarkPictures, setWatermarkPictures] = useState<StampPicture[]>([]);
  const [tughraPictures, setTughraPictures] = useState<StampPicture[]>([]);
  const [isLoadingStamps, setIsLoadingStamps] = useState<boolean>(false);
  const [countryIdForStamps, setCountryIdForStamps] = useState<string | null>(null);
  const [selectedSignaturesFrontIds, setSelectedSignaturesFrontIds] = useState<string[]>([]);
  const [selectedSignaturesBackIds, setSelectedSignaturesBackIds] = useState<string[]>([]);
  const [selectedSealIds, setSelectedSealIds] = useState<string[]>([]);
  
  useEffect(() => {
    const sigFront = formData.signatures_front || [];
    const sigBack = formData.signatures_back || [];
    const sealPics = formData.seal_pictures || [];

    if (signaturesFront.length && sigFront.length) {
      setSelectedSignaturesFrontIds(
        signaturesFront.filter(p => sigFront.includes(p.name)).map(p => p.id)
      );
    }
    if (signaturesBack.length && sigBack.length) {
      setSelectedSignaturesBackIds(
        signaturesBack.filter(p => sigBack.includes(p.name)).map(p => p.id)
      );
    }
    if (sealPictures.length && sealPics.length) {
      setSelectedSealIds(
        sealPictures.filter(p => sealPics.includes(p.name)).map(p => p.id)
      );
    }
  }, [signaturesFront, signaturesBack, sealPictures, formData.signatures_front, formData.signatures_back, formData.seal_pictures]);
  
  useEffect(() => {
    if (banknote && !isNew) {
      setFormData({
        extended_pick_number: banknote.catalogId,
        pick_number: banknote.catalogId.split('-')[0] || '',
        country: banknote.country,
        face_value: banknote.denomination,
        gregorian_year: banknote.year,
        islamic_year: banknote.islamicYear || '',
        sultan_name: banknote.sultanName || '',
        printer: banknote.printer || '',
        type: banknote.type || '',
        category: banknote.category || '',
        rarity: banknote.rarity || '',
        banknote_description: banknote.description || '',
        historical_description: banknote.historicalDescription || '',
        front_picture: banknote.imageUrls[0] || '',
        back_picture: banknote.imageUrls[1] || '',
        signatures_front: banknote.signaturesFront?.split(', ') || [],
        signatures_back: banknote.signaturesBack?.split(', ') || [],
        signature_pictures: banknote.signaturesFrontUrls || [],
        seal_pictures: banknote.sealNames?.split(', ') || [],
        seal_names: banknote.sealNames || '',
        watermark_picture: banknote.watermarkUrl || '',
        tughra_picture: banknote.tughraUrl || '',
        other_element_pictures: [],
        other_element_files: [],
        turk_catalog_number: banknote.turkCatalogNumber || '',
        security_element: banknote.securityElement || '',
        colors: banknote.colors || '',
        serial_numbering: banknote.serialNumbering || '',
        dimensions: banknote.dimensions || '',
        is_approved: banknote.isApproved,
        is_pending: banknote.isPending
      });

      fetchDetailedBanknoteInfo(banknote.id);
      setSelectedSignaturesFrontIds([]);
      setSelectedSignaturesBackIds([]);
      setSelectedSealIds([]);
    }
  }, [banknote, isNew]);
  
  useEffect(() => {
    if (formData.country) {
      fetchCountryId(formData.country).then(countryId => {
        if (countryId) {
          setCountryIdForStamps(countryId);
          fetchStampPicturesForCountry(countryId);
        }
      });
    }
  }, [formData.country]);

  // Cleanup preview URLs when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      // Clean up any preview URLs to prevent memory leaks
      if (formData.other_element_files) {
        formData.other_element_files.forEach((imageFile: any) => {
          if (imageFile.previewUrl) {
            URL.revokeObjectURL(imageFile.previewUrl);
          }
        });
      }
    };
  }, []);
  
  const fetchDetailedBanknoteInfo = async (banknoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('detailed_banknotes')
        .select('*')
        .eq('id', banknoteId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Process existing other_element_pictures to create file objects for UI
        const existingOtherElementFiles = Array.isArray(data.other_element_pictures) 
          ? data.other_element_pictures.map((url: string, index: number) => ({
              id: `existing-${index}`,
              file: null, // No file object for existing images
              previewUrl: url,
              isExisting: true
            }))
          : [];

        // Ensure other_element_pictures is an array
        const processedData = {
          ...data,
          other_element_pictures: Array.isArray(data.other_element_pictures) 
            ? data.other_element_pictures 
            : data.other_element_pictures 
              ? [data.other_element_pictures] 
              : [],
          other_element_files: existingOtherElementFiles // Set existing images as files for UI
        };
        
        setFormData(prev => ({
          ...prev,
          ...processedData
        }));
      }
    } catch (error) {
      console.error('Error fetching detailed banknote info:', error);
      toast.error('Failed to load complete banknote details');
    }
  };
  
  const fetchCountryId = async (countryName: string) => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id')
        .eq('name', countryName)
        .single();
      
      if (error) throw error;
      
      if (data) return data.id;
    } catch (error) {
      console.error('Error fetching country ID:', error);
      toast.error('Failed to fetch country ID');
    }
    return null;
  };
  
  const fetchStampPicturesForCountry = async (countryId: string) => {
    setIsLoadingStamps(true);
    try {
      const [signaturesFront, signaturesBack, seals, watermarks, tughras] = await Promise.all([
        fetchStampPictures('signatures_front' as StampType, countryId),
        fetchStampPictures('signatures_back' as StampType, countryId),
        fetchStampPictures('seal' as StampType, countryId),
        fetchStampPictures('watermark' as StampType, countryId),
        fetchStampPictures('tughra' as StampType, countryId)
      ]);

      setSignaturesFront(signaturesFront);
      setSignaturesBack(signaturesBack);
      setSealPictures(seals);
      setWatermarkPictures(watermarks);
      setTughraPictures(tughras);
    } catch (error) {
      console.error('Error fetching stamp pictures:', error);
      toast.error('Failed to load stamp pictures');
    } finally {
      setIsLoadingStamps(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // New handlers for image uploads
  const handleFrontImageUploaded = async (file: File) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const processedImages = await processAndUploadImage(
        file,
        'banknotes',
        user.id
      );
      
      setFormData(prev => ({
        ...prev,
        front_picture: processedImages.original,
        front_picture_watermarked: processedImages.watermarked,
        front_picture_thumbnail: processedImages.thumbnail
      }));
    } catch (error) {
      console.error('Error processing front image:', error);
      toast.error('Failed to process front image');
    }
  };

  const handleBackImageUploaded = async (file: File) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const processedImages = await processAndUploadImage(
        file,
        'banknotes',
        user.id
      );
      
      setFormData(prev => ({
        ...prev,
        back_picture: processedImages.original,
        back_picture_watermarked: processedImages.watermarked,
        back_picture_thumbnail: processedImages.thumbnail
      }));
    } catch (error) {
      console.error('Error processing back image:', error);
      toast.error('Failed to process back image');
    }
  };

  const handleOtherElementImagesChange = async (imageFiles: any[]) => {
    // If an image was removed, find which one and delete it
    const currentFiles = formData.other_element_files || [];
    const removedFiles = currentFiles.filter(currentFile => 
      !imageFiles.some(newFile => newFile.previewUrl === currentFile.previewUrl)
    );

    // Keep track of successfully deleted URLs to update other_element_pictures
    const deletedUrls = new Set();

    // Delete removed files
    for (const removedFile of removedFiles) {
      if (removedFile.isExisting && removedFile.previewUrl) {
        try {
          // Delete from storage
          const imageUrl = new URL(removedFile.previewUrl);
          const pathArray = imageUrl.pathname.split('/');
          const fileName = pathArray[pathArray.length - 1];
          const { error: storageError } = await supabase.storage
            .from('banknote_images')
            .remove([`other_elements/${fileName}`]);
          
          if (storageError) throw storageError;

          // Add to set of deleted URLs
          deletedUrls.add(removedFile.previewUrl);
          toast.success('Image deleted successfully');
        } catch (error) {
          console.error('Error deleting other element image:', error);
          toast.error('Failed to delete image');
        }
      }
    }

    // Update local state for both files and URLs
    setFormData(prev => {
      // Filter out deleted URLs from other_element_pictures
      const updatedPictures = (prev.other_element_pictures || [])
        .filter(url => !deletedUrls.has(url));

      console.log('Updating other_element_pictures:', {
        before: prev.other_element_pictures,
        after: updatedPictures,
        deletedUrls: Array.from(deletedUrls)
      });

      return {
        ...prev,
        other_element_files: imageFiles,
        other_element_pictures: updatedPictures
      };
    });
  };

  const uploadOtherElementImages = async (imageFiles: any[]): Promise<string[]> => {
    if (!user || !imageFiles.length) return [];
    
    const uploadedUrls: string[] = [];
    
    for (const imageFile of imageFiles) {
      try {
        // Skip existing images that are already uploaded
        if (imageFile.isExisting && imageFile.previewUrl) {
          uploadedUrls.push(imageFile.previewUrl);
          continue;
        }

        // Only upload new files
        if (imageFile.file) {
          // Upload the file to the banknote_images bucket instead of banknotes
          const fileName = `other_elements/${user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}.${imageFile.file.name.split('.').pop()}`;
          const { data, error } = await supabase.storage
            .from('banknote_images')
            .upload(fileName, imageFile.file);
          
          if (error) throw error;
          
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('banknote_images')
            .getPublicUrl(fileName);
          
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (error) {
        console.error('Error uploading other element image:', error);
        toast.error(`Failed to upload image: ${imageFile.file?.name || 'existing image'}`);
      }
    }
    
    return uploadedUrls;
  };
  
  const handleStampChange = async (type: StampType, value: string) => {
    if (value === 'none') {
      try {
        if (type === 'signatures_front' || type === 'signatures_back' || type === 'seal') {
          // For array fields, clear the array
          const fieldName = type === 'seal' ? 'seal_pictures' : type;
          const oldValues = formData[fieldName] || [];

          // Delete each image from storage
          for (const oldValue of oldValues) {
            if (oldValue) {
              const imageUrl = new URL(oldValue);
              const pathArray = imageUrl.pathname.split('/');
              const fileName = pathArray[pathArray.length - 1];
              const { error: storageError } = await supabase.storage
                .from('banknotes')
                .remove([fileName]);
              
              if (storageError) throw storageError;
            }
          }

          // Update database
          if (banknote?.id) {
            const { error: dbError } = await supabase
              .from('detailed_banknotes')
              .update({ [fieldName]: [] })
              .eq('id', banknote.id);
            
            if (dbError) throw dbError;
          }

          // Update local state
          setFormData(prev => ({
            ...prev,
            [fieldName]: []
          }));
        } else {
          // For single fields (watermark, tughra)
          const fieldName = `${type}_picture`;
          const oldValue = formData[fieldName];

          if (oldValue) {
            // Delete from storage
            const imageUrl = new URL(oldValue);
            const pathArray = imageUrl.pathname.split('/');
            const fileName = pathArray[pathArray.length - 1];
            const { error: storageError } = await supabase.storage
              .from('banknotes')
              .remove([fileName]);
            
            if (storageError) throw storageError;

            // Update database
            if (banknote?.id) {
              const { error: dbError } = await supabase
                .from('detailed_banknotes')
                .update({ [fieldName]: null })
                .eq('id', banknote.id);
              
              if (dbError) throw dbError;
            }

            // Update local state
            setFormData(prev => ({
              ...prev,
              [fieldName]: ''
            }));
          }
        }

        toast.success(`${type} image(s) deleted successfully`);
      } catch (error) {
        console.error(`Error deleting ${type} image:`, error);
        toast.error(`Failed to delete ${type} image`);
      }
      return;
    }

    // Find the selected picture to get its name
    const pictures = {
      signatures_front: signaturesFront,
      signatures_back: signaturesBack,
      seal: sealPictures,
      watermark: watermarkPictures,
      tughra: tughraPictures
    }[type];

    const selectedPicture = pictures.find(p => p.id === value);
    if (!selectedPicture) return;

    if (type === 'signatures_front' || type === 'signatures_back' || type === 'seal') {
      setFormData(prev => ({
        ...prev,
        [type]: [selectedPicture.name]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [`${type}_picture`]: selectedPicture.name
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Upload other element images if any
      const otherElementUrls = await uploadOtherElementImages(formData.other_element_files || []);
      
      // Prepare the data to save - handle all image fields properly
      const { other_element_files, ...dataToSave } = formData;

      // Ensure all image fields are properly set to null if empty
      const finalData = {
        ...dataToSave,
        // Handle front image fields
        front_picture: dataToSave.front_picture || null,
        front_picture_watermarked: dataToSave.front_picture_watermarked || null,
        front_picture_thumbnail: dataToSave.front_picture_thumbnail || null,
        
        // Handle back image fields
        back_picture: dataToSave.back_picture || null,
        back_picture_watermarked: dataToSave.back_picture_watermarked || null,
        back_picture_thumbnail: dataToSave.back_picture_thumbnail || null,
        
        // Handle stamp fields
        watermark_picture: dataToSave.watermark_picture || null,
        tughra_picture: dataToSave.tughra_picture || null,
        
        // Handle array fields - ensure they're always arrays
        signatures_front: Array.isArray(dataToSave.signatures_front) ? dataToSave.signatures_front : [],
        signatures_back: Array.isArray(dataToSave.signatures_back) ? dataToSave.signatures_back : [],
        seal_pictures: Array.isArray(dataToSave.seal_pictures) ? dataToSave.seal_pictures : [],
        
        // Handle other element pictures
        other_element_pictures: otherElementUrls.length > 0 ? otherElementUrls : (dataToSave.other_element_pictures || [])
      };
      
      // Debug log the final data being saved
      console.log('Current form data before save:', {
        formData: {
          other_element_files: formData.other_element_files,
          other_element_pictures: formData.other_element_pictures
        }
      });
      
      console.log('Final data being saved:', {
        imageFields: {
          front: {
            picture: finalData.front_picture,
            watermarked: finalData.front_picture_watermarked,
            thumbnail: finalData.front_picture_thumbnail
          },
          back: {
            picture: finalData.back_picture,
            watermarked: finalData.back_picture_watermarked,
            thumbnail: finalData.back_picture_thumbnail
          },
          stamps: {
            watermark: finalData.watermark_picture,
            tughra: finalData.tughra_picture,
            signatures_front: finalData.signatures_front,
            signatures_back: finalData.signatures_back,
            seal_pictures: finalData.seal_pictures
          },
          other_element_pictures: finalData.other_element_pictures
        }
      });

      if (isNew) {
        // Create new banknote
        const { data, error } = await supabase
          .from('detailed_banknotes')
          .insert([finalData])
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          const newBanknote: DetailedBanknote = {
            id: data.id,
            catalogId: data.extended_pick_number,
            extendedPickNumber: data.extended_pick_number,
            country: data.country,
            denomination: data.face_value,
            year: data.gregorian_year || '',
            series: '',
            description: data.banknote_description || '',
            obverseDescription: '',
            reverseDescription: '',
            imageUrls: [
              data.front_picture || '',
              data.back_picture || ''
            ].filter(Boolean),
            isApproved: data.is_approved || false,
            isPending: data.is_pending || false,
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
            signaturesFront: data.signatures_front?.join(', ') || '',
            signaturesBack: data.signatures_back?.join(', ') || '',
            signaturesFrontUrls: data.signature_pictures || [],
            signaturesBackUrls: data.signature_pictures || [],
            sealPictureUrls: data.seal_pictures || [],
            watermarkUrl: data.watermark_picture || '',
            tughraUrl: data.tughra_picture || ''
          };
          
          onCreate(newBanknote);
          toast.success('Banknote created successfully');
        }
      } else if (banknote) {
        // Update existing banknote
        const { error } = await supabase
          .from('detailed_banknotes')
          .update(finalData)
          .eq('id', banknote.id);
        
        if (error) throw error;
        
        // Fetch the updated banknote to ensure we have the latest data
        const { data: updatedData, error: fetchError } = await supabase
          .from('detailed_banknotes')
          .select('*')
          .eq('id', banknote.id)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (updatedData) {
          const updatedBanknote: DetailedBanknote = {
            ...banknote,
            catalogId: updatedData.extended_pick_number,
            country: updatedData.country,
            denomination: updatedData.face_value,
            year: updatedData.gregorian_year || '',
            description: updatedData.banknote_description || '',
            imageUrls: [
              updatedData.front_picture || '',
              updatedData.back_picture || ''
            ].filter(Boolean),
            isApproved: updatedData.is_approved || false,
            isPending: updatedData.is_pending || false,
            updatedAt: updatedData.updated_at || new Date().toISOString(),
          };
          
          onUpdate(updatedBanknote);
          toast.success('Banknote updated successfully');
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving banknote:', error);
      toast.error('Failed to save banknote');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle><span>{isNew ? 'Create New Banknote' : 'Edit Banknote'}</span></DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="details">Additional Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extended_pick_number">extended_pick_number</Label>
                  <Input
                    id="extended_pick_number"
                    name="extended_pick_number"
                    value={formData.extended_pick_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pick_number">pick_number</Label>
                  <Input
                    id="pick_number"
                    name="pick_number"
                    value={formData.pick_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="face_value">face_value</Label>
                  <Input
                    id="face_value"
                    name="face_value"
                    value={formData.face_value}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gregorian_year">gregorian_year</Label>
                  <Input
                    id="gregorian_year"
                    name="gregorian_year"
                    value={formData.gregorian_year}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="islamic_year">islamic_year</Label>
                  <Input
                    id="islamic_year"
                    name="islamic_year"
                    value={formData.islamic_year}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turk_catalog_number">turk_catalog_number</Label>
                  <Input
                    id="turk_catalog_number"
                    name="turk_catalog_number"
                    value={formData.turk_catalog_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colors">colors</Label>
                  <Input
                    id="colors"
                    name="colors"
                    value={formData.colors}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banknote_description">banknote_description</Label>
                <Textarea
                  id="banknote_description"
                  name="banknote_description"
                  value={formData.banknote_description || ''}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="security_element">security_element</Label>
                <Textarea
                  id="security_element"
                  name="security_element"
                  value={formData.security_element || ''}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_numbering">serial_numbering</Label>
                <Input
                  id="serial_numbering"
                  name="serial_numbering"
                  value={formData.serial_numbering}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">dimensions</Label>
                <Input
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_approved"
                  name="is_approved"
                  checked={formData.is_approved}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_approved">is_approved</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sultan_name">sultan_name</Label>
                  <Input
                    id="sultan_name"
                    name="sultan_name"
                    value={formData.sultan_name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="printer">printer</Label>
                  <Input
                    id="printer"
                    name="printer"
                    value={formData.printer}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">type</Label>
                  <Input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">category</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rarity">rarity</Label>
                  <Input
                    id="rarity"
                    name="rarity"
                    value={formData.rarity}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="historical_description">historical_description</Label>
                <Textarea
                  id="historical_description"
                  name="historical_description"
                  value={formData.historical_description || ''}
                  onChange={handleChange}
                  rows={3}
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="seal_names">seal_names</Label>
                <Input
                  id="seal_names"
                  name="seal_names"
                  value={formData.seal_names || ''}
                  onChange={handleChange}
                  placeholder="Enter seal names"
                />
              </div>


            </TabsContent>
            
            <TabsContent value="images" className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Front Image</Label>
                  <SimpleImageUpload 
                    image={formData.front_picture} 
                    side="front"
                    onImageUploaded={handleFrontImageUploaded}
                    onImageDeleted={async () => {
                      try {
                        // Delete from storage
                        const imageUrl = new URL(formData.front_picture);
                        const pathArray = imageUrl.pathname.split('/');
                        const fileName = pathArray[pathArray.length - 1];
                        const { error: storageError } = await supabase.storage
                          .from('banknotes')
                          .remove([fileName]);
                        
                        if (storageError) throw storageError;

                        // Update database
                        const { error: dbError } = await supabase
                          .from('detailed_banknotes')
                          .update({ 
                            front_picture: null,
                            front_picture_watermarked: null,
                            front_picture_thumbnail: null
                          })
                          .eq('id', banknote?.id);
                        
                        if (dbError) throw dbError;

                        // Update local state
                        setFormData(prev => ({
                          ...prev,
                          front_picture: '',
                          front_picture_watermarked: '',
                          front_picture_thumbnail: ''
                        }));

                        toast.success('Front image deleted successfully');
                      } catch (error) {
                        console.error('Error deleting front image:', error);
                        toast.error('Failed to delete front image');
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Back Image</Label>
                  <SimpleImageUpload 
                    image={formData.back_picture} 
                    side="back"
                    onImageUploaded={handleBackImageUploaded}
                    onImageDeleted={async () => {
                      try {
                        // Delete from storage
                        const imageUrl = new URL(formData.back_picture);
                        const pathArray = imageUrl.pathname.split('/');
                        const fileName = pathArray[pathArray.length - 1];
                        const { error: storageError } = await supabase.storage
                          .from('banknotes')
                          .remove([fileName]);
                        
                        if (storageError) throw storageError;

                        // Update database
                        const { error: dbError } = await supabase
                          .from('detailed_banknotes')
                          .update({ 
                            back_picture: null,
                            back_picture_watermarked: null,
                            back_picture_thumbnail: null
                          })
                          .eq('id', banknote?.id);
                        
                        if (dbError) throw dbError;

                        // Update local state
                        setFormData(prev => ({
                          ...prev,
                          back_picture: '',
                          back_picture_watermarked: '',
                          back_picture_thumbnail: ''
                        }));

                        toast.success('Back image deleted successfully');
                      } catch (error) {
                        console.error('Error deleting back image:', error);
                        toast.error('Failed to delete back image');
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-lg font-medium"><span>Stamp Pictures</span></h3>
                {isLoadingStamps ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Front Signatures</Label>
                      <MultiSelect
                        options={signaturesFront.map((picture) => ({ value: picture.id, label: picture.name }))}
                        selected={selectedSignaturesFrontIds}
                        onChange={(selectedIds) => {
                          setSelectedSignaturesFrontIds(selectedIds);
                          const selectedNames = signaturesFront.filter(p => selectedIds.includes(p.id)).map(p => p.name);
                          setFormData(prev => ({ ...prev, signatures_front: selectedNames }));
                        }}
                        placeholder="Select front signatures"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Back Signatures</Label>
                      <MultiSelect
                        options={signaturesBack.map((picture) => ({ value: picture.id, label: picture.name }))}
                        selected={selectedSignaturesBackIds}
                        onChange={(selectedIds) => {
                          setSelectedSignaturesBackIds(selectedIds);
                          const selectedNames = signaturesBack.filter(p => selectedIds.includes(p.id)).map(p => p.name);
                          setFormData(prev => ({ ...prev, signatures_back: selectedNames }));
                        }}
                        placeholder="Select back signatures"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Seal</Label>
                      <MultiSelect
                        options={sealPictures.map((picture) => ({ value: picture.id, label: picture.name }))}
                        selected={selectedSealIds}
                        onChange={(selectedIds) => {
                          setSelectedSealIds(selectedIds);
                          const selectedNames = sealPictures.filter(p => selectedIds.includes(p.id)).map(p => p.name);
                          setFormData(prev => ({ ...prev, seal_pictures: selectedNames }));
                        }}
                        placeholder="Select seals"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Watermark</Label>
                      <Select
                        value={watermarkPictures.find(p => p.name === formData.watermark_picture)?.id || ''}
                        onValueChange={(value) => handleStampChange('watermark', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select watermark" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {watermarkPictures.map((picture) => (
                            <SelectItem key={picture.id} value={picture.id}>
                              {picture.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tughra</Label>
                      <Select
                        value={tughraPictures.find(p => p.name === formData.tughra_picture)?.id || ''}
                        onValueChange={(value) => handleStampChange('tughra', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tughra" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {tughraPictures.map((picture) => (
                            <SelectItem key={picture.id} value={picture.id}>
                              {picture.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <MultipleImageUpload
                  images={formData.other_element_files || []}
                  onImagesChange={handleOtherElementImagesChange}
                  label="Other Element Pictures"
                  maxImages={10}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isNew ? 'Create Banknote' : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BanknoteEditDialog;
