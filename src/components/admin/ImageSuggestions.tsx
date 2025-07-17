import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Check, X, Image as ImageIcon, Eye, Crop } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { AdminComponentProps } from '@/types/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BanknoteDetailDialog from './BanknoteDetailDialog';
import ImageCropDialog from '@/components/shared/ImageCropDialog';
import { processAndUploadImage } from '@/services/imageProcessingService';

interface ImageSuggestion {
  id: string;
  banknote_id: string;
  user_id: string;
  obverse_image: string | null;
  reverse_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  // Extended properties from join
  banknote_catalog_id?: string;
  banknote_country?: string;
  banknote_denomination?: string;
  user_name?: string;
  obverse_image_watermarked?: string;
  reverse_image_watermarked?: string;
  obverse_image_thumbnail?: string;
  reverse_image_thumbnail?: string;
}

interface ImageSuggestionsProps extends AdminComponentProps {}

interface ComparisonDialogProps {
  suggestion: ImageSuggestion;
  currentImages: {
    front: string | null;
    back: string | null;
  };
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

const ComparisonDialog: React.FC<ComparisonDialogProps> = ({
  suggestion,
  currentImages,
  onApprove,
  onReject,
  onClose,
  loading
}) => {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<{
    url: string;
    type: 'obverse' | 'reverse';
  } | null>(null);

  const renderStatus = () => {
    switch (suggestion.status) {
      case 'approved':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Approved</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <X className="h-5 w-5" />
            <span className="font-medium">Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCropClick = (imageUrl: string | null, type: 'obverse' | 'reverse') => {
    if (imageUrl) {
      setSelectedImageToCrop({ url: imageUrl, type });
      setCropDialogOpen(true);
    }
  };

  const handleSaveCroppedImage = async (croppedImageUrl: string) => {
    if (!selectedImageToCrop) return;

    try {
      // Convert data URL to Blob
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create a file from the blob
      const file = new File([blob], `cropped_${selectedImageToCrop.type}.jpg`, { type: 'image/jpeg' });

      // Use imageProcessingService to process the image
      const processedImages = await processAndUploadImage(
        file,
        'suggestions',
        suggestion.user_id
      );

      // Update suggestion with new image URLs
      const updateData = selectedImageToCrop.type === 'obverse' 
        ? {
            obverse_image: processedImages.original,
            obverse_image_watermarked: processedImages.watermarked,
            obverse_image_thumbnail: processedImages.thumbnail
          }
        : {
            reverse_image: processedImages.original,
            reverse_image_watermarked: processedImages.watermarked,
            reverse_image_thumbnail: processedImages.thumbnail
          };

      const { error: updateError } = await supabase
        .from('image_suggestions')
        .update(updateData)
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      // Update local state
      if (selectedImageToCrop.type === 'obverse') {
        suggestion.obverse_image = processedImages.original;
        suggestion.obverse_image_watermarked = processedImages.watermarked;
        suggestion.obverse_image_thumbnail = processedImages.thumbnail;
      } else {
        suggestion.reverse_image = processedImages.original;
        suggestion.reverse_image_watermarked = processedImages.watermarked;
        suggestion.reverse_image_thumbnail = processedImages.thumbnail;
      }

      toast.success('Image updated successfully');
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast.error('Failed to save cropped image');
    }
  };

  return (
    <>
      <DialogContent className="sm:max-w-[99vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2"><span>Current Images</span></h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <div 
                  className="bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => currentImages.front && setEnlargedImage(currentImages.front)}
                >
                  {currentImages.front ? (
                    <img 
                      src={currentImages.front} 
                      alt="Current front"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <div 
                  className="bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => currentImages.back && setEnlargedImage(currentImages.back)}
                >
                  {currentImages.back ? (
                    <img 
                      src={currentImages.back} 
                      alt="Current back"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2"><span>Suggested Images</span></h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div 
                  className="bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => suggestion.obverse_image && setEnlargedImage(suggestion.obverse_image)}
                >
                  {suggestion.obverse_image ? (
                    <img 
                      src={suggestion.obverse_image} 
                      alt="Suggested front"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {suggestion.status === 'pending' && suggestion.obverse_image && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={() => handleCropClick(suggestion.obverse_image, 'obverse')}
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <div 
                  className="bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => suggestion.reverse_image && setEnlargedImage(suggestion.reverse_image)}
                >
                  {suggestion.reverse_image ? (
                    <img 
                      src={suggestion.reverse_image} 
                      alt="Suggested back"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {suggestion.status === 'pending' && suggestion.reverse_image && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={() => handleCropClick(suggestion.reverse_image, 'reverse')}
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            {suggestion.status !== 'pending' && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                {renderStatus()}
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Close
              </Button>
              
              {suggestion.status === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={onReject}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    onClick={onApprove}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Enlarged Image Dialog */}
      <Dialog open={enlargedImage !== null} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="w-full sm:max-w-none sm:w-[90vw] p-2">
          {enlargedImage && (
            <div className="relative w-full flex items-center justify-center">
              <img 
                src={enlargedImage} 
                alt="Enlarged banknote image" 
                className="w-full object-contain max-h-[80vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {selectedImageToCrop && (
        <ImageCropDialog
          imageUrl={selectedImageToCrop.url}
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setSelectedImageToCrop(null);
          }}
          onSave={handleSaveCroppedImage}
          title={`Edit ${selectedImageToCrop.type === 'obverse' ? 'Front' : 'Back'} Image`}
        />
      )}
    </>
  );
};

const ImageSuggestions: React.FC<ImageSuggestionsProps> = ({
  countryId,
  countryName,
  isCountryAdmin,
  disableCountrySelect
}) => {
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalSuggestions, setTotalSuggestions] = useState<number>(0);
  
  // New state variables for image and banknote dialogs
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBanknoteId, setSelectedBanknoteId] = useState<string | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ImageSuggestion | null>(null);
  const [currentImages, setCurrentImages] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null
  });
  
  const PAGE_SIZE = 10;
  
  useEffect(() => {
    fetchImageSuggestions();
  }, [currentPage, searchQuery, countryId, countryName]);

  const fetchImageSuggestions = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch image suggestions
      let query = supabase
        .from('image_suggestions')
        .select('*', { count: 'exact' });
      
      // Apply filters if needed
      if (searchQuery) {
        query = query.ilike('status', `%${searchQuery}%`);
      }
      
      // Get count and data
      const { data: suggestionsData, count, error } = await query
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTotalSuggestions(count || 0);
      
      if (!suggestionsData || suggestionsData.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Step 2: Collect user IDs and banknote IDs for batch fetching
      const userIds = suggestionsData.map(suggestion => suggestion.user_id);
      const banknoteIds = suggestionsData.map(suggestion => suggestion.banknote_id);

      // Step 3: Fetch user profiles in a batch
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      // Create a map of user profiles for easy lookup
      const userProfiles = new Map<string, { username: string }>();
      if (profilesData) {
        profilesData.forEach(profile => {
          userProfiles.set(profile.id, { username: profile.username });
        });
      }

      // Step 4: Fetch banknote details in a batch
      const { data: banknotesData, error: banknotesError } = await supabase
        .from('detailed_banknotes')
        .select('id, extended_pick_number, country, face_value')
        .in('id', banknoteIds);
        
      if (banknotesError) {
        console.error('Error fetching banknote details:', banknotesError);
      }

      // Create a map of banknote details for easy lookup
      const banknoteDetails = new Map<string, any>();
      if (banknotesData) {
        banknotesData.forEach(banknote => {
          banknoteDetails.set(banknote.id, banknote);
        });
      }

      // Step 5: Map all data together
      const suggestionsWithDetails = suggestionsData.map(suggestion => {
        const userProfile = userProfiles.get(suggestion.user_id);
        const banknote = banknoteDetails.get(suggestion.banknote_id);
        
        return {
          ...suggestion,
          user_name: userProfile?.username || 'Unknown',
          banknote_catalog_id: banknote?.extended_pick_number || '',
          banknote_country: banknote?.country || '',
          banknote_denomination: banknote?.face_value || '',
          obverse_image_watermarked: banknote?.front_picture_watermarked,
          reverse_image_watermarked: banknote?.back_picture_watermarked,
          obverse_image_thumbnail: banknote?.front_picture_thumbnail,
          reverse_image_thumbnail: banknote?.back_picture_thumbnail
        } as ImageSuggestion; // Type assertion to ensure it matches ImageSuggestion
      });
      
      // If country filter is applied, filter locally
      const filteredSuggestions = isCountryAdmin && countryName
        ? suggestionsWithDetails.filter(s => s.banknote_country === countryName)
        : suggestionsWithDetails;
      
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error fetching image suggestions:', error);
      toast.error('Failed to load image suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleApprove = async (suggestion: ImageSuggestion) => {
    try {
      setLoading(true);
      
      // Validate that the suggestion has at least one image
      if (!suggestion.obverse_image && !suggestion.reverse_image) {
        toast.error('Cannot approve suggestion: No images provided');
        setLoading(false);
        return;
      }
      
      console.log('Approving suggestion:', {
        id: suggestion.id,
        banknote_id: suggestion.banknote_id,
        hasObverse: !!suggestion.obverse_image,
        hasReverse: !!suggestion.reverse_image
      });
      
      // First check if the banknote exists
      const { data: banknoteCheck, error: banknoteCheckError } = await supabase
        .from('detailed_banknotes')
        .select('id')
        .eq('id', suggestion.banknote_id)
        .single();
        
      if (banknoteCheckError || !banknoteCheck) {
        console.error('Banknote not found:', banknoteCheckError);
        toast.error(`Banknote not found: ${banknoteCheckError?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      // Helper function to convert URL to File
      const urlToFile = async (url: string, filename: string): Promise<File> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type });
      };
      
      // Process images to create watermarked and thumbnail versions
      let obverseProcessedImages = null;
      let reverseProcessedImages = null;
      
      // Show processing message
      toast.info('Processing images, please wait...');
      
      if (suggestion.obverse_image) {
        try {
          console.log('Processing obverse image...');
          const obverseFile = await urlToFile(suggestion.obverse_image, 'obverse.jpg');
          obverseProcessedImages = await processAndUploadImage(obverseFile, 'banknotes', suggestion.user_id);
          console.log('Processed obverse image:', obverseProcessedImages);
        } catch (error) {
          console.error('Error processing obverse image:', error);
          toast.error('Failed to process obverse image');
          setLoading(false);
          return;
        }
      }
      
      if (suggestion.reverse_image) {
        try {
          console.log('Processing reverse image...');
          const reverseFile = await urlToFile(suggestion.reverse_image, 'reverse.jpg');
          reverseProcessedImages = await processAndUploadImage(reverseFile, 'banknotes', suggestion.user_id);
          console.log('Processed reverse image:', reverseProcessedImages);
        } catch (error) {
          console.error('Error processing reverse image:', error);
          toast.error('Failed to process reverse image');
          setLoading(false);
          return;
        }
      }
      
      // Ensure at least one image was processed successfully
      if (!obverseProcessedImages && !reverseProcessedImages) {
        toast.error('No images were processed successfully');
        setLoading(false);
        return;
      }
      
      // Prepare the update data object
      const updateData: any = {};
      
      // Add obverse image data if available
      if (obverseProcessedImages) {
        updateData.front_picture = obverseProcessedImages.original;
        updateData.front_picture_watermarked = obverseProcessedImages.watermarked;
        updateData.front_picture_thumbnail = obverseProcessedImages.thumbnail;
      }
      
      // Add reverse image data if available
      if (reverseProcessedImages) {
        updateData.back_picture = reverseProcessedImages.original;
        updateData.back_picture_watermarked = reverseProcessedImages.watermarked;
        updateData.back_picture_thumbnail = reverseProcessedImages.thumbnail;
      }
      
      // Update the banknote with the suggested images
      const { error: updateError } = await supabase
        .from('detailed_banknotes')
        .update(updateData)
          .eq('id', suggestion.banknote_id);
        
      if (updateError) {
        console.error('Error updating banknote images:', updateError);
        toast.error(`Failed to update banknote images: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Successfully updated banknote images:', updateData);
      
      // Update the suggestion status to approved
      const { error: suggestionError } = await supabase
        .from('image_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);
      
      if (suggestionError) {
        console.error('Error updating suggestion status:', suggestionError);
        toast.error(`Failed to update suggestion status: ${suggestionError.message}`);
      } else {
        console.log('Successfully approved suggestion:', suggestion.id);
        toast.success('Image suggestion approved successfully');
      }
      
      // Refresh the list
      fetchImageSuggestions();
    } catch (error) {
      console.error('Unexpected error in handleApprove:', error);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (suggestion: ImageSuggestion) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('image_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestion.id);
      
      if (error) throw error;
      
      toast.success('Image suggestion rejected');
      fetchImageSuggestions();
    } catch (error) {
      console.error('Error rejecting image suggestion:', error);
      toast.error('Failed to reject image suggestion');
    } finally {
      setLoading(false);
    }
  };

  // New handlers for image and banknote dialogs
  const openImageDialog = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
    }
  };

  const openBanknoteDialog = (banknoteId: string) => {
    setSelectedBanknoteId(banknoteId);
  };

  // Add this function to fetch current banknote images
  const fetchCurrentImages = async (banknoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('detailed_banknotes')
        .select('front_picture, back_picture')
        .eq('id', banknoteId)
        .single();

      if (error) throw error;

      return {
        front: data?.front_picture || null,
        back: data?.back_picture || null
      };
    } catch (error) {
      console.error('Error fetching current images:', error);
      return { front: null, back: null };
    }
  };

  const openCompareDialog = async (suggestion: ImageSuggestion) => {
    setSelectedSuggestion(suggestion);
    const images = await fetchCurrentImages(suggestion.banknote_id);
    setCurrentImages(images);
    setShowCompareDialog(true);
  };

  return (
    <div>
      {loading && suggestions.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compare</TableHead>
                  <TableHead>Banknote</TableHead>
                  <TableHead>Ext. Pick</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Denomination</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion) => (
                    <TableRow key={suggestion.id}>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCompareDialog(suggestion)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" /> Compare
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openBanknoteDialog(suggestion.banknote_id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" /> View
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{suggestion.banknote_catalog_id}</TableCell>
                      <TableCell>{suggestion.banknote_country}</TableCell>
                      <TableCell>{suggestion.banknote_denomination}</TableCell>
                      <TableCell>{suggestion.user_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {suggestion.status === 'pending' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        ) : suggestion.status === 'approved' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {suggestion.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(suggestion)}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(suggestion)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      No image suggestions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-center mt-4">
            <Pagination 
              currentPage={currentPage}
              totalPages={Math.ceil(totalSuggestions / PAGE_SIZE)}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}

      {/* Dialog for enlarged image view */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="w-full sm:max-w-none sm:w-[70vw] p-2">
          {selectedImage && (
            <div className="relative w-full flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Banknote image" 
                className="w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for banknote details */}
      <Dialog open={selectedBanknoteId !== null} onOpenChange={() => setSelectedBanknoteId(null)}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[90vh] overflow-y-auto">
          {selectedBanknoteId && (
            <BanknoteDetailDialog id={selectedBanknoteId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={(open) => !open && setShowCompareDialog(false)}>
        {selectedSuggestion && (
          <ComparisonDialog
            suggestion={selectedSuggestion}
            currentImages={currentImages}
            onApprove={async () => {
              await handleApprove(selectedSuggestion);
              // Refresh current images after approval
              const updatedImages = await fetchCurrentImages(selectedSuggestion.banknote_id);
              setCurrentImages(updatedImages);
              setShowCompareDialog(false);
            }}
            onReject={async () => {
              await handleReject(selectedSuggestion);
              setShowCompareDialog(false);
            }}
            onClose={() => setShowCompareDialog(false)}
            loading={loading}
          />
        )}
      </Dialog>
    </div>
  );
};

export default ImageSuggestions;
