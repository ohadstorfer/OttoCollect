
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { getInitials } from '@/lib/utils';
import { ImageSuggestion } from '@/types/forum';

const ImageSuggestions = () => {
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalSuggestions, setTotalSuggestions] = useState<number>(0);
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  
  const PAGE_SIZE = 8;

  useEffect(() => {
    fetchSuggestions();
  }, [currentPage, searchQuery]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Count pending image suggestions with direct query instead of RPC
      const { count, error: countError } = await supabase
        .from('image_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (countError) {
        console.error("Error counting suggestions:", countError);
        throw countError;
      }
      
      setTotalSuggestions(count || 0);

      // Fetch the suggestions with pagination using direct query
      const { data, error } = await supabase
        .from('image_suggestions')
        .select(`
          *,
          banknote:detailed_banknotes (id, country, pick_number, denomination),
          user:profiles (id, username, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching suggestions:", error);
        throw error;
      }

      if (Array.isArray(data)) {
        // Map the data to our ImageSuggestion type
        const mappedSuggestions: ImageSuggestion[] = data.map((item: any) => ({
          id: item.id,
          banknoteId: item.banknote_id,
          userId: item.user_id,
          banknote: {
            catalogId: item.banknote?.pick_number || 'Unknown',
            country: item.banknote?.country || 'Unknown',
            denomination: item.banknote?.denomination || ''
          },
          user: {
            username: item.user?.username || 'Unknown User',
            avatarUrl: item.user?.avatar_url
          },
          imageUrl: item.image_url,
          type: item.type,
          status: item.status,
          createdAt: item.created_at
        }));

        setSuggestions(mappedSuggestions);
      } else {
        console.error("Unexpected data format:", data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching image suggestions:', error);
      toast.error('Failed to load image suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleApprove = async (suggestion: ImageSuggestion) => {
    setProcessingIds(prev => ({ ...prev, [suggestion.id]: true }));
    
    try {
      // Update the image suggestion and the banknote directly
      const { error } = await supabase
        .from('image_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestion.id);
      
      if (error) {
        console.error("Error approving suggestion:", error);
        throw error;
      }
      
      // Update the banknote with the image
      const updateField = suggestion.type === 'obverse' ? 'front_picture' : 'back_picture';
      const { error: updateError } = await supabase
        .from('detailed_banknotes')
        .update({ [updateField]: suggestion.imageUrl })
        .eq('id', suggestion.banknoteId);
      
      if (updateError) {
        console.error("Error updating banknote:", updateError);
        throw updateError;
      }
      
      // Update local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      toast.success('Image suggestion approved and set as official catalog image');
    } catch (error) {
      console.error('Error approving image suggestion:', error);
      toast.error('Failed to approve image suggestion');
    } finally {
      setProcessingIds(prev => ({ ...prev, [suggestion.id]: false }));
    }
  };

  const handleReject = async (suggestion: ImageSuggestion) => {
    setProcessingIds(prev => ({ ...prev, [suggestion.id]: true }));
    
    try {
      // Update status directly
      const { error } = await supabase
        .from('image_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestion.id);
      
      if (error) {
        console.error("Error rejecting suggestion:", error);
        throw error;
      }
      
      // Update local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      toast.success('Image suggestion rejected');
    } catch (error) {
      console.error('Error rejecting image suggestion:', error);
      toast.error('Failed to reject image suggestion');
    } finally {
      setProcessingIds(prev => ({ ...prev, [suggestion.id]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suggestions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Button onClick={fetchSuggestions} variant="outline" disabled={loading}>
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

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <div className="text-center py-10 border rounded-lg">
              <h3 className="text-lg font-medium">No pending image suggestions</h3>
              <p className="text-muted-foreground mt-2">
                All submitted image suggestions have been processed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="font-medium">{suggestion.banknote?.catalogId}</span>
                        <span className="mx-2 text-muted-foreground">•</span>
                        <span>{suggestion.banknote?.country}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        suggestion.type === 'obverse' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {suggestion.type === 'obverse' ? 'Front' : 'Back'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  
                  <div className="flex-1 p-4 pt-0">
                    <div className="aspect-[3/2] bg-muted rounded overflow-hidden">
                      <img
                        src={suggestion.imageUrl}
                        alt={`${suggestion.banknote?.denomination} ${suggestion.type === 'obverse' ? 'obverse' : 'reverse'}`}
                        className="w-full h-full object-contain"
                        onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="p-4 pt-0 flex flex-col">
                    <div className="flex items-center mb-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={suggestion.user?.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(suggestion.user?.username || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-2 flex-1">
                        <p className="text-sm font-medium">{suggestion.user?.username}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(suggestion.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between w-full">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(suggestion)}
                        disabled={processingIds[suggestion.id]}
                      >
                        {processingIds[suggestion.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(suggestion)}
                        disabled={processingIds[suggestion.id]}
                      >
                        {processingIds[suggestion.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          {totalSuggestions > PAGE_SIZE && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalSuggestions / PAGE_SIZE)}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageSuggestions;
