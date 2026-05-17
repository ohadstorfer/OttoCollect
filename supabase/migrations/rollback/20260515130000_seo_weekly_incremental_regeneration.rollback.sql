-- Rollback for 20260515130000_seo_weekly_incremental_regeneration.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-incremental-banknote-regeneration') THEN
    PERFORM cron.unschedule('weekly-incremental-banknote-regeneration');
  END IF;
END $$;
