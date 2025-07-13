
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BanknoteType {
  id: string;
  name: string;
  description?: string;
}

interface TypesManagerProps {
  countryId: string;
}

const TypesManager: React.FC<TypesManagerProps> = ({ countryId }) => {
  const [types, setTypes] = useState<BanknoteType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const { toast } = useToast();

  const fetchTypes = async () => {
    console.log('Fetching types for country:', countryId);
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    
    setLoading(true);
    try {
      toast({
        title: "Success",
        description: "Type added successfully",
      });
      setNewTypeName('');
      fetchTypes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countryId) {
      fetchTypes();
    }
  }, [countryId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Types Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
            />
            <Button onClick={handleAddType} disabled={loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TypesManager;
