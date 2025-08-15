import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FixedTypesManagerProps {
  types: any[];
  onTypeCreated: (type: any) => void;
  onTypeUpdated: (id: string, type: any) => void;
  onTypeDeleted: (id: string) => void;
  fetchTypes: () => void;
}

export function FixedTypesManager({
  types,
  onTypeCreated,
  onTypeUpdated,
  onTypeDeleted,
  fetchTypes
}: FixedTypesManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Type name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newType = { name: newTypeName.trim() };
      onTypeCreated(newType);
      setNewTypeName('');
      fetchTypes();
      toast.success('Type created successfully');
    } catch (error) {
      console.error('Error creating type:', error);
      toast.error('Failed to create type');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder="Type name"
          disabled={isLoading}
        />
        <Button onClick={handleCreateType} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      
      <div className="space-y-2">
        {types.map((type) => (
          <div key={type.id} className="flex items-center justify-between p-2 border rounded">
            <span>{type.name}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onTypeDeleted(type.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}