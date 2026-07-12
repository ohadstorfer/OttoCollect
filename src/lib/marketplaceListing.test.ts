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
