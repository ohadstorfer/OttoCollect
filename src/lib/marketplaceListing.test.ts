import { describe, expect, it } from 'vitest';
import {
  combineAuctionDateTime,
  formatAuctionDateTime,
  getListingHostname,
  isListingArchived,
  isListingEnded,
  parseUtcOffset,
  splitAuctionDateTime,
} from './marketplaceListing';

const DAY = 24 * 60 * 60 * 1000;

describe('parseUtcOffset', () => {
  it('parses positive and negative offsets to minutes', () => {
    expect(parseUtcOffset('UTC+2:00')).toBe(120);
    expect(parseUtcOffset('UTC-9:30')).toBe(-570);
    expect(parseUtcOffset('UTC+0:00')).toBe(0);
  });
  it('returns null for garbage', () => {
    expect(parseUtcOffset('EST')).toBeNull();
    expect(parseUtcOffset('')).toBeNull();
    expect(parseUtcOffset(null)).toBeNull();
  });
});

describe('combineAuctionDateTime', () => {
  it('builds a UTC instant from local date/time + offset', () => {
    // 20:00 at UTC+2 == 18:00Z
    expect(combineAuctionDateTime('2026-07-18', '20:00', 'UTC+2:00')).toBe(
      '2026-07-18T18:00:00.000Z'
    );
  });
  it('returns null when a part is missing or invalid', () => {
    expect(combineAuctionDateTime('', '20:00', 'UTC+2:00')).toBeNull();
    expect(combineAuctionDateTime('2026-07-18', '', 'UTC+2:00')).toBeNull();
    expect(combineAuctionDateTime('2026-07-18', '20:00', 'nope')).toBeNull();
  });
});

describe('splitAuctionDateTime', () => {
  it('is the inverse of combineAuctionDateTime', () => {
    const iso = combineAuctionDateTime('2026-07-18', '20:00', 'UTC+2:00')!;
    expect(splitAuctionDateTime(iso, 'UTC+2:00')).toEqual({
      date: '2026-07-18',
      time: '20:00',
    });
  });
});

describe('formatAuctionDateTime', () => {
  it('formats in the listing timezone with ordinal day', () => {
    expect(formatAuctionDateTime('2026-07-18T18:00:00.000Z', 'UTC+2:00')).toBe(
      'July 18th, 2026 20:00 UTC+2:00'
    );
  });
  it('handles 1st/2nd/3rd ordinals', () => {
    expect(formatAuctionDateTime('2026-03-01T10:00:00.000Z', 'UTC+0:00')).toBe(
      'March 1st, 2026 10:00 UTC+0:00'
    );
  });
  it('omits the tz suffix and formats at UTC when tz is invalid or null', () => {
    expect(formatAuctionDateTime('2026-07-18T18:00:00.000Z', 'nope')).toBe('July 18th, 2026 18:00');
    expect(formatAuctionDateTime('2026-07-18T18:00:00.000Z', null)).toBe('July 18th, 2026 18:00');
  });
  it('handles 11th-13th ordinals', () => {
    expect(formatAuctionDateTime('2026-03-11T10:00:00.000Z', 'UTC+0:00')).toBe('March 11th, 2026 10:00 UTC+0:00');
    expect(formatAuctionDateTime('2026-03-12T10:00:00.000Z', 'UTC+0:00')).toBe('March 12th, 2026 10:00 UTC+0:00');
    expect(formatAuctionDateTime('2026-03-13T10:00:00.000Z', 'UTC+0:00')).toBe('March 13th, 2026 10:00 UTC+0:00');
  });
});

describe('archive rules', () => {
  const now = new Date('2026-07-12T00:00:00Z').getTime();
  it('auction ended >7 days ago is archived', () => {
    const item = { listing_type: 'auction' as const, auction_at: new Date(now - 8 * DAY).toISOString() };
    expect(isListingArchived(item, now)).toBe(true);
    expect(isListingEnded(item, now)).toBe(true);
  });
  it('auction ended 2 days ago is ended but NOT archived', () => {
    const item = { listing_type: 'auction' as const, auction_at: new Date(now - 2 * DAY).toISOString() };
    expect(isListingArchived(item, now)).toBe(false);
    expect(isListingEnded(item, now)).toBe(true);
  });
  it('future auction is neither', () => {
    const item = { listing_type: 'auction' as const, auction_at: new Date(now + 2 * DAY).toISOString() };
    expect(isListingArchived(item, now)).toBe(false);
    expect(isListingEnded(item, now)).toBe(false);
  });
  it('sale sold >7 days ago is archived; unsold sale never is', () => {
    expect(
      isListingArchived({ listing_type: 'sale' as const, is_sold: true, sold_at: new Date(now - 8 * DAY).toISOString() }, now)
    ).toBe(true);
    expect(isListingArchived({ listing_type: 'sale' as const, is_sold: false }, now)).toBe(false);
  });
  it('treats missing listing_type as sale', () => {
    expect(isListingArchived({}, now)).toBe(false);
  });
  it('exactly 7 days after end is NOT yet archived; just over is', () => {
    const exactly = { listing_type: 'auction' as const, auction_at: new Date(now - 7 * DAY).toISOString() };
    const over = { listing_type: 'auction' as const, auction_at: new Date(now - 7 * DAY - 1).toISOString() };
    expect(isListingArchived(exactly, now)).toBe(false);
    expect(isListingArchived(over, now)).toBe(true);
  });
});

describe('getListingHostname', () => {
  it('strips protocol, path and www', () => {
    expect(getListingHostname('https://www.ebay.com/itm/12345')).toBe('ebay.com');
    expect(getListingHostname('https://greenappleauction.com/lot/1860')).toBe('greenappleauction.com');
  });
  it('returns null for empty/invalid', () => {
    expect(getListingHostname(null)).toBeNull();
    expect(getListingHostname('not a url')).toBeNull();
  });
});

// --- Rev 1.50 additions ---

import {
  buildMarketplaceSections,
  formatListingPrice,
  formatReferenceCode,
  normalizeListingUrl,
  UNSOLD_ARCHIVE_MS,
  UPCOMING_AUCTION_WINDOW_MS,
} from './marketplaceListing';

describe('formatListingPrice', () => {
  it('formats numbers with the currency symbol', () => {
    expect(formatListingPrice(85, 'USD')).toBe('$85');
    expect(formatListingPrice(85, 'EUR')).toBe('€85');
    expect(formatListingPrice(12.5)).toBe('$12.5');
  });
  it('prefixes ranges without parsing them', () => {
    expect(formatListingPrice('150-300', 'EUR')).toBe('€150-300');
    expect(formatListingPrice('150-300')).toBe('$150-300');
  });
  it('returns null for empty values', () => {
    expect(formatListingPrice(null)).toBeNull();
    expect(formatListingPrice(undefined)).toBeNull();
    expect(formatListingPrice('')).toBeNull();
  });
});

describe('formatReferenceCode', () => {
  it('spaces out a valid code', () => {
    expect(formatReferenceCode('A20260800001')).toBe('A 2026 08 00001');
    expect(formatReferenceCode('B20251200008')).toBe('B 2025 12 00008');
  });
  it('passes through unknown shapes and nulls out empties', () => {
    expect(formatReferenceCode('LEGACY-1')).toBe('LEGACY-1');
    expect(formatReferenceCode(null)).toBeNull();
    expect(formatReferenceCode(undefined)).toBeNull();
  });
});

describe('rev 1.50 archive rules', () => {
  const now = new Date('2026-08-16T00:00:00Z').getTime();
  const DAY_ = 24 * 60 * 60 * 1000;
  it('explicit archived_at always archives', () => {
    expect(isListingArchived({ archived_at: new Date(now - 1).toISOString() } as any, now)).toBe(true);
    expect(
      isListingArchived(
        { listing_type: 'auction' as const, auction_at: new Date(now + 5 * DAY_).toISOString(), archived_at: new Date(now).toISOString() } as any,
        now
      )
    ).toBe(true);
  });
  it('unsold sale archives after 6 months from published_at', () => {
    const oldSale = { listing_type: 'sale' as const, is_sold: false, published_at: new Date(now - UNSOLD_ARCHIVE_MS - DAY_).toISOString() };
    const freshSale = { listing_type: 'sale' as const, is_sold: false, published_at: new Date(now - 30 * DAY_).toISOString() };
    expect(isListingArchived(oldSale as any, now)).toBe(true);
    expect(isListingArchived(freshSale as any, now)).toBe(false);
  });
  it('6-month rule does not apply to auctions', () => {
    const oldAuction = {
      listing_type: 'auction' as const,
      auction_at: new Date(now + 5 * DAY_).toISOString(),
      published_at: new Date(now - UNSOLD_ARCHIVE_MS - DAY_).toISOString(),
    };
    expect(isListingArchived(oldAuction as any, now)).toBe(false);
  });
});

describe('buildMarketplaceSections', () => {
  const now = new Date('2026-08-16T00:00:00Z').getTime();
  const DAY_ = 24 * 60 * 60 * 1000;
  const countryOrder = [
    { id: 'c-ott', name: 'Ottoman Empire', display_order: 0 },
    { id: 'c-jor', name: 'Jordan', display_order: 1 },
    { id: 'c-tur', name: 'Turkey', display_order: 4 },
  ];
  const mk = (country: string, over: Record<string, unknown>) => ({
    collectionItem: { banknote: { country } },
    ...over,
  });

  it('orders countries by display_order (Ottoman first) and omits empty ones', () => {
    const items = [
      mk('Turkey', { listing_type: 'sale', published_at: new Date(now - DAY_).toISOString() }),
      mk('Ottoman Empire', { listing_type: 'sale', published_at: new Date(now - DAY_).toISOString() }),
    ];
    const sections = buildMarketplaceSections(items as any, countryOrder, now);
    expect(sections.map((s) => s.countryName)).toEqual(['Ottoman Empire', 'Turkey']);
  });

  it('splits auctions at the 14-day window and sorts by date then reference code', () => {
    const items = [
      mk('Jordan', { listing_type: 'auction', auction_at: new Date(now + 20 * DAY_).toISOString(), reference_code: 'A20260800004' }),
      mk('Jordan', { listing_type: 'auction', auction_at: new Date(now + 3 * DAY_).toISOString(), reference_code: 'A20260800002' }),
      mk('Jordan', { listing_type: 'auction', auction_at: new Date(now + 3 * DAY_).toISOString(), reference_code: 'A20260800001' }),
      mk('Jordan', { listing_type: 'auction', auction_at: new Date(now + 10 * DAY_).toISOString(), reference_code: 'A20260800003' }),
    ];
    const [jordan] = buildMarketplaceSections(items as any, countryOrder, now);
    expect(jordan.nearAuctions.map((i: any) => i.reference_code)).toEqual([
      'A20260800001', 'A20260800002', 'A20260800003',
    ]);
    expect(jordan.farAuctions.map((i: any) => i.reference_code)).toEqual(['A20260800004']);
  });

  it('exactly-14-days is still "near"', () => {
    const items = [
      mk('Jordan', { listing_type: 'auction', auction_at: new Date(now + UPCOMING_AUCTION_WINDOW_MS).toISOString(), reference_code: 'A20260800001' }),
    ];
    const [jordan] = buildMarketplaceSections(items as any, countryOrder, now);
    expect(jordan.nearAuctions).toHaveLength(1);
    expect(jordan.farAuctions).toHaveLength(0);
  });

  it('orders buy-now newest published first', () => {
    const items = [
      mk('Ottoman Empire', { listing_type: 'sale', reference_code: 'B1', published_at: new Date(now - 5 * DAY_).toISOString() }),
      mk('Ottoman Empire', { listing_type: 'sale', reference_code: 'B2', published_at: new Date(now - 1 * DAY_).toISOString() }),
    ];
    const [ott] = buildMarketplaceSections(items as any, countryOrder, now);
    expect(ott.buyNow.map((i: any) => i.reference_code)).toEqual(['B2', 'B1']);
  });

  it('puts unknown countries last, alphabetically', () => {
    const items = [
      mk('Zzz Land', { listing_type: 'sale', published_at: new Date(now).toISOString() }),
      mk('Aaa Land', { listing_type: 'sale', published_at: new Date(now).toISOString() }),
      mk('Ottoman Empire', { listing_type: 'sale', published_at: new Date(now).toISOString() }),
    ];
    const sections = buildMarketplaceSections(items as any, countryOrder, now);
    expect(sections.map((s) => s.countryName)).toEqual(['Ottoman Empire', 'Aaa Land', 'Zzz Land']);
  });
});

describe('normalizeListingUrl', () => {
  it('accepts a bare domain by assuming https', () => {
    expect(normalizeListingUrl('greenappleauction.com')).toBe('https://greenappleauction.com');
    expect(normalizeListingUrl('  ebay.com/itm/123  ')).toBe('https://ebay.com/itm/123');
  });
  it('leaves an explicit scheme untouched', () => {
    expect(normalizeListingUrl('https://www.ebay.com/itm/1')).toBe('https://www.ebay.com/itm/1');
    expect(normalizeListingUrl('http://example.com/a?b=c')).toBe('http://example.com/a?b=c');
  });
  it('rejects empty, spaced and dotless input', () => {
    expect(normalizeListingUrl('')).toBeNull();
    expect(normalizeListingUrl('   ')).toBeNull();
    expect(normalizeListingUrl('not a url')).toBeNull();
    expect(normalizeListingUrl('localhost')).toBeNull();
  });
  it('rejects non-http schemes', () => {
    expect(normalizeListingUrl('ftp://files.example.com')).toBeNull();
    expect(normalizeListingUrl('javascript:alert(1)')).toBeNull();
  });
  it('produces a value isUrlApproved/getListingHostname can consume', () => {
    expect(getListingHostname(normalizeListingUrl('greenappleauction.com'))).toBe('greenappleauction.com');
    expect(getListingHostname(normalizeListingUrl('www.ebay.com/itm/1'))).toBe('ebay.com');
  });
});
