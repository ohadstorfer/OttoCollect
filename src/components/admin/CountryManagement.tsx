import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Country, CategoryDefinition, TypeDefinition, SortOption } from '@/types/filter';
import { Edit, Plus, Trash2, Save, X } from 'lucide-react';
import { Switch } from "@/components/ui/switch";

const TABS = {
  COUNTRIES: 'countries',
  CATEGORIES: 'categories',
  TYPES: 'types',
  SORT_OPTIONS: 'sortOptions',
};

const CountryManagement: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(TABS.COUNTRIES);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [types, setTypes] = useState<TypeDefinition[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [countryForm, setCountryForm] = useState({ name: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', display_order: 0 });
  const [typeForm, setTypeForm] = useState({ name: '', description: '', display_order: 0 });
  const [sortForm, setSortForm] = useState({ 
    name: '', 
    field_name: '', 
    description: '', 
    is_required: false,
    is_default: false,
    display_order: 0
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountryId) {
      fetchCategoriesByCountry(selectedCountryId);
      fetchTypesByCountry(selectedCountryId);
      fetchSortOptionsByCountry(selectedCountryId);
    } else {
      setCategories([]);
      setTypes([]);
      setSortOptions([]);
    }
  }, [selectedCountryId]);

  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setCountries(data || []);
      if (data && data.length > 0 && !selectedCountryId) {
        setSelectedCountryId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast({ title: "Error", description: "Failed to fetch countries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoriesByCountry = async (countryId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_category_definitions')
        .select('*')
        .eq('country_id', countryId)
        .order('display_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({ title: "Error", description: "Failed to fetch categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTypesByCountry = async (countryId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_type_definitions')
        .select('*')
        .eq('country_id', countryId)
        .order('display_order');
      
      if (error) throw error;
      setTypes(data || []);
    } catch (error) {
      console.error('Error fetching types:', error);
      toast({ title: "Error", description: "Failed to fetch types.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSortOptionsByCountry = async (countryId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_sort_options')
        .select('*')
        .eq('country_id', countryId)
        .order('display_order');
      
      if (error) throw error;
      setSortOptions(data || []);
    } catch (error) {
      console.error('Error fetching sort options:', error);
      toast({ title: "Error", description: "Failed to fetch sort options.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addCountry = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('countries')
        .insert([{ 
          name: countryForm.name, 
          description: countryForm.description
        }])
        .select();
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Country added successfully." });
      fetchCountries();
      setCountryForm({ name: '', description: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding country:', error);
      toast({ title: "Error", description: "Failed to add country.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCountry = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('countries')
        .update({ 
          name: countryForm.name, 
          description: countryForm.description
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Country updated successfully." });
      fetchCountries();
      setCountryForm({ name: '', description: '' });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating country:', error);
      toast({ title: "Error", description: "Failed to update country.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCountry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this country? This will delete all related categories, types, and sort options.")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Country deleted successfully." });
      fetchCountries();
      if (selectedCountryId === id) {
        setSelectedCountryId(null);
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      toast({ title: "Error", description: "Failed to delete country.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async () => {
    if (!selectedCountryId) {
      toast({ title: "Error", description: "Please select a country first.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_category_definitions')
        .insert([{ 
          name: categoryForm.name, 
          description: categoryForm.description,
          display_order: parseInt(String(categoryForm.display_order)) || 0,
          country_id: selectedCountryId
        }])
        .select();
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Category added successfully." });
      fetchCategoriesByCountry(selectedCountryId);
      setCategoryForm({ name: '', description: '', display_order: 0 });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding category:', error);
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategory = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_category_definitions')
        .update({ 
          name: categoryForm.name, 
          description: categoryForm.description,
          display_order: parseInt(String(categoryForm.display_order)) || 0
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Category updated successfully." });
      fetchCategoriesByCountry(selectedCountryId!);
      setCategoryForm({ name: '', description: '', display_order: 0 });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: "Error", description: "Failed to update category.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_category_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Category deleted successfully." });
      fetchCategoriesByCountry(selectedCountryId!);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addType = async () => {
    if (!selectedCountryId) {
      toast({ title: "Error", description: "Please select a country first.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_type_definitions')
        .insert([{ 
          name: typeForm.name, 
          description: typeForm.description,
          display_order: parseInt(String(typeForm.display_order)) || 0,
          country_id: selectedCountryId
        }])
        .select();
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Type added successfully." });
      fetchTypesByCountry(selectedCountryId);
      setTypeForm({ name: '', description: '', display_order: 0 });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding type:', error);
      toast({ title: "Error", description: "Failed to add type.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateType = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_type_definitions')
        .update({ 
          name: typeForm.name, 
          description: typeForm.description,
          display_order: parseInt(String(typeForm.display_order)) || 0
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Type updated successfully." });
      fetchTypesByCountry(selectedCountryId!);
      setTypeForm({ name: '', description: '', display_order: 0 });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating type:', error);
      toast({ title: "Error", description: "Failed to update type.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this type?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_type_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Type deleted successfully." });
      fetchTypesByCountry(selectedCountryId!);
    } catch (error) {
      console.error('Error deleting type:', error);
      toast({ title: "Error", description: "Failed to delete type.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addSortOption = async () => {
    if (!selectedCountryId) {
      toast({ title: "Error", description: "Please select a country first.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('banknote_sort_options')
        .insert([{ 
          name: sortForm.name, 
          field_name: sortForm.field_name,
          description: sortForm.description,
          is_required: sortForm.is_required,
          is_default: sortForm.is_default,
          display_order: parseInt(String(sortForm.display_order)) || 0,
          country_id: selectedCountryId
        }])
        .select();
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Sort option added successfully." });
      fetchSortOptionsByCountry(selectedCountryId);
      setSortForm({ 
        name: '', 
        field_name: '', 
        description: '', 
        is_required: false,
        is_default: false,
        display_order: 0
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding sort option:', error);
      toast({ title: "Error", description: "Failed to add sort option.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSortOption = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_sort_options')
        .update({ 
          name: sortForm.name, 
          field_name: sortForm.field_name,
          description: sortForm.description,
          is_required: sortForm.is_required,
          is_default: sortForm.is_default,
          display_order: parseInt(String(sortForm.display_order)) || 0
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Sort option updated successfully." });
      fetchSortOptionsByCountry(selectedCountryId!);
      setSortForm({ 
        name: '', 
        field_name: '', 
        description: '', 
        is_required: false,
        is_default: false,
        display_order: 0
      });
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating sort option:', error);
      toast({ title: "Error", description: "Failed to update sort option.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSortOption = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sort option?")) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('banknote_sort_options')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Sort option deleted successfully." });
      fetchSortOptionsByCountry(selectedCountryId!);
    } catch (error) {
      console.error('Error deleting sort option:', error);
      toast({ title: "Error", description: "Failed to delete sort option.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCountry = (country: Country) => {
    setCountryForm({
      name: country.name,
      description: country.description || '',
    });
    setIsEditing(country.id);
  };

  const handleEditCategory = (category: CategoryDefinition) => {
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order
    });
    setIsEditing(category.id);
  };

  const handleEditType = (type: TypeDefinition) => {
    setTypeForm({
      name: type.name,
      description: type.description || '',
      display_order: type.display_order
    });
    setIsEditing(type.id);
  };

  const handleEditSortOption = (sort: SortOption) => {
    setSortForm({
      name: sort.name,
      field_name: sort.field_name,
      description: sort.description || '',
      is_required: sort.is_required,
      is_default: sort.is_default,
      display_order: sort.display_order
    });
    setIsEditing(sort.id);
  };

  const resetForms = () => {
    setCountryForm({ name: '', description: '' });
    setCategoryForm({ name: '', description: '', display_order: 0 });
    setTypeForm({ name: '', description: '', display_order: 0 });
    setSortForm({ 
      name: '', 
      field_name: '', 
      description: '', 
      is_required: false,
      is_default: false,
      display_order: 0
    });
    setIsEditing(null);
    setIsDialogOpen(false);
  };

  const handleAddButtonClick = () => {
    resetForms();
    setIsDialogOpen(true);
  };

  const renderCountriesTab = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Countries</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddButtonClick} variant="primary">
              <Plus className="mr-2 h-4 w-4" /> Add Country
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Country</DialogTitle>
              <DialogDescription>
                Add a new country to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Country Name</Label>
                <Input
                  id="name"
                  value={countryForm.name}
                  onChange={(e) => setCountryForm({...countryForm, name: e.target.value})}
                  placeholder="Enter country name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={countryForm.description}
                  onChange={(e) => setCountryForm({...countryForm, description: e.target.value})}
                  placeholder="Enter country description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={addCountry}
                disabled={isLoading || !countryForm.name}
              >
                {isLoading ? "Adding..." : "Add Country"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {countries.map((country) => (
            <TableRow key={country.id} className={selectedCountryId === country.id ? "bg-muted/50" : ""}>
              <TableCell>
                {isEditing === country.id ? (
                  <Input
                    value={countryForm.name}
                    onChange={(e) => setCountryForm({...countryForm, name: e.target.value})}
                    className="w-full"
                  />
                ) : (
                  <div 
                    className="cursor-pointer font-medium"
                    onClick={() => setSelectedCountryId(country.id)}
                  >
                    {country.name}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {isEditing === country.id ? (
                  <Input
                    value={countryForm.description}
                    onChange={(e) => setCountryForm({...countryForm, description: e.target.value})}
                    className="w-full"
                  />
                ) : (
                  <div onClick={() => setSelectedCountryId(country.id)}>
                    {country.description || "-"}
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
          ))}
          {countries.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No countries found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );

  const renderCategoriesTab = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <h2 className="text-xl font-bold">Categories</h2>
          <span className="text-sm text-muted-foreground">
            for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
          </span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAddButtonClick} 
              variant="primary" 
              disabled={!selectedCountryId}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Add a new category for {countries.find(c => c.id === selectedCountryId)?.name || "selected country"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  placeholder="Enter category name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  placeholder="Enter category description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={addCategory}
                disabled={isLoading || !categoryForm.name}
              >
                {isLoading ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedCountryId ? (
        <div className="p-4 border rounded-md text-center">
          Please select a country first.
        </div>
      ) : (
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {isEditing === category.id ? (
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    category.name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === category.id ? (
                    <Input
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    category.description || "-"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === category.id ? (
                    <Input
                      type="number"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
                      className="w-32"
                    />
                  ) : (
                    category.display_order
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing === category.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateCategory(category.id)}
                        disabled={isLoading || !categoryForm.name}
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
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No categories found for this country.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );

  const renderTypesTab = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <h2 className="text-xl font-bold">Types</h2>
          <span className="text-sm text-muted-foreground">
            for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
          </span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAddButtonClick} 
              variant="primary" 
              disabled={!selectedCountryId}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Type</DialogTitle>
              <DialogDescription>
                Add a new banknote type for {countries.find(c => c.id === selectedCountryId)?.name || "selected country"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Type Name</Label>
                <Input
                  id="name"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
                  placeholder="Enter type name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({...typeForm, description: e.target.value})}
                  placeholder="Enter type description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={typeForm.display_order}
                  onChange={(e) => setTypeForm({...typeForm, display_order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={addType}
                disabled={isLoading || !typeForm.name}
              >
                {isLoading ? "Adding..." : "Add Type"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedCountryId ? (
        <div className="p-4 border rounded-md text-center">
          Please select a country first.
        </div>
      ) : (
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  {isEditing === type.id ? (
                    <Input
                      value={typeForm.name}
                      onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    type.name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === type.id ? (
                    <Input
                      value={typeForm.description}
                      onChange={(e) => setTypeForm({...typeForm, description: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    type.description || "-"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === type.id ? (
                    <Input
                      type="number"
                      value={typeForm.display_order}
                      onChange={(e) => setTypeForm({...typeForm, display_order: parseInt(e.target.value) || 0})}
                      className="w-32"
                    />
                  ) : (
                    type.display_order
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing === type.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateType(type.id)}
                        disabled={isLoading || !typeForm.name}
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
                        onClick={() => handleEditType(type)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteType(type.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No types found for this country.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );

  const renderSortOptionsTab = () => (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <h2 className="text-xl font-bold">Sort Options</h2>
          <span className="text-sm text-muted-foreground">
            for {countries.find(c => c.id === selectedCountryId)?.name || "Selected Country"}
          </span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleAddButtonClick} 
              variant="primary" 
              disabled={!selectedCountryId}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Sort Option
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sort Option</DialogTitle>
              <DialogDescription>
                Add a new sort option for {countries.find(c => c.id === selectedCountryId)?.name || "selected country"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sort Option Name</Label>
                <Input
                  id="name"
                  value={sortForm.name}
                  onChange={(e) => setSortForm({...sortForm, name: e.target.value})}
                  placeholder="Enter sort option name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldName">Field Name</Label>
                <Input
                  id="fieldName"
                  value={sortForm.field_name}
                  onChange={(e) => setSortForm({...sortForm, field_name: e.target.value})}
                  placeholder="Enter field name (e.g. 'year', 'sultan')"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={sortForm.description}
                  onChange={(e) => setSortForm({...sortForm, description: e.target.value})}
                  placeholder="Enter description (optional)"
                  rows={2}
                />
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="isRequired" className="cursor-pointer">Is Required</Label>
                <Switch
                  id="isRequired"
                  checked={sortForm.is_required}
                  onCheckedChange={(checked) => setSortForm({...sortForm, is_required: checked})}
                />
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="isDefault" className="cursor-pointer">Is Default</Label>
                <Switch
                  id="isDefault"
                  checked={sortForm.is_default}
                  onCheckedChange={(checked) => setSortForm({...sortForm, is_default: checked})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortDisplayOrder">Display Order</Label>
                <Input
                  id="sortDisplayOrder"
                  type="number"
                  min="0"
                  value={sortForm.display_order}
                  onChange={(e) => setSortForm({...sortForm, display_order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={addSortOption}
                disabled={isLoading || !sortForm.name || !sortForm.field_name}
              >
                {isLoading ? "Adding..." : "Add Sort Option"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedCountryId ? (
        <div className="p-4 border rounded-md text-center">
          Please select a country first.
        </div>
      ) : (
        <Table className="border">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Field Name</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortOptions.map((sort) => (
              <TableRow key={sort.id}>
                <TableCell>
                  {isEditing === sort.id ? (
                    <Input
                      value={sortForm.name}
                      onChange={(e) => setSortForm({...sortForm, name: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    sort.name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === sort.id ? (
                    <Input
                      value={sortForm.field_name}
                      onChange={(e) => setSortForm({...sortForm, field_name: e.target.value})}
                      className="w-full"
                    />
                  ) : (
                    sort.field_name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === sort.id ? (
                    <Switch
                      checked={sortForm.is_required}
                      onCheckedChange={(checked) => setSortForm({...sortForm, is_required: checked})}
                    />
                  ) : (
                    sort.is_required ? "Yes" : "No"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === sort.id ? (
                    <Switch
                      checked={sortForm.is_default}
                      onCheckedChange={(checked) => setSortForm({...sortForm, is_default: checked})}
                    />
                  ) : (
                    sort.is_default ? "Yes" : "No"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing === sort.id ? (
                    <Input
                      type="number"
                      value={sortForm.display_order}
                      onChange={(e) => setSortForm({...sortForm, display_order: parseInt(e.target.value) || 0})}
                      className="w-20"
                    />
                  ) : (
                    sort.display_order
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isEditing === sort.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateSortOption(sort.id)}
                        disabled={isLoading || !sortForm.name || !sortForm.field_name}
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
                        onClick={() => handleEditSortOption(sort)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSortOption(sort.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {sortOptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No sort options found for this country.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Country & Filter Management</CardTitle>
        <CardDescription>
          Manage countries, categories, types, and sort options for the banknote catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value={TABS.COUNTRIES}>Countries</TabsTrigger>
            <TabsTrigger value={TABS.CATEGORIES}>Categories</TabsTrigger>
            <TabsTrigger value={TABS.TYPES}>Types</TabsTrigger>
            <TabsTrigger value={TABS.SORT_OPTIONS}>Sort Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value={TABS.COUNTRIES}>
            {renderCountriesTab()}
          </TabsContent>
          
          <TabsContent value={TABS.CATEGORIES}>
            {renderCategoriesTab()}
          </TabsContent>
          
          <TabsContent value={TABS.TYPES}>
            {renderTypesTab()}
          </TabsContent>
          
          <TabsContent value={TABS.SORT_OPTIONS}>
            {renderSortOptionsTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CountryManagement;
