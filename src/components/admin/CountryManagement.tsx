import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Country } from '@/types/filter';
import { Edit, Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import SimpleCountryImageUpload from './SimpleCountryImageUpload';
import { ImageIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';

interface ExtendedCountry extends Country {
  display_order: number;
}

const CountryManagement: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { toast } = useToast();
  const [countries, setCountries] = useState<ExtendedCountry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [countryForm, setCountryForm] = useState({ 
    name: '', 
    image_url: '' 
  });
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      
      setCountries(data || []);
      if (data && data.length > 0 && !selectedCountryId) {
        setSelectedCountryId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({ title: t('countryManagement.error'), description: t('countryManagement.failedToFetchCountries'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addCountry = async () => {
    console.log('Starting addCountry process with form data:', countryForm);
    
    if (!countryForm.name.trim()) {
      toast({ title: t('countryManagement.error'), description: t('countryManagement.countryNameRequired'), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting to insert new country into database...');
      const { data: countryData, error } = await supabase
        .from('countries')
        .insert([{ 
          name: countryForm.name, 
          image_url: countryForm.image_url,
          display_order: countries.length // Add at the end
        }])
        .select();
      
      if (error) {
        console.error('Error inserting country:', error);
        throw error;
      }
      
      console.log('Country inserted successfully:', countryData);
      
      const newCountry = countryData[0];

      // Check if role already exists before creating
      console.log('Checking for existing admin role...');
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', `${countryForm.name} Admin`)
        .single();

      if (!existingRole) {
        console.log('Creating new admin role...');
        const { error: roleError } = await supabase
          .from('roles')
          .insert([{
            name: `${countryForm.name} Admin`,
            is_country_admin: true
          }]);

        if (roleError) {
          console.error('Error creating role:', roleError);
          toast({ title: "Warning", description: "Country created but role creation failed.", variant: "destructive" });
        }
      }
      
      toast({ title: t('countryManagement.success'), description: t('countryManagement.countryAdded') });
      await fetchCountries();
      setCountryForm({ name: '', image_url: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error in addCountry:', error);
      toast({ title: "Error", description: "Failed to add country.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCountry = async (id: string) => {
    console.log('Starting updateCountry process:', { id, formData: countryForm });
    
    if (!countryForm.name.trim()) {
      toast({ title: t('countryManagement.error'), description: t('countryManagement.countryNameRequired'), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting to update country in database...');
      const { error } = await supabase
        .from('countries')
        .update({ 
          name: countryForm.name, 
          image_url: countryForm.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating country:', error);
        throw error;
      }
      
      console.log('Country updated successfully');
      toast({ title: t('countryManagement.success'), description: t('countryManagement.countryUpdated') });
      await fetchCountries();
      setCountryForm({ name: '', image_url: '' });
      setIsEditing(null);
    } catch (error) {
      console.error('Error in updateCountry:', error);
      toast({ title: t('countryManagement.error'), description: t('countryManagement.failedToUpdateCountry'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCountry = async (id: string) => {
    console.log('Starting country deletion process for id:', id);
    if (!confirm(t('countryManagement.deleteConfirmDescription'))) {
      console.log('User cancelled deletion');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Attempting to delete country...');
      
      // First check if country exists
      const { data: existingCountry, error: checkError } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('Country check result:', { existingCountry, checkError });
      
      if (!existingCountry) {
        console.log('Country not found in database');
        throw new Error('Country not found');
      }

      // Get current sort options for verification
      const { data: currentSortOptions, error: sortOptionsCheckError } = await supabase
        .from('banknote_sort_options')
        .select('*')
        .eq('country_id', id);
      
      console.log('Current sort options:', { currentSortOptions, sortOptionsCheckError });

      // Get the authenticated user's role first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Current user:', { user, authError });

      // Delete in correct order to handle foreign key constraints
      
      // 1. Delete banknote type definitions
      console.log('Deleting banknote type definitions...');
      const { error: typeError } = await supabase
        .from('banknote_type_definitions')
        .delete()
        .eq('country_id', id);
      
      if (typeError) {
        console.error('Error deleting type definitions:', typeError);
        throw typeError;
      }

      // 2. Delete banknote category definitions
      console.log('Deleting banknote category definitions...');
      const { error: categoryError } = await supabase
        .from('banknote_category_definitions')
        .delete()
        .eq('country_id', id);
      
      if (categoryError) {
        console.error('Error deleting category definitions:', categoryError);
        throw categoryError;
      }

      // 3. Delete sort options
      console.log('Deleting sort options...');
      const { error: sortOptionsError } = await supabase
        .from('banknote_sort_options')
        .delete()
        .eq('country_id', id);
      
      if (sortOptionsError) {
        console.error('Error deleting sort options:', sortOptionsError);
        throw sortOptionsError;
      }

      // 4. Delete seal pictures
      console.log('Deleting seal pictures...');
      const { error: sealError } = await supabase
        .from('seal_pictures')
        .delete()
        .eq('country_id', id);
      
      if (sealError) {
        console.error('Error deleting seal pictures:', sealError);
        throw sealError;
      }

      // 5. Delete watermark pictures
      console.log('Deleting watermark pictures...');
      const { error: watermarkError } = await supabase
        .from('watermark_pictures')
        .delete()
        .eq('country_id', id);
      
      if (watermarkError) {
        console.error('Error deleting watermark pictures:', watermarkError);
        throw watermarkError;
      }

      // 6. Delete user filter preferences
      console.log('Deleting user filter preferences...');
      const { error: preferencesError } = await supabase
        .from('user_filter_preferences')
        .delete()
        .eq('country_id', id);
      
      if (preferencesError) {
        console.error('Error deleting user preferences:', preferencesError);
        throw preferencesError;
      }

      // Finally delete the country
      console.log('Deleting country...');
      const { error: deleteError } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Delete operation error details:', {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint
        });
        throw deleteError;
      }

      // Delete the country role
      const country = countries.find(c => c.id === id);
      if (country) {
        console.log('Deleting country role...');
        const { error: roleError } = await supabase
          .from('roles')
          .delete()
          .eq('name', `${country.name} Admin`);
        
        if (roleError) {
          console.error('Error deleting role:', roleError);
          // Don't throw here as role might not exist
        }
      }

      // Verify deletion
      const { data: verifyCountry, error: verifyError } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (verifyCountry) {
        console.warn('Country still exists after deletion!');
        throw new Error('Delete operation did not remove the country. You may not have sufficient permissions.');
      }
      
      toast({ title: t('countryManagement.success'), description: t('countryManagement.countryDeleted') });
      console.log('Delete operation completed successfully, refreshing countries list...');
      fetchCountries();
      if (selectedCountryId === id) {
        console.log('Resetting selected country ID');
        setSelectedCountryId(null);
      }
    } catch (error) {
      console.error('Error in delete process:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete country.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
      console.log('Delete process completed');
    }
  };

  const handleEditCountry = (country: ExtendedCountry) => {
    setCountryForm({
      name: country.name,
      image_url: country.image_url || ''
    });
    setIsEditing(country.id);
  };

  const handleAddButtonClick = () => {
    setCountryForm({ name: '', image_url: '' });
    setIsDialogOpen(true);
  };

  const handleDeleteImage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to remove this image?')) {
      setCountryForm(prev => ({ ...prev, image_url: '' }));
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(countries);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setIsLoading(true);
    try {
      // Update all items with new display orders
      for (const item of updatedItems) {
        await supabase
          .from('countries')
          .update({ display_order: item.display_order })
          .eq('id', item.id);
      }

      setCountries(updatedItems);
      toast({
        title: t('countryManagement.success'),
        description: t('countryManagement.countriesReordered'),
      });
    } catch (error) {
      console.error("Error reordering countries:", error);
      toast({
        title: "Error",
        description: "Failed to reorder countries",
        variant: "destructive",
      });
      fetchCountries(); // Reload original order on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle><span>{t('countryManagement.title')}</span></CardTitle>
        <CardDescription>
          {t('countryManagement.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold"><span>{t('countryManagement.title')}</span></h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddButtonClick} variant="primary">
                <Plus className="mr-2 h-4 w-4" /> {t('countryManagement.addCountry')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle><span>{t('countryManagement.addCountry')}</span></DialogTitle>
                <DialogDescription>
                  {t('countryManagement.description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('countryManagement.countryName')}</Label>
                  <Input
                    id="name"
                    value={countryForm.name}
                    onChange={(e) => setCountryForm({...countryForm, name: e.target.value})}
                    placeholder={t('countryManagement.countryName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('countryManagement.imageUrl')}</Label>
                  <SimpleCountryImageUpload
                    image={countryForm.image_url}
                    onImageUploaded={(url) => setCountryForm({...countryForm, image_url: url})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('countryManagement.cancel')}</Button>
                <Button
                  variant="primary"
                  onClick={addCountry}
                  disabled={isLoading || !countryForm.name}
                >
                  {isLoading ? t('countryManagement.adding') : t('countryManagement.addCountry')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>{t('countryManagement.tableHeaders.order')}</TableHead>
              <TableHead>{t('countryManagement.tableHeaders.name')}</TableHead>
              <TableHead>{t('countryManagement.tableHeaders.image')}</TableHead>
              <TableHead className="text-right">{t('countryManagement.tableHeaders.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="countries">
              {(provided, snapshot) => (
                <TableBody
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {countries.map((country, index) => (
                    <Draggable
                      key={country.id}
                      draggableId={country.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${selectedCountryId === country.id ? "bg-muted/50" : ""} ${snapshot.isDragging ? "bg-muted" : ""} cursor-move`}
                        >
                          <TableCell>{country.display_order + 1}</TableCell>
                <TableCell>
                  {isEditing === country.id ? (
                    <Input
                      value={countryForm.name}
                      onChange={(e) => setCountryForm({...countryForm, name: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    <div className="font-medium">
                      {country.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === country.id ? (
                    <div className="w-32 h-32 relative">
                      <SimpleCountryImageUpload
                        image={countryForm.image_url}
                        onImageUploaded={(url) => {
                          console.log('New image URL received:', url);
                          setCountryForm({...countryForm, image_url: url});
                        }}
                      />
                      {countryForm.image_url && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleDeleteImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      {country.image_url ? (
                        <div 
                          className="w-32 h-32 rounded-md overflow-hidden bg-muted cursor-pointer transition-transform hover:scale-105"
                          onClick={() => setPreviewImage({ url: country.image_url!, name: country.name })}
                        >
                          <img 
                            src={country.image_url} 
                            alt={country.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing === country.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateCountry(country.id)}
                        disabled={isLoading || !countryForm.name}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCountry(country)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCountry(country.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
                      )}
                    </Draggable>
            ))}
                  {provided.placeholder}
            {countries.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No countries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
              )}
            </Droppable>
          </DragDropContext>
        </Table>

        {/* Image Preview Dialog */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl max-h-[80%] overflow-auto">
            <DialogHeader>
              <DialogTitle><span>{previewImage?.name}</span></DialogTitle>
            </DialogHeader>
            <div className="w-full">
              {previewImage && (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CountryManagement;