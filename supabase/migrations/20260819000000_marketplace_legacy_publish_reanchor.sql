-- Legacy listings must not be archived by a rule they predate.
--
-- 20260816000000 backfilled published_at = created_at for listings that were
-- already live, so every pre-rev150 buy-now inherited a publish date months or
-- years in the past. The nightly sweep (20260816000200) then applied spec §10
-- -- "a buy-now archives half a year after publishing" -- retroactively and
-- swept the entire live marketplace into Archive on 2026-08-17 03:15 UTC.
--
-- Fix: treat those listings as published on the day the rule shipped
-- (2026-08-16), so their six months start there instead of at creation, and
-- clear the archived_at the sweep stamped on them. Only unsold buy-now
-- listings are touched -- an old auction past its date, or an old listing sold
-- more than a week ago, is archived for reasons that still hold.
--
-- published_at is re-anchored with one-second offsets ordered by created_at so
-- the marketplace's newest-published-first ordering survives unchanged.

with legacy as (
  select id,
         row_number() over (order by created_at) as n
    from public.marketplace_items
   where listing_type = 'sale'
     and coalesce(is_sold, false) = false
     and status = 'Available'
     and published_at is not null
     and published_at < timestamptz '2026-08-16 00:00:00+00'
)
update public.marketplace_items mi
   set published_at = timestamptz '2026-08-16 00:00:00+00' + (legacy.n * interval '1 second'),
       archived_at  = null
  from legacy
 where mi.id = legacy.id;
