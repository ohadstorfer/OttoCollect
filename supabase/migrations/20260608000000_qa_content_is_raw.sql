-- Raw-HTML guide entries: when true, `content` (and its _en/_ar/_tr variants)
-- holds a complete, self-contained HTML document that is rendered verbatim
-- (sandboxed iframe for humans; served as the page for bots) instead of going
-- through the rich-text renderer.
ALTER TABLE public.qa_entries
  ADD COLUMN IF NOT EXISTS content_is_raw boolean NOT NULL DEFAULT false;
