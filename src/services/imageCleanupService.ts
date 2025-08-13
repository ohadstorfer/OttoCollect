import { supabase } from "@/integrations/supabase/client";

export async function runImageCleanup() {
  try {
    const { data, error } = await supabase.functions.invoke('cleanup-orphaned-images');
    
    if (error) {
      console.error('Error running cleanup:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to run cleanup:', error);
    throw error;
  }
}