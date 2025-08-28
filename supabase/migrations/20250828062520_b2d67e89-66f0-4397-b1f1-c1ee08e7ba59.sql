-- Ensure country-admin role is created per country on insert
-- Function runs as security definer to bypass RLS and permission issues
CREATE OR REPLACE FUNCTION public.create_country_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
  -- Create or update a '<country> Admin' role entry
  IF NOT EXISTS (
    SELECT 1 FROM public.roles r WHERE r.name = NEW.name || ' Admin'
  ) THEN
    INSERT INTO public.roles (name, is_country_admin)
    VALUES (NEW.name || ' Admin', TRUE);
  ELSE
    UPDATE public.roles
    SET is_country_admin = TRUE
    WHERE name = NEW.name || ' Admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger to be safe and idempotent
DROP TRIGGER IF EXISTS trg_create_country_admin_role ON public.countries;
CREATE TRIGGER trg_create_country_admin_role
AFTER INSERT ON public.countries
FOR EACH ROW
EXECUTE FUNCTION public.create_country_admin_role();

-- Optional: allow calling directly if ever needed
GRANT EXECUTE ON FUNCTION public.create_country_admin_role() TO authenticated;