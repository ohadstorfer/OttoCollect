export const ARCHIVE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

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
  const end = getListingEndTime(item);
  return end !== null && now - end > ARCHIVE_GRACE_MS;
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
  const offset = parseUtcOffset(tz) ?? 0;
  const d = new Date(ts + offset * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = `${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}, ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return tz ? `${label} ${tz}` : label;
}

export function getListingHostname(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
