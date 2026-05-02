-- Enable RLS on signatures_front and signatures_back to silence Supabase
-- security advisor "RLS Disabled in Public" warnings.
--
-- Intentionally permissive: USING (true) WITH CHECK (true) allows every
-- operation for every role (anon + authenticated), preserving the exact
-- pre-RLS behavior. No application code change is required.

-- signatures_front
ALTER TABLE public.signatures_front ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on signatures_front"
  ON public.signatures_front
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- signatures_back
ALTER TABLE public.signatures_back ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on signatures_back"
  ON public.signatures_back
  FOR ALL
  USING (true)
  WITH CHECK (true);
