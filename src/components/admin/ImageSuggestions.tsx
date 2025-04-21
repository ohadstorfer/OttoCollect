
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
import { Search, Loader2, Check, X, Image as ImageIcon } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { AdminComponentProps } from '@/types/admin';

interface ImageSuggestion {
  id: string;
  banknote_id: string;
  user_id: string;
  image_url: string;
  type: 'obverse' | 'reverse' | 'other'; // Matches database constraint
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
  
  const PAGE_SIZE = 10;
  
  useEffect(() => {
    fetchImageSuggestions();
  }, [currentPage, searchQuery, countryId, countryName]);

  const fetchImageSuggestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('image_suggestions')
        .select(`
          *,
          profiles:user_id(username)
        `, { count: 'exact' });
      
      // Apply filters
      if (searchQuery) {
        // We can only filter by fields in the image_suggestions table directly
        query = query.ilike('type', `%${searchQuery}%`);
      }
      
      // If in country admin mode, filter by country
      if (isCountryAdmin && countryName) {
        // We need to join with detailed_banknotes to filter by country
        // This will be done in post-processing
      }
      
      // Get count first
      const { count, error: countError } = await query;
      
      if (countError) throw countError;
      setTotalSuggestions(count || 0);
      
      // Then get paginated data
      const { data, error } = await query
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!data) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      
      // Get the banknote details for each suggestion
      const suggestionsWithDetails = await Promise.all(
        data.map(async (suggestion) => {
          // Get banknote details
          const { data: banknoteData } = await supabase
            .from('detailed_banknotes')
            .select('extended_pick_number, country, face_value')
            .eq('id', suggestion.banknote_id)
            .single();
          
          return {
            id: suggestion.id,
            banknote_id: suggestion.banknote_id,
            user_id: suggestion.user_id,
            image_url: suggestion.image_url,
            type: suggestion.type,
            status: suggestion.status as 'pending' | 'approved' | 'rejected',
            created_at: suggestion.created_at,
            updated_at: suggestion.updated_at,
            // Joined data
            banknote_catalog_id: banknoteData?.extended_pick_number || '',
            banknote_country: banknoteData?.country || '',
            banknote_denomination: banknoteData?.face_value || '',
            user_name: suggestion.profiles?.username || 'Unknown'
          };
        })
      );
      
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
      
      // First update the banknote with the new image
      const { error: banknoteError } = await supabase
        .from('detailed_banknotes')
        .update({
          [suggestion.type === 'obverse' ? 'front_picture' : 'back_picture']: suggestion.image_url
        })
        .eq('id', suggestion.banknote_id);
      
      if (banknoteError) throw banknoteError;
      
      // Then update the suggestion status
      const { error: suggestionError } = await supabase
        .from('image_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);
      
      if (suggestionError) throw suggestionError;
      
      toast.success('Image suggestion approved successfully');
      fetchImageSuggestions();
    } catch (error) {
      console.error('Error approving image suggestion:', error);
      toast.error('Failed to approve image suggestion');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by catalog ID or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Button onClick={fetchImageSuggestions} variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

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
                  <TableHead>Catalog ID</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion) => (
                    <TableRow key={suggestion.id}>
                      <TableCell>
                        <div className="w-16 h-12 relative bg-muted rounded overflow-hidden">
                          {suggestion.image_url ? (
                            <img 
                              src={suggestion.image_url} 
                              alt={`${suggestion.type} of ${suggestion.banknote_catalog_id}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{suggestion.banknote_catalog_id}</TableCell>
                      <TableCell>{suggestion.banknote_country}</TableCell>
                      <TableCell>{suggestion.banknote_denomination}</TableCell>
                      <TableCell>
                        <span className="capitalize">{suggestion.type}</span>
                      </TableCell>
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
    </div>
  );
};

export default ImageSuggestions;
