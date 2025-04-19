
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
import { Banknote, DetailedBanknote } from '@/types';
import { Search, Loader2, Plus, Edit, Check, X } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import BanknoteEditDialog from './BanknoteEditDialog';
import { AdminComponentProps } from '@/types/admin';

interface BanknotesManagementProps extends AdminComponentProps {}

const BanknotesManagement: React.FC<BanknotesManagementProps> = ({
  countryId,
  countryName,
  isCountryAdmin,
  disableCountrySelect
}) => {
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalBanknotes, setTotalBanknotes] = useState<number>(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedBanknote, setSelectedBanknote] = useState<Banknote | null>(null);
  const [isNewBanknote, setIsNewBanknote] = useState<boolean>(false);
  
  const PAGE_SIZE = 10;
  
  useEffect(() => {
    fetchBanknotes();
  }, [currentPage, searchQuery, countryId]);

  const fetchBanknotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('detailed_banknotes')
        .select('*', { count: 'exact', head: true })
        .ilike('country', `%${searchQuery}%`);

      // If in country admin mode, filter by country
      if (isCountryAdmin && countryName) {
        query = query.eq('country', countryName);
      }

      // First get count for pagination
      const { count, error: countError } = await query;

      if (countError) throw countError;
      setTotalBanknotes(count || 0);

      // Then fetch data with pagination
      let dataQuery = supabase
        .from('detailed_banknotes')
        .select('*')
        .ilike('country', `%${searchQuery}%`);

      // If in country admin mode, filter by country
      if (isCountryAdmin && countryName) {
        dataQuery = dataQuery.eq('country', countryName);
      }

      const { data, error } = await dataQuery
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('country', { ascending: true })
        .order('face_value', { ascending: true });

      if (error) throw error;

      setBanknotes(data.map(item => ({
        id: item.id,
        catalogId: item.extended_pick_number,
        country: item.country,
        denomination: item.face_value,
        year: item.gregorian_year || '',
        series: '',
        description: item.banknote_description || '',
        obverseDescription: '',
        reverseDescription: '',
        imageUrls: [
          item.front_picture || '',
          item.back_picture || ''
        ].filter(Boolean),
        isApproved: item.is_approved || false,
        isPending: item.is_pending || false,
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || '',
        createdBy: ''
      })));
    } catch (error) {
      console.error('Error fetching banknotes:', error);
      toast.error('Failed to load banknotes');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEditBanknote = (banknote: Banknote) => {
    setSelectedBanknote(banknote);
    setIsNewBanknote(false);
    setIsEditDialogOpen(true);
  };

  const handleAddNewBanknote = () => {
    setSelectedBanknote(null);
    setIsNewBanknote(true);
    setIsEditDialogOpen(true);
  };

  const handleToggleApproval = async (banknote: Banknote) => {
    try {
      const { error } = await supabase
        .from('detailed_banknotes')
        .update({ is_approved: !banknote.isApproved })
        .eq('id', banknote.id);

      if (error) throw error;

      setBanknotes(prevBanknotes => 
        prevBanknotes.map(b => 
          b.id === banknote.id ? { ...b, isApproved: !b.isApproved } : b
        )
      );

      toast.success(`Banknote ${banknote.isApproved ? 'unapproved' : 'approved'} successfully`);
    } catch (error) {
      console.error('Error toggling banknote approval:', error);
      toast.error('Failed to update banknote');
    }
  };

  const handleBanknoteUpdated = (updatedBanknote: Banknote) => {
    setBanknotes(prev => 
      prev.map(b => b.id === updatedBanknote.id ? updatedBanknote : b)
    );
    setIsEditDialogOpen(false);
  };

  const handleBanknoteCreated = (newBanknote: Banknote) => {
    setBanknotes(prev => [newBanknote, ...prev]);
    setIsEditDialogOpen(false);
    toast.success('New banknote created successfully');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banknotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchBanknotes} variant="outline" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </>
            ) : (
              'Refresh'
            )}
          </Button>
          
          <Button onClick={handleAddNewBanknote}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-ottoman-600" />
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catalog ID</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banknotes.length > 0 ? (
                  banknotes.map((banknote) => (
                    <TableRow key={banknote.id}>
                      <TableCell className="font-medium">{banknote.catalogId}</TableCell>
                      <TableCell>{banknote.country}</TableCell>
                      <TableCell>{banknote.denomination}</TableCell>
                      <TableCell>{banknote.year}</TableCell>
                      <TableCell>
                        {banknote.isApproved ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="mr-1 h-3 w-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <X className="mr-1 h-3 w-3" />
                            Unapproved
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBanknote(banknote)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={banknote.isApproved ? "destructive" : "default"}
                            onClick={() => handleToggleApproval(banknote)}
                          >
                            {banknote.isApproved ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      No banknotes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-center mt-4">
            <Pagination 
              currentPage={currentPage}
              totalPages={Math.ceil(totalBanknotes / PAGE_SIZE)}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}

      {isEditDialogOpen && (
        <BanknoteEditDialog
          open={isEditDialogOpen}
          banknote={selectedBanknote}
          isNew={isNewBanknote}
          onClose={() => setIsEditDialogOpen(false)}
          onUpdate={handleBanknoteUpdated}
          onCreate={handleBanknoteCreated}
        />
      )}
    </div>
  );
};

export default BanknotesManagement;
