
-- 1) Helper trigger functions

CREATE OR REPLACE FUNCTION public.invalidate_name_translations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    IF NEW.name_ar IS NOT DISTINCT FROM OLD.name_ar THEN
      NEW.name_ar := NULL;
    END IF;
    IF NEW.name_tr IS NOT DISTINCT FROM OLD.name_tr THEN
      NEW.name_tr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_title_translations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    IF NEW.title_ar IS NOT DISTINCT FROM OLD.title_ar THEN
      NEW.title_ar := NULL;
    END IF;
    IF NEW.title_tr IS NOT DISTINCT FROM OLD.title_tr THEN
      NEW.title_tr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_content_translations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    IF NEW.content_ar IS NOT DISTINCT FROM OLD.content_ar THEN
      NEW.content_ar := NULL;
    END IF;
    IF NEW.content_tr IS NOT DISTINCT FROM OLD.content_tr THEN
      NEW.content_tr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_excerpt_translations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.excerpt IS DISTINCT FROM OLD.excerpt THEN
    IF NEW.excerpt_ar IS NOT DISTINCT FROM OLD.excerpt_ar THEN
      NEW.excerpt_ar := NULL;
    END IF;
    IF NEW.excerpt_tr IS NOT DISTINCT FROM OLD.excerpt_tr THEN
      NEW.excerpt_tr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_about_translations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.about IS DISTINCT FROM OLD.about THEN
    IF NEW.about_ar IS NOT DISTINCT FROM OLD.about_ar THEN
      NEW.about_ar := NULL;
    END IF;
    IF NEW.about_tr IS NOT DISTINCT FROM OLD.about_tr THEN
      NEW.about_tr := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Attach BEFORE UPDATE triggers to tables
-- We guard each table with to_regclass() checks so this migration is safe
-- even if some optional tables are not present in the schema.

-- Helper: create a trigger safely if table exists
DO $$
BEGIN
  -- countries (name)
  IF to_regclass('public.countries') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_countries') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_countries ON public.countries';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_countries
      BEFORE UPDATE ON public.countries
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- banknote_category_definitions (name)
  IF to_regclass('public.banknote_category_definitions') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_bcd') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_bcd ON public.banknote_category_definitions';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_bcd
      BEFORE UPDATE ON public.banknote_category_definitions
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- banknote_sort_options (name)
  IF to_regclass('public.banknote_sort_options') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_bso') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_bso ON public.banknote_sort_options';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_bso
      BEFORE UPDATE ON public.banknote_sort_options
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- banknote_type_definitions (name)
  IF to_regclass('public.banknote_type_definitions') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_btd') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_btd ON public.banknote_type_definitions';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_btd
      BEFORE UPDATE ON public.banknote_type_definitions
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- currencies (name)
  IF to_regclass('public.currencies') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_currencies') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_currencies ON public.currencies';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_currencies
      BEFORE UPDATE ON public.currencies
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- roles (name)
  IF to_regclass('public.roles') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_roles') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_roles ON public.roles';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_roles
      BEFORE UPDATE ON public.roles
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- seal_pictures (name)
  IF to_regclass('public.seal_pictures') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_seal_pics') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_seal_pics ON public.seal_pictures';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_seal_pics
      BEFORE UPDATE ON public.seal_pictures
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- signatures_back (name)
  IF to_regclass('public.signatures_back') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_sig_back') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_sig_back ON public.signatures_back';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_sig_back
      BEFORE UPDATE ON public.signatures_back
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- signatures_front (name)
  IF to_regclass('public.signatures_front') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_sig_front') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_sig_front ON public.signatures_front';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_sig_front
      BEFORE UPDATE ON public.signatures_front
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- sultan_order (name)
  IF to_regclass('public.sultan_order') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_sultan_order') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_sultan_order ON public.sultan_order';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_sultan_order
      BEFORE UPDATE ON public.sultan_order
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- tughra_pictures (name)
  IF to_regclass('public.tughra_pictures') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_tughra_pics') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_tughra_pics ON public.tughra_pictures';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_tughra_pics
      BEFORE UPDATE ON public.tughra_pictures
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- watermark_pictures (name)
  IF to_regclass('public.watermark_pictures') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_name_translations_watermark_pics') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_name_translations_watermark_pics ON public.watermark_pictures';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_name_translations_watermark_pics
      BEFORE UPDATE ON public.watermark_pictures
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_name_translations()';
  END IF;

  -- blog_posts (title, content, excerpt)
  IF to_regclass('public.blog_posts') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_title_translations_blog_posts') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_title_translations_blog_posts ON public.blog_posts';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_title_translations_blog_posts
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_title_translations()';

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_blog_posts') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_blog_posts ON public.blog_posts';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_blog_posts
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_excerpt_translations_blog_posts') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_excerpt_translations_blog_posts ON public.blog_posts';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_excerpt_translations_blog_posts
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_excerpt_translations()';
  END IF;

  -- blog_comments (content)
  IF to_regclass('public.blog_comments') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_blog_comments') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_blog_comments ON public.blog_comments';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_blog_comments
      BEFORE UPDATE ON public.blog_comments
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- forum_posts (title, content)
  IF to_regclass('public.forum_posts') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_title_translations_forum_posts') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_title_translations_forum_posts ON public.forum_posts';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_title_translations_forum_posts
      BEFORE UPDATE ON public.forum_posts
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_title_translations()';

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_forum_posts') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_forum_posts ON public.forum_posts';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_forum_posts
      BEFORE UPDATE ON public.forum_posts
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- forum_comments (content)
  IF to_regclass('public.forum_comments') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_forum_comments') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_forum_comments ON public.forum_comments';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_forum_comments
      BEFORE UPDATE ON public.forum_comments
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- forum_announcements (title, content)
  IF to_regclass('public.forum_announcements') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_title_translations_forum_announcements') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_title_translations_forum_announcements ON public.forum_announcements';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_title_translations_forum_announcements
      BEFORE UPDATE ON public.forum_announcements
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_title_translations()';

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_forum_announcements') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_forum_announcements ON public.forum_announcements';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_forum_announcements
      BEFORE UPDATE ON public.forum_announcements
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- forum_announcement_comments (content)
  IF to_regclass('public.forum_announcement_comments') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_forum_announcement_comments') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_forum_announcement_comments ON public.forum_announcement_comments';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_forum_announcement_comments
      BEFORE UPDATE ON public.forum_announcement_comments
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- messages (content)
  IF to_regclass('public.messages') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_content_translations_messages') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_content_translations_messages ON public.messages';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_content_translations_messages
      BEFORE UPDATE ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_content_translations()';
  END IF;

  -- profiles (about)
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invalidate_about_translations_profiles') THEN
      EXECUTE 'DROP TRIGGER trg_invalidate_about_translations_profiles ON public.profiles';
    END IF;
    EXECUTE 'CREATE TRIGGER trg_invalidate_about_translations_profiles
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_about_translations()';
  END IF;
END
$$;
