-- Allow updates to translation fields for blog_posts safely
-- 1) Trigger function to restrict non-authors from changing non-translation columns
CREATE OR REPLACE FUNCTION public.prevent_non_translation_updates_blog_posts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow authors and admins to update anything
  IF auth.uid() = NEW.author_id OR public.is_super_or_country_admin() THEN
    RETURN NEW;
  END IF;

  -- For others, ensure only translation fields are modified
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.content IS DISTINCT FROM OLD.content)
     OR (NEW.excerpt IS DISTINCT FROM OLD.excerpt)
     OR (NEW.main_image_url IS DISTINCT FROM OLD.main_image_url)
     OR (NEW.author_id IS DISTINCT FROM OLD.author_id)
     OR (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Only translation fields can be updated by non-authors';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Attach trigger to blog_posts
DROP TRIGGER IF EXISTS trg_prevent_non_translation_updates_blog_posts ON public.blog_posts;
CREATE TRIGGER trg_prevent_non_translation_updates_blog_posts
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_translation_updates_blog_posts();

-- 3) RLS policy: allow updates (trigger enforces column restrictions)
DROP POLICY IF EXISTS "Anyone can update blog_post translations" ON public.blog_posts;
CREATE POLICY "Anyone can update blog_post translations"
ON public.blog_posts
FOR UPDATE
USING (true)
WITH CHECK (true);
