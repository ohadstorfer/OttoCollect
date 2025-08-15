import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FixedSortOptionsManagerProps {
  sortOptions: any[];
  countryId: string;
  onSortOptionCreated: (option: any) => void;
  onSortOptionUpdated: (id: string, option: any) => void;
  onSortOptionDeleted: (id: string) => void;
  fetchSortOptions: () => void;
}

export function FixedSortOptionsManager({
  sortOptions,
  countryId,
  onSortOptionCreated,
  onSortOptionUpdated,
  onSortOptionDeleted,
  fetchSortOptions
}: FixedSortOptionsManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');

  const handleCreateSortOption = async () => {
    if (!newOptionName.trim() || !newFieldName.trim()) {
      toast.error('Both name and field name are required');
      return;
    }

    setIsLoading(true);
    try {
      const newOption = { 
        name: newOptionName.trim(),
        field_name: newFieldName.trim(),
        country_id: countryId,
        display_order: sortOptions.length + 1,
        is_default: false,
        is_required: false
      };
      onSortOptionCreated(newOption);
      setNewOptionName('');
      setNewFieldName('');
      fetchSortOptions();
      toast.success('Sort option created successfully');
    } catch (error) {
      console.error('Error creating sort option:', error);
      toast.error('Failed to create sort option');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newOptionName}
          onChange={(e) => setNewOptionName(e.target.value)}
          placeholder="Option name"
          disabled={isLoading}
        />
        <Input
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          placeholder="Field name"
          disabled={isLoading}
        />
        <Button onClick={handleCreateSortOption} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      
      <div className="space-y-2">
        {sortOptions.map((option) => (
          <div key={option.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <span className="font-medium">{option.name}</span>
              <span className="text-sm text-gray-500 ml-2">({option.field_name})</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onSortOptionDeleted(option.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}