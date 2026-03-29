import { supabase } from '@/integrations/supabase/client';

export interface ApprovedDomain {
  id: string;
  domain: string;
  created_at: string;
}

/**
 * Fetches all approved domains from the database.
 */
export async function fetchApprovedDomains(): Promise<ApprovedDomain[]> {
  const { data, error } = await supabase
    .from('approved_domains')
    .select('*')
    .order('domain');

  if (error) {
    console.error('Error fetching approved domains:', error);
    return [];
  }

  return data || [];
}

/**
 * Adds a new approved domain. Strips protocol, path, and www prefix.
 * Stores just the base domain (e.g. "ebay.com").
 */
export async function addApprovedDomain(rawDomain: string): Promise<boolean> {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return false;

  const { error } = await supabase
    .from('approved_domains')
    .insert({ domain });

  if (error) {
    console.error('Error adding approved domain:', error);
    return false;
  }

  return true;
}

/**
 * Deletes an approved domain by ID.
 */
export async function deleteApprovedDomain(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('approved_domains')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting approved domain:', error);
    return false;
  }

  return true;
}

/**
 * Normalizes user input to a clean domain string.
 * "https://www.ebay.com/some/path" → "ebay.com"
 * "www.amazon.com" → "amazon.com"
 * "ebay.com" → "ebay.com"
 */
export function normalizeDomain(input: string): string {
  let cleaned = input.trim().toLowerCase();

  // Try to parse as URL if it has a protocol
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      cleaned = url.hostname;
    } catch {
      return '';
    }
  }

  // Remove www. prefix
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  // Remove trailing slashes/paths
  cleaned = cleaned.split('/')[0];

  // Basic validation: must have at least one dot
  if (!cleaned.includes('.')) return '';

  return cleaned;
}

/**
 * Checks if a given URL matches any of the approved domains.
 * "https://www.ebay.com/itm/123" matches approved domain "ebay.com"
 */
export function isUrlApproved(url: string, approvedDomains: string[]): boolean {
  if (!url) return true; // Empty URL is allowed (field is optional)

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return approvedDomains.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch {
    return false; // Invalid URL
  }
}
