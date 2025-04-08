import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload,
  ImagePlus,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Label } from '../ui/label';
import { DetailedBanknote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { CollectionItem, updateCollectionItem } from '@/services/collectionService';

interface Props {
  banknote: DetailedBanknote;
  collectionItem: CollectionItem;
  onUpdate: (updatedItem: CollectionItem) => void;
}

const CollectionImageUpload = ({ banknote, collectionItem, onUpdate }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingObverse, setUploadingObverse] = useState(false);
  const [uploadingReverse, setUploadingReverse] = useState(false);
  const [submitSuggestion, setSubmitSuggestion] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'obverse' | 'reverse'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isUploading = type === 'obverse' ? uploadingObverse : uploadingReverse;
    const setIsUploading = type === 'obverse' ? setUploadingObverse : setUploadingReverse;
    
    if (isUploading) return;
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user?.id}/collection/${collectionItem.id}/${type}-${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('banknote_images')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage
        .from('banknote_images')
        .getPublicUrl(filePath);
        
      const imageUrl = data.publicUrl;
      
      const updatedFields = type === 'obverse' 
        ? { obverseImage: imageUrl } 
        : { reverseImage: imageUrl };
      
      const updatedItem = await updateCollectionItem(collectionItem.id, updatedFields);
      
      if (updatedItem) {
        onUpdate(updatedItem);
        toast({
          title: "Image updated",
          description: `The ${type} image was successfully updated.`
        });
        
        if (submitSuggestion) {
          await submitImageToCatalog(imageUrl, type);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: `There was a problem uploading your ${type} image.`
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };
  
  const submitImageToCatalog = async (imageUrl: string, type: 'obverse' | 'reverse') => {
    if (!user || !banknote) return;
    
    try {
      const { data: existingData, error: checkError } = await supabase
        .from('image_suggestions')
        .select('*')
        .eq('banknote_id', banknote.id)
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('status', 'pending');
      
      if (checkError) {
        console.error("Error checking for existing image suggestions:", checkError);
        return; 
      }
      
      if (existingData && existingData.length > 0) {
        const { error: updateError } = await supabase
          .from('image_suggestions')
          .update({ image_url: imageUrl })
          .eq('id', existingData[0].id);
        
        if (updateError) {
          console.error("Error updating existing image suggestion:", updateError);
          return;
        }
        
        toast({
          title: "Suggestion updated",
          description: "Your image suggestion for the catalog has been updated."
        });
      } 
      else {
        const { error: createError } = await supabase
          .from('image_suggestions')
          .insert([{
            banknote_id: banknote.id,
            user_id: user.id,
            image_url: imageUrl,
            type: type
          }]);
        
        if (createError) {
          console.error("Error creating image suggestion:", createError);
          return;
        }
        
        toast({
          title: "Suggestion submitted",
          description: "Your image has been submitted to improve the catalog."
        });
      }
    } catch (error) {
      console.error("Error submitting image suggestion:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "There was a problem submitting your image suggestion."
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Your Images</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="personal">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="personal">Personal Copy</TabsTrigger>
            <TabsTrigger value="contribute">Contribute to Catalog</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <p className="text-sm text-muted-foreground mb-4">
              Upload images of your personal banknote copy. These will only be visible in your collection.
            </p>
          </TabsContent>
          
          <TabsContent value="contribute">
            <p className="text-sm text-muted-foreground mb-4">
              You can also contribute your high-quality images to improve the catalog for everyone.
              Your contributions will be reviewed by moderators before being added.
            </p>
            
            <div className="flex items-center space-x-2 mb-4">
              <input 
                type="checkbox" 
                id="submitToCatalog" 
                checked={submitSuggestion}
                onChange={(e) => setSubmitSuggestion(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="submitToCatalog" className="text-sm">
                Submit my uploads to improve the catalog
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block">Obverse (Front)</Label>
            <div className="aspect-[3/2] relative border rounded-md overflow-hidden">
              {collectionItem.obverseImage ? (
                <img
                  src={collectionItem.obverseImage}
                  alt={`${banknote.denomination} front`}
                  className="w-full h-full object-cover"
                />
              ) : banknote.frontPicture ? (
                <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center">
                  <img
                    src={banknote.frontPicture}
                    alt={`${banknote.denomination} catalog front`}
                    className="w-full h-full object-contain opacity-40"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                    <p className="text-sm">Upload your copy</p>
                    <ArrowRight className="h-4 w-4 mt-1" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group">
                <label className="cursor-pointer p-2 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingObverse ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, 'obverse')}
                    disabled={uploadingObverse}
                  />
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Reverse (Back)</Label>
            <div className="aspect-[3/2] relative border rounded-md overflow-hidden">
              {collectionItem.reverseImage ? (
                <img
                  src={collectionItem.reverseImage}
                  alt={`${banknote.denomination} back`}
                  className="w-full h-full object-cover"
                />
              ) : banknote.backPicture ? (
                <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center">
                  <img
                    src={banknote.backPicture}
                    alt={`${banknote.denomination} catalog back`}
                    className="w-full h-full object-contain opacity-40"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                    <p className="text-sm">Upload your copy</p>
                    <ArrowRight className="h-4 w-4 mt-1" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group">
                <label className="cursor-pointer p-2 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingReverse ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, 'reverse')}
                    disabled={uploadingReverse}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Images should be clear, well-lit, and show the entire banknote.
        </p>
        
        <Button 
          variant="ghost" 
          size="sm"
          type="button"
          onClick={() => setSubmitSuggestion(!submitSuggestion)}
        >
          <Upload className="h-4 w-4 mr-1" />
          {submitSuggestion ? 'Don\'t contribute' : 'Contribute to catalog'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CollectionImageUpload;
