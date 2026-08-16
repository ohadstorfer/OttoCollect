export const ARCHIVE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
// Spec §10: any Buy-now listing archives half a year after publishing, sold or not.
export const UNSOLD_ARCHIVE_MS = 182 * 24 * 60 * 60 * 1000;
// Spec §11: auctions further than two weeks out are folded behind a toggle.
export const UPCOMING_AUCTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export const CURRENCIES = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€' };

/** "85" → "$85" · "150-300" + EUR → "€150-300" · empty → null. Ranges are not parsed. */
export function formatListingPrice(
  value: number | string | null | undefined,
  currency: Currency = 'USD',
): string | null {
  if (value === null || value === undefined || value === '') return null;
  return `${CURRENCY_SYMBOL[currency] ?? '$'}${value}`;
}

/** "A20260800001" → "A 2026 08 00001" (PDF §12 display form). Unknown shapes pass through. */
export function formatReferenceCode(code?: string | null): string | null {
  if (!code) return null;
  const m = /^([AB])(\d{4})(\d{2})(\d{5})$/.exec(code);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : code;
}

export const UTC_OFFSETS: string[] = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-9:30', 'UTC-9:00', 'UTC-8:00',
  'UTC-7:00', 'UTC-6:00', 'UTC-5:00', 'UTC-4:00', 'UTC-3:30', 'UTC-3:00',
  'UTC-2:00', 'UTC-1:00', 'UTC+0:00', 'UTC+1:00', 'UTC+2:00', 'UTC+3:00',
  'UTC+3:30', 'UTC+4:00', 'UTC+4:30', 'UTC+5:00', 'UTC+5:30', 'UTC+5:45',
  'UTC+6:00', 'UTC+6:30', 'UTC+7:00', 'UTC+8:00', 'UTC+8:45', 'UTC+9:00',
  'UTC+9:30', 'UTC+10:00', 'UTC+10:30', 'UTC+11:00', 'UTC+12:00',
  'UTC+12:45', 'UTC+13:00', 'UTC+14:00',
];

interface ListingLike {
  listing_type?: 'sale' | 'auction' | null;
  is_sold?: boolean | null;
  sold_at?: string | null;
  auction_at?: string | null;
  archived_at?: string | null;
  published_at?: string | null;
}

export function parseUtcOffset(tz: string | null | undefined): number | null {
  if (!tz) return null;
  const m = /^UTC([+-])(\d{1,2}):(\d{2})$/.exec(tz.trim());
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

export function combineAuctionDateTime(date: string, time: string, tz: string): string | null {
  const offset = parseUtcOffset(tz);
  if (!date || !time || offset === null) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if ([y, mo, d, h, mi].some((n) => n === undefined || Number.isNaN(n))) return null;
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - offset * 60 * 1000;
  return new Date(utcMs).toISOString();
}

export function splitAuctionDateTime(auctionAt: string, tz: string | null): { date: string; time: string } {
  const offset = parseUtcOffset(tz) ?? 0;
  const d = new Date(new Date(auctionAt).getTime() + offset * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export function getListingEndTime(item: ListingLike): number | null {
  if (item.listing_type === 'auction') {
    if (!item.auction_at) return null;
    const ts = new Date(item.auction_at).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  if (item.is_sold && item.sold_at) {
    const ts = new Date(item.sold_at).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  return null;
}

export function isListingEnded(item: ListingLike, now: number = Date.now()): boolean {
  const end = getListingEndTime(item);
  return end !== null && now >= end;
}

export function isListingArchived(item: ListingLike, now: number = Date.now()): boolean {
  // Explicit archive (owner action or nightly sweep) always wins.
  if (item.archived_at) return true;
  const end = getListingEndTime(item);
  if (end !== null && now - end > ARCHIVE_GRACE_MS) return true;
  // Buy-now listings expire half a year after publishing even if never sold.
  if (item.listing_type !== 'auction' && item.published_at) {
    const published = new Date(item.published_at).getTime();
    if (!Number.isNaN(published) && now - published > UNSOLD_ARCHIVE_MS) return true;
  }
  return false;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function formatAuctionDateTime(auctionAt: string, tz: string | null): string | null {
  const ts = new Date(auctionAt).getTime();
  if (Number.isNaN(ts)) return null;
  const offset = parseUtcOffset(tz);
  const d = new Date(ts + (offset ?? 0) * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = `${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}, ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return offset !== null && tz ? `${label} ${tz}` : label;
}

/**
 * Accepts what people actually type ("greenappleauction.com") and returns a
 * usable absolute URL, or null if it cannot be one. Only http(s) is allowed.
 * The typed form is preserved (no trailing slash added) beyond the scheme.
 */
export function normalizeListingUrl(input: string | null | undefined): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // A hostname without a dot ("localhost", "hello") is not a public website.
    if (!parsed.hostname.includes('.')) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function getListingHostname(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// --- Marketplace page ordering (spec §8.3 / PDF §11) -------------------------

export interface SectionableListing extends ListingLike {
  reference_code?: string | null;
  created_at?: string;
  createdAt?: string;
  collectionItem?: { banknote?: { country?: string } };
}

export interface MarketplaceSection<T extends SectionableListing = SectionableListing> {
  countryId: string;
  countryName: string;
  nearAuctions: T[]; // auction within the next 14 days, soonest first
  farAuctions: T[];  // auction beyond 14 days, folded behind a toggle
  buyNow: T[];       // newest published first
}

const byAuctionDateThenReference = (a: SectionableListing, b: SectionableListing): number => {
  const ta = a.auction_at ? new Date(a.auction_at).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.auction_at ? new Date(b.auction_at).getTime() : Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return (a.reference_code ?? '').localeCompare(b.reference_code ?? '');
};

const publishedTime = (i: SectionableListing): number => {
  const raw = i.published_at ?? i.createdAt ?? i.created_at;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Groups active listings into per-country sections: countries in catalog order
 * (Ottoman Empire holds display_order 0), unknown countries last alphabetically.
 * Within a country: near auctions (≤14 days, by date then reference code),
 * far auctions (same order, collapsed in the UI), then buy-now newest-first.
 * Countries with no items are omitted.
 */
export function buildMarketplaceSections<T extends SectionableListing>(
  items: T[],
  countryOrder: Array<{ id: string; name: string; display_order: number }>,
  now: number = Date.now(),
): MarketplaceSection<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const country = item.collectionItem?.banknote?.country || 'Unknown';
    const list = buckets.get(country);
    if (list) list.push(item);
    else buckets.set(country, [item]);
  }

  const known = countryOrder
    .filter((c) => buckets.has(c.name))
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => ({ id: c.id, name: c.name }));
  const knownNames = new Set(known.map((c) => c.name));
  const unknown = Array.from(buckets.keys())
    .filter((name) => !knownNames.has(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name, name }));

  return [...known, ...unknown].map(({ id, name }) => {
    const list = buckets.get(name)!;
    const auctions = list.filter((i) => i.listing_type === 'auction').sort(byAuctionDateThenReference);
    const cutoff = now + UPCOMING_AUCTION_WINDOW_MS;
    return {
      countryId: id,
      countryName: name,
      nearAuctions: auctions.filter((i) => i.auction_at && new Date(i.auction_at).getTime() <= cutoff),
      farAuctions: auctions.filter((i) => !i.auction_at || new Date(i.auction_at).getTime() > cutoff),
      buyNow: list
        .filter((i) => i.listing_type !== 'auction')
        .sort((a, b) => publishedTime(b) - publishedTime(a)),
    };
  });
}
