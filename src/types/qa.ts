export interface QaCategory {
  id: string;
  name: string;
  name_en?: string | null;
  name_ar?: string | null;
  name_tr?: string | null;
  displayOrder: number;
  originalLanguage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface QaEntry {
  id: string;
  authorId?: string | null;
  categoryId: string;
  headline: string;
  headline_en?: string | null;
  headline_ar?: string | null;
  headline_tr?: string | null;
  shortDescription: string;
  shortDescription_en?: string | null;
  shortDescription_ar?: string | null;
  shortDescription_tr?: string | null;
  content: string;
  content_en?: string | null;
  content_ar?: string | null;
  content_tr?: string | null;
  mainImageUrl?: string | null;
  displayOrder: number;
  isDraft: boolean;
  originalLanguage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface QaCategoryGroup {
  category: QaCategory;
  entries: QaEntry[];
}

export const normalizeQaCategory = (row: any): QaCategory => ({
  id: row.id,
  name: row.name,
  name_en: row.name_en ?? null,
  name_ar: row.name_ar ?? null,
  name_tr: row.name_tr ?? null,
  displayOrder: row.display_order ?? 0,
  originalLanguage: row.original_language ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const normalizeQaEntry = (row: any): QaEntry => ({
  id: row.id,
  authorId: row.author_id ?? null,
  categoryId: row.category_id,
  headline: row.headline,
  headline_en: row.headline_en ?? null,
  headline_ar: row.headline_ar ?? null,
  headline_tr: row.headline_tr ?? null,
  shortDescription: row.short_description ?? '',
  shortDescription_en: row.short_description_en ?? null,
  shortDescription_ar: row.short_description_ar ?? null,
  shortDescription_tr: row.short_description_tr ?? null,
  content: row.content ?? '',
  content_en: row.content_en ?? null,
  content_ar: row.content_ar ?? null,
  content_tr: row.content_tr ?? null,
  mainImageUrl: row.main_image_url ?? null,
  displayOrder: row.display_order ?? 0,
  isDraft: row.is_draft ?? false,
  originalLanguage: row.original_language ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const langSuffix = (lang: string): '' | '_en' | '_ar' | '_tr' => {
  if (lang === 'en') return '_en';
  if (lang === 'ar') return '_ar';
  if (lang === 'tr') return '_tr';
  return '';
};

export const getLocalizedEntry = (
  entry: QaEntry,
  lang: string
): { headline: string; shortDescription: string; content: string } => {
  const s = langSuffix(lang);
  const pick = (base: 'headline' | 'shortDescription' | 'content') => {
    const key = (base + s) as keyof QaEntry;
    const val = s ? (entry[key] as string | null | undefined) : undefined;
    return (val && val.length > 0 ? val : (entry[base] as string)) ?? '';
  };
  return {
    headline: pick('headline'),
    shortDescription: pick('shortDescription'),
    content: pick('content'),
  };
};

export const getLocalizedCategoryName = (category: QaCategory, lang: string): string => {
  const s = langSuffix(lang);
  if (!s) return category.name;
  const key = ('name' + s) as keyof QaCategory;
  const val = category[key] as string | null | undefined;
  return val && val.length > 0 ? val : category.name;
};

export const groupEntriesByCategory = (
  categories: QaCategory[],
  entries: QaEntry[]
): QaCategoryGroup[] => {
  const sortedCats = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  return sortedCats
    .map((category) => ({
      category,
      entries: entries
        .filter((e) => e.categoryId === category.id)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .filter((g) => g.entries.length > 0);
};
