-- Nightly marketplace archive sweep (spec §9 / PDF §10).
-- Stamps archived_at on listings whose archive condition has passed:
--   * auction: 7 days after auction_at
--   * buy-now: 7 days after being marked sold
--   * buy-now: 6 months after publishing, sold or not
-- The client keeps a read-time derivation as fallback, so nothing depends on
-- this having run — it just makes archive membership durable.

SELECT cron.schedule(
  'marketplace-archive-sweep',
  '15 3 * * *', -- daily at 03:15 UTC
  $$
  UPDATE public.marketplace_items SET archived_at = now()
  WHERE archived_at IS NULL AND status = 'Available' AND (
       (listing_type = 'auction' AND auction_at IS NOT NULL
        AND auction_at < now() - interval '7 days')
    OR (listing_type = 'sale' AND is_sold AND sold_at IS NOT NULL
        AND sold_at < now() - interval '7 days')
    OR (listing_type = 'sale' AND published_at IS NOT NULL
        AND published_at < now() - interval '6 months')
  );
  $$
);
