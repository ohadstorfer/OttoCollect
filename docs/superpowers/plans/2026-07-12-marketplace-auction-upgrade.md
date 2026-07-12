# Marketplace Auction Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Auction (External Auction)" listing type alongside the existing Sale/Buy-now flow, with a dedicated listing dialog (Publish / Save draft / Cancel), approved-URL gating, a redesigned marketplace card (View Source button, site name, item-type label, no "Available" badge), a Marketplace Archive view with 1-week auto-archive rules, and an Edit Item option on the detail page. Spec items 6 and 7 (Contact-seller blocking for eBay, chat↔email bridge) are explicitly OUT of scope.

**Architecture:** All listing data lives on the existing `marketplace_items` table (new columns; drafts are `status='Draft'`). Archive membership is **derived at read time** (sold/auction-ended more than 7 days ago) via pure helpers — no cron jobs. A new self-contained `MarketplaceListingDialog` replaces the inline for-sale switch/price fields in the collection edit forms and is also the "Edit Item" surface on the marketplace detail page. The existing `approved_domains` / `pending_domain_requests` system (`approvedDomainsService.ts`) is reused for URL gating.

**Tech Stack:** React 18 + TypeScript + Vite, shadcn/radix UI, Tailwind (custom `ottoman` palette), Supabase (remote project via MCP `apply_migration`), i18next (namespaces under `public/locales/{en,ar,tr}/marketplace.json`), vitest for pure-logic tests.

## Global Constraints

- **Title texts must wrap content in `<span>`** — every `DialogTitle`, `CardTitle`, `h1`–`h6` (project CLAUDE.md rule).
- **Never `git push` or deploy** — commits only; the user pushes explicitly.
- **No regeneration of `src/integrations/supabase/types.ts`** — it is already stale (missing `external_listing_url`, `approved_domains`, etc.); the codebase works with `select('*')` + app-level types in `src/types/index.ts`. Follow that pattern; cast with `as any` where the stale generated types complain, matching existing service code.
- All user-facing strings via `t(...)` from the `marketplace` namespace, added to **all three** locales (en, ar, tr).
- Sale rank gating stays as-is: `isLimitedRank = ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank)` (UI-only, as today).
- Typecheck with `npx tsc --noEmit` (vite build does NOT typecheck). Tests: `npx vitest run`.
- Currency is always USD, displayed with `$` prefix.
- The archive grace period is exactly 7 days (spec: "1 week").

---

### Task 1: Database migration + app types

**Files:**
- Create: `supabase/migrations/20260712000000_marketplace_auction_listings.sql`
- Modify: `src/types/index.ts:331-348` (the `MarketplaceItem` interface)

**Interfaces:**
- Consumes: existing `marketplace_items` table (`status` default `'Available'`, `external_listing_url`, `is_url_approved` already live in prod).
- Produces: new columns `listing_type, public_remark, is_sold, sold_at, auction_at, auction_timezone, lot_number, start_price, estimated_price, realized_price`; `status` may now also be `'Draft'`. TS type `MarketplaceItem` exposes all of them; exported type `ListingType = 'sale' | 'auction'`.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260712000000_marketplace_auction_listings.sql
-- Marketplace upgrade: auction listings, public remark, sold flag, drafts.
alter table public.marketplace_items
  add column if not exists listing_type text not null default 'sale',
  add column if not exists public_remark text,
  add column if not exists is_sold boolean not null default false,
  add column if not exists sold_at timestamptz,
  add column if not exists auction_at timestamptz,
  add column if not exists auction_timezone text,
  add column if not exists lot_number text,
  add column if not exists start_price numeric,
  add column if not exists estimated_price text,
  add column if not exists realized_price numeric;

alter table public.marketplace_items
  drop constraint if exists marketplace_items_listing_type_check;
alter table public.marketplace_items
  add constraint marketplace_items_listing_type_check
  check (listing_type in ('sale', 'auction'));
```

- [ ] **Step 2: Apply it to the remote project**

Use MCP tool `mcp__supabase__apply_migration` with name `marketplace_auction_listings` and the SQL above.
Expected: success, no error. Verify with `mcp__supabase__execute_sql`:
`select column_name from information_schema.columns where table_name='marketplace_items' order by 1;` — must list all 10 new columns.

- [ ] **Step 3: Extend the app-level type**

In `src/types/index.ts`, replace the `MarketplaceItem` interface (currently lines 331–348) with:

```ts
export type ListingType = 'sale' | 'auction';

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  collection_item_id: string;
  banknote_id: string;
  status: 'Available' | 'Sold' | 'Reserved' | 'Draft';
  external_listing_url?: string | null;
  is_url_approved?: boolean;
  listing_type?: ListingType;
  public_remark?: string | null;
  is_sold?: boolean;
  sold_at?: string | null;
  auction_at?: string | null;
  auction_timezone?: string | null;
  lot_number?: string | null;
  start_price?: number | null;
  estimated_price?: string | null;
  realized_price?: number | null;
  created_at: string;
  updated_at: string;
  // Additional properties returned by the service
  collectionItemId?: string;
  collectionItem?: CollectionItem;
  sellerId?: string;
  seller?: User;
  createdAt?: string;
  updatedAt?: string;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: same error count as before the change (run once before editing to baseline; the repo may not be at zero).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260712000000_marketplace_auction_listings.sql src/types/index.ts
git commit -m "feat(marketplace): add auction/draft listing columns and types"
```

---

### Task 2: Pure listing helpers (TDD)

**Files:**
- Create: `src/lib/marketplaceListing.ts`
- Test: `src/lib/marketplaceListing.test.ts`

**Interfaces:**
- Produces (all exported, consumed by Tasks 3, 5, 7, 8, 9):
  - `ARCHIVE_GRACE_MS: number`
  - `UTC_OFFSETS: string[]` — `'UTC-12:00'`…`'UTC+14:00'`
  - `parseUtcOffset(tz: string | null | undefined): number | null` — minutes
  - `combineAuctionDateTime(date: string, time: string, tz: string): string | null` — ISO instant
  - `splitAuctionDateTime(auctionAt: string, tz: string | null): { date: string; time: string }` — inverse, for prefilling the edit form
  - `getListingEndTime(item): number | null`
  - `isListingArchived(item, now?: number): boolean`
  - `isListingEnded(item, now?: number): boolean`
  - `formatAuctionDateTime(auctionAt: string, tz: string | null): string | null` — `"July 18th, 2026 20:00 UTC+2:00"`
  - `getListingHostname(url?: string | null): string | null` — `"greenappleauction.com"`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/marketplaceListing.test.ts
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/marketplaceListing.test.ts`
Expected: FAIL — cannot resolve `./marketplaceListing`.

- [ ] **Step 3: Implement the helpers**

```ts
// src/lib/marketplaceListing.ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/lib/marketplaceListing.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplaceListing.ts src/lib/marketplaceListing.test.ts
git commit -m "feat(marketplace): pure helpers for auction datetimes and archive rules"
```

---

### Task 3: Service layer — save listing, map new fields, exclude archived from home

**Files:**
- Modify: `src/services/marketplaceService.ts`

**Interfaces:**
- Consumes: helpers from Task 2 (`isListingArchived`), columns from Task 1.
- Produces (consumed by Tasks 5, 8, 9):
  - `export interface ListingInput { listingType: ListingType; salePrice: number | null; publicRemark: string | null; externalListingUrl: string | null; isUrlApproved: boolean; isSold: boolean; auctionAt: string | null; auctionTimezone: string | null; lotNumber: string | null; startPrice: number | null; estimatedPrice: string | null; realizedPrice: number | null; }`
  - `export async function saveMarketplaceListing(collectionItemId: string, sellerId: string, input: ListingInput, publish: boolean): Promise<boolean>`
  - Existing `removeFromMarketplace(collectionItemId, marketplaceItemId?)` unchanged — reused for "Remove listing" and "Delete draft".
  - All fetchers (`fetchMarketplaceItems`, `fetchNewestMarketplaceItems`, `getMarketplaceItemById`, `getMarketplaceItemForCollectionItem`) return the new listing fields on each item.

- [ ] **Step 1: Add imports and the `ListingInput` type + `saveMarketplaceListing`**

At the top of `src/services/marketplaceService.ts` add to the imports:

```ts
import { isListingArchived } from '@/lib/marketplaceListing';
import type { ListingType } from '@/types';
```

Add after the existing `addToMarketplace` function:

```ts
export interface ListingInput {
  listingType: ListingType;
  salePrice: number | null;
  publicRemark: string | null;
  externalListingUrl: string | null;
  isUrlApproved: boolean;
  isSold: boolean;
  auctionAt: string | null;
  auctionTimezone: string | null;
  lotNumber: string | null;
  startPrice: number | null;
  estimatedPrice: string | null;
  realizedPrice: number | null;
}

/**
 * Creates or updates the marketplace listing for a collection item.
 * publish=false saves it as a Draft (hidden from the marketplace,
 * collection item not flagged for sale).
 */
export async function saveMarketplaceListing(
  collectionItemId: string,
  sellerId: string,
  input: ListingInput,
  publish: boolean
): Promise<boolean> {
  try {
    const { data: collectionItem, error: ciError } = await supabase
      .from('collection_items')
      .select('id, banknote_id, is_unlisted_banknote')
      .eq('id', collectionItemId)
      .single();
    if (ciError || !collectionItem) throw ciError ?? new Error('Collection item not found');

    const { data: existing } = await supabase
      .from('marketplace_items')
      .select('id, sold_at')
      .eq('collection_item_id', collectionItemId)
      .maybeSingle();

    const row: Record<string, unknown> = {
      listing_type: input.listingType,
      public_remark: input.publicRemark,
      external_listing_url: input.externalListingUrl,
      is_url_approved: input.isUrlApproved,
      is_sold: input.listingType === 'sale' ? input.isSold : false,
      sold_at:
        input.listingType === 'sale' && input.isSold
          ? existing?.sold_at ?? new Date().toISOString()
          : null,
      auction_at: input.listingType === 'auction' ? input.auctionAt : null,
      auction_timezone: input.listingType === 'auction' ? input.auctionTimezone : null,
      lot_number: input.listingType === 'auction' ? input.lotNumber : null,
      start_price: input.listingType === 'auction' ? input.startPrice : null,
      estimated_price: input.listingType === 'auction' ? input.estimatedPrice : null,
      realized_price: input.listingType === 'auction' ? input.realizedPrice : null,
      status: publish ? 'Available' : 'Draft',
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('marketplace_items')
        .update(row as any)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('marketplace_items').insert({
        ...(row as any),
        collection_item_id: collectionItemId,
        seller_id: sellerId,
        banknote_id: collectionItem.is_unlisted_banknote ? null : collectionItem.banknote_id,
      });
      if (error) throw error;
    }

    const { error: updateError } = await supabase
      .from('collection_items')
      .update({
        is_for_sale: publish,
        sale_price: input.listingType === 'sale' ? input.salePrice : null,
      })
      .eq('id', collectionItemId);
    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error in saveMarketplaceListing:', error);
    return false;
  }
}
```

- [ ] **Step 2: Pass the new columns through every fetcher**

There are four mapping sites that build the returned object (`fetchMarketplaceItems` ~line 114, `fetchNewestMarketplaceItems`, `getMarketplaceItemById`, `getMarketplaceItemForCollectionItem`). In each, the raw row already contains the new columns (they all `select('*')` on `marketplace_items`). Add this block to each returned object, next to the existing `status: item.status` line (adjust `item` to the local variable name in each function):

```ts
external_listing_url: item.external_listing_url,
is_url_approved: item.is_url_approved,
listing_type: (item.listing_type ?? 'sale') as ListingType,
public_remark: item.public_remark,
is_sold: item.is_sold ?? false,
sold_at: item.sold_at,
auction_at: item.auction_at,
auction_timezone: item.auction_timezone,
lot_number: item.lot_number,
start_price: item.start_price,
estimated_price: item.estimated_price,
realized_price: item.realized_price,
```

Note: `getMarketplaceItemById` and `getMarketplaceItemForCollectionItem` already map `external_listing_url`/`is_url_approved` — don't duplicate those two keys there.

- [ ] **Step 3: Make sure drafts load for the owner and stay hidden publicly**

- `fetchMarketplaceItems` and `fetchNewestMarketplaceItems` keep `.eq('status', 'Available')` — drafts stay hidden with no change.
- Check `getMarketplaceItemForCollectionItem` (line ~386): it must NOT filter by status (so the owner's Draft loads into the dialog). If it currently has `.eq('status', 'Available')`, remove that filter.
- In `fetchNewestMarketplaceItems` only (home page teaser), filter archived items after mapping, just before the final return:

```ts
return validItems.filter((i) => !isListingArchived(i));
```

(`fetchMarketplaceItems` intentionally returns archived items too — the Marketplace page splits Active/Archive in Task 8.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors vs. baseline.

- [ ] **Step 5: Commit**

```bash
git add src/services/marketplaceService.ts
git commit -m "feat(marketplace): saveMarketplaceListing service + auction fields in fetchers"
```

---

### Task 4: i18n keys (en / ar / tr)

**Files:**
- Modify: `public/locales/en/marketplace.json`
- Modify: `public/locales/ar/marketplace.json`
- Modify: `public/locales/tr/marketplace.json`

**Interfaces:**
- Produces: `listing.*` keys in the `marketplace` namespace, used by Tasks 5–9 via `t('listing.…')`.

- [ ] **Step 1: Add the `listing` block to `public/locales/en/marketplace.json`**

Add as a new top-level key (keep existing keys untouched):

```json
"listing": {
  "manageListing": "Marketplace Listing",
  "sellThisItem": "Sell this item",
  "editItem": "Edit Item",
  "saleOption": "Sale (Buy now)",
  "auctionOption": "Auction (External Auction)",
  "salePrice": "Sale price",
  "salePriceRequired": "Sale price is required",
  "publicRemark": "Public Remark (Optional)",
  "addWebsiteUrl": "Add your website URL (Optional)",
  "auctionUrl": "Add Auction Item website URL",
  "auctionUrlRequired": "An approved auction website URL is required to publish",
  "urlNotApprovedNotice": "If your website is not approved by OttoCollect, contact: info@ottocollect.com",
  "checkChatNotice": "Please check your OttoCollect chat box from time to time",
  "itemSold": "Item Sold",
  "itemSoldDescription": "Item will move to Archive in 1 week",
  "auctionDate": "Auction date",
  "auctionTime": "Auction time",
  "timezone": "Time zone",
  "auctionDateRequired": "Auction date, time and time zone are required",
  "lotNumber": "Lot No.",
  "startPrice": "Start price",
  "estimatedPrice": "Estimated",
  "estimatedPlaceholder": "e.g. 150-300",
  "realizedPrice": "Realized price",
  "realizedPriceDescription": "You can enter the final price after the auction ends",
  "archiveAfterAuction": "Item will move to Archive 1 week after the auction",
  "mustBeFilled": "* Must be filled in",
  "publish": "Publish",
  "saveDraft": "Save draft",
  "cancel": "Cancel",
  "deleteDraft": "Delete draft",
  "removeListing": "Remove from Marketplace",
  "draft": "Draft",
  "draftSaved": "Draft saved",
  "published": "Listing published",
  "listingRemoved": "Listing removed",
  "saveError": "Could not save the listing. Please try again.",
  "viewSource": "View Source",
  "auctionItem": "Auction item",
  "buyNowItem": "Buy it now Item",
  "auctionDateTime": "Auction Date & Time:",
  "lot": "Lot",
  "sold": "Sold",
  "activeTab": "Marketplace",
  "archiveTab": "Archive",
  "noArchivedItems": "No archived sales yet."
}
```

- [ ] **Step 2: Add the Arabic block to `public/locales/ar/marketplace.json`**

```json
"listing": {
  "manageListing": "عرض في السوق",
  "sellThisItem": "بيع هذه القطعة",
  "editItem": "تعديل العنصر",
  "saleOption": "بيع (شراء فوري)",
  "auctionOption": "مزاد (مزاد خارجي)",
  "salePrice": "سعر البيع",
  "salePriceRequired": "سعر البيع مطلوب",
  "publicRemark": "ملاحظة عامة (اختياري)",
  "addWebsiteUrl": "أضف رابط موقعك (اختياري)",
  "auctionUrl": "أضف رابط صفحة المزاد",
  "auctionUrlRequired": "يلزم رابط موقع مزاد معتمد للنشر",
  "urlNotApprovedNotice": "إذا لم يكن موقعك معتمداً لدى OttoCollect تواصل مع: info@ottocollect.com",
  "checkChatNotice": "يرجى مراجعة صندوق محادثات OttoCollect من وقت لآخر",
  "itemSold": "تم البيع",
  "itemSoldDescription": "سينتقل العنصر إلى الأرشيف خلال أسبوع",
  "auctionDate": "تاريخ المزاد",
  "auctionTime": "وقت المزاد",
  "timezone": "المنطقة الزمنية",
  "auctionDateRequired": "تاريخ المزاد ووقته والمنطقة الزمنية مطلوبة",
  "lotNumber": "رقم القطعة (Lot)",
  "startPrice": "سعر البداية",
  "estimatedPrice": "السعر التقديري",
  "estimatedPlaceholder": "مثال: 150-300",
  "realizedPrice": "السعر النهائي",
  "realizedPriceDescription": "يمكنك إدخال السعر النهائي بعد انتهاء المزاد",
  "archiveAfterAuction": "سينتقل العنصر إلى الأرشيف بعد أسبوع من المزاد",
  "mustBeFilled": "* حقل إلزامي",
  "publish": "نشر",
  "saveDraft": "حفظ كمسودة",
  "cancel": "إلغاء",
  "deleteDraft": "حذف المسودة",
  "removeListing": "إزالة من السوق",
  "draft": "مسودة",
  "draftSaved": "تم حفظ المسودة",
  "published": "تم نشر العرض",
  "listingRemoved": "تمت إزالة العرض",
  "saveError": "تعذر حفظ العرض. حاول مرة أخرى.",
  "viewSource": "عرض المصدر",
  "auctionItem": "قطعة مزاد",
  "buyNowItem": "شراء فوري",
  "auctionDateTime": "تاريخ ووقت المزاد:",
  "lot": "Lot",
  "sold": "مباع",
  "activeTab": "السوق",
  "archiveTab": "الأرشيف",
  "noArchivedItems": "لا توجد مبيعات مؤرشفة بعد."
}
```

- [ ] **Step 3: Add the Turkish block to `public/locales/tr/marketplace.json`**

```json
"listing": {
  "manageListing": "Pazar Yeri İlanı",
  "sellThisItem": "Bu parçayı sat",
  "editItem": "İlanı Düzenle",
  "saleOption": "Satış (Hemen al)",
  "auctionOption": "Müzayede (Harici Müzayede)",
  "salePrice": "Satış fiyatı",
  "salePriceRequired": "Satış fiyatı zorunludur",
  "publicRemark": "Genel Not (İsteğe bağlı)",
  "addWebsiteUrl": "Web sitenizin adresini ekleyin (İsteğe bağlı)",
  "auctionUrl": "Müzayede sayfası adresini ekleyin",
  "auctionUrlRequired": "Yayınlamak için onaylı bir müzayede sitesi adresi gerekli",
  "urlNotApprovedNotice": "Siteniz OttoCollect tarafından onaylı değilse iletişim: info@ottocollect.com",
  "checkChatNotice": "Lütfen OttoCollect sohbet kutunuzu ara sıra kontrol edin",
  "itemSold": "Satıldı",
  "itemSoldDescription": "Parça 1 hafta içinde Arşive taşınacak",
  "auctionDate": "Müzayede tarihi",
  "auctionTime": "Müzayede saati",
  "timezone": "Saat dilimi",
  "auctionDateRequired": "Müzayede tarihi, saati ve saat dilimi zorunludur",
  "lotNumber": "Lot No.",
  "startPrice": "Başlangıç fiyatı",
  "estimatedPrice": "Tahmini",
  "estimatedPlaceholder": "örn. 150-300",
  "realizedPrice": "Gerçekleşen fiyat",
  "realizedPriceDescription": "Müzayede bittikten sonra nihai fiyatı girebilirsiniz",
  "archiveAfterAuction": "Parça müzayededen 1 hafta sonra Arşive taşınacak",
  "mustBeFilled": "* Doldurulması zorunludur",
  "publish": "Yayınla",
  "saveDraft": "Taslak kaydet",
  "cancel": "İptal",
  "deleteDraft": "Taslağı sil",
  "removeListing": "Pazar Yerinden Kaldır",
  "draft": "Taslak",
  "draftSaved": "Taslak kaydedildi",
  "published": "İlan yayınlandı",
  "listingRemoved": "İlan kaldırıldı",
  "saveError": "İlan kaydedilemedi. Lütfen tekrar deneyin.",
  "viewSource": "Kaynağı Gör",
  "auctionItem": "Müzayede parçası",
  "buyNowItem": "Hemen al",
  "auctionDateTime": "Müzayede Tarihi ve Saati:",
  "lot": "Lot",
  "sold": "Satıldı",
  "activeTab": "Pazar Yeri",
  "archiveTab": "Arşiv",
  "noArchivedItems": "Henüz arşivlenmiş satış yok."
}
```

- [ ] **Step 4: Validate JSON**

Run: `node -e "['en','ar','tr'].forEach(l=>JSON.parse(require('fs').readFileSync('public/locales/'+l+'/marketplace.json','utf8')) && console.log(l,'ok'))"`
Expected: `en ok`, `ar ok`, `tr ok`.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/marketplace.json public/locales/ar/marketplace.json public/locales/tr/marketplace.json
git commit -m "feat(marketplace): listing i18n keys for sale/auction dialog and archive"
```

---

### Task 5: `MarketplaceListingDialog` component

**Files:**
- Create: `src/components/marketplace/MarketplaceListingDialog.tsx`

**Interfaces:**
- Consumes: `saveMarketplaceListing`, `removeFromMarketplace`, `getMarketplaceItemForCollectionItem` (Task 3); `combineAuctionDateTime`, `splitAuctionDateTime`, `UTC_OFFSETS` (Task 2); `fetchApprovedDomains`, `isUrlApproved`, `normalizeDomain`, `createPendingDomainRequest` from `@/services/approvedDomainsService`; `listing.*` i18n keys (Task 4).
- Produces (consumed by Tasks 6 and 9):

```ts
interface MarketplaceListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionItemId: string;
  onSaved?: () => void;   // called after publish / draft save / delete
}
export function MarketplaceListingDialog(props: MarketplaceListingDialogProps): JSX.Element;
```

The dialog loads the existing listing itself via `getMarketplaceItemForCollectionItem(collectionItemId)` when opened, so callers only pass the id.

- [ ] **Step 1: Create the component**

```tsx
// src/components/marketplace/MarketplaceListingDialog.tsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  getMarketplaceItemForCollectionItem,
  removeFromMarketplace,
  saveMarketplaceListing,
  ListingInput,
} from '@/services/marketplaceService';
import {
  fetchApprovedDomains,
  isUrlApproved,
  normalizeDomain,
  createPendingDomainRequest,
  ApprovedDomain,
} from '@/services/approvedDomainsService';
import {
  combineAuctionDateTime,
  splitAuctionDateTime,
  UTC_OFFSETS,
} from '@/lib/marketplaceListing';
import { ListingType, MarketplaceItem } from '@/types';

interface MarketplaceListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionItemId: string;
  onSaved?: () => void;
}

const NUMERIC = /^[0-9]*\.?[0-9]*$/;

export function MarketplaceListingDialog({
  open, onOpenChange, collectionItemId, onSaved,
}: MarketplaceListingDialogProps) {
  const { t } = useTranslation(['marketplace']);
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<MarketplaceItem | null>(null);
  const [approvedDomains, setApprovedDomains] = useState<ApprovedDomain[]>([]);
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [listingType, setListingType] = useState<ListingType>('sale');
  const [salePrice, setSalePrice] = useState('');
  const [publicRemark, setPublicRemark] = useState('');
  const [url, setUrl] = useState('');
  const [isSold, setIsSold] = useState(false);
  const [auctionDate, setAuctionDate] = useState('');
  const [auctionTime, setAuctionTime] = useState('');
  const [auctionTz, setAuctionTz] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [realizedPrice, setRealizedPrice] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErrors([]);
    setApprovalRequested(false);
    Promise.all([
      getMarketplaceItemForCollectionItem(collectionItemId),
      fetchApprovedDomains(),
    ]).then(([item, domains]) => {
      if (cancelled) return;
      setApprovedDomains(domains);
      setExisting(item);
      if (item) {
        setListingType((item.listing_type ?? 'sale') as ListingType);
        setSalePrice(item.collectionItem?.salePrice ? String(item.collectionItem.salePrice) : '');
        setPublicRemark(item.public_remark ?? '');
        setUrl(item.external_listing_url ?? '');
        setIsSold(Boolean(item.is_sold));
        setLotNumber(item.lot_number ?? '');
        setStartPrice(item.start_price != null ? String(item.start_price) : '');
        setEstimatedPrice(item.estimated_price ?? '');
        setRealizedPrice(item.realized_price != null ? String(item.realized_price) : '');
        setAuctionTz(item.auction_timezone ?? '');
        if (item.auction_at) {
          const { date, time } = splitAuctionDateTime(item.auction_at, item.auction_timezone ?? null);
          setAuctionDate(date);
          setAuctionTime(time);
        } else {
          setAuctionDate('');
          setAuctionTime('');
        }
      } else {
        setListingType('sale');
        setSalePrice(''); setPublicRemark(''); setUrl(''); setIsSold(false);
        setAuctionDate(''); setAuctionTime(''); setAuctionTz('');
        setLotNumber(''); setStartPrice(''); setEstimatedPrice(''); setRealizedPrice('');
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, collectionItemId]);

  const urlTrimmed = url.trim();
  const urlIsValid = useMemo(() => {
    if (!urlTrimmed) return false;
    try { new URL(urlTrimmed); return true; } catch { return false; }
  }, [urlTrimmed]);
  const urlApproved = urlIsValid && isUrlApproved(urlTrimmed, approvedDomains);

  const isDraft = existing?.status === 'Draft';
  const isPublished = existing != null && existing.status !== 'Draft';

  const validate = (publish: boolean): string[] => {
    const errs: string[] = [];
    if (listingType === 'sale') {
      const price = parseFloat(salePrice);
      if (publish && (!salePrice || Number.isNaN(price) || price <= 0)) {
        errs.push(t('listing.salePriceRequired'));
      }
    } else {
      if (publish && !combineAuctionDateTime(auctionDate, auctionTime, auctionTz)) {
        errs.push(t('listing.auctionDateRequired'));
      }
      if (publish && (!urlIsValid || !urlApproved)) {
        errs.push(t('listing.auctionUrlRequired'));
      }
    }
    return errs;
  };

  const buildInput = (): ListingInput => ({
    listingType,
    salePrice: listingType === 'sale' && salePrice ? parseFloat(salePrice) : null,
    publicRemark: publicRemark.trim() || null,
    externalListingUrl: urlTrimmed || null,
    isUrlApproved: urlApproved,
    isSold: listingType === 'sale' ? isSold : false,
    auctionAt: listingType === 'auction'
      ? combineAuctionDateTime(auctionDate, auctionTime, auctionTz)
      : null,
    auctionTimezone: listingType === 'auction' ? auctionTz || null : null,
    lotNumber: lotNumber.trim() || null,
    startPrice: startPrice ? parseFloat(startPrice) : null,
    estimatedPrice: estimatedPrice.trim() || null,
    realizedPrice: realizedPrice ? parseFloat(realizedPrice) : null,
  });

  const handleSave = async (publish: boolean) => {
    if (!user?.id) return;
    const errs = validate(publish);
    setErrors(errs);
    if (errs.length > 0) return;
    setSaving(true);
    const ok = await saveMarketplaceListing(collectionItemId, user.id, buildInput(), publish);
    setSaving(false);
    if (ok) {
      toast({ title: publish ? t('listing.published') : t('listing.draftSaved') });
      onOpenChange(false);
      onSaved?.();
    } else {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const ok = await removeFromMarketplace(collectionItemId, existing?.id);
    setSaving(false);
    if (ok) {
      toast({ title: t('listing.listingRemoved') });
      onOpenChange(false);
      onSaved?.();
    } else {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
  };

  const handleRequestApproval = async () => {
    if (!user?.id || !urlIsValid) return;
    const ok = await createPendingDomainRequest(user.id, normalizeDomain(urlTrimmed), urlTrimmed);
    if (ok) setApprovalRequested(true);
  };

  const numericInput = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === '' || NUMERIC.test(e.target.value)) setter(e.target.value);
    };

  const urlWarning = urlTrimmed && urlIsValid && !urlApproved && (
    <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
        {t('listing.urlNotApprovedNotice')}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={approvalRequested} onClick={handleRequestApproval}>
        {approvalRequested ? t('item.approvalRequested') : t('item.requestApproval')}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            <span>
              {t('listing.manageListing')}
              {isDraft && <Badge variant="secondary" className="ml-2">{t('listing.draft')}</Badge>}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">…</div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={listingType} onValueChange={(v) => setListingType(v as ListingType)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sale" id="listing-sale" />
                <Label htmlFor="listing-sale">{t('listing.saleOption')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auction" id="listing-auction" />
                <Label htmlFor="listing-auction">{t('listing.auctionOption')}</Label>
              </div>
            </RadioGroup>

            {listingType === 'sale' ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label>{t('listing.salePrice')} * (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input className="pl-6" value={salePrice} onChange={numericInput(setSalePrice)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.publicRemark')}</Label>
                  <Textarea value={publicRemark} onChange={(e) => setPublicRemark(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.addWebsiteUrl')}</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.ebay.com/itm/..." />
                  {urlWarning}
                </div>
                <p className="text-xs text-muted-foreground">{t('listing.checkChatNotice')}</p>
                {isPublished && (
                  <div className="flex items-start gap-2">
                    <Checkbox id="listing-sold" checked={isSold} onCheckedChange={(v) => setIsSold(v === true)} />
                    <div>
                      <Label htmlFor="listing-sold">{t('listing.itemSold')}</Label>
                      <p className="text-xs text-muted-foreground">{t('listing.itemSoldDescription')}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('listing.mustBeFilled')}</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('listing.auctionDate')} *</Label>
                    <Input type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('listing.auctionTime')} *</Label>
                    <Input type="time" value={auctionTime} onChange={(e) => setAuctionTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.timezone')} *</Label>
                  <Select value={auctionTz} onValueChange={setAuctionTz}>
                    <SelectTrigger><SelectValue placeholder="UTC+0:00" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {UTC_OFFSETS.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.lotNumber')}</Label>
                  <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t('listing.startPrice')} (USD)</Label>
                    <Input value={startPrice} onChange={numericInput(setStartPrice)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('listing.estimatedPrice')} (USD)</Label>
                    <Input value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} placeholder={t('listing.estimatedPlaceholder')} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.realizedPrice')} (USD)</Label>
                  <Input value={realizedPrice} onChange={numericInput(setRealizedPrice)} />
                  <p className="text-xs text-muted-foreground">{t('listing.realizedPriceDescription')}</p>
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.publicRemark')}</Label>
                  <Textarea value={publicRemark} onChange={(e) => setPublicRemark(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t('listing.auctionUrl')} *</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                  {urlWarning}
                </div>
                <p className="text-xs text-muted-foreground">{t('listing.archiveAfterAuction')}</p>
                <p className="text-xs text-muted-foreground">{t('listing.mustBeFilled')}</p>
              </div>
            )}

            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((e) => (
                  <p key={e} className="text-sm font-medium text-destructive">{e}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {existing && (
                <Button type="button" variant="ghost" className="mr-auto text-destructive" disabled={saving} onClick={handleDelete}>
                  {isDraft ? t('listing.deleteDraft') : t('listing.removeListing')}
                </Button>
              )}
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                {t('listing.cancel')}
              </Button>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => handleSave(false)}>
                {t('listing.saveDraft')}
              </Button>
              <Button type="button" disabled={saving} onClick={() => handleSave(true)}>
                {t('listing.publish')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Notes for the implementer:
- Check the actual export names in `src/components/ui/*` before importing (e.g. `use-toast` location: `@/hooks/use-toast` — verify with `grep -rn "useToast" src/hooks/`). Adjust imports to match the codebase.
- `getMarketplaceItemForCollectionItem` returns the mapped item including `collectionItem.salePrice` — verify its return shape and adapt the prefill lines if the key differs.
- Per the spec, the "Item Sold" checkbox only appears on an already-published Buy-now listing.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors vs. baseline.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketplace/MarketplaceListingDialog.tsx
git commit -m "feat(marketplace): listing dialog with sale/auction options, drafts and publish"
```

---

### Task 6: Entry points — collection item page and edit forms

**Files:**
- Modify: `src/pages/CollectionItem.tsx` (owner buttons ~lines 710–734, dialogs ~772–781)
- Modify: `src/components/collection/CollectionItemFormEdit.tsx` (sale section lines 1063–1186, zod schema lines 73–84, submit logic ~lines 391–392 and 462–486, `isLimitedRank` line 155)
- Modify: `src/components/collection/EditUnlistedBanknoteDialog.tsx` (sale switch lines 1482–1498, price 1506+, analogous schema/submit logic)

**Interfaces:**
- Consumes: `MarketplaceListingDialog` (Task 5).
- Produces: the ONLY way to create/edit a listing is now the dialog. `AddUnlistedBanknoteDialog.tsx` is intentionally left unchanged (its simple for-sale switch still creates a plain Buy-now listing, which remains valid with `listing_type` defaulting to `'sale'`).

- [ ] **Step 1: CollectionItem page — add a Sell/Manage-listing button**

In `src/pages/CollectionItem.tsx`:
1. Add imports: `import { MarketplaceListingDialog } from '@/components/marketplace/MarketplaceListingDialog';` and add `Tag` to the existing `lucide-react` import.
2. Add state next to `isEditDialogOpen`: `const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);`
3. Compute the rank gate near other derived values: `const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;` (verify `user` is available in this component; it uses auth context already for `isOwner`).
4. In the owner buttons block (between the Delete and Edit buttons at lines ~712–732), add:

```tsx
<Button
  title={collectionItem?.isForSale ? t('listing.editItem', { ns: 'marketplace' }) : t('listing.sellThisItem', { ns: 'marketplace' })}
  variant="ghost"
  size="sm"
  className="flex items-center gap-1"
  onClick={() => setIsListingDialogOpen(true)}
  disabled={isDeleting || isLimitedRank}
>
  <Tag className="w-4 h-4" />
</Button>
```

5. Next to the existing Edit dialog (after line 781), render:

```tsx
<MarketplaceListingDialog
  open={isListingDialogOpen}
  onOpenChange={setIsListingDialogOpen}
  collectionItemId={collectionItem.id}
  onSaved={handleUpdateSuccess}
/>
```

(Verify the refresh callback name — the edit dialog uses `handleUpdateSuccess`; reuse the same.)

- [ ] **Step 2: CollectionItemFormEdit — replace the inline sale section with a launcher**

In `src/components/collection/CollectionItemFormEdit.tsx`:
1. Delete the three sale-related `FormField` blocks (For Sale switch, salePrice, externalListingUrl — currently lines 1063–1186) and replace with:

```tsx
{/* Marketplace listing is managed in its own dialog */}
<div className={`flex items-center justify-between rounded-lg border p-4 ${i18n.dir() === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
  <div className={`space-y-0.5 ${i18n.dir() === 'rtl' ? 'text-right' : 'text-left'}`}>
    <span className="text-base font-medium">{t('listing.manageListing')}</span>
    <p className="text-sm text-muted-foreground">
      {isLimitedRank ? t('item.rankInsufficient') : t('item.forSaleDescription')}
    </p>
  </div>
  <Button type="button" variant="outline" disabled={isLimitedRank} onClick={() => setIsListingDialogOpen(true)}>
    {currentItem.isForSale ? t('listing.editItem') : t('listing.sellThisItem')}
  </Button>
</div>
```

2. Add state `const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);` and render at the end of the component's JSX (inside the fragment, after the `</form>`):

```tsx
<MarketplaceListingDialog
  open={isListingDialogOpen}
  onOpenChange={setIsListingDialogOpen}
  collectionItemId={currentItem.id}
  onSaved={() => onUpdate?.()}
/>
```

(Verify the update-callback prop name on this form — the component receives `onUpdate`; check its signature and call it the same way existing code does after a successful save.)

3. Remove from the zod schema: `isForSale`, `salePrice`, `externalListingUrl` fields and the `.refine`/conditional price rule (lines 73–84), and their `defaultValues`.
4. Remove from `onSubmit`: the `is_for_sale`/`sale_price` assignments (lines ~391–392), the `addToMarketplace`/`removeFromMarketplace` calls (lines ~462–476), and the `external_listing_url`/`is_url_approved` update block (lines ~478–486).
5. Remove now-unused imports (`addToMarketplace`, `removeFromMarketplace`, `createMarketplaceItem`, `Switch` if unused elsewhere in the file, approved-domain imports if the URL field was their only consumer — check each with a grep inside the file before deleting). Keep `isLimitedRank` (line 155) — the launcher uses it.
6. Add import: `import { MarketplaceListingDialog } from '@/components/marketplace/MarketplaceListingDialog';`

- [ ] **Step 3: EditUnlistedBanknoteDialog — same replacement**

Apply the same pattern as Step 2 to `src/components/collection/EditUnlistedBanknoteDialog.tsx`: replace its For-Sale switch (lines 1482–1498) + sale price field (1506+) with the launcher block, add the nested `MarketplaceListingDialog`, strip `isForSale`/`salePrice` from schema/defaults/submit, keep `isLimitedRank`. The collection item id prop here: check what the dialog edits (it has the collection item — find the id variable used in its submit call and pass that as `collectionItemId`).

- [ ] **Step 4: Typecheck and grep for leftovers**

Run: `npx tsc --noEmit` — no new errors.
Run: `grep -n "isForSale\|salePrice\|externalListingUrl" src/components/collection/CollectionItemFormEdit.tsx src/components/collection/EditUnlistedBanknoteDialog.tsx`
Expected: no remaining references except possibly display-only usages (e.g. `currentItem.isForSale` in the launcher label).

- [ ] **Step 5: Commit**

```bash
git add src/pages/CollectionItem.tsx src/components/collection/CollectionItemFormEdit.tsx src/components/collection/EditUnlistedBanknoteDialog.tsx
git commit -m "feat(marketplace): open listing dialog from collection item page and edit forms"
```

---

### Task 7: Marketplace card redesign

**Files:**
- Modify: `src/components/marketplace/MarketplaceItem.tsx`

**Interfaces:**
- Consumes: new fields on `MarketplaceItem` (Task 1/3); `formatAuctionDateTime`, `getListingHostname` (Task 2); `listing.*` keys (Task 4).
- Produces: card per spec items 8–13.

- [ ] **Step 1: Rewrite the card body**

In `src/components/marketplace/MarketplaceItem.tsx`:

1. Add imports:

```tsx
import { formatAuctionDateTime, getListingHostname } from '@/lib/marketplaceListing';
```

2. Delete `getStatusBadge` (lines 97–109) and its render site (lines 146–148). Replace the badge slot with a Sold badge only:

```tsx
{item.is_sold && (
  <div className="absolute top-2 right-2">
    <Badge variant="destructive">{t('listing.sold')}</Badge>
  </div>
)}
```

3. Derive listing values after the `collectionItem` destructuring (line 78):

```tsx
const isAuction = item.listing_type === 'auction';
const showSource = Boolean(item.external_listing_url && item.is_url_approved);
const sourceHostname = getListingHostname(item.external_listing_url);
const auctionDateTime = item.auction_at
  ? formatAuctionDateTime(item.auction_at, item.auction_timezone ?? null)
  : null;
const handleViewSource = (e: React.MouseEvent) => {
  e.stopPropagation();
  window.open(item.external_listing_url!, '_blank', 'noopener,noreferrer');
};
```

4. Price badge (lines 142–144): larger font, darker brown, sale-only:

```tsx
{!isAuction && salePrice != null && (
  <div className="absolute top-0 left-0 bg-ottoman-700/95 text-white px-3 py-1 flex items-center text-lg font-bold">
    ${salePrice}
  </div>
)}
```

5. Spec item 9 (bigger font, light brown → brown): in the header/content change
   - `text-sm text-ottoman-300` (country/year line, line 166) → `text-base text-ottoman-600 dark:text-ottoman-300`
   - seller label `text-xs text-ottoman-400` → `text-sm text-ottoman-600 dark:text-ottoman-400`, seller name `text-sm text-ottoman-200` → `text-base text-ottoman-700 dark:text-ottoman-200`
   (Check the rendered card in BOTH light and dark themes; the dark: fallbacks keep dark mode readable.)

6. Remark (spec: appears under the item image/title): in `CardContent`, replace the `publicNote` paragraph with:

```tsx
{(item.public_remark || publicNote) && (
  <p className="text-sm text-ottoman-700 dark:text-ottoman-200 line-clamp-2 mb-2">
    {item.public_remark || publicNote}
  </p>
)}
```

7. Auction info block (spec items 12–13 — render each line only when the value exists), inside `CardContent` after the remark:

```tsx
{isAuction && (
  <div className="mt-2 space-y-0.5 text-sm">
    {auctionDateTime && (
      <div className="rounded border border-ottoman-200 dark:border-ottoman-700 bg-muted/40 px-2 py-1">
        <p className="text-xs text-muted-foreground">{t('listing.auctionDateTime')}</p>
        <p className="font-bold">{auctionDateTime}</p>
      </div>
    )}
    {item.lot_number && <p>{t('listing.lot')}: {item.lot_number}</p>}
    {item.start_price != null && <p>{t('listing.startPrice')}: ${item.start_price}</p>}
    {item.estimated_price && <p>{t('listing.estimatedPrice')}: ${item.estimated_price}</p>}
    {item.realized_price != null && <p>{t('listing.realizedPrice')}: ${item.realized_price}</p>}
  </div>
)}
```

8. Footer (replace the current `CardFooter` content, lines 207–209) — View Source button, hostname, type label, Contact seller only for non-auctions:

```tsx
<CardFooter className="pt-2 pb-3 px-4 flex flex-col items-stretch gap-1">
  {showSource && (
    <>
      <Button
        className="w-full bg-ottoman-600 hover:bg-ottoman-700 text-white font-semibold"
        onClick={handleViewSource}
      >
        {t('listing.viewSource')}
      </Button>
      {sourceHostname && (
        <p className="text-center text-sm text-ottoman-700 dark:text-ottoman-300">{sourceHostname}</p>
      )}
    </>
  )}
  <p className="text-center text-base font-semibold text-foreground">
    {isAuction ? t('listing.auctionItem') : t('listing.buyNowItem')}
  </p>
  {!isAuction && (
    <div className="flex justify-between pt-1" onClick={(e) => e.stopPropagation()}>
      <ContactSellerButton item={item} />
    </div>
  )}
</CardFooter>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — no new errors.

- [ ] **Step 3: Visual check**

Run: `npm run dev`, open `/marketplace` (needs a logged-in session to click through; the grid itself renders logged-out). Verify: no "Available" badge; price badge bigger/darker; type label shows. If no auction item exists yet in dev data, publish one through the Task 6 dialog first.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketplace/MarketplaceItem.tsx
git commit -m "feat(marketplace): card redesign with auction info, View Source and type label"
```

---

### Task 8: Marketplace page — Active / Archive views

**Files:**
- Modify: `src/pages/Marketplace.tsx`

**Interfaces:**
- Consumes: `isListingArchived` (Task 2); `fetchMarketplaceItems` already returns archived items too (Task 3 kept them in).
- Produces: spec item 14 — default view shows active + ended-but-not-yet-archived listings; an Archive toggle shows ended sales that weren't deleted.

- [ ] **Step 1: Add the view state and split**

In `src/pages/Marketplace.tsx`:

1. Imports: `import { isListingArchived } from '@/lib/marketplaceListing';` and `Archive` from `lucide-react`.
2. State: `const [view, setView] = useState<'active' | 'archive'>('active');`
3. Where `marketplaceItemsForFilter` is built from `marketplaceItems` (lines ~136–142), filter first:

```tsx
const visibleItems = useMemo(
  () => marketplaceItems.filter((i) => (view === 'archive') === isListingArchived(i)),
  [marketplaceItems, view]
);
```

and feed `visibleItems` (instead of `marketplaceItems`) into the existing `marketplaceItemsForFilter` mapping so filters/sorting keep working per view.

- [ ] **Step 2: Add the toggle UI**

Directly above the items grid (before `marketplaceItemsSection` is rendered, next to/below the `BanknoteFilterMarketplace` bar at lines ~295–302), add:

```tsx
<div className="flex justify-center gap-2 my-3">
  <Button
    variant={view === 'active' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setView('active')}
  >
    {t('listing.activeTab')}
  </Button>
  <Button
    variant={view === 'archive' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setView('archive')}
  >
    <Archive className="w-4 h-4 mr-1" />
    {t('listing.archiveTab')}
  </Button>
</div>
```

(Verify the page's `t` is bound to the `marketplace` namespace; it is — `useTranslation(['marketplace'])`. Verify `Button` is already imported.)

3. Empty state: where the page renders its "no items" state, when `view === 'archive'` show `t('listing.noArchivedItems')` instead.

- [ ] **Step 3: Typecheck + manual check**

Run: `npx tsc --noEmit` — no new errors.
Manual: `/marketplace` shows the two buttons; Archive is empty (until something sold/auction-ended >7 days exists). Toggling preserves filters.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Marketplace.tsx
git commit -m "feat(marketplace): active/archive views on marketplace page"
```

---

### Task 9: Detail pages — listing info, Edit Item, auction contact rules

**Files:**
- Modify: `src/pages/MarketplaceItemDetail.tsx`
- Modify: `src/pages/MarketplaceItemDetailUnlisted.tsx` (same changes, adjusted to its structure)

**Interfaces:**
- Consumes: `MarketplaceListingDialog` (Task 5), helpers (Task 2), `listing.*` keys (Task 4).
- Produces: spec items 15–16 — detail page shows the listing info (remark, auction data, View Source, type label), owner gets "Edit Item" next to "Remove from Marketplace", auctions hide the Message/Contact button.

- [ ] **Step 1: Listing info block in `MarketplaceItemDetail.tsx`**

1. Imports:

```tsx
import { formatAuctionDateTime, getListingHostname } from '@/lib/marketplaceListing';
import { MarketplaceListingDialog } from '@/components/marketplace/MarketplaceListingDialog';
```

2. Derive (after `item` is loaded, near the price render at lines ~370–372):

```tsx
const isAuction = item.listing_type === 'auction';
const showSource = Boolean(item.external_listing_url && item.is_url_approved);
```

3. Price at lines 370–372: wrap so it only renders for non-auctions; for auctions render the auction block instead:

```tsx
{!isAuction && item.collectionItem?.salePrice != null && (
  <p className="text-3xl font-bold text-ottoman-500">${item.collectionItem.salePrice}</p>
)}
<p className="text-base font-semibold text-foreground mt-1">
  {isAuction ? t('listing.auctionItem') : t('listing.buyNowItem')}
</p>
{item.public_remark && (
  <p className="text-sm text-muted-foreground mt-2">{item.public_remark}</p>
)}
{isAuction && (
  <div className="mt-3 space-y-1 text-sm">
    {item.auction_at && (
      <div className="rounded border bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">{t('listing.auctionDateTime')}</p>
        <p className="font-bold">{formatAuctionDateTime(item.auction_at, item.auction_timezone ?? null)}</p>
      </div>
    )}
    {item.lot_number && <p>{t('listing.lot')}: {item.lot_number}</p>}
    {item.start_price != null && <p>{t('listing.startPrice')}: ${item.start_price}</p>}
    {item.estimated_price && <p>{t('listing.estimatedPrice')}: ${item.estimated_price}</p>}
    {item.realized_price != null && <p>{t('listing.realizedPrice')}: ${item.realized_price}</p>}
  </div>
)}
{showSource && (
  <div className="mt-3">
    <Button
      className="w-full sm:w-auto bg-ottoman-600 hover:bg-ottoman-700 text-white font-semibold"
      onClick={() => window.open(item.external_listing_url!, '_blank', 'noopener,noreferrer')}
    >
      {t('listing.viewSource')}
    </Button>
    {getListingHostname(item.external_listing_url) && (
      <p className="text-sm text-ottoman-700 dark:text-ottoman-300 mt-1">
        {getListingHostname(item.external_listing_url)}
      </p>
    )}
  </div>
)}
```

Note: this page may already render `external_listing_url` somewhere (lines ~418–437) — remove/merge that older block so the link appears once, only via View Source.

- [ ] **Step 2: Contact rules + Edit Item**

1. Message button (lines ~467–474): add `!isAuction &&` to its render condition (spec item 4: auctions never show contact-seller).
2. Owner actions (lines ~476–499): before the existing Remove button add:

```tsx
<Button variant="outline" size="sm" onClick={() => setIsListingDialogOpen(true)}>
  {t('listing.editItem')}
</Button>
```

with state `const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);` and, near the page bottom:

```tsx
{item.collectionItem?.id && (
  <MarketplaceListingDialog
    open={isListingDialogOpen}
    onOpenChange={setIsListingDialogOpen}
    collectionItemId={item.collectionItem.id}
    onSaved={() => window.location.reload()}
  />
)}
```

(If the page has a cleaner refetch function — it loads via `getMarketplaceItemById` in an effect — prefer re-calling that loader over `window.location.reload()`; check for an extractable `loadItem` function first.)

- [ ] **Step 3: Mirror in `MarketplaceItemDetailUnlisted.tsx`**

Apply the same three changes (listing info block, `!isAuction` on contact, Edit Item + dialog) to the unlisted variant, adapting to its variable names.

- [ ] **Step 4: Typecheck + manual check**

Run: `npx tsc --noEmit` — no new errors.
Manual: open a marketplace item detail; verify type label, remark, and (for an auction) date/lot/prices + no Message button; as owner verify Edit Item opens the dialog prefilled.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MarketplaceItemDetail.tsx src/pages/MarketplaceItemDetailUnlisted.tsx
git commit -m "feat(marketplace): listing info, Edit Item and auction contact rules on detail pages"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Unit tests**

Run: `npx vitest run`
Expected: all suites pass (including `src/lib/marketplaceListing.test.ts`).

- [ ] **Step 2: Typecheck + lint + build**

Run: `npx tsc --noEmit` (no new errors vs. pre-work baseline), `npm run lint` (no new errors), `npm run build` (succeeds).

- [ ] **Step 3: End-to-end manual pass (`npm run dev`)**

Walk the whole spec with a Known-Collector test account:
1. Collection item → Tag button → dialog opens with Sale/Auction radio.
2. Sale: publish without price → validation error; with price → appears in `/marketplace` with new card (no Available badge, bigger/darker price, "Buy it now Item" label, Contact Seller visible).
3. Sale with unapproved URL → yellow notice + Request Approval; Publish still allowed; View Source NOT shown on card.
4. Auction: Publish blocked without date/time/tz or without an approved URL; Save draft works anyway; reopening the dialog shows the Draft badge and prefilled values; Delete draft removes it.
5. Published auction card: date/time with tz, Lot, Start/Estimated prices (only the filled ones), View Source button + hostname, "Auction item" label, NO Contact Seller.
6. Detail page: click card image → detail shows the same listing info; owner sees Edit Item + Remove from Marketplace; non-owner of an auction sees no Message button.
7. Sold flow: edit a published sale → check Item Sold → card shows Sold badge, stays in active view.
8. Archive: with SQL, backdate one item (`update marketplace_items set is_sold=true, sold_at=now()-interval '10 days' where id='…';` via `mcp__supabase__execute_sql` on a test row) → it disappears from Active, appears under Archive; home-page newest items exclude it.
9. Check `/marketplace` in Arabic (RTL) and Turkish — no raw `listing.…` keys visible.

- [ ] **Step 4: Report**

Report results to the user (in Spanish), including anything that failed or was intentionally left out (spec items 6–7; `AddUnlistedBanknoteDialog` keeps its simple switch). **Do not push** — the user pushes/deploys explicitly.
