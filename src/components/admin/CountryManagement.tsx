import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Edit, Plus, Trash2, Save, X } from 'lucide-react';

const CountryManagement: React.FC = () => {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [countryForm, setCountryForm] = useState({ name: '', description: '' });
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries();
  }, []);

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
          description: countryForm.description,
          updated_at: new Date().toISOString()
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

  const handleEditCountry = (country: Country) => {
    setCountryForm({
      name: country.name,
      description: country.description || '',
    });
    setIsEditing(country.id);
  };

  const handleAddButtonClick = () => {
    setCountryForm({ name: '', description: '' });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Country Management</CardTitle>
        <CardDescription>
          Manage the countries in the banknote catalog.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderCountriesTab()}
      </CardContent>
    </Card>
  );
};

export default CountryManagement;
