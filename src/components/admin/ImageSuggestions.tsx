
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
import { Search, Loader2, Check, X, Image as ImageIcon, Eye } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { AdminComponentProps } from '@/types/admin';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BanknoteDetailDialog from './BanknoteDetailDialog';

interface ImageSuggestion {
  id: string;
  banknote_id: string;
  user_id: string;
  image_url: string;
  type: 'obverse' | 'reverse';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  // Extended properties from join
  banknote_catalog_id?: string;
  banknote_country?: string;
  banknote_denomination?: string;
  user_name?: string;
}

interface ImageSuggestionsProps extends AdminComponentProps {}

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
          banknote_denomination: banknote?.face_value || ''
        } as ImageSuggestion;
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
      
      // Update the banknote with the new image
      const updateField = suggestion.type === 'obverse' ? 'front_picture' : 'back_picture';
      const { error: updateError } = await supabase
        .from('detailed_banknotes')
        .update({
          [updateField]: suggestion.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestion.banknote_id);
      
      if (updateError) {
        console.error('Error updating banknote:', updateError);
        toast.error(`Failed to update banknote: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      // Update the suggestion status
      const { error: suggestionError } = await supabase
        .from('image_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);
      
      if (suggestionError) {
        console.error('Error updating suggestion status:', suggestionError);
        toast.error(`Failed to update suggestion status: ${suggestionError.message}`);
      } else {
        toast.success('Image suggestion approved successfully');
      }
      
      // Refresh the list
      fetchImageSuggestions();
    } catch (error) {
      console.error('Unexpected error in handleApprove:', error);
      toast.error(`Unexpected error: ${error.message || 'Unknown error'}`);
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
                  <TableHead>Image</TableHead>
                  <TableHead>Type</TableHead>
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
                          onClick={() => openImageDialog(suggestion.image_url)}
                          className="flex items-center gap-1"
                        >
                          <ImageIcon className="h-4 w-4" /> View
                        </Button>
                      </TableCell>
                      <TableCell className="capitalize">{suggestion.type}</TableCell>
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
                    <TableCell colSpan={9} className="text-center py-10">
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
    </div>
  );
};

export default ImageSuggestions;
