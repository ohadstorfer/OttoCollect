import { supabase } from '@/integrations/supabase/client';
import {
  WatermarkSettings,
  DEFAULT_WATERMARK_SETTINGS,
} from '@/services/imageProcessingService';

/** A single watermarked file to regenerate in place. */
export interface WatermarkTarget {
  originalUrl: string;
  watermarkedUrl: string;
}

/** Result of scanning a country for watermarked images. */
export interface WatermarkScanResult {
  targets: WatermarkTarget[];
  /** Sides that have only one of (original, watermarked) and can't be regenerated in place. */
  skipped: number;
}

// Map DB row (snake_case) → app settings (camelCase).
function rowToSettings(row: {
  width_ratio_portrait: number;
  width_ratio_landscape: number;
  padding_x_ratio_portrait: number;
  padding_y_ratio_portrait: number;
  padding_x_ratio_landscape: number;
  padding_y_ratio_landscape: number;
  opacity: number;
}): WatermarkSettings {
  return {
    widthRatioPortrait: row.width_ratio_portrait,
    widthRatioLandscape: row.width_ratio_landscape,
    paddingXRatioPortrait: row.padding_x_ratio_portrait,
    paddingYRatioPortrait: row.padding_y_ratio_portrait,
    paddingXRatioLandscape: row.padding_x_ratio_landscape,
    paddingYRatioLandscape: row.padding_y_ratio_landscape,
    opacity: row.opacity,
  };
}

const SETTINGS_COLUMNS =
  'width_ratio_portrait, width_ratio_landscape, padding_x_ratio_portrait, padding_y_ratio_portrait, padding_x_ratio_landscape, padding_y_ratio_landscape, opacity';

// Reads a single settings row for (country, category); category null = country-wide.
async function fetchSettingsRow(
  countryId: string,
  categoryId: string | null
): Promise<WatermarkSettings | null> {
  let query = supabase
    .from('watermark_settings')
    .select(SETTINGS_COLUMNS)
    .eq('country_id', countryId);
  query = categoryId ? query.eq('category_id', categoryId) : query.is('category_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Error fetching watermark settings:', error);
    return null;
  }
  return data ? rowToSettings(data) : null;
}

/**
 * Returns the watermark settings to show for a country/category, with a
 * fallback chain: the category's own row → the country-wide row → app defaults.
 *
 * @param countryId The country to read settings for.
 * @param categoryId A specific category, or null/omitted for the country-wide row.
 */
export async function fetchWatermarkSettings(
  countryId: string,
  categoryId: string | null = null
): Promise<WatermarkSettings> {
  if (categoryId) {
    const categorySettings = await fetchSettingsRow(countryId, categoryId);
    if (categorySettings) return categorySettings;
    // Fall back to the country-wide default when the category has no row yet.
  }
  const countrySettings = await fetchSettingsRow(countryId, null);
  return countrySettings ?? DEFAULT_WATERMARK_SETTINGS;
}

/**
 * Inserts or updates the watermark settings for a country/category.
 *
 * @param categoryId A specific category, or null for the country-wide default.
 */
export async function saveWatermarkSettings(
  countryId: string,
  settings: WatermarkSettings,
  categoryId: string | null = null
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from('watermark_settings').upsert(
    {
      country_id: countryId,
      category_id: categoryId,
      width_ratio_portrait: settings.widthRatioPortrait,
      width_ratio_landscape: settings.widthRatioLandscape,
      padding_x_ratio_portrait: settings.paddingXRatioPortrait,
      padding_y_ratio_portrait: settings.paddingYRatioPortrait,
      padding_x_ratio_landscape: settings.paddingXRatioLandscape,
      padding_y_ratio_landscape: settings.paddingYRatioLandscape,
      opacity: settings.opacity,
      updated_at: new Date().toISOString(),
      updated_by: userData?.user?.id ?? null,
    },
    { onConflict: 'country_id,category_id' }
  );

  if (error) throw error;
}

// Push a regen target when both original and watermarked exist; otherwise, if
// exactly one side is present, count it as skipped (can't regenerate in place).
function addPair(
  result: WatermarkScanResult,
  original: string | null,
  watermarked: string | null
): void {
  if (original && watermarked) {
    result.targets.push({ originalUrl: original, watermarkedUrl: watermarked });
  } else if (original || watermarked) {
    result.skipped += 1;
  }
}

// Supabase `.in()` builds a query string, so keep id batches bounded.
const IN_CHUNK = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Collects every watermarked image that belongs to a country: catalog banknotes
 * (`detailed_banknotes`), unlisted banknotes (`unlisted_banknotes`), and the
 * collection items that reference either of them.
 *
 * @param countryName The country name string (matches the `country` column).
 * @param categoryName Optional category name to narrow the scope to a single
 *   category within the country (matches the `category` column). When omitted or
 *   null, every category is included.
 */
export async function collectCountryWatermarkTargets(
  countryName: string,
  categoryName?: string | null
): Promise<WatermarkScanResult> {
  const result: WatermarkScanResult = { targets: [], skipped: 0 };

  // 1. Catalog banknotes for this country (optionally narrowed to one category).
  let catalogQuery = supabase
    .from('detailed_banknotes')
    .select('id, front_picture, front_picture_watermarked, back_picture, back_picture_watermarked')
    .eq('country', countryName);
  if (categoryName) catalogQuery = catalogQuery.eq('category', categoryName);
  const { data: catalog, error: catalogError } = await catalogQuery;
  if (catalogError) throw catalogError;

  const catalogIds: string[] = [];
  for (const b of catalog ?? []) {
    catalogIds.push(b.id);
    addPair(result, b.front_picture, b.front_picture_watermarked);
    addPair(result, b.back_picture, b.back_picture_watermarked);
  }

  // 2. Unlisted banknotes for this country (optionally narrowed to one category).
  let unlistedQuery = supabase
    .from('unlisted_banknotes')
    .select('id, front_picture, front_picture_watermarked, back_picture, back_picture_watermarked')
    .eq('country', countryName);
  if (categoryName) unlistedQuery = unlistedQuery.eq('category', categoryName);
  const { data: unlisted, error: unlistedError } = await unlistedQuery;
  if (unlistedError) throw unlistedError;

  const unlistedIds: string[] = [];
  for (const b of unlisted ?? []) {
    unlistedIds.push(b.id);
    addPair(result, b.front_picture, b.front_picture_watermarked);
    addPair(result, b.back_picture, b.back_picture_watermarked);
  }

  // 3. Collection items pointing at catalog banknotes of this country.
  for (const ids of chunk(catalogIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from('collection_items')
      .select('obverse_image, obverse_image_watermarked, reverse_image, reverse_image_watermarked')
      .in('banknote_id', ids);
    if (error) throw error;
    for (const item of data ?? []) {
      addPair(result, item.obverse_image, item.obverse_image_watermarked);
      addPair(result, item.reverse_image, item.reverse_image_watermarked);
    }
  }

  // 4. Collection items pointing at unlisted banknotes of this country.
  for (const ids of chunk(unlistedIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from('collection_items')
      .select('obverse_image, obverse_image_watermarked, reverse_image, reverse_image_watermarked')
      .in('unlisted_banknotes_id', ids);
    if (error) throw error;
    for (const item of data ?? []) {
      addPair(result, item.obverse_image, item.obverse_image_watermarked);
      addPair(result, item.reverse_image, item.reverse_image_watermarked);
    }
  }

  return result;
}

/**
 * Test helper for admins: collects every watermarked photo in a single user's
 * collection. Lets admins verify the regeneration pipeline on a small, known
 * scope before running it for a whole country.
 *
 * @param userId The owner of the collection items.
 */
export async function collectUserCollectionWatermarkTargets(
  userId: string
): Promise<WatermarkScanResult> {
  const result: WatermarkScanResult = { targets: [], skipped: 0 };

  const { data, error } = await supabase
    .from('collection_items')
    .select('obverse_image, obverse_image_watermarked, reverse_image, reverse_image_watermarked')
    .eq('user_id', userId);
  if (error) throw error;

  for (const item of data ?? []) {
    addPair(result, item.obverse_image, item.obverse_image_watermarked);
    addPair(result, item.reverse_image, item.reverse_image_watermarked);
  }

  return result;
}
