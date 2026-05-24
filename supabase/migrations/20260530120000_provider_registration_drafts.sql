-- Rascunhos do formulário de cadastro de prestador (admin / auto-cadastro)

CREATE TABLE IF NOT EXISTS public.provider_registration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  context text NOT NULL DEFAULT 'admin'
    CHECK (context IN ('admin', 'self')),
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, context)
);

CREATE INDEX IF NOT EXISTS provider_registration_drafts_owner_idx
  ON public.provider_registration_drafts (owner_id, updated_at DESC);

DROP TRIGGER IF EXISTS provider_registration_drafts_updated_at ON public.provider_registration_drafts;
CREATE TRIGGER provider_registration_drafts_updated_at
  BEFORE UPDATE ON public.provider_registration_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.provider_registration_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_registration_drafts_own ON public.provider_registration_drafts;
CREATE POLICY provider_registration_drafts_own ON public.provider_registration_drafts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());
