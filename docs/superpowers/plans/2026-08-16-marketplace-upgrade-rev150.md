# Marketplace Upgrade Rev 1.50 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Design spec:** `docs/superpowers/specs/2026-08-16-marketplace-upgrade-rev150-design.md` — read it first; this plan implements its delta and refers to its sections as "spec §N".

> **STATUS (2026-08-16):** Tasks 1–12 and Task 13 Step 1 are IMPLEMENTED and committed
> (migrations applied to the remote project; tests/typecheck/build green). Remaining:
> Task 13 Steps 2–4 (edge functions, `_shared/email.ts`, email cron) — blocked on the
> email-provider decision (spec §13 Q1) — and Task 14 Step 3 (manual in-browser E2E walk).

**Goal:** Close the gap between the shipped `marketplace-auction-upgrade` branch and the Rev 1.50 PDF: currency selection (USD/EUR), chat→email consent + daily digest, `PendingUrl` holding state for auctions, the three-list Admin URL dashboard, server-side domain approval (fixes a live RLS bug), stored archive rules (6-month + owner archive + nightly sweep), country-grouped marketplace ordering with pinned owner drafts, per-item reference IDs, and the remaining card/detail polish (inline Mark-as-Sold / Realized-price, guest messaging prompt, cancel confirm, per-field validation highlighting).

**Architecture:** All listing data stays on `marketplace_items` (new columns; `PendingUrl` joins the status enum). Domain approval moves into two `security definer` RPCs (`approve_domain` / `reject_domain`) because prod RLS blocks the current client-side batch updates (spec §6.2). Archive membership becomes stored (`archived_at`, nightly `pg_cron` sweep) with the existing read-time derivation kept as fallback. Marketplace ordering is a pure, unit-tested sectioner (`buildMarketplaceSections`). Email (digest + pending-URLs count) is net-new infrastructure in Supabase edge functions — **blocked on the provider decision** (spec §13 Q1) and staged last.

**Tech Stack:** React 18 + TypeScript + Vite, shadcn/radix, Tailwind (`ottoman` palette), Supabase (remote via MCP `apply_migration`), i18next (`public/locales/{en,ar,tr}/`), vitest, `pg_cron` + `pg_net` (already enabled — see `20260515130000_seo_weekly_incremental_regeneration.sql`).

## Global Constraints

- Title text wrapped in `<span>` (project CLAUDE.md). All user-facing strings via `t(...)`, added to **all three** locales.
- **Never `git push` / deploy** — commits only; the user pushes explicitly.
- `src/integrations/supabase/types.ts` stays stale — use `select('*')` + app types in `src/types/index.ts`, `as any` where needed (existing pattern).
- Typecheck `npx tsc --noEmit` (baseline the error count before starting); tests `npx vitest run`.
- Migrations: apply via `mcp__supabase__apply_migration` **and** commit the file under `supabase/migrations/`.
- Pure logic in `src/lib/marketplaceListing.ts` with tests; components stay thin.

## Decisions taken on the spec's open questions

| Spec §13 | Decision in this plan |
|---|---|
| Q1 email provider | **Blocked** — Task 13 is structured so everything except the actual send is built and tested; assumes Resend as placeholder |
| Q2 currency scope | One `currency` per listing, display-only (no cross-currency sort normalisation) |
| Q3 §8c "Buy it now" on auction mockup | Treated as typo — auction cards show `Auction` only |
| Q4 sort control | Dropped on `/marketplace`; search/country/category/type filters stay |
| Q5 archive layout | Continuous scroll (PDF wording) — Archive section under the active list, replacing the toggle |
| Q6 rejected domains | Log, not block-list — resubmission allowed |
| Q7 rank gate | Left UI-only (unchanged) |
| Q8 reference backfill | Yes — existing published listings get codes in the migration, month taken from `created_at` |
| Q9 remark→publicNote write-through | No — fields stay separate |
| Q10 guest detail access | Login wall stays (current behaviour) |
| Q11 §6c cadence | Email sent only on days with `N > 0` |

If the user overrules any of these, adjust the affected task before executing it.

---

### Task 1: Migration A — schema

**Files:**
- Create: `supabase/migrations/20260816000000_marketplace_rev150_schema.sql`

**Interfaces:**
- Produces: everything in spec §4 — `marketplace_items` columns (`currency`, `reference_code`, `published_at`, `archived_at`, `pending_url_domain`), `PendingUrl` status, `marketplace_reference_counters` + `next_marketplace_reference()`, `rejected_domains`, `pending_domain_requests.{listing_type,marketplace_item_id}`, `profiles.{chat_email_consent,chat_email_consent_at}`, `chat_digest_runs`.

- [ ] **Step 1: Write the migration** — concatenate, in order, the SQL blocks from spec §4.1, §4.2, §4.3, §4.4, §4.5, §4.6 verbatim, then append backfill:

```sql
-- Backfill published_at for already-live listings.
update public.marketplace_items
   set published_at = created_at
 where published_at is null and status in ('Available', 'Sold', 'Reserved');

-- Backfill reference codes month-by-month from created_at (decision Q8).
with numbered as (
  select id,
         case when listing_type = 'auction' then 'A' else 'B' end as prefix,
         extract(year from created_at)::int  as y,
         extract(month from created_at)::int as m,
         row_number() over (
           partition by (case when listing_type = 'auction' then 'A' else 'B' end),
                        date_trunc('month', created_at)
           order by created_at
         ) as n
  from public.marketplace_items
  where reference_code is null and status <> 'Draft'
)
update public.marketplace_items mi
   set reference_code = numbered.prefix || numbered.y::text
                        || lpad(numbered.m::text, 2, '0') || lpad(numbered.n::text, 5, '0')
  from numbered where mi.id = numbered.id;

-- Seed the counters so live allocation continues after the backfilled numbers.
insert into public.marketplace_reference_counters (prefix, year, month, last_value)
select substr(reference_code, 1, 1), substr(reference_code, 2, 4)::int,
       substr(reference_code, 6, 2)::int, max(substr(reference_code, 8, 5)::int)
from public.marketplace_items where reference_code is not null
group by 1, 2, 3
on conflict (prefix, year, month) do update
  set last_value = greatest(marketplace_reference_counters.last_value, excluded.last_value);
```

Also `grant execute on function public.next_marketplace_reference(text) to authenticated;`.

- [ ] **Step 2: Apply** via `mcp__supabase__apply_migration` (name `marketplace_rev150_schema`). Verify with `mcp__supabase__execute_sql`: the 5 new columns exist; `select public.next_marketplace_reference('auction')` returns the next `A…` code after the backfilled max; `rejected_domains` and `chat_digest_runs` exist.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260816000000_marketplace_rev150_schema.sql
git commit -m "feat(marketplace): rev1.50 schema — currency, reference codes, PendingUrl, consent, digests"
```

---

### Task 2: Migration B — approval RPCs + RLS hardening (fixes live bug)

**Files:**
- Create: `supabase/migrations/20260816000100_domain_approval_rpc.sql`

**Interfaces:**
- Consumes: Task 1 tables/columns.
- Produces: `approve_domain(p_domain text)`, `reject_domain(p_domain text)`, `restore_rejected_domain(p_domain text)` — all `security definer`, Super-Admin-gated inside (spec §6.2); tightened policies on `approved_domains` / `pending_domain_requests` / `rejected_domains`.

- [ ] **Step 1: Write the migration.** Implement the RPC skeleton from spec §6.2, filling the four numbered bodies:

`approve_domain(p_domain)` — after the Super-Admin check (`role = 'Super Admin'`, matching `credit_links`):
1. `insert into approved_domains (domain) values (p_domain) on conflict do nothing;` (add a unique index on `approved_domains(domain)` if missing) and `delete from rejected_domains where domain = p_domain;`
2. Attach links by **host-suffix**, not `ilike '%…%'`:

```sql
update public.marketplace_items set is_url_approved = true
 where external_listing_url is not null and (
   lower(split_part(split_part(external_listing_url, '//', 2), '/', 1)) = p_domain
   or lower(split_part(split_part(external_listing_url, '//', 2), '/', 1)) like '%.' || p_domain);
-- same shape for profiles.personal_website_url → profiles.is_url_approved
```

3. Promote held auctions (spec §5.3 step 4): set `status='Available'`, `is_url_approved=true`, `published_at=now()`, `pending_url_domain=null`, `reference_code = coalesce(reference_code, public.next_marketplace_reference(listing_type))` where `status='PendingUrl' and pending_url_domain = p_domain` (loop with `returning id, collection_item_id` or a CTE — one `next_marketplace_reference` call **per row**); then `update collection_items set is_for_sale = true` for those `collection_item_id`s.
4. `delete from pending_domain_requests where domain = p_domain;`

`reject_domain(p_domain)` — same gate; copy pending rows into `rejected_domains (domain, requested_url, requested_by, listing_type, rejected_by=auth.uid())`, then delete them from pending.

`restore_rejected_domain(p_domain)` — same gate; move rows back from `rejected_domains` into `pending_domain_requests`.

Policy tightening (drop-and-recreate):

```sql
drop policy if exists "Admins can manage approved_domains" on public.approved_domains;
create policy "approved_domains super admin write" on public.approved_domains
  for all using (exists (select 1 from public.profiles
                         where id = auth.uid() and role = 'Super Admin'))
  with check   (exists (select 1 from public.profiles
                         where id = auth.uid() and role = 'Super Admin'));
-- keep "Anyone can read approved_domains"

drop policy if exists "Admins can delete requests" on public.pending_domain_requests;
create policy "pending_requests super admin delete" on public.pending_domain_requests
  for delete using (exists (select 1 from public.profiles
                            where id = auth.uid() and role = 'Super Admin'));
-- keep public read + own-insert policies
```

`grant execute` on the three functions to `authenticated`.

- [ ] **Step 2: Apply + verify.** `mcp__supabase__apply_migration`, then via `execute_sql`: `select public.approve_domain('rpc-smoke-test.example')` **fails** when run without a Super-Admin `auth.uid()` context (MCP runs as service role — verify the gate by checking the function raises for a non-admin uid: `set local role authenticated; set local request.jwt.claims ...` or accept manual verification in Task 14). Confirm `pg_policies` now shows the Super-Admin quals.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260816000100_domain_approval_rpc.sql
git commit -m "fix(marketplace): server-side domain approval RPCs + Super-Admin RLS (closes silent 0-row update bug)"
```

---

### Task 3: App types

**Files:**
- Modify: `src/types/index.ts` (MarketplaceItem ~line 331; User/profile type ~line 77)

- [ ] Add to `MarketplaceItem`: `currency?: 'USD' | 'EUR'; reference_code?: string | null; published_at?: string | null; archived_at?: string | null; pending_url_domain?: string | null;` and widen `status` with `'PendingUrl'`. Add to the profile/User type: `chat_email_consent?: boolean;`. Typecheck; commit `feat(marketplace): rev1.50 type additions`.

---

### Task 4: Pure helpers (TDD)

**Files:**
- Modify: `src/lib/marketplaceListing.ts`, `src/lib/marketplaceListing.test.ts`

**Interfaces (produces, consumed by Tasks 6, 7, 10, 11):**

```ts
export const CURRENCIES = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOL: Record<Currency, string>;           // $ / €
export function formatListingPrice(value: number | string | null | undefined,
                                   currency?: Currency): string | null;
export const UNSOLD_ARCHIVE_MS: number;                            // 182 days
export const UPCOMING_AUCTION_WINDOW_MS: number;                   // 14 days
export function formatReferenceCode(code?: string | null): string | null; // "A202608000001" → "A 2026 08 00001"
export interface MarketplaceSection { /* spec §8.3 */ }
export function buildMarketplaceSections(items, countryOrder, now?): MarketplaceSection[];
```

- [ ] **Step 1: Failing tests** — spec §12 list: `formatListingPrice` (USD/EUR × number/range/null); `formatReferenceCode`; `buildMarketplaceSections` (country order incl. empty-country omission, 14-day split, `auction_at` asc then `reference_code` asc tiebreak, buy-now `published_at` desc); archive predicates: explicit `archived_at` wins; buy-now unsold archives after `published_at + 6 months`; existing 7-day cases keep passing.
- [ ] **Step 2: Implement.** `ListingLike` gains `archived_at?`, `published_at?`. `isListingArchived` = `archived_at != null || (derived end-time rule) || (sale && published_at older than UNSOLD_ARCHIVE_MS)`. `buildMarketplaceSections` groups by `item.collectionItem?.banknote?.country` matched against `countryOrder` by name (unknown countries go last, alphabetical).
- [ ] **Step 3:** `npx vitest run src/lib/marketplaceListing.test.ts` → PASS. Commit `feat(marketplace): currency/reference/section helpers + 6-month archive rule`.

---

### Task 5: i18n (en / ar / tr)

**Files:** `public/locales/{en,ar,tr}/marketplace.json`, `public/locales/{en,ar,tr}/admin.json`

- [ ] Add `listing.*` keys (spec §11): `currency`, `chatConsent` ("Agree to receive chat summaries by email"), `chatConsentHint` ("Your email is not visible to other users."), `chatConsentRequired`, `waitingUrlApproval` ("Waiting for URL Approval"), `waitingUrlApprovalNotice` (spec §5.3 message verbatim), `cancelConfirmTitle` ("Changes will not be saved"), `cancelConfirmOk`, `cancelConfirmBack`, `markAsSold` ("Mark as Item Sold"), `enterRealizedPrice` ("After sale, enter Price Realized:"), `update`, `archive`, `archived`, `showUpcomingAuctions` (with `{{count}}`), `yourListings` ("Your drafts & pending items"), `referenceId`, `priceRealizedLabel` ("Price Realized: {{price}}"). Translate ar/tr in the style of the existing `listing` block.
- [ ] Add `urls.*` keys to `admin.json`: `approvedList`, `pendingList`, `rejectedList`, `saleType`, `requestDate`, `rejectedDate`, `username`, `restore`.
- [ ] Validate: `node -e "['en','ar','tr'].forEach(l=>['marketplace','admin'].forEach(n=>JSON.parse(require('fs').readFileSync('public/locales/'+l+'/'+n+'.json','utf8'))&&console.log(l,n,'ok')))"`. Commit `feat(marketplace): rev1.50 i18n keys`.

---

### Task 6: Service layer

**Files:**
- Modify: `src/services/marketplaceService.ts`, `src/services/approvedDomainsService.ts`

**Interfaces (produces):**

```ts
// marketplaceService
export interface ListingInput { /* existing */ currency: Currency; }
export type SaveListingResult = 'published' | 'draft' | 'pending-url' | 'error';
export async function saveMarketplaceListing(...): Promise<SaveListingResult>;  // was boolean
export async function setListingSold(marketplaceItemId: string, isSold: boolean): Promise<boolean>;
export async function setRealizedPrice(marketplaceItemId: string, price: number | null): Promise<boolean>;
export async function archiveListing(marketplaceItemId: string): Promise<boolean>;
// approvedDomainsService
export async function approveDomain(domain: string): Promise<boolean>;          // rpc('approve_domain')
export async function rejectDomain(domain: string): Promise<boolean>;           // rpc('reject_domain')
export async function restoreRejectedDomain(domain: string): Promise<boolean>;
export async function fetchRejectedDomains(): Promise<RejectedDomain[]>;
export async function createPendingDomainRequest(userId, domain, fullUrl,
  listingType?: ListingType, marketplaceItemId?: string): Promise<boolean>;
```

- [ ] **Step 1: `saveMarketplaceListing` rework.**
  - Add `currency` to the row (all listing types).
  - Status resolution: `publish && auction && url valid && !approved` → `'PendingUrl'` + `pending_url_domain = normalizeDomain(url)`; `publish` otherwise → `'Available'`; else `'Draft'`.
  - `collection_items.is_for_sale = (status === 'Available')` (a `PendingUrl` item is not on sale yet — spec §5.3).
  - On first transition into `Available`/`PendingUrl` (existing row had status `Draft`/none, or no `reference_code`): `published_at = now()` (Available only) and `reference_code = (await supabase.rpc('next_marketplace_reference', { p_listing_type: input.listingType })).data` when null.
  - When the result is `'pending-url'`, call `createPendingDomainRequest(sellerId, normalizeDomain(url), url, input.listingType, savedItemId)` automatically (spec §5.3 step 2); keep it best-effort (log, don't fail the save).
  - Re-publishing clears `archived_at`.
- [ ] **Step 2: Small mutators.** `setListingSold` (sets `is_sold` + `sold_at`/null), `setRealizedPrice`, `archiveListing` (`archived_at = now()`) — plain single-row updates; RLS (seller-only) is the guard.
- [ ] **Step 3: Fetchers.** Map the five new columns in all four mapping sites. `fetchMarketplaceItems`: change `.eq('status','Available')` → `.in('status', ['Available','PendingUrl','Draft'])` and after mapping filter `item.status === 'Available' || item.sellerId === currentUserId` — add an optional `currentUserId?: string` param (default: keep only Available). Skip the `is_for_sale` row-drop check for `Draft`/`PendingUrl` items (they are legitimately not for sale). `fetchNewestMarketplaceItems` unchanged (Available only, archived filtered).
- [ ] **Step 4: `approvedDomainsService`.** Replace `approvePendingDomain`'s multi-table client writes with `supabase.rpc('approve_domain', { p_domain })`; add `rejectDomain`/`restoreRejectedDomain`/`fetchRejectedDomains` (`select('*, profiles:requested_by (username)')`); thread `listing_type`/`marketplace_item_id` through `createPendingDomainRequest`. Keep `addApprovedDomain`/`deleteApprovedDomain` (now Super-Admin-only via RLS).
- [ ] **Step 5:** Typecheck; fix the two existing callers of `saveMarketplaceListing`'s boolean return (dialog — reworked in Task 7 anyway). Commit `feat(marketplace): PendingUrl flow, currency, reference codes, RPC-backed domain approval`.

---

### Task 7: Listing dialog

**Files:**
- Modify: `src/components/marketplace/MarketplaceListingDialog.tsx`

- [ ] **Step 1: Currency select.** `const [currency, setCurrency] = useState<Currency>('USD')` (prefill from `existing.currency`). Small `Select` (USD/EUR) beside the sale-price input and beside start/estimated/realized in the auction branch (one shared state). Replace hardcoded `$`/`(USD)` labels with `CURRENCY_SYMBOL[currency]`.
- [ ] **Step 2: Consent checkbox (buy-now branch).** Below `checkChatNotice`: `Checkbox` bound to `chatConsent` state, initialised from `user`'s profile (`select chat_email_consent from profiles`, fetched in the load effect alongside the listing); label `t('listing.chatConsent')` + hint `t('listing.chatConsentHint')`. Publish validation for sale: unchecked → field error `chatConsentRequired`. On save (publish or draft) with the box changed, write `profiles.chat_email_consent` (+`chat_email_consent_at = now()` when turning on).
- [ ] **Step 3: PendingUrl path.** Auction validation: keep blocking on missing/invalid URL, **stop blocking on unapproved** (spec §5.3 step 5). `handleSave` switches on the new `SaveListingResult`: `'pending-url'` → toast + inline notice `t('listing.waitingUrlApprovalNotice')`, keep dialog open a beat or close with toast (close + toast, matching existing UX). Remove the manual "Request Approval" button flow for auctions (request is now automatic); keep it for buy-now.
- [ ] **Step 4: Per-field errors (spec §5.4).** `errors: Record<string, string>` keyed by field (`salePrice`, `auctionDate`, `auctionTime`, `auctionTz`, `url`, `chatConsent`); `border-destructive` + `aria-invalid` on the offending control, message under it; keep one summary line on top. Clear a field's error on change.
- [ ] **Step 5: Cancel confirm (spec §5.5).** Snapshot form state after prefill; on `Cancel` click or `onOpenChange(false)` with dirty state, open an `AlertDialog` (`cancelConfirmTitle` / `cancelConfirmOk` discards / `cancelConfirmBack` returns). Wrap the `DialogTitle` text in `<span>` (already done — keep it).
- [ ] **Step 6:** Typecheck + manual smoke (`npm run dev`): sale publish without consent blocked with red field; auction with unapproved URL publishes into "waiting" toast. Commit `feat(marketplace): dialog — currency, consent gate, PendingUrl publish, field errors, cancel confirm`.

---

### Task 8: Chat page consent toggle

**Files:**
- Modify: `src/components/messages/MessageCenter.tsx`; `public/locales/{en,ar,tr}/messaging.json` (reuse `marketplace:listing.chatConsent*` or duplicate under `messaging` — prefer `useTranslation(['messaging','marketplace'])` and reuse)

- [ ] Above the conversation list render a checkbox row: `chat_email_consent` loaded from `profiles` for `user.id`, optimistic toggle writing `{ chat_email_consent, chat_email_consent_at }`, toast on failure, hint line underneath. Revocation needs no confirm (spec §7.1). Typecheck; commit `feat(chat): email-summary consent toggle on chat page`.

---

### Task 9: Admin → URLs three-list dashboard

**Files:**
- Modify: `src/components/admin/ApprovedDomainsManager.tsx`

- [ ] **Step 1:** Convert the pending block to a table with columns `requestDate | URL | username | saleType` (`listing_type` now on the row; `profiles.username` already joined). Wire Approve → `approveDomain()` (RPC), Reject → `rejectDomain()` (RPC).
- [ ] **Step 2:** Add the third section "Rejected sites" (`fetchRejectedDomains()`), same columns + `rejectedDate`, with a `Restore` action → `restoreRejectedDomain()` → reloads both lists.
- [ ] **Step 3:** Section headings in `<span>`; strings from `admin:urls.*` (Task 5). Typecheck + manual: approve a test domain and confirm (via `execute_sql`) that a *different* seller's matching listing flipped `is_url_approved` — this is the regression the RPC fixes. Commit `feat(admin): three-list URL dashboard (approved/pending/rejected) on approval RPCs`.

---

### Task 10: Card + detail display polish

**Files:**
- Modify: `src/components/marketplace/MarketplaceItem.tsx`, `src/components/messages/ContactSeller.tsx`, `src/pages/MarketplaceItemDetail.tsx`, `src/pages/MarketplaceItemDetailUnlisted.tsx`

- [ ] **Step 1: Currency formatting.** Replace every `${item.…}` price render on card + both detail pages with `formatListingPrice(value, item.currency)`.
- [ ] **Step 2: Guest messaging prompt (spec §8.1).** In `ContactSeller.tsx`, replace the `if (!user) return <div/>` branch: render the same trigger `Button`; clicking opens `AuthRequiredDialog` (import from `@/components/auth/AuthRequiredDialog`) instead of the compose dialog.
- [ ] **Step 3: Owner inline controls (spec §8.2).** On the card footer and the detail page, for `user.id === sellerId`:
  - Buy-now: `Checkbox` `markAsSold` → `setListingSold(item.id, v)`, optimistic, `stopPropagation` on the card.
  - Auction, `isListingEnded(item)`: label `enterRealizedPrice`, numeric input + `Update` button → `setRealizedPrice(item.id, parseFloat(v))`.
  Refresh the item locally on success (no full reload).
- [ ] **Step 4: Prominent labels.** Full-width strip on the card (and detail header) when `is_sold` → `Item Sold`; when `realized_price != null` → `t('listing.priceRealizedLabel', { price: formatListingPrice(item.realized_price, item.currency) })`. Badge-style, high-contrast.
- [ ] **Step 5: Typography/colour pass (spec §8.1)** — bump the card's primary text a size, swap light-brown classes to the darker existing `ottoman-*` token; footer `Buy it now` / `Auction` label: `text-lg font-bold text-black dark:text-white`.
- [ ] **Step 6: Status badges + reference.** Owner's `Draft` / `PendingUrl` cards get a badge (`listing.draft` / `listing.waitingUrlApproval`). Show `formatReferenceCode(item.reference_code)` small and muted on the detail page (and card footer if space allows).
- [ ] **Step 7: Detail-page Archive (spec §8.4).** Next to Edit/Remove for the owner: `Archive` button → `archiveListing(item.id)` + toast; keep Remove behind its existing confirm.
- [ ] **Step 8:** Typecheck + manual pass in en/ar (RTL). Commit `feat(marketplace): inline sold/realized controls, guest prompt, labels, currency display, archive action`.

---

### Task 11: Marketplace page ordering

**Files:**
- Modify: `src/pages/Marketplace.tsx`

- [ ] **Step 1: Data.** Pass `user?.id` to `fetchMarketplaceItems(currentUserId)` (Task 6) so the owner's `Draft`/`PendingUrl` rows arrive. Fetch `countries` order via `fetchCountries()` (`src/services/countryService.ts` — returns `display_order`, Ottoman Empire = 0, verified).
- [ ] **Step 2: Restructure rendering (spec §8.3).**
  1. Pinned owner block (`yourListings`) when any `Draft`/`PendingUrl` items — rendered above filters' result grid.
  2. Active items → `buildMarketplaceSections(activeItems, countryOrder)`; per section: country heading (`<span>`), near-auctions grid, `showUpcomingAuctions ({{count}})` collapsible for far-auctions (local `useState<Set<countryId>>`), then buy-now grid.
  3. Archive: continuous scroll — an `Archive` heading (`<span>`) after the last country section, then the archived items through the same sectioner (decision Q5; **delete** the Active/Archive toggle buttons and the `view` state).
- [ ] **Step 3: Filters.** Keep `BanknoteFilterMarketplace` search/category/type/country; **remove the sort control** for this page (decision Q4) — check `BanknoteFilterMarketplace` for a prop to hide sort (add one if missing); the section order is now canonical. Apply filters *before* sectioning.
- [ ] **Step 4:** Typecheck + manual: Ottoman section first; a >2-week auction hidden behind the toggle; own draft pinned on top; archive visible at the bottom of the scroll; empty states still correct. Commit `feat(marketplace): country-sectioned ordering, upcoming-auction fold, pinned drafts, inline archive`.

---

### Task 12: Migration C — nightly archive sweep

**Files:**
- Create: `supabase/migrations/20260816000200_marketplace_archive_sweep.sql`

- [ ] Write + apply: the sweep UPDATE from spec §9 wrapped in `select cron.schedule('marketplace-archive-sweep', '15 3 * * *', $$ ... $$);` (pattern: `20260515130000_seo_weekly_incremental_regeneration.sql`). Verify with `select * from cron.job where jobname = 'marketplace-archive-sweep'`. Commit `feat(marketplace): nightly archive sweep (7-day sold/auction, 6-month unsold)`.

---

### Task 13: Email infrastructure — digest + pending-URLs ⚠️ BLOCKED on provider (spec §13 Q1)

**Files:**
- Create: `supabase/functions/_shared/email.ts`, `supabase/functions/send-chat-digest/index.ts`, `supabase/functions/notify-pending-urls/index.ts`, `supabase/functions/send-chat-digest/digest.ts` + `digest.test.ts` (pure builder, mirrored into `src/lib/` if vitest can't reach functions dir — put the pure builder at `src/lib/chatDigest.ts` and import from the edge fn via copy; simplest: implement in `src/lib/chatDigest.ts` with tests, duplicate into the function at deploy time)
- Create: `supabase/migrations/20260816000300_email_cron.sql`

**Do not start until the user names the provider and the `Chat@ottocollect.com` domain is verified (SPF/DKIM).** Everything except `_shared/email.ts` internals and the cron migration can be built and tested beforehand:

- [ ] **Step 1: Pure digest builder (unblocked, TDD)** — `src/lib/chatDigest.ts`:

```ts
export interface DigestMessage { senderUsername: string; content: string;
  referenceItemId: string | null; itemDescription: string | null; createdAt: string; }
export function buildChatDigest(username: string, messages: DigestMessage[]):
  { subject: string; text: string } | null;   // null when messages is empty
```

Tests (spec §12): section A only when marketplace messages exist; section B only for direct; 3-entry cap per section with the "Additional … you have (x) …" overflow line and correct names/counts; multiple messages from one sender grouped in order; exact subject `Your OttoCollect Chat report – Do not reply`.

- [ ] **Step 2: Edge functions (blocked).** `send-chat-digest`: service-role client; for each user with `chat_email_consent = true`, window = `(last chat_digest_runs.covered_to for user, now]` (fallback: 24h); run the spec §7.3 query; skip zero-message users; `buildChatDigest` → `sendEmail(...)`; insert `chat_digest_runs` row **only after a successful send**. `notify-pending-urls`: count `pending_domain_requests`; if `> 0` send the spec §6.1 body to `info@ottocollect.com`. `_shared/email.ts`: provider fetch call, key from `Deno.env.get('EMAIL_API_KEY')` (Supabase secret).
- [ ] **Step 3: Cron migration (blocked):** schedule `chat-daily-digest` at `0 6 * * *` and `pending-urls-digest` at `5 6 * * *`, both `net.http_post` to the edge functions (copy the auth pattern from the SEO migration).
- [ ] **Step 4:** Deploy via `mcp__supabase__deploy_edge_function`; trigger `send-chat-digest` manually against a test consenting user; verify one email, correct sections, and a `chat_digest_runs` row; re-trigger → no duplicate email. Commit `feat(chat): daily chat digest + pending-URLs email`.

---

### Task 14: Full verification

**Files:** none.

- [ ] **Step 1:** `npx vitest run` (all suites incl. `marketplaceListing`, `chatDigest`), `npx tsc --noEmit` (baseline), `npm run lint`, `npm run build`.
- [ ] **Step 2: RLS spot-checks** (spec §12 manual): with a non-Super-Admin session, `insert into approved_domains` and `rpc('approve_domain')` both rejected; after a real `approve_domain`, a different seller's buy-now listing shows its link and a `PendingUrl` auction went live with a `reference_code` and `collection_items.is_for_sale = true`.
- [ ] **Step 3: End-to-end walk (`npm run dev`):**
  1. Buy-now publish: no price → red field; no consent → red consent row; with both → live, EUR listing shows `€`.
  2. Auction + unapproved URL → publishes as *waiting*, appears pinned in the owner's marketplace view with the badge, absent for others; approve the domain in Admin → item goes live automatically.
  3. Cancel with dirty form → confirm dialog; Back returns, OK discards.
  4. Card: owner toggles Mark-as-Sold inline → Item Sold strip; auction owner (past date) enters Realized price → `Price Realized: …` strip.
  5. Guest: card "Send message to the seller" → auth dialog.
  6. Marketplace: Ottoman first; ≤2-week auctions by date; >2-week behind the fold; buy-now newest-first; Archive section at the bottom; ar (RTL) + tr show no raw keys.
  7. Admin URLs: three lists, sale-type column, reject → appears in Rejected, restore → back to Pending.
  8. Reference codes visible on detail (`A 2026 08 00001` format), unique across two same-month publishes.
- [ ] **Step 4:** Report results (in Spanish), listing anything skipped — expected: Task 13 steps 2–4 if the provider decision is still pending. **Do not push.**
