-- Campos fiscais adicionais para cadastro CNPJ do prestador
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS company_fantasy_name text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS address_proof_url text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS legal_rep_id_url text;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS fiscal_data_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS fiscal_data_verified_at timestamptz;

-- clients: aceite de termos (se ainda não existir)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
