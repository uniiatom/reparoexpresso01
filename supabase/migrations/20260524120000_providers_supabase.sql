-- Prestadores, disponibilidade e configurações — migração Base44 → Supabase

CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  birth_date date,
  cpf text,
  rg text,
  photo_url text,
  photo_body_url text,
  photo_url_pending text,
  photo_body_url_pending text,
  photos_pending_review boolean NOT NULL DEFAULT false,
  qualifications text,
  service_hourly_rates_json text,
  specialties text[] NOT NULL DEFAULT '{}',
  bio text,
  experience_years integer NOT NULL DEFAULT 0,
  address text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  coverage_regions text[] NOT NULL DEFAULT '{}',
  latitude double precision,
  longitude double precision,
  is_online boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  is_rejected boolean NOT NULL DEFAULT false,
  rejection_reason text,
  rejected_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  blocked_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 5,
  total_reviews integer NOT NULL DEFAULT 0,
  total_jobs integer NOT NULL DEFAULT 0,
  cnh_url text,
  cnh_expiry date,
  cnh_status text NOT NULL DEFAULT 'pendente',
  cnh_rejection_reason text,
  crlv_url text,
  crlv_expiry date,
  crlv_status text NOT NULL DEFAULT 'pendente',
  crlv_rejection_reason text,
  cnpj text,
  cnpj_url text,
  cnpj_status text NOT NULL DEFAULT 'nao_enviado',
  cnpj_rejection_reason text,
  background_check_url text,
  background_check_status text NOT NULL DEFAULT 'nao_enviado',
  background_check_rejection_reason text,
  push_subscription text,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  max_slots_per_day integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  required_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_user_id_idx ON public.providers (user_id);
CREATE INDEX IF NOT EXISTS providers_is_approved_idx ON public.providers (is_approved);
CREATE INDEX IF NOT EXISTS providers_is_online_idx ON public.providers (is_online);
CREATE INDEX IF NOT EXISTS provider_availability_provider_id_idx ON public.provider_availability (provider_id);
CREATE INDEX IF NOT EXISTS provider_unavailability_provider_id_idx ON public.provider_unavailability (provider_id);

DROP TRIGGER IF EXISTS providers_updated_at ON public.providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS provider_availability_updated_at ON public.provider_availability;
CREATE TRIGGER provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS provider_config_updated_at ON public.provider_config;
CREATE TRIGGER provider_config_updated_at
  BEFORE UPDATE ON public.provider_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;

-- providers
DROP POLICY IF EXISTS providers_select ON public.providers;
CREATE POLICY providers_select ON public.providers
  FOR SELECT USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (is_approved = true AND is_blocked = false AND is_rejected = false)
  );

DROP POLICY IF EXISTS providers_insert ON public.providers;
CREATE POLICY providers_insert ON public.providers
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS providers_update ON public.providers;
CREATE POLICY providers_update ON public.providers
  FOR UPDATE USING (
    public.is_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS providers_delete ON public.providers;
CREATE POLICY providers_delete ON public.providers
  FOR DELETE USING (public.is_admin());

-- provider_availability
DROP POLICY IF EXISTS provider_availability_select ON public.provider_availability;
CREATE POLICY provider_availability_select ON public.provider_availability
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND (p.user_id = auth.uid() OR p.is_approved = true)
    )
  );

DROP POLICY IF EXISTS provider_availability_write ON public.provider_availability;
CREATE POLICY provider_availability_write ON public.provider_availability
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND p.user_id = auth.uid()
    )
  );

-- provider_unavailability
DROP POLICY IF EXISTS provider_unavailability_select ON public.provider_unavailability;
CREATE POLICY provider_unavailability_select ON public.provider_unavailability
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id
        AND (p.user_id = auth.uid() OR p.is_approved = true)
    )
  );

DROP POLICY IF EXISTS provider_unavailability_write ON public.provider_unavailability;
CREATE POLICY provider_unavailability_write ON public.provider_unavailability
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND p.user_id = auth.uid()
    )
  );

-- provider_config (admin gerencia; leitura autenticada para formulário)
DROP POLICY IF EXISTS provider_config_select ON public.provider_config;
CREATE POLICY provider_config_select ON public.provider_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS provider_config_write ON public.provider_config;
CREATE POLICY provider_config_write ON public.provider_config
  FOR ALL USING (public.is_admin());

-- qualifications
DROP POLICY IF EXISTS qualifications_select ON public.qualifications;
CREATE POLICY qualifications_select ON public.qualifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS qualifications_write ON public.qualifications;
CREATE POLICY qualifications_write ON public.qualifications
  FOR ALL USING (public.is_admin());

INSERT INTO public.provider_config (required_fields)
SELECT '{}'::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.provider_config);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.providers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
