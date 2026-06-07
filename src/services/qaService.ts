import { supabase } from '@/integrations/supabase/client';
import {
  QaCategory,
  QaEntry,
  normalizeQaCategory,
  normalizeQaEntry,
} from '@/types/qa';
import { translationService } from './translationService';

// Re-export the blog image uploader so the QA form has a single import source.
export { uploadBlogImage as uploadQaImage } from './blogService';

/** Fetch all categories, ordered. */
export const fetchQaCategories = async (): Promise<QaCategory[]> => {
  const { data, error } = await supabase
    .from('qa_categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa categories:', error);
    return [];
  }
  return (data || []).map(normalizeQaCategory);
};

/** Fetch all published entries (admins also get drafts via RLS). */
export const fetchQaEntries = async (): Promise<QaEntry[]> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa entries:', error);
    return [];
  }
  return (data || []).map(normalizeQaEntry);
};

/** Fetch a single entry by id. */
export const fetchQaEntryById = async (id: string): Promise<QaEntry | null> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching qa entry:', error);
    return null;
  }
  return data ? normalizeQaEntry(data) : null;
};

/** Create a category. */
export const createQaCategory = async (
  name: string,
  displayOrder = 0
): Promise<QaCategory | null> => {
  const { data, error } = await supabase
    .from('qa_categories')
    .insert([{ name, name_en: name, display_order: displayOrder, original_language: 'en' }])
    .select('*')
    .single();
  if (error) {
    console.error('Error creating qa category:', error);
    return null;
  }
  return data ? normalizeQaCategory(data) : null;
};

/** Update a category's name and/or order. */
export const updateQaCategory = async (
  id: string,
  fields: { name?: string; displayOrder?: number }
): Promise<QaCategory | null> => {
  const payload: Record<string, unknown> = {};
  if (typeof fields.name === 'string') payload.name = fields.name;
  if (typeof fields.displayOrder === 'number') payload.display_order = fields.displayOrder;
  const { data, error } = await supabase
    .from('qa_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error('Error updating qa category:', error);
    return null;
  }
  return data ? normalizeQaCategory(data) : null;
};

export interface QaEntryInput {
  categoryId: string;
  headline: string;
  shortDescription: string;
  content: string;
  mainImageUrl?: string | null;
  displayOrder?: number;
  isDraft?: boolean;
}

/** Create an entry, then detect+store the original language fields. */
export const createQaEntry = async (
  input: QaEntryInput,
  authorId: string
): Promise<QaEntry | null> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .insert([{
      author_id: authorId,
      category_id: input.categoryId,
      headline: input.headline,
      short_description: input.shortDescription,
      content: input.content,
      main_image_url: input.mainImageUrl ?? null,
      display_order: input.displayOrder ?? 0,
      is_draft: input.isDraft ?? false,
    }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error creating qa entry:', error);
    return null;
  }

  // Detect and persist the original-language columns (best-effort).
  try {
    const lang = await translationService.detectLanguage(input.content || input.headline);
    const suffix = lang === 'en' ? '_en' : lang === 'ar' ? '_ar' : lang === 'tr' ? '_tr' : '_en';
    await supabase.from('qa_entries').update({
      original_language: lang,
      [`headline${suffix}`]: input.headline,
      [`short_description${suffix}`]: input.shortDescription,
      [`content${suffix}`]: input.content,
    }).eq('id', data.id);
  } catch (e) {
    console.error('Error detecting qa entry language:', e);
  }

  return normalizeQaEntry(data);
};

/** Update an entry. */
export const updateQaEntry = async (
  id: string,
  input: QaEntryInput
): Promise<QaEntry | null> => {
  const payload: Record<string, unknown> = {
    category_id: input.categoryId,
    headline: input.headline,
    short_description: input.shortDescription,
    content: input.content,
    main_image_url: input.mainImageUrl ?? null,
  };
  if (typeof input.displayOrder === 'number') payload.display_order = input.displayOrder;
  if (typeof input.isDraft === 'boolean') payload.is_draft = input.isDraft;

  const { data, error } = await supabase
    .from('qa_entries')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error updating qa entry:', error);
    return null;
  }
  return normalizeQaEntry(data);
};

/** Delete an entry. */
export const deleteQaEntry = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('qa_entries').delete().eq('id', id);
  if (error) {
    console.error('Error deleting qa entry:', error);
    return false;
  }
  return true;
};
