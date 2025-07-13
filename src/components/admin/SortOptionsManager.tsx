
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SortOption {
  id: string;
  name: string;
  field_name: string;
  is_default: boolean;
}

interface SortOptionsManagerProps {
  countryId: string;
}

const SortOptionsManager: React.FC<SortOptionsManagerProps> = ({ countryId }) => {
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const { toast } = useToast();

  const fetchSortOptions = async () => {
    console.log('Fetching sort options for country:', countryId);
  };

  const handleAddSortOption = async () => {
    if (!newOptionName.trim()) return;
    
    setLoading(true);
    try {
      toast({
        title: "Success",
        description: "Sort option added successfully",
      });
      setNewOptionName('');
      fetchSortOptions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add sort option",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countryId) {
      fetchSortOptions();
    }
  }, [countryId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sort Options Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Sort option name"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
            />
            <Button onClick={handleAddSortOption} disabled={loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SortOptionsManager;
