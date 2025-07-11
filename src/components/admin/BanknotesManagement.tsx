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
import { Search, Loader2, Plus, Edit, Check, X, Eye, Upload, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import BanknoteEditDialog from './BanknoteEditDialog';
import BanknoteDetailDialog from './BanknoteDetailDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AdminComponentProps } from '@/types/admin';
import { useBanknoteSorting } from '@/hooks/use-banknote-sorting';
import { Currency } from '@/types/banknote';
import { importBanknoteData } from '@/scripts/importBanknoteData';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { user } = useAuth();
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [banknoteToDelete, setBanknoteToDelete] = useState<Banknote | null>(null);
  
  const PAGE_SIZE = 10;

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'Super Admin';

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
    // Filter banknotes based on search query with prioritization
    if (!searchQuery.trim()) {
      setFilteredBanknotes(allBanknotes);
    } else {
      const searchLower = searchQuery.toLowerCase();
      
      // Separate banknotes into priority groups
      const exactExtPickMatches = [];
      const partialExtPickMatches = [];
      const otherMatches = [];
      
      allBanknotes.forEach(banknote => {
        const extPick = banknote.extendedPickNumber?.toLowerCase() || '';
        const matchesSearch = (
          extPick.includes(searchLower) ||
          banknote.country?.toLowerCase().includes(searchLower) ||
          banknote.denomination?.toLowerCase().includes(searchLower) ||
          banknote.year?.toLowerCase().includes(searchLower) ||
          banknote.description?.toLowerCase().includes(searchLower)
        );
        
        if (matchesSearch) {
          if (extPick === searchLower) {
            // Exact match with extended pick number
            exactExtPickMatches.push(banknote);
          } else if (extPick.includes(searchLower)) {
            // Partial match with extended pick number
            partialExtPickMatches.push(banknote);
          } else {
            // Matches other fields
            otherMatches.push(banknote);
          }
        }
      });
      
      // Combine results with priority order
      const filtered = [
        ...exactExtPickMatches,
        ...partialExtPickMatches,
        ...otherMatches
      ];
      
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
        extendedPickNumber: item.extended_pick_number,
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
        createdBy: '',
        type: item.type || '',
        sultanName: item.sultan_name || '',
        category: item.category || ''
      })) as unknown as Banknote[];

      setAllBanknotes(transformedData);
    } catch (error) {
      console.error('Error fetching banknotes:', error);
      toast.error('Failed to load banknotes');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast.error('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);
    try {
      const csvText = await csvFile.text();
      const result = await importBanknoteData(csvText);
      
      // Show success toast with import stats
      toast.success(
        `Import completed:\n` +
        `✓ ${result.importedCount} banknotes imported\n` +
        `⚠ ${result.skippedCount} duplicates skipped\n` +
        `${result.errors.length > 0 ? `⚠ ${result.errors.length} errors` : ''}`
      );

      // If there are errors, show them in a separate toast
      if (result.errors.length > 0) {
        toast.warning(
          'Import completed with warnings. Check the console for details.',
          {
            duration: 5000,
          }
        );
        console.log('Import errors:', result.errors);
      }
      
      setCsvFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh banknotes list
      fetchBanknotes();
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error('Failed to import CSV data. Please check the file format.');
    } finally {
      setUploading(false);
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

  const handleDeleteBanknote = async (banknote: Banknote) => {
    try {
      const { error } = await supabase
        .from('detailed_banknotes')
        .delete()
        .eq('id', banknote.id);

      if (error) throw error;

      setAllBanknotes(prevBanknotes => 
        prevBanknotes.filter(b => b.id !== banknote.id)
      );

      toast.success('Banknote deleted successfully');
      setBanknoteToDelete(null);
    } catch (error) {
      console.error('Error deleting banknote:', error);
      toast.error('Failed to delete banknote');
    }
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
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="relative"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {csvFile ? csvFile.name : 'Select CSV'}
                      </>
                    )}
                  </Button>
                  {csvFile && !uploading && (
                    <Button 
                      onClick={handleCsvUpload}
                      variant="default"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  )}
                </div>
              )}
              
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
                          <TableCell className="font-medium">{banknote.extendedPickNumber}</TableCell>
                          <TableCell>{banknote.country}</TableCell>
                          <TableCell>{banknote.denomination}</TableCell>
                          <TableCell>{banknote.year}</TableCell>
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
                                variant="destructive"
                                onClick={() => setBanknoteToDelete(banknote)}
                              >
                                <Trash2 className="h-4 w-4" />
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
              banknote={selectedBanknote as unknown as DetailedBanknote}
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

          {/* Delete Confirmation Dialog */}
          <AlertDialog 
            open={banknoteToDelete !== null} 
            onOpenChange={() => setBanknoteToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle><span>Are you sure?</span></AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the banknote with ext.Pick: {banknoteToDelete?.extendedPickNumber}. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => banknoteToDelete && handleDeleteBanknote(banknoteToDelete)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default BanknotesManagement;
