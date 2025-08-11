import { supabase } from "@/integrations/supabase/client";

export interface SultanOrder {
  id: string;
  country_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const fetchSultanOrdersByCountryId = async (countryId: string): Promise<SultanOrder[]> => {
  const { data, error } = await supabase
    .from('sultan_order')
    .select('*')
    .eq('country_id', countryId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching sultan orders:', error);
    throw error;
  }

  return data || [];
};

export const createSultanOrder = async (
  countryId: string, 
  name: string, 
  displayOrder: number
): Promise<void> => {
  const { error } = await supabase
    .from('sultan_order')
    .insert({
      country_id: countryId,
      name,
      display_order: displayOrder
    });

  if (error) {
    console.error('Error creating sultan order:', error);
    throw error;
  }
};

export const updateSultanOrder = async (
  id: string,
  updates: {
    name?: string;
    display_order?: number;
  }
): Promise<void> => {
  const { error } = await supabase
    .from('sultan_order')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating sultan order:', error);
    throw error;
  }
};

export const deleteSultanOrder = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sultan_order')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sultan order:', error);
    throw error;
  }
};

export const getSultanOrderMap = async (countryId: string): Promise<Map<string, number>> => {
  const sultans = await fetchSultanOrdersByCountryId(countryId);
  const orderMap = new Map<string, number>();
  
  sultans.forEach(sultan => {
    orderMap.set(sultan.name, sultan.display_order);
  });
  
  return orderMap;
};