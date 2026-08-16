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

// --- Pending domain requests ---

export interface PendingDomainRequest {
  id: string;
  domain: string;
  requested_by: string;
  requested_url: string;
  listing_type?: string | null;
  marketplace_item_id?: string | null;
  created_at: string;
  // Joined profile data (optional)
  profiles?: { username: string; avatar_url: string | null } | null;
}

/**
 * Creates a pending domain approval request.
 * listingType/marketplaceItemId identify the sale that triggered it (spec §6a).
 */
export async function createPendingDomainRequest(
  userId: string,
  domain: string,
  fullUrl: string,
  listingType?: string,
  marketplaceItemId?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('pending_domain_requests')
    .insert({
      domain: normalizeDomain(domain),
      requested_by: userId,
      requested_url: fullUrl,
      listing_type: listingType ?? null,
      marketplace_item_id: marketplaceItemId ?? null,
    } as any);

  if (error) {
    console.error('Error creating pending domain request:', error);
    return false;
  }
  return true;
}

/**
 * Fetches all pending domain requests (for admin dashboard).
 */
export async function fetchPendingDomainRequests(): Promise<PendingDomainRequest[]> {
  const { data, error } = await supabase
    .from('pending_domain_requests')
    .select('*, profiles:requested_by (username, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending domain requests:', error);
    return [];
  }
  return data || [];
}

/**
 * Deletes all pending requests for a given domain (after approval or rejection).
 */
export async function deletePendingRequestsByDomain(domain: string): Promise<boolean> {
  const { error } = await supabase
    .from('pending_domain_requests')
    .delete()
    .eq('domain', domain);

  if (error) {
    console.error('Error deleting pending requests:', error);
    return false;
  }
  return true;
}

export interface RejectedDomain {
  id: string;
  domain: string;
  requested_url: string | null;
  requested_by: string | null;
  listing_type: string | null;
  rejected_by: string | null;
  rejected_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

/**
 * Approves a domain via the Super-Admin security-definer RPC. The RPC adds the
 * domain, attaches links on other sellers' listings/profiles (host-suffix
 * match), promotes PendingUrl auctions, and clears pending requests — all of
 * which client-side writes cannot do under RLS (spec §6.2).
 */
export async function approveDomain(domain: string): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  const { error } = await (supabase.rpc as any)('approve_domain', { p_domain: normalized });
  if (error) {
    console.error('Error approving domain:', error);
    return false;
  }
  return true;
}

/** Rejects a domain: pending rows are logged to rejected_domains, then removed. */
export async function rejectDomain(domain: string): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  const { error } = await (supabase.rpc as any)('reject_domain', { p_domain: normalized });
  if (error) {
    console.error('Error rejecting domain:', error);
    return false;
  }
  return true;
}

/** Moves a rejected domain's requests back to the pending list. */
export async function restoreRejectedDomain(domain: string): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  const { error } = await (supabase.rpc as any)('restore_rejected_domain', { p_domain: normalized });
  if (error) {
    console.error('Error restoring rejected domain:', error);
    return false;
  }
  return true;
}

/** Fetches the rejected-domains log (Super-Admin dashboard, spec §6a). */
export async function fetchRejectedDomains(): Promise<RejectedDomain[]> {
  const { data, error } = await supabase
    .from('rejected_domains' as any)
    .select('*, profiles:requested_by (username, avatar_url)')
    .order('rejected_at', { ascending: false });

  if (error) {
    console.error('Error fetching rejected domains:', error);
    return [];
  }
  return (data as unknown as RejectedDomain[]) || [];
}

/** @deprecated use approveDomain — kept as an alias for older call sites. */
export async function approvePendingDomain(domain: string): Promise<boolean> {
  return approveDomain(domain);
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
