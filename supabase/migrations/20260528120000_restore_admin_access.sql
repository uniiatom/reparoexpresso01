-- Restaura papéis administrativos e corrige RLS de profiles
-- (a migração full_base44 reaplicou políticas recursivas que quebram o admin)

-- ─── Funções de papel (SECURITY DEFINER, sem recursão) ───────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_attendant()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'attendant'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'provider'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR public.is_attendant();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_attendant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ─── RLS profiles: usa is_admin()/is_staff(), não subquery recursiva ───
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS profiles_staff_select ON public.profiles;
CREATE POLICY profiles_staff_select ON public.profiles
  FOR SELECT USING (public.is_attendant());

-- ─── Restaurar administradores conhecidos ───────────────────
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN (
  'selvomichael@gmail.com',
  'reparoexpressooficial@gmail.com'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'admin'::public.app_role,
  updated_at = now();

UPDATE public.profiles
SET role = 'admin'::public.app_role, updated_at = now()
WHERE lower(email) IN (
  'selvomichael@gmail.com',
  'reparoexpressooficial@gmail.com'
);

-- ─── Novos usuários: não rebaixar admin/atendente existente ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user'::public.app_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    role = CASE
      WHEN public.profiles.role IN ('admin'::public.app_role, 'attendant'::public.app_role)
      THEN public.profiles.role
      ELSE EXCLUDED.role
    END,
    updated_at = now();
  RETURN NEW;
END;
$$;
