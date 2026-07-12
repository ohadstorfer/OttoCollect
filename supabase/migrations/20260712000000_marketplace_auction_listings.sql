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

-- Drafts are stored as status='Draft'; widen the existing status check.
alter table public.marketplace_items
  drop constraint if exists valid_status;
alter table public.marketplace_items
  add constraint valid_status
  check (status in ('Available', 'Reserved', 'Sold', 'Draft'));
