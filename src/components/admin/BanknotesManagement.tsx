
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, DetailedBanknote } from '@/types';
import { Search, Loader2, Plus, Edit, Check, X, Eye } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import BanknoteEditDialog from './BanknoteEditDialog';
import BanknoteDetailDialog from './BanknoteDetailDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AdminComponentProps } from '@/types/admin';
import { useBanknoteSorting } from '@/hooks/use-banknote-sorting';
import { Currency } from '@/types/banknote';

interface BanknotesManagementProps extends AdminComponentProps {}

interface Country {
  id: string;
  name: string;
}

const SEARCHABLE_FIELDS = [
  'country',
  'face_value',
  'gregorian_year',
  'islamic_year',
  'sultan_name',
  'printer',
  'type',
  'category',
  'rarity',
  'banknote_description',
  'historical_description',
  'extended_pick_number',
  'pick_number',
  'denomination',
  'series',
  'description',
  'name',
];

const BanknotesManagement: React.FC<BanknotesManagementProps> = ({
  countryId: initialCountryId,
  countryName,
  isCountryAdmin,
  disableCountrySelect
}) => {
  const [allBanknotes, setAllBanknotes] = useState<Banknote[]>([]);
  const [filteredBanknotes, setFilteredBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedBanknote, setSelectedBanknote] = useState<Banknote | null>(null);
  const [isNewBanknote, setIsNewBanknote] = useState<boolean>(false);
  const [selectedBanknoteId, setSelectedBanknoteId] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  
  const PAGE_SIZE = 10;

  // Use the sorting hook
  const sortedBanknotes = useBanknoteSorting({
    banknotes: filteredBanknotes,
    currencies,
    sortFields: ['extPick']
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedBanknotes.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedBanknotes = sortedBanknotes.slice(startIndex, endIndex);

  useEffect(() => {
    const loadCountries = async () => {
      if (isCountryAdmin && initialCountryId) {
        // For country admins, only fetch their assigned country
        const { data: country, error } = await supabase
          .from('countries')
          .select('*')
          .eq('id', initialCountryId)
          .single();
        
        if (!error && country) {
          setCountries([country]);
          setSelectedCountryId(country.id);
        }
      } else {
        // For super admins, fetch all countries
        const { data: countriesData, error } = await supabase
          .from('countries')
          .select('id, name')
          .order('name');
        
        if (!error && countriesData) {
          setCountries(countriesData);
          
          if (countriesData.length > 0 && !selectedCountryId) {
            setSelectedCountryId(countriesData[0].id);
          }
        }
      }
    };
    
    loadCountries();
  }, [initialCountryId, isCountryAdmin, selectedCountryId]);

  useEffect(() => {
    if (selectedCountryId) {
      fetchBanknotes();
      fetchCurrencies();
    }
  }, [selectedCountryId]);

  useEffect(() => {
    // Filter banknotes based on search query
    if (!searchQuery.trim()) {
      setFilteredBanknotes(allBanknotes);
    } else {
      const filtered = allBanknotes.filter(banknote => {
        const searchLower = searchQuery.toLowerCase();
        return (
          banknote.catalogId?.toLowerCase().includes(searchLower) ||
          banknote.country?.toLowerCase().includes(searchLower) ||
          banknote.denomination?.toLowerCase().includes(searchLower) ||
          banknote.year?.toLowerCase().includes(searchLower) ||
          banknote.description?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredBanknotes(filtered);
    }
    
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchQuery, allBanknotes]);

  const fetchCurrencies = async () => {
    if (!selectedCountryId) return;
    
    try {
      const { data: currencyRows, error: currencyError } = await supabase
        .from("currencies")
        .select("id, name, display_order, country_id")
        .eq("country_id", selectedCountryId)
        .order("display_order", { ascending: true });

      if (currencyError) {
        console.error("Error fetching currencies:", currencyError);
        setCurrencies([]);
      } else if (currencyRows) {
        setCurrencies(currencyRows as Currency[]);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setCurrencies([]);
    }
  };

  const fetchBanknotes = async () => {
    if (!selectedCountryId) return;
    
    setLoading(true);
    try {
      // Get the selected country name
      const selectedCountry = countries.find(c => c.id === selectedCountryId);
      if (!selectedCountry) {
        setLoading(false);
        return;
      }

      // Fetch ALL banknotes for the selected country
      const { data, error } = await supabase
        .from('detailed_banknotes')
        .select('*')
        .eq('country', selectedCountry.name);

      if (error) throw error;

      // Transform to Banknote format
      const transformedData = data.map(item => ({
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
      }));

      setAllBanknotes(transformedData);
    } catch (error) {
      console.error('Error fetching banknotes:', error);
      toast.error('Failed to load banknotes');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountryId(value);
    setCurrentPage(1); // Reset to first page when country changes
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

      setAllBanknotes(prevBanknotes => 
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
    setAllBanknotes(prev => 
      prev.map(b => b.id === updatedBanknote.id ? updatedBanknote : b)
    );
    setIsEditDialogOpen(false);
  };

  const handleBanknoteCreated = (newBanknote: Banknote) => {
    setAllBanknotes(prev => [newBanknote, ...prev]);
    setIsEditDialogOpen(false);
    toast.success('New banknote created successfully');
  };

  const handleViewBanknote = (banknote: Banknote) => {
    setSelectedBanknoteId(banknote.id);
  };

  return (
    <div>
      {!disableCountrySelect && (
        <div className="mb-6">
          <Label htmlFor="country-select" className="text-lg font-medium mb-2 block">
            Select Country
          </Label>
          <Select 
            value={selectedCountryId}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCountryId && (
        <>
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
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedBanknotes.length)} of {sortedBanknotes.length} banknotes
              </div>
            
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>View</TableHead>
                      <TableHead>Extended Pick</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Denomination</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBanknotes.length > 0 ? (
                      paginatedBanknotes.map((banknote) => (
                        <TableRow key={banknote.id}>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewBanknote(banknote)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" /> View
                            </Button>
                          </TableCell>
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
                        <TableCell colSpan={7} className="text-center py-10">
                          No banknotes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
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

          {/* Dialog for banknote details */}
          <Dialog open={selectedBanknoteId !== null} onOpenChange={() => setSelectedBanknoteId(null)}>
            <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[90vh] overflow-y-auto">
              {selectedBanknoteId && (
                <BanknoteDetailDialog id={selectedBanknoteId} />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default BanknotesManagement;
