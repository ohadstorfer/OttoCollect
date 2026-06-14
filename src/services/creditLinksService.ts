import { supabase } from '@/integrations/supabase/client';

export interface CreditLink {
  id: string;
  name: string;
  url: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export const normalizeCreditLink = (row: any): CreditLink => ({
  id: row.id,
  name: row.name,
  url: row.url,
  displayOrder: row.display_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Fetch all links, ordered for display. */
export const fetchCreditLinks = async (): Promise<CreditLink[]> => {
  const { data, error } = await supabase
    .from('credit_links')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching credit links:', error);
    return [];
  }
  return (data || []).map(normalizeCreditLink);
};

/** Create a link, appending it after the current highest display_order. */
export const createCreditLink = async (name: string, url: string): Promise<CreditLink | null> => {
  const { data: top } = await supabase
    .from('credit_links')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = ((top && top[0]?.display_order) ?? -1) + 1;

  const { data, error } = await supabase
    .from('credit_links')
    .insert([{ name, url, display_order: nextOrder }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error creating credit link:', error);
    return null;
  }
  return normalizeCreditLink(data);
};

/** Update a link's name and/or url. */
export const updateCreditLink = async (
  id: string,
  fields: { name?: string; url?: string }
): Promise<CreditLink | null> => {
  const payload: Record<string, unknown> = {};
  if (typeof fields.name === 'string') payload.name = fields.name;
  if (typeof fields.url === 'string') payload.url = fields.url;
  const { data, error } = await supabase
    .from('credit_links')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error updating credit link:', error);
    return null;
  }
  return normalizeCreditLink(data);
};

/** Delete a link. */
export const deleteCreditLink = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('credit_links').delete().eq('id', id);
  if (error) {
    console.error('Error deleting credit link:', error);
    return false;
  }
  return true;
};
