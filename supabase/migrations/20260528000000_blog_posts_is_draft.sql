-- Drafts for blog posts.
--
-- Adds an `is_draft` flag on `blog_posts` so authors can save work without
-- publishing it. Public listing/detail queries (fetchBlogPosts and
-- fetchBlogPostsWithTranslations in blogService.ts) filter on
-- `is_draft = false`; authors load their own drafts separately.
--
-- Default is `false` to preserve the meaning of every existing row
-- (everything that already exists was previously published).

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Speeds up the common "list published posts, newest first" query, which now
-- carries a WHERE on is_draft.
CREATE INDEX IF NOT EXISTS blog_posts_published_created_at_idx
  ON public.blog_posts (created_at DESC)
  WHERE is_draft = false;
