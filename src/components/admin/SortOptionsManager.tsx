import { updateSortOption } from '@/services/adminService';

const handleEdit = async (id: string, newName: string) => {
  setLoading(true);
  try {
    const result = await updateSortOption(id, newName);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast({
      title: "Success",
      description: "Sort option updated successfully",
    });
    // Refresh the sort options list
    fetchSortOptions();
  } catch (error) {
    console.error('Error updating sort option:', error);
    toast({
      title: "Error",
      description: "Failed to update sort option",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}; 