-- supabase/migrations/20260816000000_marketplace_rev150_schema.sql
-- Marketplace Rev 1.50: currency, reference codes, PendingUrl status,
-- stored archive, rejected domains, chat email consent, digest bookkeeping.
-- Spec: docs/superpowers/specs/2026-08-16-marketplace-upgrade-rev150-design.md §4

-- §4.1 marketplace_items ------------------------------------------------------
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

-- §4.2 reference-code allocation ---------------------------------------------
create table if not exists public.marketplace_reference_counters (
  prefix      text    not null,          -- 'A' | 'B'
  year        integer not null,
  month       integer not null,
  last_value  integer not null default 0,
  primary key (prefix, year, month)
);

create or replace function public.next_marketplace_reference(p_listing_type text)
returns text language plpgsql security definer set search_path = public as $$
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

grant execute on function public.next_marketplace_reference(text) to authenticated;

-- §4.3 pending_domain_requests: capture sale type + originating listing -------
alter table public.pending_domain_requests
  add column if not exists listing_type text,
  add column if not exists marketplace_item_id uuid references public.marketplace_items(id) on delete set null;

-- §4.4 rejected_domains -------------------------------------------------------
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

drop policy if exists "rejected_domains super admin all" on public.rejected_domains;
create policy "rejected_domains super admin all"
  on public.rejected_domains for all
  using (exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin'))
  with check (exists (select 1 from public.profiles
                      where id = auth.uid() and role = 'Super Admin'));

-- §4.5 profiles: chat email consent ------------------------------------------
alter table public.profiles
  add column if not exists chat_email_consent    boolean not null default false,
  add column if not exists chat_email_consent_at timestamptz;

-- §4.6 chat digest bookkeeping ------------------------------------------------
create table if not exists public.chat_digest_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  sent_at       timestamptz not null default now(),
  covered_from  timestamptz not null,
  covered_to    timestamptz not null,
  message_count integer not null
);
create index if not exists chat_digest_runs_user_sent_idx
  on public.chat_digest_runs (user_id, sent_at desc);

alter table public.chat_digest_runs enable row level security;
-- Written only by the service-role digest job; users may read their own rows.
drop policy if exists "chat_digest_runs own read" on public.chat_digest_runs;
create policy "chat_digest_runs own read"
  on public.chat_digest_runs for select using (auth.uid() = user_id);

-- Backfills ------------------------------------------------------------------
-- published_at for already-live listings.
update public.marketplace_items
   set published_at = created_at
 where published_at is null and status in ('Available', 'Sold', 'Reserved');

-- Reference codes month-by-month from created_at (plan decision Q8).
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
