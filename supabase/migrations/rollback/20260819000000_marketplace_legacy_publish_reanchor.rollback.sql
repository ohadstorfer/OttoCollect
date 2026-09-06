-- Undo the legacy re-anchor: put published_at back on created_at and restore
-- the archived_at stamp the 2026-08-17 sweep had written.
update public.marketplace_items
   set published_at = created_at,
       archived_at  = timestamptz '2026-08-17 03:15:00+00'
 where listing_type = 'sale'
   and coalesce(is_sold, false) = false
   and status = 'Available'
   and published_at >= timestamptz '2026-08-16 00:00:00+00'
   and published_at <  timestamptz '2026-08-16 01:00:00+00'
   and created_at   <  timestamptz '2026-08-16 00:00:00+00';
