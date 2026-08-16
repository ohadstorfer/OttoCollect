# Marketplace Upgrade (Auction + In-App) — Design Spec

**Date:** 2026-08-16
**Source document:** `8) Markert place upgraide (Rev 1.50).pdf` (Hebrew, updated 15.8.2026)
**Supersedes:** the Rev ~1.34 slice implemented by
`docs/superpowers/plans/2026-07-12-marketplace-auction-upgrade.md`
**Status:** Draft — for review

---

## 1. Summary

Rev 1.50 describes the complete "upload an item for sale" flow for the Marketplace,
covering both listing types — **Sale (Buy it now)** and **Auction (external auction)** —
plus URL gating, admin URL management, a chat→email daily digest, card/detail display
rules, archive rules, marketplace ordering, and per-item reference IDs.

A significant part of this is **already built and live** on branch
`marketplace-auction-upgrade` (listing dialog, auction fields, approved-domain gating,
card redesign, archive view, Edit Item on the detail page). This spec therefore has two
jobs:

1. **Record the full Rev 1.50 behaviour** as the single source of truth, and
2. **Isolate the delta** — what is missing or diverges from what ships today.

The delta is concentrated in eight areas: **currency selection**, **the chat→email
consent + daily digest**, **`Waiting for URL Approval` as a real listing state**, **the
three-list Admin URL dashboard (incl. rejected)**, **archive rules beyond the 7-day
derivation**, **marketplace ordering (country grouping / auction windows / owner drafts
on top)**, **per-item reference IDs**, and **moving domain approval server-side** —
re-review against the production database showed the shipped approval flow is both
under-protected (any authenticated user can write `approved_domains`) and broken (the
admin's batch link-attach update is silently blocked by seller-only RLS); see §6.2.

---

## 2. Status of every spec section

Legend: ✅ done · 🟡 partial · ❌ missing

| § | Requirement | Status | Where it lives today |
|---|---|---|---|
| Header | Selling gated to rank ≥ 400 pts (Known Collector) | 🟡 | `isLimitedRank` denylist in `CollectionItem.tsx:92`, `CollectionItemFormEdit.tsx:141` — UI-only, no RLS |
| 1 | Listing created from collection-item edit; type picker | ✅ | `MarketplaceListingDialog.tsx` radio group |
| 2 | Buy-now: price required | ✅ | `validate()` in the dialog |
| 2 | Buy-now: **currency USD/EUR required** | ❌ | USD hardcoded (`$` prefix everywhere) |
| 2 | Buy-now: public remark, optional URL | ✅ | `public_remark`, `external_listing_url` |
| 2 | Buy-now: **chat-summary-email consent checkbox, required to publish** | ❌ | no consent field, no email pipeline |
| 3 | Auction: date + time + timezone required | ✅ | `combineAuctionDateTime` + `UTC_OFFSETS` |
| 3 | Auction: lot no., start price, estimate, remark | ✅ | dialog fields |
| 3 | Auction: **currency USD/EUR** on start/estimate | ❌ | USD hardcoded |
| 3 | Auction: URL required + approved | ✅ | `validate()` blocks publish |
| 3 | Auction: **unapproved URL → queued, auto-publishes on approval** | ❌ | today publish is *refused* with a validation error |
| 3 | Auction: no Contact Seller | ✅ | `MarketplaceItem.tsx:239`, `MarketplaceItemDetail.tsx:489` |
| 3 | Auction: **Realized price editable without entering edit mode** | ✅ | entered on the item display (card + detail) once the auction has ended; **not** a field of the create/edit form |
| 3 | Auction: auto-archive 1 week after auction date | ✅ | `isListingArchived` (derived at read time) |
| 4 | Publish / Save draft / Cancel | ✅ | dialog footer |
| 4 | **Missing required fields highlighted in red *in the form*** | 🟡 | errors listed as text under the form, fields not marked |
| 4 | **Cancel → "changes will not be saved" confirm (OK / Back)** | ❌ | closes immediately |
| 4 | Draft saved regardless of missing fields | ✅ | `saveMarketplaceListing(..., publish=false)` |
| 4 | **Draft shown prominently in Marketplace, owner-only** | ❌ | drafts are filtered out (`status = 'Available'`) |
| 4 | Remove Draft | ✅ | `removeFromMarketplace` |
| 5a | Approved URL → publish immediately | ✅ | `isUrlApproved` at save time |
| 5b | Buy-now + unapproved URL → publish **without** the link | ✅ | `is_url_approved=false` ⇒ card hides source |
| 5b | Link auto-attaches after approval | 🟡 | code exists (`approvePendingDomain`) **but is broken by RLS**: `marketplace_items` UPDATE is seller-only, so the admin's batch update silently matches 0 rows — see §6.2 |
| 5b | Auction + unapproved URL → **hold as `Waiting for URL Approval`** | ❌ | — |
| 6a | Admin → URLs: approved list | ✅ | `ApprovedDomainsManager.tsx` |
| 6a | Pending list with **date / URL / username / sale type** | 🟡 | list exists; `sale type` column missing |
| 6a | **Rejected list** (date / URL / username / sale type) | ❌ | reject just deletes the pending row |
| 6b | SuperAdmin is the approving authority | ❌ | UI is admin-gated only; in prod, `approved_domains` writes and `pending_domain_requests` deletes are `USING (true)` — **any authenticated user can approve/reject via the API** — see §6.2 |
| 6c | **Daily email to info@ottocollect.com with pending count** | ❌ | no email infrastructure at all |
| 7 | **Chat-page consent checkbox + revoke any time** | ❌ | — |
| 7 | **Daily chat digest email** (appendix format) | ❌ | — |
| 8a | Remove "Available" badge | ✅ | card redesign |
| 8a | **Larger font, light-brown → brown** | 🟡 | needs a design pass |
| 8b | Buy-now card: entered params only, collapsed gaps | ✅ | conditional rendering |
| 8b | "Send message to the seller" | ✅ | `ContactSellerButton` |
| 8b | **Guest → prompt to register/log in** | ❌ | `ContactSeller` renders an empty `<div>` for guests |
| 8b | "To Source website" + hostname below | ✅ | `getListingHostname` |
| 8b | Bold black enlarged "Buy it now" footer label | 🟡 | label present, typography not per spec |
| 8b | Owner-only "Mark as Item Sold" checkbox + "Item Sold" label | 🟡 | checkbox lives in the edit dialog; `Sold` badge on card |
| 8c | Auction card: framed date/time | ✅ | bordered block |
| 8c | "To Auction website" + hostname | ✅ | same button, auction copy |
| 8c | Bold black enlarged "Auction" footer label | 🟡 | as above |
| 8c | Owner-only inline **Price Realized + Update** | ❌ | only in edit dialog |
| 8c | Prominent `Price Realized: 85 USD` label | 🟡 | plain text line |
| 9 | Image click → detail page with fixed + sale info | ✅ | `MarketplaceItemDetail.tsx` |
| 9b | Owner-only **Edit** | ✅ | opens `MarketplaceListingDialog` |
| 9b | Owner-only **Archive** | ❌ | only "Remove from Marketplace" (destructive) |
| 10 | Auction +1 week → archive | ✅ | derived |
| 10 | Sold +1 week → archive | ✅ | derived |
| 10 | **Buy-now +6 months → archive even if unsold** | ❌ | — |
| 10 | **Owner-chosen archive** | ❌ | — |
| 10 | **Archive below the active list on the same scroll** | 🟡 | implemented as an Active/Archive toggle instead |
| 11 | **Group by country, Ottoman first then catalog order** | ❌ | flat grid, generic sort filter |
| 11 | **Auctions ≤2 weeks first, by date then ID** | ❌ | — |
| 11 | **Auctions >2 weeks hidden behind a "show upcoming" control** | ❌ | — |
| 11 | **Then Buy-now, newest→oldest** | 🟡 | default sort is `newest` globally |
| 11 | **Owner's drafts / waiting items pinned at top** | ❌ | — |
| 12 | **Per-item reference ID (`A/B YYYY MM NNNNN`)** | ❌ | — |

---

## 3. Invariants & conventions

- **Repo conventions apply:** every title element (`h1`–`h6`, `DialogTitle`,
  `CardTitle`, …) wraps its text in `<span>`; every user-facing string is `t(...)` from
  the `marketplace` namespace and exists in **all three** locales
  (`public/locales/{en,ar,tr}/marketplace.json`).
- **No `git push` / deploy** without an explicit request.
- `src/integrations/supabase/types.ts` is stale by design — keep using `select('*')` +
  app-level types in `src/types/index.ts`, casting `as any` where the generated types
  complain (existing service pattern).
- Typecheck with `npx tsc --noEmit` (vite build does not typecheck). Tests: `npx vitest run`.
- Pure, testable logic goes in `src/lib/marketplaceListing.ts` with unit tests; React
  components stay thin.
- Migrations are applied to the remote project via MCP `mcp__supabase__apply_migration`
  **and** committed under `supabase/migrations/`.

---

## 4. Data model

### 4.1 `marketplace_items` — new columns

```sql
alter table public.marketplace_items
  add column if not exists currency text not null default 'USD',
  add column if not exists reference_code text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists pending_url_domain text;

alter table public.marketplace_items
  drop constraint if exists marketplace_items_currency_check;
alter table public.marketplace_items
  add constraint marketplace_items_currency_check check (currency in ('USD', 'EUR'));

-- 'PendingUrl' = auction held back until its URL is approved (spec §5b).
alter table public.marketplace_items drop constraint if exists valid_status;
alter table public.marketplace_items
  add constraint valid_status
  check (status in ('Available', 'Reserved', 'Sold', 'Draft', 'PendingUrl'));

create unique index if not exists marketplace_items_reference_code_key
  on public.marketplace_items (reference_code) where reference_code is not null;
```

| Column | Purpose |
|---|---|
| `currency` | §2/§3 — one currency per listing, applied to sale/start/estimated/realized price |
| `reference_code` | §12 — `A202608000001`-style human ID, assigned on first publish |
| `published_at` | §10 — anchor for the 6-month buy-now rule (`created_at` is wrong once drafts exist) |
| `archived_at` | §10 — set by owner action or by the nightly sweep; makes archive membership *stored*, not only derived |
| `pending_url_domain` | §5b — the normalized domain this listing is waiting on, so approval can flip listings to `Available` cheaply |

**Currency scope decision:** one currency per listing rather than per price field. The
mockups only ever show a single `(currency)` selector per form, and mixed-currency
start/estimate/realized on one lot has no real-world meaning.

### 4.2 Reference-code allocation (§12)

```sql
create table if not exists public.marketplace_reference_counters (
  prefix      text    not null,          -- 'A' | 'B'
  year        integer not null,
  month       integer not null,
  last_value  integer not null default 0,
  primary key (prefix, year, month)
);

create or replace function public.next_marketplace_reference(p_listing_type text)
returns text language plpgsql security definer as $$
declare
  v_prefix text := case when p_listing_type = 'auction' then 'A' else 'B' end;
  v_year   integer := extract(year  from now())::int;
  v_month  integer := extract(month from now())::int;
  v_next   integer;
begin
  insert into public.marketplace_reference_counters (prefix, year, month, last_value)
  values (v_prefix, v_year, v_month, 1)
  on conflict (prefix, year, month)
    do update set last_value = marketplace_reference_counters.last_value + 1
  returning last_value into v_next;

  return v_prefix || v_year::text || lpad(v_month::text, 2, '0') || lpad(v_next::text, 5, '0');
end;
$$;
```

Assigned **once**, on the first transition to `Available` (or `PendingUrl`), and never
reassigned — a listing edited from Buy-now to Auction keeps its original code, so the
prefix records how it was first published. Display format inserts thin spaces for
legibility (`A 2026 08 00001`) while the stored value stays compact.

### 4.3 `pending_domain_requests` — add sale type (§6a)

```sql
alter table public.pending_domain_requests
  add column if not exists listing_type text,
  add column if not exists marketplace_item_id uuid references public.marketplace_items(id) on delete set null;
```

### 4.4 New table `rejected_domains` (§6a)

```sql
create table if not exists public.rejected_domains (
  id            uuid primary key default gen_random_uuid(),
  domain        text not null,
  requested_url text,
  requested_by  uuid references public.profiles(id) on delete set null,
  listing_type  text,
  rejected_by   uuid references public.profiles(id) on delete set null,
  rejected_at   timestamptz not null default now()
);

alter table public.rejected_domains enable row level security;

create policy "rejected_domains super admin all"
  on public.rejected_domains for all
  using (exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin'))
  with check (exists (select 1 from public.profiles
                      where id = auth.uid() and role = 'Super Admin'));
```

A rejected domain is a *record*, not a block-list — re-submitting the same domain is
allowed and simply creates a new pending request. (If the client wants hard blocking,
that is an open question — see §13.)

### 4.5 `profiles` — chat email consent (§7)

```sql
alter table public.profiles
  add column if not exists chat_email_consent    boolean not null default false,
  add column if not exists chat_email_consent_at timestamptz;
```

Consent is a **profile-level** flag, not per-listing: §7a says the checkbox lives on the
chat page and can be revoked there at any time, while §2 only requires that it be *on*
at the moment a Buy-now listing is published.

### 4.6 Digest bookkeeping

```sql
create table if not exists public.chat_digest_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  sent_at      timestamptz not null default now(),
  covered_from timestamptz not null,
  covered_to   timestamptz not null,
  message_count integer not null
);
create index if not exists chat_digest_runs_user_sent_idx
  on public.chat_digest_runs (user_id, sent_at desc);
```

`covered_from`/`covered_to` make the digest idempotent and gap-free even if a run fails
and is retried: the next run starts from the last successful `covered_to`.

---

## 5. Listing form (§1–§4)

### 5.1 Currency (§2, §3) — new

- Add a `Select` next to the price inputs with `USD` / `EUR`, bound to
  `ListingInput.currency`. Required for Buy-now (the mockup marks `Sale price*` and
  `(currency)` together); for Auction it applies to `start_price` / `estimated_price` /
  `realized_price` and defaults to `USD`.
- Replace every hardcoded `$` with a formatter:

```ts
// src/lib/marketplaceListing.ts
export const CURRENCIES = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€' };
export function formatListingPrice(
  value: number | string | null | undefined,
  currency: Currency = 'USD',
): string | null;   // 85 → "$85"  ·  "150-300" → "€150-300"
```

  Call sites to update: `MarketplaceItem.tsx` (price overlay, start/estimated/realized),
  `MarketplaceItemDetail.tsx` (headline price + auction block),
  `MarketplaceListingDialog.tsx` (all `(USD)` labels and the `$` adornment).
  `estimated_price` stays `text` (it is a range like `150-300`) — the formatter prefixes
  the symbol without parsing.

### 5.2 Chat-email consent checkbox (§2, §7a) — new

- In the Buy-now branch of the dialog, below the "check your chat box" note:
  `☐ Agree to receive chat summaries by email *`, bound to
  `profiles.chat_email_consent`.
- **Publish validation:** Buy-now cannot publish while unchecked
  (`listing.chatConsentRequired`). Auction has no such requirement (§3 omits it).
- If the user already consented (profile flag true), the box renders pre-checked; saving
  a listing with it checked writes the profile flag + `chat_email_consent_at`.
- Unchecking here revokes globally, same as the chat page — surface that in the helper
  text so it is not a surprise.

### 5.3 Auction with an unapproved URL (§3, §5b) — behaviour change

Today publishing an auction with an unapproved URL **fails validation**. Per spec it must
**succeed into a holding state**:

1. Auction + valid URL + not approved → save with `status = 'PendingUrl'`,
   `pending_url_domain = normalizeDomain(url)`, `is_url_approved = false`,
   `collection_items.is_for_sale = false` (it is not on sale yet).
2. Create the pending domain request (today this is a manual "Request Approval" button —
   make it automatic on publish, keeping the button as a no-op/confirmation).
3. Show the spec's message verbatim:
   > "This website is not approved yet and has been submitted for approval — the item
   > will wait for approval and will then be published automatically."
4. Domain approval additionally promotes held listings — inside the **approval RPC**
   (§6.2), not client-side; RLS on `marketplace_items` is seller-only, so this update
   cannot run from the admin's browser session:

```sql
update public.marketplace_items
   set status = 'Available', is_url_approved = true,
       published_at = now(), pending_url_domain = null
 where status = 'PendingUrl' and pending_url_domain = p_domain;
-- …then flip collection_items.is_for_sale = true for those rows,
-- and assign reference_code where null.
```

   The existing blanket `ilike('external_listing_url', '%domain%')` update covers the
   Buy-now case, but it is **too loose** — `%ebay.com%` also matches
   `notebay.commerce.example`. Replace it with a host-suffix comparison
   (`hostname = domain OR hostname LIKE '%.' || domain`) inside the RPC.
5. Validation still rejects publish when the URL is **absent or syntactically invalid**
   — only the *unapproved* case becomes non-blocking.

**Buy-now** keeps today's behaviour: publishes immediately, link withheld until approved.

### 5.4 Required-field highlighting (§4) — change

Replace the flat error list with per-field state: `errors: Record<FieldKey, string>`,
`aria-invalid` + `border-destructive` on the offending `Input`/`Select`, and the message
rendered directly under that field. Keep a single summary line at the top for
screen-reader users.

### 5.5 Cancel confirmation (§4) — new

`Cancel` (and dialog dismissal) when the form is dirty opens an `AlertDialog`:

- Title: "Changes will not be saved"
- `OK` → discard and close · `Back` → return to the form

Dirty-tracking: snapshot the prefilled form state in the load effect and shallow-compare.
When not dirty, close without prompting.

### 5.6 Drafts (§4) — surfacing

`status = 'Draft'` already exists and is already excluded from the public marketplace.
What is missing is §4's *visibility*: drafts (and `PendingUrl` auctions) must appear
**at the top of the Marketplace page, for their owner only** — see §8.3.

---

## 6. Admin → URLs (§6)

`ApprovedDomainsManager.tsx` grows from two blocks to **three labelled lists**, each a
table rather than a chip row:

| List | Columns | Actions |
|---|---|---|
| Approved sites | domain, added date | Add, Remove |
| Pending approval | request date, URL, username, sale type | Approve, Reject |
| Rejected sites | rejection date, URL, username, sale type | Restore → back to pending |

- `sale type` comes from `pending_domain_requests.listing_type` (§4.3), captured when the
  request is created from the listing dialog.
- `Reject` now **inserts into `rejected_domains`** before deleting the pending rows
  (today it only deletes — the information is lost).
- Approving a domain that appears in `rejected_domains` removes it from the rejected
  list.
- **Authority (§6b):** must move from the UI into the database — see §6.2.

### 6.1 Daily pending-URLs email (§6c)

Nightly `pg_cron` job → edge function `notify-pending-urls` → email to
`info@ottocollect.com`:

> `N` website(s) are waiting for approval — oldest request: `<date>`.

The PDF literally says "daily"; sending "0 pending" every day is noise, so this spec
sends **only when `N > 0`** — flagged as an assumption in §13. Same infrastructure as
§7 (see §10).

### 6.2 Server-side approval RPC + RLS hardening — new (and fixes a live bug)

Verified against the production database (2026-08-16):

- `approved_domains` — policy "Admins can manage approved_domains" is
  `FOR ALL USING (true)`: **any authenticated user can insert/delete approved domains
  through the API.** The admin gate exists only in the React routing.
- `pending_domain_requests` — "Admins can delete requests" is also `USING (true)`.
- `marketplace_items` — UPDATE is `auth.uid() = seller_id` only. Consequence:
  `approvePendingDomain()`'s client-side batch update of `is_url_approved` on other
  sellers' listings **matches 0 rows and reports success** — the shipped
  "link auto-attaches after approval" flow (§5b) does not actually work when the
  approver isn't the seller. (The parallel `profiles` update works only because Super
  Admins happen to have a blanket profiles policy.)

Fix — one `security definer` RPC as the single approval/rejection surface:

```sql
create or replace function public.approve_domain(p_domain text)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin') then
    raise exception 'Super Admin only';
  end if;
  -- 1. upsert into approved_domains; remove from rejected_domains
  -- 2. attach links: is_url_approved = true on marketplace_items / profiles
  --    matched by host-suffix (see §5.3), NOT by ilike '%domain%'
  -- 3. promote PendingUrl auctions (§5.3 step 4) + set collection_items.is_for_sale
  -- 4. delete pending_domain_requests for the domain
end;
$$;

create or replace function public.reject_domain(p_domain text)
returns void language plpgsql security definer as $$ ... $$;  -- same gate; logs to rejected_domains
```

Then tighten the table policies: `approved_domains` / `pending_domain_requests` /
`rejected_domains` writes become Super-Admin-only (mirroring `credit_links`, see
`2026-06-14-credits-links-page-design.md`); users keep INSERT on
`pending_domain_requests` for their own requests. `approvedDomainsService.ts` calls the
RPCs instead of doing multi-table writes client-side.

---

## 7. Chat → email digest (§7 + Appendix)

### 7.1 Consent UI (§7a)

On the chat/messages page (`src/pages/Messaging.tsx`, which renders
`src/components/messages/MessageCenter.tsx` — put the checkbox in `MessageCenter`,
above the conversation list):

```
☐ Agree to receive chat summaries by email
   Your email is not visible to other users.
```

Bound to `profiles.chat_email_consent`; toggling writes immediately (optimistic + toast).
Revocable at any time — no confirmation needed.

### 7.2 Digest content (Appendix)

One email per user per day, **only** if the user consented **and** received ≥1 message in
the window.

```
From:    OttoCollect <Chat@ottocollect.com>
Subject: Your OttoCollect Chat report – Do not reply
```

Body:

- `Dear [username],`
- "Here is a summary of all chat messages sent to you today."
- "Do not reply to this email. Please respond through your OttoCollect account chat!"
- **Section A — "Marketplace Item Chat Messages"** — included only if any message in the
  window has `reference_item_id` set. Up to **3** entries:
  `n) Item: [item description] - from [Sender Username]`, then each message body from
  that sender for that item, in order. Overflow line:
  `4) Additional Marketplace Messages - You have (x) additional Marketplace messages from
  the following users: [names…]`
- **Section B — "Your OttoCollect Direct Chat Messages"** — same shape for messages with
  no `reference_item_id`. Up to 3 senders, then the same overflow line.

The 3-entry cap + overflow line is read directly off the appendix mockup (entries 1–3
detailed, entry 4 an aggregate). Grouping key: Section A = `(reference_item_id, sender)`;
Section B = `sender`.

`[item description]` = `"{country} {denomination} ({year})"` — the same string
`ContactSellerButton` already builds.

### 7.3 Query

For each consenting user with unsent messages in `(last covered_to, now]`:

```sql
select m.*, p.username as sender_username, m.reference_item_id
from public.messages m
join public.profiles p on p.id = m.sender_id
where m.receiver_id = $1
  and m.created_at > $2 and m.created_at <= $3
order by m.reference_item_id nulls last, m.sender_id, m.created_at;
```

Then record a `chat_digest_runs` row per user actually emailed.

---

## 8. Marketplace display (§8, §9, §11)

### 8.1 Card (§8a–c)

Mostly built. Remaining:

- **Typography/colour pass (§8a):** enlarge the primary card text; replace the
  light-brown tone with the darker brown from the site palette (Tailwind `ottoman-*` —
  pick the existing token, do **not** introduce a new colour).
- **Footer label (§8b/§8c):** `Buy it now` / `Auction` rendered black, bold, enlarged.
  Note the PDF shows `Buy it now` on the Auction mockup above the `Auction` heading —
  treated as a typo in the source; auction cards show `Auction` only (see §13).
- **`Item Sold` / `Price Realized: 85 USD`** need to be *prominent labels* (badge-style,
  full-width strip on the card), not plain lines.
- **Guest "Send message to the seller" (§8b):** `ContactSeller` returns an empty `<div>`
  for guests today. Render the button for everyone; for a guest, clicking opens the
  existing `AuthRequiredDialog` instead of the compose dialog.

### 8.2 Owner-only inline controls (§8b, §8c)

Both currently require opening the edit dialog; spec wants them **on the item display**:

- Buy-now, owner: `☐ Mark as Item Sold` — toggling writes `is_sold` + `sold_at`
  immediately (no dialog, optimistic, toast on failure).
- Auction, owner, after `auction_at` has passed: `After sale, enter Price Realized:`
  `[input] [Update]` — writes `realized_price` (+ `currency`) directly. The input is
  prefilled with the stored value so an entered price can be corrected, not only added.

**Price Realized is deliberately absent from the listing form.** Per §3/§8c it is a
post-sale result, not a listing parameter, so it appears only here. `ListingInput`
therefore carries no `realizedPrice`, and `saveMarketplaceListing` leaves the column
untouched for auctions (clearing it only when the listing stops being an auction) —
otherwise editing a listing after the sale would silently wipe the entered price.

Both surfaces: the marketplace card **and** the detail page (`§8` says "at the bottom of
the item's information display", which the mockups show on the card).

New service functions:

```ts
export async function setListingSold(marketplaceItemId: string, isSold: boolean): Promise<boolean>;
export async function setRealizedPrice(marketplaceItemId: string, price: number | null): Promise<boolean>;
```

Guarded by RLS (`seller_id = auth.uid()`), not just by hiding the UI.

### 8.3 Ordering (§11) — new

The marketplace page becomes **sectioned by country** instead of one flat grid:

1. **Pinned owner block** (only when logged in and the user has any):
   their `Draft` and `PendingUrl` listings, above everything, visually distinct
   ("Draft" / "Waiting for URL Approval" badges).
2. **Country sections** in `countries.display_order` (verified in prod: Ottoman Empire
   is `display_order = 0`, so plain `display_order` ordering satisfies §11's "Ottoman
   first, then catalog order" with no special-casing).
3. Within a country:
   a. **Auctions with `auction_at` within the next 14 days** — ascending by `auction_at`,
      then ascending by `reference_code` (§11's "same date → by ID").
   b. **Auctions beyond 14 days** — collapsed; a `Show upcoming auctions (N)` toggle
      reveals them, same ordering.
   c. **Buy-now listings** — `published_at` descending (newest listed first).
4. **Archive** rendered the same way, below the active list (§10).

Pure helper, unit-tested:

```ts
// src/lib/marketplaceListing.ts
export const UPCOMING_AUCTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export interface MarketplaceSection {
  countryId: string; countryName: string;
  nearAuctions: MarketplaceItem[];
  farAuctions: MarketplaceItem[];   // hidden behind the toggle
  buyNow: MarketplaceItem[];
}
export function buildMarketplaceSections(
  items: MarketplaceItem[],
  countryOrder: Array<{ id: string; name: string; display_order: number }>,
  now?: number,
): MarketplaceSection[];
```

**Conflict to resolve:** the page currently runs everything through `useBanknoteFilter`
with a `sort` filter defaulting to `newest`. §11 prescribes a fixed order. Proposal:
keep search/country/category/type **filters**, and drop the **sort** control on the
marketplace (spec order becomes the only order). Flagged in §13.

**Archive placement (§10):** spec says the archive appears *further down the same
scroll*, after the active list. Today it is an Active/Archive button pair. Recommend
switching to a continuous scroll with an `Archive` heading — the toggle was a
simplification, not a spec requirement.

### 8.4 Detail page (§9)

Present: fixed banknote details, sale details, owner `Edit`. Missing: the owner
**`Archive`** control (§9b) — distinct from today's destructive "Remove from
Marketplace". Add both, with `Archive` calling `archiveListing(id)` (§9.1 below) and the
existing remove action kept behind a confirm.

---

## 9. Archive rules (§10)

Membership becomes **stored** (`archived_at`) rather than purely derived, because two of
the four rules cannot be derived from a page load alone.

| Rule | Trigger | Mechanism |
|---|---|---|
| Auction + 1 week after `auction_at` | time | nightly sweep sets `archived_at` (derivation kept as a read-time fallback) |
| Buy-now + 1 week after `sold_at` | time | nightly sweep |
| Buy-now + 6 months after `published_at`, sold or not | time | nightly sweep — **new** |
| Owner chose Archive | user action | `archiveListing()` sets `archived_at = now()` — **new** |

```sql
-- nightly, 03:15 UTC
update public.marketplace_items set archived_at = now()
where archived_at is null and status = 'Available' and (
     (listing_type = 'auction' and auction_at  < now() - interval '7 days')
  or (listing_type = 'sale' and is_sold and sold_at < now() - interval '7 days')
  or (listing_type = 'sale' and published_at < now() - interval '6 months')
);
```

`isListingArchived(item)` keeps working (now: `archived_at != null ||` the existing
derivation) so nothing breaks between sweeps. `ARCHIVE_GRACE_MS` stays 7 days;
add `UNSOLD_ARCHIVE_MS = 182 days`.

Un-archiving is not in the spec; the owner's route back is re-publishing from the edit
dialog (which clears `archived_at`).

---

## 10. Scheduled jobs & email infrastructure

**There is no email sending in this codebase today** — only Supabase Auth's built-in
mails. §6c and §7 both need transactional email, so this is net-new infrastructure and
the single largest unknown in the spec.

Proposed shape, following the existing SEO regeneration pattern
(`20260515130000_seo_weekly_incremental_regeneration.sql` already uses `pg_cron` +
`pg_net`):

| Job | Schedule | Edge function | Does |
|---|---|---|---|
| `marketplace-archive-sweep` | daily 03:15 UTC | — (plain SQL) | §9 sweep |
| `chat-daily-digest` | daily 06:00 UTC | `send-chat-digest` | §7 digest to consenting users |
| `pending-urls-digest` | daily 06:05 UTC | `notify-pending-urls` | §6c count to info@ottocollect.com |

Both edge functions live under `supabase/functions/`, share a small
`_shared/email.ts` wrapper, and read the provider key from a Supabase secret. **Provider
choice (Resend / Postmark / SES) and the `Chat@ottocollect.com` sending domain + SPF/DKIM
setup are client decisions** — see §13.

Digest timing note: "once a day" with a fixed UTC hour means the window is a rolling
24 h, not a calendar day in the recipient's timezone. `chat_digest_runs.covered_from/to`
makes that explicit and prevents both gaps and double-sends.

---

## 11. i18n

New `listing.*` / `chat.*` keys in all three locales:

`currency`, `currencyUsd`, `currencyEur`, `chatConsent`, `chatConsentHint`,
`chatConsentRequired`, `waitingUrlApproval`, `waitingUrlApprovalNotice`,
`cancelConfirmTitle`, `cancelConfirmOk`, `cancelConfirmBack`, `markAsSold`,
`enterRealizedPrice`, `update`, `archive`, `archived`, `showUpcomingAuctions`,
`yourDrafts`, `referenceId`, plus admin-side `urls.rejectedList`, `urls.saleType`,
`urls.restore`.

Email bodies are **English-only** (the appendix specifies English copy verbatim and the
digest is transactional) — do not route them through i18next.

---

## 12. Testing

**Pure logic (vitest, `src/lib/marketplaceListing.test.ts`):**
- `formatListingPrice` for USD/EUR, numeric and range inputs, null.
- `buildMarketplaceSections`: country ordering (Ottoman first), 14-day auction split,
  same-date tiebreak by `reference_code`, buy-now newest-first, empty countries omitted.
- Archive predicates incl. the 6-month rule and explicit `archived_at`.

**Service:**
- `saveMarketplaceListing`: auction + unapproved URL → `PendingUrl`, `is_for_sale=false`,
  pending request created; auction + approved URL → `Available` + `reference_code`.
- `approvePendingDomain`: promotes only listings whose `pending_url_domain` matches, and
  does **not** match `notebay.commerce.example` for `ebay.com`.
- Reference-code allocation: concurrent calls in the same month yield distinct codes.

**Digest (unit, no network):** the body builder — sections omitted when empty, 3-entry
cap, overflow wording and counts, multiple messages per sender grouped in order.

**Manual:**
- §6.2 RLS: as a non-Super-Admin authenticated user, `insert into approved_domains`
  and `rpc('approve_domain')` must both be **rejected** (today the insert succeeds).
- After `approve_domain`, a *different* seller's Buy-now listing shows its link and a
  held `PendingUrl` auction goes live (this is the flow RLS silently broke).
- Guest sees the login prompt on "Send message to the seller"; owner sees drafts pinned
  on top while another user does not.

---

## 13. Open questions

1. **Email provider & sending domain.** Nothing exists today. Which provider, and who
   sets up `Chat@ottocollect.com` (SPF/DKIM)? Blocks §6c and §7. The appendix also has a
   `(?)אסף` annotation next to the From line — the sender identity may not be final.
2. **Currency scope.** One currency per listing (this spec's assumption) or per price
   field? Also: is `EUR` display-only, or does sorting/filtering by price need
   normalisation across currencies?
3. **§8c "Buy it now" on the auction mockup** — read as a typo (an auction card showing a
   Buy-it-now label makes no sense next to the `Auction` heading directly below it).
   Confirm.
4. **Sort control on the Marketplace page.** §11 dictates a fixed order; do we drop the
   existing sort filter, or keep it as an override that replaces the spec order?
5. **Archive layout.** Continuous scroll under the active list (spec) vs. the shipped
   Active/Archive toggle. The toggle is arguably better UX at scale — confirm which wins.
6. **Rejected domains: record or block-list?** This spec treats rejection as a log; a
   user could resubmit the same domain. Should resubmission be blocked outright?
7. **Rank gate is UI-only.** `isLimitedRank` is a client-side denylist of three rank
   names; the header requirement is "≥ 400 points". Should this become a points check
   enforced in RLS on `marketplace_items` insert? (Also: the denylist and the points
   thresholds in `pointsService.ts:69` can drift apart.)
8. **Reference-code backfill.** Do existing live listings get codes retroactively (month
   of `created_at`, or all in the migration month)?
9. **Public note vs. public remark.** §2/§3 say the remark "can update the existing field
   in the banknote details". Today `public_remark` (listing) and `publicNote` (collection
   item) are separate, with the card falling back from one to the other. Should saving a
   remark write through to the collection item's public note?
10. **Guest access to the item detail page.** Clicking a marketplace card currently
    requires login (`AuthRequiredDialog`); the PDF's §9 describes the image-click →
    detail-page flow with no login mention, and §8b gates only *messaging* for guests.
    Keep the login wall on details, or open the detail page and gate messaging only?
11. **§6c email cadence.** The PDF says a *daily* update of the pending count; this spec
    sends only on days with `N > 0` to avoid "0 pending" noise. Confirm.

---

## 14. Explicitly out of scope (per the PDF's own list)

1. Creating a listing *from inside* the Marketplace (collection-item edit stays the only
   entry point).
2. User-initiated item deletion.
3. Marking a user as Dealer / Auction house (title-based selling rights, bypassing the
   points gate).
4. SEO: marking marketplace items as for-sale offers (structured data).
