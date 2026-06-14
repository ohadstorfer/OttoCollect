-- Credits & Links: a flat, public list of name + URL items.
-- Public read; only Super Admin can write. Public URL is /credits.

CREATE TABLE IF NOT EXISTS public.credit_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  url           text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_links ENABLE ROW LEVEL SECURITY;

-- Public read.
DROP POLICY IF EXISTS "credit_links public read" ON public.credit_links;
CREATE POLICY "credit_links public read"
  ON public.credit_links FOR SELECT USING (true);

-- Super Admin only manage (strict — not country admins).
DROP POLICY IF EXISTS "credit_links super admin write" ON public.credit_links;
CREATE POLICY "credit_links super admin write"
  ON public.credit_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'));
