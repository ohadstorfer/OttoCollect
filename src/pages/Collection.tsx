import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, Plus, Filter } from 'lucide-react';
import CollectionItemCard from '@/components/collection/CollectionItemCard';
import { fetchCollectionItems, updateCollectionItem } from '@/services/collectionService';
import { CollectionItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchCountries } from '@/services/countryService';
import { CountryData } from '@/types';
import CollectionItemForm from '@/components/collection/CollectionItemForm';

interface CollectionItemWithBanknote extends CollectionItem {
  banknote: {
    country: string;
    denomination: string;
    year: string;
    pickNumber: string;
  };
}

const Collection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItemWithBanknote[]>([]);
  const [filteredItems, setFilteredItems] = useState<CollectionItemWithBanknote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadCollection = async () => {
      setLoading(true);
      try {
        const items = await fetchCollectionItems(user.id);
        setCollectionItems(items);
        setFilteredItems(items);
      } catch (error) {
        console.error('Error fetching collection items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCollection();

    const loadCountries = async () => {
      try {
        const countryList = await fetchCountries();
        setCountries(countryList);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    loadCountries();
  }, [user, navigate]);

  useEffect(() => {
    let items = [...collectionItems];

    if (selectedCountry) {
      items = items.filter(item => item.banknote.country === selectedCountry);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.banknote.denomination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.banknote.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.banknote.year.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.banknote.pickNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(items);
  }, [collectionItems, searchTerm, selectedCountry]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId === 'all' ? null : countryId);
  };

  const handleUpdate = () => {
    // Trigger refetch of data
    window.location.reload();
  };

  const handleEditItem = (item: CollectionItem) => {
    setEditingItem(item);
  };

  const handleSaveItem = async (updatedItem: CollectionItem) => {
    try {
      await updateCollectionItem(updatedItem.id, updatedItem);
      setEditingItem(null);
      handleUpdate();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  return (
    <div>
      <section className={`${theme === 'light' ? 'bg-ottoman-100' : 'bg-dark-600'} py-12 relative overflow-hidden`}>
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] ${theme === 'light'
            ? 'bg-ottoman-500/10 shadow-ottoman-300/20 ring-ottoman-400/10'
            : 'bg-dark-500/40 shadow-ottoman-900/20 ring-ottoman-900/10'
            } shadow-xl ring-1 ring-inset`} aria-hidden="true" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">
          <h1 className={`text-3xl md:text-4xl font-serif font-bold text-center ${theme === 'light' ? 'text-ottoman-900' : 'text-parchment-500'} fade-bottom`}>
            My Collection
          </h1>
        </div>
        <p className={`mt-4 text-center ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-300'} max-w-2xl mx-auto fade-bottom`}>
          Browse and manage your banknote collection
        </p>
      </section>

      <div className="page-container">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="all" className="mb-10">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <TabsList className="shrink-0">
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="unlisted">Unlisted</TabsTrigger>
              </TabsList>

              <div className="flex items-center space-x-2">
                <Select onValueChange={handleCountryChange} defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search collection..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
              </div>
            </div>

            <TabsContent value="all" className="mt-8">
              {loading ? (
                <div className="text-center py-10">
                  <p>Loading collection items...</p>
                </div>
              ) : (
                <>
                  {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredItems.map((item) => (
                        <CollectionItemCard
                          key={item.id}
                          collectionItem={item}
                          isOwner={true}
                          onUpdate={handleUpdate}
                          onEdit={() => handleEditItem(item)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      {searchTerm || selectedCountry ? (
                        <p>No items found matching your search and filters.</p>
                      ) : (
                        <p>Your collection is empty. Start adding banknotes!</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="unlisted" className="mt-8">
              <div className="text-center py-10">
                <p>Unlisted banknotes will be shown here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <CollectionItemForm
                item={editingItem}
                onCancel={() => setEditingItem(null)}
                onSaveComplete={() => {
                  setEditingItem(null);
                  handleUpdate();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collection;
