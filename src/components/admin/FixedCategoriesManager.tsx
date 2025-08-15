import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FixedCategoriesManagerProps {
  categories: any[];
  onCategoryCreated: (category: any) => void;
  onCategoryUpdated: (id: string, category: any) => void;
  onCategoryDeleted: (id: string) => void;
  fetchCategories: () => void;
}

export function FixedCategoriesManager({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  fetchCategories
}: FixedCategoriesManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsLoading(true);
    try {
      // Create category logic here
      const newCategory = { name: newCategoryName.trim() };
      onCategoryCreated(newCategory);
      setNewCategoryName('');
      fetchCategories();
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name"
          disabled={isLoading}
        />
        <Button onClick={handleCreateCategory} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-2 border rounded">
            <span>{category.name}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCategoryDeleted(category.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}