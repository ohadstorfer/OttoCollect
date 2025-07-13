import { updateTypeDefinition } from '@/services/adminService';

const handleEdit = async (id: string, newName: string, oldName: string) => {
  setLoading(true);
  try {
    const result = await updateTypeDefinition(id, newName, oldName);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast({
      title: "Success",
      description: "Type updated successfully",
    });
    // Refresh the types list
    fetchTypes();
  } catch (error) {
    console.error('Error updating type:', error);
    toast({
      title: "Error",
      description: "Failed to update type",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}; 