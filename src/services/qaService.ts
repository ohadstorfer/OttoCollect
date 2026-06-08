import { supabase } from '@/integrations/supabase/client';
import {
  QaCategory,
  QaEntry,
  normalizeQaCategory,
  normalizeQaEntry,
} from '@/types/qa';
import { translationService } from './translationService';
import {
  databaseTranslationService,
  createNameTranslationConfig,
  type TranslationConfig,
} from './databaseTranslationService';

// Re-export the blog image uploader so the QA form has a single import source.
export { uploadBlogImage as uploadQaImage } from './blogService';

// Auto-translation config for entries: localize headline / short answer / full
// answer into the current language (ar/tr), caching results in the *_<lang>
// columns. Mirrors the blog's translation flow.
const QA_ENTRY_TRANSLATION_CONFIG: TranslationConfig = {
  table: 'qa_entries',
  idField: 'id',
  fields: [
    { originalField: 'headline', arField: 'headline_ar', trField: 'headline_tr' },
    { originalField: 'short_description', arField: 'short_description_ar', trField: 'short_description_tr' },
    { originalField: 'content', arField: 'content_ar', trField: 'content_tr' },
  ],
};

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

/**
 * Fetch all categories, localized to the current language (auto-translating
 * and caching the name when missing).
 */
export const fetchQaCategoriesWithTranslations = async (
  currentLanguage: string = 'en'
): Promise<QaCategory[]> => {
  const { data, error } = await supabase
    .from('qa_categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa categories:', error);
    return [];
  }
  let rows = data || [];
  if (currentLanguage === 'ar' || currentLanguage === 'tr') {
    try {
      rows = await databaseTranslationService.getLocalizedRecords(
        createNameTranslationConfig('qa_categories'),
        rows,
        currentLanguage,
        true
      );
    } catch (e) {
      console.error('qa categories translation failed, using originals:', e);
    }
  }
  return rows.map(normalizeQaCategory);
};

/**
 * Fetch all entries, localized to the current language (auto-translating and
 * caching headline / short answer / content when missing).
 */
export const fetchQaEntriesWithTranslations = async (
  currentLanguage: string = 'en'
): Promise<QaEntry[]> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Error fetching qa entries:', error);
    return [];
  }
  let rows = data || [];
  if (currentLanguage === 'ar' || currentLanguage === 'tr') {
    try {
      // Rich-text entries auto-translate (text mode) and cache on read. Raw-HTML
      // entries already have eagerly-translated columns, so we only PICK them
      // (autoTranslate=false) — never text-mode-translate a full HTML document.
      const rich = rows.filter((r: any) => !r.content_is_raw);
      const raw = rows.filter((r: any) => r.content_is_raw);
      const [lRich, lRaw] = await Promise.all([
        rich.length
          ? databaseTranslationService.getLocalizedRecords(QA_ENTRY_TRANSLATION_CONFIG, rich, currentLanguage, true)
          : Promise.resolve([] as any[]),
        raw.length
          ? databaseTranslationService.getLocalizedRecords(QA_ENTRY_TRANSLATION_CONFIG, raw, currentLanguage, false)
          : Promise.resolve([] as any[]),
      ]);
      const byId = new Map<string, any>();
      [...lRich, ...lRaw].forEach((r) => byId.set(r.id, r));
      rows = rows.map((r: any) => byId.get(r.id) || r);
    } catch (e) {
      console.error('qa entries translation failed, using originals:', e);
    }
  }
  return rows.map(normalizeQaEntry);
};

/** Fetch a single entry by id, localized to the current language. */
export const fetchQaEntryByIdWithTranslations = async (
  id: string,
  currentLanguage: string = 'en'
): Promise<QaEntry | null> => {
  const { data, error } = await supabase
    .from('qa_entries')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    console.error('Error fetching qa entry:', error);
    return null;
  }
  let row: any = data;
  if (currentLanguage === 'ar' || currentLanguage === 'tr') {
    try {
      // Raw-HTML entries: pick the eagerly-translated column (no API, no
      // text-mode HTML translation). Rich entries: auto-translate on read.
      row = await databaseTranslationService.getLocalizedRecord(
        QA_ENTRY_TRANSLATION_CONFIG,
        row,
        currentLanguage,
        !row.content_is_raw
      );
    } catch (e) {
      console.error('qa entry translation failed, using original:', e);
    }
  }
  return normalizeQaEntry(row);
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
  /** When true, `content` is a full HTML document stored/rendered verbatim. */
  contentIsRaw?: boolean;
}

const langSuffix = (lang: string) => (lang === 'ar' ? '_ar' : lang === 'tr' ? '_tr' : '_en');

/**
 * Eagerly translate a raw-HTML entry into the other two languages right after
 * it's saved, so all three versions exist immediately ("translate after
 * upload"). headline/short answer translate as text; the full HTML document
 * translates with format=html so the markup + CSS survive. On any failure the
 * base text is kept for that field/language.
 */
async function persistRawEntryTranslations(entryId: string, input: QaEntryInput): Promise<void> {
  // Detect from the plain-text fields (the HTML body would confuse detection).
  let original: 'ar' | 'tr' | 'en' = 'en';
  try {
    original = await translationService.detectLanguage(input.shortDescription || input.headline);
  } catch (e) {
    console.error('qa raw: language detection failed, assuming en:', e);
  }

  const update: Record<string, unknown> = { original_language: original };
  const oSfx = langSuffix(original);
  update[`headline${oSfx}`] = input.headline;
  update[`short_description${oSfx}`] = input.shortDescription;
  update[`content${oSfx}`] = input.content;

  const others = (['en', 'ar', 'tr'] as const).filter((l) => l !== original);
  for (const lang of others) {
    const sfx = langSuffix(lang);
    const [h, s, c] = await Promise.all([
      translationService.translateText(input.headline, lang, original, 'text').catch(() => input.headline),
      translationService.translateText(input.shortDescription, lang, original, 'text').catch(() => input.shortDescription),
      translationService.translateText(input.content, lang, original, 'html').catch(() => input.content),
    ]);
    update[`headline${sfx}`] = h;
    update[`short_description${sfx}`] = s;
    update[`content${sfx}`] = c;
  }

  const { error } = await supabase.from('qa_entries').update(update).eq('id', entryId);
  if (error) console.error('qa raw: failed to persist translations:', error);
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
      content_is_raw: input.contentIsRaw ?? false,
    }])
    .select('*')
    .single();
  if (error || !data) {
    console.error('Error creating qa entry:', error);
    return null;
  }

  if (input.contentIsRaw) {
    // Raw HTML: eagerly translate the whole document to the other two languages.
    await persistRawEntryTranslations(data.id, input);
  } else {
    // Rich text: detect + store the original-language columns (best-effort);
    // the other languages translate lazily on first view.
    try {
      const lang = await translationService.detectLanguage(input.content || input.headline);
      const suffix = langSuffix(lang);
      await supabase.from('qa_entries').update({
        original_language: lang,
        [`headline${suffix}`]: input.headline,
        [`short_description${suffix}`]: input.shortDescription,
        [`content${suffix}`]: input.content,
      }).eq('id', data.id);
    } catch (e) {
      console.error('Error detecting qa entry language:', e);
    }
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
    // Invalidate the cached ar/tr translations: the base text just changed, so
    // the old translated columns are stale. Nulling them makes the next ar/tr
    // view re-translate from the new base (otherwise the published page keeps
    // showing the pre-edit translation).
    headline_ar: null,
    headline_tr: null,
    short_description_ar: null,
    short_description_tr: null,
    content_ar: null,
    content_tr: null,
  };
  if (typeof input.displayOrder === 'number') payload.display_order = input.displayOrder;
  if (typeof input.isDraft === 'boolean') payload.is_draft = input.isDraft;
  if (typeof input.contentIsRaw === 'boolean') payload.content_is_raw = input.contentIsRaw;

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

  // Raw HTML: the base text just changed and the _ar/_tr columns were nulled
  // above, so re-translate the whole document eagerly into both languages.
  if (input.contentIsRaw) {
    await persistRawEntryTranslations(id, input);
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
