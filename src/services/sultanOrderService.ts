import { supabase } from "@/integrations/supabase/client";

export interface SultanOrder {
  id: string;
  country_id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
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

  // Debug: Log the actual fields returned
  if (data && data.length > 0) {
    console.log('🔍 [SultanOrderService Debug] First sultan object keys:', Object.keys(data[0]));
    console.log('🔍 [SultanOrderService Debug] First sultan object:', data[0]);
  }

  return data || [];
};

export const createSultanOrder = async (
  countryId: string, 
  name: string, 
  displayOrder: number,
  name_ar?: string,
  name_tr?: string
): Promise<void> => {
  const { error } = await supabase
    .from('sultan_order')
    .insert({
      country_id: countryId,
      name,
      display_order: displayOrder,
      ...(name_ar ? { name_ar } : {}),
      ...(name_tr ? { name_tr } : {}),
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
    name_ar?: string | null;
    name_tr?: string | null;
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
  console.log(`\n🗄️ [SultanOrderService Debug] Fetching sultan order for country ID: ${countryId}`);
  
  const sultans = await fetchSultanOrdersByCountryId(countryId);
  console.log(`📋 [SultanOrderService Debug] Raw sultan data from database:`, sultans);
  
  const orderMap = new Map<string, number>();
  
  sultans.forEach(sultan => {
    // Store with original case for exact matches
    orderMap.set(sultan.name, sultan.display_order);
    console.log(`  📝 [SultanOrderService Debug] Added to map: "${sultan.name}" -> ${sultan.display_order}`);
    
    // Also store with common case variations for flexible matching
    const variations = [
      sultan.name.toLowerCase(), // "abdulmecid", "abdulaziz"
      sultan.name.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase()), // "abdulmecid", "abdulaziz"
      sultan.name.replace(/([a-z])([A-Z])/g, '$1$2'.toLowerCase()) // Handle camelCase like "AbdulMecid" -> "abdulmecid"
    ];
    
    variations.forEach(variation => {
      if (variation !== sultan.name && !orderMap.has(variation)) {
        orderMap.set(variation, sultan.display_order);
        console.log(`  📝 [SultanOrderService Debug] Added variation: "${variation}" -> ${sultan.display_order}`);
      }
    });
  });
  
  console.log(`✅ [SultanOrderService Debug] Final sultan order map with variations:`, 
    Array.from(orderMap.entries()).map(([name, order]) => `"${name}": ${order}`));
  
  return orderMap;
};

// Helper function to get sultan order with case-insensitive fallback
export const getSultanOrder = (sultanName: string, sultanOrderMap: Map<string, number>): number => {
  // Try exact match first
  if (sultanOrderMap.has(sultanName)) {
    return sultanOrderMap.get(sultanName)!;
  }
  
  // Try case-insensitive match
  for (const [dbName, order] of sultanOrderMap.entries()) {
    if (dbName.toLowerCase() === sultanName.toLowerCase()) {
      console.log(`🔄 [SultanOrderService Debug] Case-insensitive match: "${sultanName}" -> "${dbName}" (order: ${order})`);
      return order;
    }
  }
  
  // Not found
  return Number.MAX_SAFE_INTEGER;
};