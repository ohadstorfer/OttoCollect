import { updateCategoryDefinition } from '@/services/adminService';

const handleEdit = async (id: string, newName: string, oldName: string) => {
  setLoading(true);
  try {
    const result = await updateCategoryDefinition(id, newName, oldName);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast({
      title: "Success",
      description: "Category updated successfully",
    });
    // Refresh the categories list
    fetchCategories();
  } catch (error) {
    console.error('Error updating category:', error);
    toast({
      title: "Error",
      description: "Failed to update category",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}; 