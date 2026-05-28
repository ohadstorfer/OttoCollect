-- Secure RLS for signatures_front and signatures_back.
--
-- Access path is src/services/stampsService.ts (anon key + the logged-in
-- admin's JWT):
--   * SELECT is public (true) -> fetching never breaks.
--   * INSERT/UPDATE/DELETE restricted to admins via is_super_or_country_admin(),
--     which returns true for Super Admin and any "<Country> Admin" role.
--
-- NOTE: we intentionally do NOT use is_country_admin() here (unlike the
-- tughra_pictures policies). That function references a non-existent
-- country_admins table and throws at runtime; is_super_or_country_admin()
-- already authorizes every admin, so it is both sufficient and robust.
--
-- Defensive: drops any prior permissive "Allow all" policies (from the never
-- applied 20260429221638 migration) so they can't re-open write access, since
-- RLS combines policies with OR.

-- ============ signatures_front ============
ALTER TABLE public.signatures_front ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on signatures_front" ON public.signatures_front;
DROP POLICY IF EXISTS "Anyone can view signatures_front" ON public.signatures_front;
DROP POLICY IF EXISTS "Super/country admins can insert signatures_front" ON public.signatures_front;
DROP POLICY IF EXISTS "Super/country admins can update signatures_front" ON public.signatures_front;
DROP POLICY IF EXISTS "Super/country admins can delete signatures_front" ON public.signatures_front;

CREATE POLICY "Anyone can view signatures_front"
  ON public.signatures_front FOR SELECT
  USING (true);

CREATE POLICY "Super/country admins can insert signatures_front"
  ON public.signatures_front FOR INSERT
  WITH CHECK (is_super_or_country_admin());

CREATE POLICY "Super/country admins can update signatures_front"
  ON public.signatures_front FOR UPDATE
  USING (is_super_or_country_admin());

CREATE POLICY "Super/country admins can delete signatures_front"
  ON public.signatures_front FOR DELETE
  USING (is_super_or_country_admin());

-- ============ signatures_back ============
ALTER TABLE public.signatures_back ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on signatures_back" ON public.signatures_back;
DROP POLICY IF EXISTS "Anyone can view signatures_back" ON public.signatures_back;
DROP POLICY IF EXISTS "Super/country admins can insert signatures_back" ON public.signatures_back;
DROP POLICY IF EXISTS "Super/country admins can update signatures_back" ON public.signatures_back;
DROP POLICY IF EXISTS "Super/country admins can delete signatures_back" ON public.signatures_back;

CREATE POLICY "Anyone can view signatures_back"
  ON public.signatures_back FOR SELECT
  USING (true);

CREATE POLICY "Super/country admins can insert signatures_back"
  ON public.signatures_back FOR INSERT
  WITH CHECK (is_super_or_country_admin());

CREATE POLICY "Super/country admins can update signatures_back"
  ON public.signatures_back FOR UPDATE
  USING (is_super_or_country_admin());

CREATE POLICY "Super/country admins can delete signatures_back"
  ON public.signatures_back FOR DELETE
  USING (is_super_or_country_admin());
