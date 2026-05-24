-- Catálogo de serviços prestados (admin → cliente + prestador)

CREATE TABLE IF NOT EXISTS public.offered_service_field_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'number', 'textarea', 'boolean', 'select')),
  placeholder text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offered_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  average_price numeric(10,2),
  estimated_duration_minutes integer,
  image_url text,
  service_group text NOT NULL DEFAULT 'casa'
    CHECK (service_group IN ('casa', 'veiculo')),
  icon_key text,
  extra_field_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offered_services_group_active_idx
  ON public.offered_services (service_group, is_active, sort_order);

DROP TRIGGER IF EXISTS offered_service_field_templates_updated_at ON public.offered_service_field_templates;
CREATE TRIGGER offered_service_field_templates_updated_at
  BEFORE UPDATE ON public.offered_service_field_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS offered_services_updated_at ON public.offered_services;
CREATE TRIGGER offered_services_updated_at
  BEFORE UPDATE ON public.offered_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.offered_service_field_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offered_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offered_service_field_templates_select ON public.offered_service_field_templates;
CREATE POLICY offered_service_field_templates_select ON public.offered_service_field_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS offered_service_field_templates_admin ON public.offered_service_field_templates;
CREATE POLICY offered_service_field_templates_admin ON public.offered_service_field_templates
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS offered_services_select ON public.offered_services;
CREATE POLICY offered_services_select ON public.offered_services
  FOR SELECT TO authenticated USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS offered_services_admin ON public.offered_services;
CREATE POLICY offered_services_admin ON public.offered_services
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Campos padrão iniciais
INSERT INTO public.offered_service_field_templates (field_key, field_label, field_type, placeholder, sort_order)
VALUES
  ('garantia_dias', 'Garantia (dias)', 'number', 'Ex: 90', 1),
  ('inclui_material', 'Inclui material?', 'boolean', NULL, 2),
  ('observacoes', 'Observações para o cliente', 'textarea', 'Detalhes visíveis ao solicitar', 3)
ON CONFLICT (field_key) DO NOTHING;

-- Seed inicial a partir do catálogo legado
INSERT INTO public.offered_services (slug, name, service_group, icon_key, sort_order, average_price, estimated_duration_minutes)
VALUES
  ('eletrica', 'Elétrica', 'casa', 'Zap', 1, 120, 90),
  ('hidraulica', 'Hidráulica', 'casa', 'Droplets', 2, 130, 90),
  ('reparo_geral', 'Reparo Geral', 'casa', 'Wrench', 3, 100, 120),
  ('fechadura', 'Fechadura', 'casa', 'Lock', 4, 90, 60),
  ('ar_condicionado', 'Ar Condicionado', 'casa', 'Wind', 5, 180, 120),
  ('limpeza_caixa_dagua', 'Limpeza Caixa d''Água', 'casa', 'Droplets', 6, 200, 180),
  ('instalacao_suporte_tv', 'Suporte de TV', 'casa', 'Monitor', 7, 150, 90),
  ('desentupimento', 'Desentupimento', 'casa', 'Droplets', 8, 160, 120),
  ('outros', 'Outros', 'casa', 'Wrench', 9, 100, 120),
  ('troca_pneu', 'Troca de Pneu', 'veiculo', 'Car', 10, 80, 45),
  ('recarga_bateria', 'Recarga de Bateria', 'veiculo', 'Battery', 11, 70, 30),
  ('conserto_pneu', 'Conserto de Pneu', 'veiculo', 'Car', 12, 60, 45),
  ('reboque', 'Reboque', 'veiculo', 'Car', 13, 250, 60),
  ('pane_seca', 'Pane Seca', 'veiculo', 'Power', 14, 90, 45)
ON CONFLICT (slug) DO NOTHING;
