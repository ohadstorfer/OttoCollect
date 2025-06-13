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
import { Banknote } from '@/types';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleImageUpload from '@/components/collection/SimpleImageUpload';
import { uploadBanknoteImage } from '@/services/banknoteService';
import { fetchStampPictures } from '@/services/stampsService';
import { StampPicture } from '@/types/stamps';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multiselect';

interface BanknoteEditDialogProps {
  open: boolean;
  banknote: Banknote | null;
  isNew: boolean;
  onClose: () => void;
  onUpdate: (banknote: Banknote) => void;
  onCreate: (banknote: Banknote) => void;
}

const BanknoteEditDialog = ({ 
  open, 
  banknote, 
  isNew, 
  onClose, 
  onUpdate,
  onCreate
}: BanknoteEditDialogProps) => {
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
    back_picture: '',
    signature_pictures: [],
    seal_pictures: [],
    watermark_picture: '',
    tughra_picture: '',
    is_approved: true,
    is_pending: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [signaturePictures, setSignaturePictures] = useState<StampPicture[]>([]);
  const [sealPictures, setSealPictures] = useState<StampPicture[]>([]);
  const [watermarkPictures, setWatermarkPictures] = useState<StampPicture[]>([]);
  const [tughraPictures, setTughraPictures] = useState<StampPicture[]>([]);
  const [isLoadingStamps, setIsLoadingStamps] = useState<boolean>(false);
  const [countryIdForStamps, setCountryIdForStamps] = useState<string | null>(null);
  const [selectedSignatureIds, setSelectedSignatureIds] = useState<string[]>([]);
  const [selectedSealIds, setSelectedSealIds] = useState<string[]>([]);
  
  useEffect(() => {
    if (banknote && !isNew) {
      // Convert from Banknote to the detailed banknote format for the form
      setFormData({
        extended_pick_number: banknote.catalogId,
        pick_number: banknote.catalogId.split('-')[0] || '',
        country: banknote.country,
        face_value: banknote.denomination,
        gregorian_year: banknote.year,
        islamic_year: '',
        sultan_name: '',
        printer: '',
        type: '',
        category: '',
        rarity: '',
        banknote_description: banknote.description || '',
        historical_description: '',
        front_picture: banknote.imageUrls[0] || '',
        back_picture: banknote.imageUrls[1] || '',
        signature_pictures: [],
        seal_pictures: [],
        watermark_picture: '',
        tughra_picture: '',
        is_approved: banknote.isApproved,
        is_pending: banknote.isPending
      });
      
      // If we have a detailed banknote, fetch the extra details
      fetchDetailedBanknoteInfo(banknote.id);
      setSelectedSignatureIds([]);
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
  
  useEffect(() => {
    const sigPics = formData.signature_pictures || [];
    const sealPics = formData.seal_pictures || [];
    if (signaturePictures.length && sigPics.length) {
      setSelectedSignatureIds(
        signaturePictures.filter(p => sigPics.includes(p.name)).map(p => p.id)
      );
    }
    if (sealPictures.length && sealPics.length) {
      setSelectedSealIds(
        sealPictures.filter(p => sealPics.includes(p.name)).map(p => p.id)
      );
    }
  }, [signaturePictures, sealPictures, formData.signature_pictures, formData.seal_pictures]);
  
  const fetchDetailedBanknoteInfo = async (banknoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('detailed_banknotes')
        .select('*')
        .eq('id', banknoteId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data
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
      const [signatures, seals, watermarks, tughras] = await Promise.all([
        fetchStampPictures('signature', countryId),
        fetchStampPictures('seal', countryId),
        fetchStampPictures('watermark', countryId),
        fetchStampPictures('tughra', countryId)
      ]);

      setSignaturePictures(signatures);
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
  const handleFrontImageUploaded = (url: string) => {
    setFormData(prev => ({
      ...prev,
      front_picture: url
    }));
  };

  const handleBackImageUploaded = (url: string) => {
    setFormData(prev => ({
      ...prev,
      back_picture: url
    }));
  };
  
  const handleStampChange = (type: string, value: string) => {
    if (value === 'none') {
      if (type === 'signature' || type === 'seal') {
        setFormData(prev => ({
          ...prev,
          [`${type}_pictures`]: []
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [`${type}_picture`]: ''
        }));
      }
      return;
    }

    // Find the selected picture to get its name
    const pictures = {
      signature: signaturePictures,
      seal: sealPictures,
      watermark: watermarkPictures,
      tughra: tughraPictures
    }[type];

    const selectedPicture = pictures.find(p => p.id === value);
    if (!selectedPicture) return;

    if (type === 'signature' || type === 'seal') {
      setFormData(prev => ({
        ...prev,
        [`${type}_pictures`]: [selectedPicture.name]
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
      if (isNew) {
        // Create new banknote
        const { data, error } = await supabase
          .from('detailed_banknotes')
          .insert([formData])
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          const newBanknote: Banknote = {
            id: data.id,
            catalogId: data.extended_pick_number,
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
            createdBy: ''
          };
          
          onCreate(newBanknote);
          toast.success('Banknote created successfully');
        }
      } else if (banknote) {
        // Update existing banknote
        const { error } = await supabase
          .from('detailed_banknotes')
          .update(formData)
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
          const updatedBanknote: Banknote = {
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
          <DialogTitle>{isNew ? 'Create New Banknote' : 'Edit Banknote'}</DialogTitle>
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
                  <Label htmlFor="extended_pick_number">Catalog ID</Label>
                  <Input
                    id="extended_pick_number"
                    name="extended_pick_number"
                    value={formData.extended_pick_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pick_number">Pick Number</Label>
                  <Input
                    id="pick_number"
                    name="pick_number"
                    value={formData.pick_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="face_value">Denomination</Label>
                  <Input
                    id="face_value"
                    name="face_value"
                    value={formData.face_value}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gregorian_year">Gregorian Year</Label>
                  <Input
                    id="gregorian_year"
                    name="gregorian_year"
                    value={formData.gregorian_year}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="islamic_year">Islamic Year</Label>
                  <Input
                    id="islamic_year"
                    name="islamic_year"
                    value={formData.islamic_year}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banknote_description">Description</Label>
                <Textarea
                  id="banknote_description"
                  name="banknote_description"
                  value={formData.banknote_description}
                  onChange={handleChange}
                  rows={3}
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
                <Label htmlFor="is_approved">Approved</Label>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sultan_name">Sultan Name</Label>
                  <Input
                    id="sultan_name"
                    name="sultan_name"
                    value={formData.sultan_name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="printer">Printer</Label>
                  <Input
                    id="printer"
                    name="printer"
                    value={formData.printer}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rarity">Rarity</Label>
                  <Input
                    id="rarity"
                    name="rarity"
                    value={formData.rarity}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="historical_description">Historical Description</Label>
                <Textarea
                  id="historical_description"
                  name="historical_description"
                  value={formData.historical_description}
                  onChange={handleChange}
                  rows={3}
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
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Back Image</Label>
                  <SimpleImageUpload 
                    image={formData.back_picture} 
                    side="back"
                    onImageUploaded={handleBackImageUploaded}
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-lg font-medium">Stamp Pictures</h3>
                {isLoadingStamps ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Signature</Label>
                      <MultiSelect
                        options={signaturePictures.map((picture) => ({ value: picture.id, label: picture.name }))}
                        selected={selectedSignatureIds}
                        onChange={(selectedIds) => {
                          setSelectedSignatureIds(selectedIds);
                          const selectedNames = signaturePictures.filter(p => selectedIds.includes(p.id)).map(p => p.name);
                          setFormData(prev => ({ ...prev, signature_pictures: selectedNames }));
                        }}
                        placeholder="Select signatures"
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
