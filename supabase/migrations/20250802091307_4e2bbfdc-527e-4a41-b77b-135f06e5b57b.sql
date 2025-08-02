-- Add unique constraints for statistics tables to enable ON CONFLICT clauses
ALTER TABLE daily_user_stats ADD CONSTRAINT daily_user_stats_date_key UNIQUE (date);
ALTER TABLE daily_catalog_stats ADD CONSTRAINT daily_catalog_stats_date_country_key UNIQUE (date, country_id);
ALTER TABLE daily_blog_stats ADD CONSTRAINT daily_blog_stats_date_key UNIQUE (date);
ALTER TABLE daily_forum_stats ADD CONSTRAINT daily_forum_stats_date_key UNIQUE (date);