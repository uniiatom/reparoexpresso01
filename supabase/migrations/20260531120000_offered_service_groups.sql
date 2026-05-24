-- Grupos customizáveis para serviços prestados (ex.: Casa, Veículo, Empresa…)

CREATE TABLE IF NOT EXISTS public.offered_service_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offered_service_groups_sort_idx
  ON public.offered_service_groups (sort_order, label);

DROP TRIGGER IF EXISTS offered_service_groups_updated_at ON public.offered_service_groups;
CREATE TRIGGER offered_service_groups_updated_at
  BEFORE UPDATE ON public.offered_service_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.offered_service_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offered_service_groups_select ON public.offered_service_groups;
CREATE POLICY offered_service_groups_select ON public.offered_service_groups
  FOR SELECT TO authenticated USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS offered_service_groups_admin ON public.offered_service_groups;
CREATE POLICY offered_service_groups_admin ON public.offered_service_groups
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Permite slugs de grupos definidos pelo admin (remove limite fixo casa/veículo)
ALTER TABLE public.offered_services
  DROP CONSTRAINT IF EXISTS offered_services_service_group_check;

INSERT INTO public.offered_service_groups (slug, label, emoji, sort_order)
VALUES
  ('casa', 'Casa', '🏠', 0),
  ('veiculo', 'Veículo', '🚗', 1)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
