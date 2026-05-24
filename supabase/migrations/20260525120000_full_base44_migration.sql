-- Migração completa Base44 → Supabase: expande OS + cria todas as entidades restantes

-- ─── Helpers de papel ───────────────────────────────────────
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

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR public.is_attendant();
$$;

GRANT EXECUTE ON FUNCTION public.is_attendant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ─── Expandir service_requests (campos Base44) ──────────────
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS service_number text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS client_suggested_price numeric,
  ADD COLUMN IF NOT EXISTS problem_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS client_latitude double precision,
  ADD COLUMN IF NOT EXISTS client_longitude double precision,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_number text,
  ADD COLUMN IF NOT EXISTS delivery_neighborhood text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_state text,
  ADD COLUMN IF NOT EXISTS delivery_cep text,
  ADD COLUMN IF NOT EXISTS delivery_latitude double precision,
  ADD COLUMN IF NOT EXISTS delivery_longitude double precision,
  ADD COLUMN IF NOT EXISTS tow_distance_km numeric,
  ADD COLUMN IF NOT EXISTS modality text NOT NULL DEFAULT 'imediato',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'agora',
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS provider_phone text,
  ADD COLUMN IF NOT EXISTS provider_latitude double precision,
  ADD COLUMN IF NOT EXISTS provider_longitude double precision,
  ADD COLUMN IF NOT EXISTS estimated_arrival_minutes integer,
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS final_price numeric,
  ADD COLUMN IF NOT EXISTS coupon_id uuid,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric,
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS night_surcharge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekend_surcharge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_surcharge boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_client numeric,
  ADD COLUMN IF NOT EXISTS rating_comment text,
  ADD COLUMN IF NOT EXISTS security_password text,
  ADD COLUMN IF NOT EXISTS validation_password text,
  ADD COLUMN IF NOT EXISTS passwords_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS additional_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist jsonb,
  ADD COLUMN IF NOT EXISTS parts_return_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS tech_visit_reason text,
  ADD COLUMN IF NOT EXISTS warranty_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_status text NOT NULL DEFAULT 'ativa';

CREATE INDEX IF NOT EXISTS service_requests_provider_id_idx ON public.service_requests (provider_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests (status);
CREATE INDEX IF NOT EXISTS service_requests_created_by_idx ON public.service_requests (created_by);
CREATE INDEX IF NOT EXISTS service_requests_scheduled_date_idx ON public.service_requests (scheduled_date);

-- RLS service_requests (prestador vê/atualiza OS atribuídas)
DROP POLICY IF EXISTS service_requests_select ON public.service_requests;
CREATE POLICY service_requests_select ON public.service_requests
  FOR SELECT USING (
    client_id = auth.uid()
    OR public.is_staff()
    OR (public.is_provider() AND status = 'aguardando'::public.service_request_status)
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = service_requests.provider_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_requests_insert ON public.service_requests;
CREATE POLICY service_requests_insert ON public.service_requests
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS service_requests_update_own ON public.service_requests;
CREATE POLICY service_requests_update ON public.service_requests
  FOR UPDATE USING (
    client_id = auth.uid()
    OR public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = service_requests.provider_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS service_requests_admin_all ON public.service_requests;
CREATE POLICY service_requests_admin_all ON public.service_requests
  FOR ALL USING (public.is_admin());

-- ─── clients ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  cpf text,
  birth_date date,
  photo_url text,
  referral_code text,
  addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_blacklisted boolean NOT NULL DEFAULT false,
  blacklist_reason text,
  blacklisted_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS clients_referral_code_idx ON public.clients (referral_code);

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── tickets + mensagens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  client_name text,
  client_email text,
  provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  provider_name text,
  provider_email text,
  type text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  service_request_id uuid REFERENCES public.service_requests (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'aberto',
  priority text NOT NULL DEFAULT 'media',
  attendant_name text,
  attendant_login text,
  internal_notes text,
  response text,
  responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  sender_name text,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
  sender_role text,
  sender_name text,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── catálogo e preços ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL,
  zone text,
  city text,
  state text,
  price_min numeric,
  price_max numeric,
  ticket_medio numeric,
  note text,
  repasse_value numeric,
  repasse_percent numeric,
  repasse_percent_ticket numeric,
  repasse_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text,
  name text NOT NULL,
  description text,
  unit_price numeric,
  unit text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.service_requests (id) ON DELETE SET NULL,
  service_number text,
  event_type text,
  actor_type text,
  actor_name text,
  previous_price numeric,
  new_price numeric,
  extra_charges_total numeric,
  reason text,
  notes text,
  status text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.surcharge_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text,
  days_of_week integer[],
  time_start text,
  time_end text,
  surcharge_percent numeric,
  applies_to_all_services boolean NOT NULL DEFAULT true,
  service_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── cupons ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  min_amount numeric,
  max_discount_amount numeric,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  service_types text[] NOT NULL DEFAULT '{}',
  applicable_to_providers uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── carteiras ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL,
  owner_name text,
  owner_email text,
  balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  pix_key text,
  pix_key_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets (id) ON DELETE SET NULL,
  owner_id uuid,
  owner_type text,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric,
  description text,
  reference_id uuid,
  reference_type text,
  status text NOT NULL DEFAULT 'pending',
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets (id) ON DELETE SET NULL,
  owner_id uuid,
  owner_name text,
  amount numeric NOT NULL,
  reason text,
  related_coupon_code text,
  related_service_request_id uuid,
  validation_status text,
  validated_by text,
  validated_at timestamptz,
  is_used boolean NOT NULL DEFAULT false,
  used_on_service_id uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── cashback ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cashbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL,
  owner_name text,
  service_request_id uuid,
  service_type text,
  service_value numeric,
  cashback_amount numeric,
  cashback_percent numeric,
  reason text,
  status text NOT NULL DEFAULT 'disponivel',
  expires_at timestamptz,
  used_at timestamptz,
  used_in_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cashback_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text,
  nivel text,
  owner_type text,
  min_jobs integer,
  max_jobs integer,
  min_rating numeric,
  min_amigos integer,
  max_amigos integer,
  bonus_fixo numeric,
  percent_take numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── social / fidelidade ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  client_email text,
  provider_id uuid NOT NULL REFERENCES public.providers (id) ON DELETE CASCADE,
  provider_name text,
  provider_photo_url text,
  provider_rating numeric,
  provider_city text,
  provider_state text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referral_code text NOT NULL,
  reward_status text NOT NULL DEFAULT 'pendente',
  referred_client_id uuid,
  service_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid,
  provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  service_request_id uuid REFERENCES public.service_requests (id) ON DELETE SET NULL,
  client_id uuid,
  client_name text,
  overall_rating numeric,
  punctuality_rating numeric,
  quality_rating numeric,
  behavior_rating numeric,
  comment text,
  service_description text,
  review_photos text[] NOT NULL DEFAULT '{}',
  is_detailed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'bronze',
  total_points integer NOT NULL DEFAULT 0,
  available_points integer NOT NULL DEFAULT 0,
  used_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  type text NOT NULL,
  points integer NOT NULL,
  description text,
  reference_type text,
  balance_after integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── notificações ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  client_email text,
  type text,
  title text,
  message text,
  service_id uuid,
  service_number text,
  provider_name text,
  extra_total numeric,
  new_total numeric,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers (id) ON DELETE CASCADE,
  provider_email text,
  type text,
  title text,
  message text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── alertas e agendamentos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.busy_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text,
  client_phone text,
  service_type text,
  service_description text,
  client_latitude double precision,
  client_longitude double precision,
  client_address text,
  status text NOT NULL DEFAULT 'aguardando',
  notified_provider_ids uuid[] NOT NULL DEFAULT '{}',
  responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_service_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  client_name text,
  client_phone text,
  service_type text,
  description text,
  address text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  recurrence_pattern text,
  start_date date,
  end_date date,
  next_service_date date,
  last_service_date date,
  last_service_request_id uuid,
  client_suggested_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  total_occurrences_created integer NOT NULL DEFAULT 0,
  notes text,
  preferred_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.preventive_service_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  client_name text,
  service_type text,
  last_service_date date,
  next_reminder_date date,
  reminder_interval_days integer,
  reminder_interval_label text,
  is_active boolean NOT NULL DEFAULT true,
  reminder_sent boolean NOT NULL DEFAULT false,
  reminder_sent_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── financeiro prestador ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  provider_name text,
  invoice_number text,
  file_url text,
  amount numeric,
  issue_date date,
  description text,
  status text NOT NULL DEFAULT 'pendente',
  received_date timestamptz,
  paid_date timestamptz,
  low_date timestamptz,
  payment_method text,
  payment_proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.biweekly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  provider_name text,
  period_start date,
  period_end date,
  period_label text,
  total_services integer NOT NULL DEFAULT 0,
  gross_amount numeric NOT NULL DEFAULT 0,
  reserve_fund_deduction numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  invoice_id uuid,
  service_ids uuid[] NOT NULL DEFAULT '{}',
  payment_proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reserve_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers (id) ON DELETE SET NULL,
  provider_name text,
  total_accumulated numeric NOT NULL DEFAULT 0,
  blocked_amount numeric NOT NULL DEFAULT 0,
  available_amount numeric NOT NULL DEFAULT 0,
  debited_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  last_service_date timestamptz,
  termination_request_date timestamptz,
  termination_approval_date timestamptz,
  pix_sent_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reserve_fund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_fund_id uuid REFERENCES public.reserve_funds (id) ON DELETE SET NULL,
  provider_id uuid,
  service_request_id uuid,
  type text,
  amount numeric,
  service_value numeric,
  retention_percentage numeric,
  blocked_until timestamptz,
  reason text,
  related_complaint_id uuid,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── gamificação ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  category text,
  requirement_type text,
  requirement_value numeric,
  visibility_bonus numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers (id) ON DELETE CASCADE,
  provider_name text,
  level integer NOT NULL DEFAULT 1,
  total_jobs_completed integer NOT NULL DEFAULT 0,
  average_rating numeric NOT NULL DEFAULT 5,
  achievements_unlocked text[] NOT NULL DEFAULT '{}',
  visibility_bonus_percent numeric NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  level_up_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers (id) ON DELETE CASCADE,
  provider_name text,
  nivel_anterior text,
  nivel_novo text,
  direcao text,
  total_jobs_na_mudanca integer,
  rating_na_mudanca numeric,
  bonus_anterior numeric,
  bonus_novo numeric,
  mudanca_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  min_jobs integer,
  min_rating numeric,
  min_punctuality numeric,
  bonus_1st numeric,
  bonus_2nd numeric,
  bonus_3rd numeric,
  bonus_released boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  released_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bonus_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text,
  goal_id uuid,
  provider_id uuid,
  provider_name text,
  rank integer,
  score numeric,
  jobs_completed integer,
  avg_rating numeric,
  avg_punctuality numeric,
  bonus_amount numeric,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES public.service_requests (id) ON DELETE SET NULL,
  respondent_type text,
  respondent_id uuid,
  respondent_name text,
  quality_rating numeric,
  punctuality_rating numeric,
  service_rating numeric,
  comment text,
  recommended boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── admin / marketplace legado ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_name text,
  actor_email text,
  entity_type text,
  entity_id uuid,
  entity_label text,
  old_value text,
  new_value text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  cnpj text,
  company_name text,
  partner_type text,
  address text,
  city text,
  state text,
  description text,
  products_services text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  description text,
  slug text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  photo_url text,
  category_id uuid,
  category_name text,
  description text,
  city text,
  rating numeric NOT NULL DEFAULT 5,
  total_reviews integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  hourly_rate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text,
  client_email text,
  client_phone text,
  category_id uuid,
  category_name text,
  professional_id uuid,
  professional_name text,
  description text,
  city text,
  state text,
  preferred_date date,
  budget text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Triggers updated_at ────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tickets', 'ticket_messages', 'service_pricing', 'service_parts',
    'surcharge_rules', 'coupons', 'wallets', 'wallet_transactions', 'wallet_bonuses',
    'cashbacks', 'cashback_configs', 'referrals', 'reviews', 'customer_loyalty',
    'client_notifications', 'provider_notifications', 'busy_alerts',
    'recurring_service_schedules', 'preventive_service_reminders',
    'invoices', 'biweekly_closings', 'reserve_funds',
    'provider_achievements', 'monthly_goals', 'partners', 'professionals', 'quote_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ─── RLS genérico ───────────────────────────────────────────
DO $$
DECLARE
  tbl text;
  staff_tables text[] := ARRAY[
    'tickets', 'ticket_messages', 'admin_activity_logs', 'busy_alerts',
    'biweekly_closings', 'invoices', 'reserve_funds', 'reserve_fund_transactions',
    'bonus_releases', 'monthly_goals', 'satisfaction_surveys'
  ];
  read_all_tables text[] := ARRAY[
    'service_pricing', 'service_parts', 'surcharge_rules', 'achievements',
    'service_categories', 'cashback_configs', 'coupons'
  ];
BEGIN
  -- staff tables
  FOREACH tbl IN ARRAY staff_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_staff ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_staff ON public.%I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())',
      tbl, tbl
    );
  END LOOP;

  -- read-all authenticated, write admin
  FOREACH tbl IN ARRAY read_all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_admin ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', tbl, tbl);
  END LOOP;

  -- owner-based tables (políticas explícitas)
  ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS clients_access ON public.clients;
  CREATE POLICY clients_access ON public.clients FOR ALL TO authenticated
    USING (public.is_staff() OR user_id = auth.uid())
    WITH CHECK (public.is_staff() OR user_id = auth.uid());

  ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS favorites_access ON public.favorites;
  CREATE POLICY favorites_access ON public.favorites FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS referrals_access ON public.referrals;
  CREATE POLICY referrals_access ON public.referrals FOR ALL TO authenticated
    USING (public.is_staff() OR referrer_id = auth.uid())
    WITH CHECK (public.is_staff() OR referrer_id = auth.uid());

  ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS reviews_access ON public.reviews;
  CREATE POLICY reviews_access ON public.reviews FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS customer_loyalty_access ON public.customer_loyalty;
  CREATE POLICY customer_loyalty_access ON public.customer_loyalty FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS loyalty_transactions_access ON public.loyalty_transactions;
  CREATE POLICY loyalty_transactions_access ON public.loyalty_transactions FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS client_notifications_access ON public.client_notifications;
  CREATE POLICY client_notifications_access ON public.client_notifications FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.recurring_service_schedules ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS recurring_service_schedules_access ON public.recurring_service_schedules;
  CREATE POLICY recurring_service_schedules_access ON public.recurring_service_schedules FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.preventive_service_reminders ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS preventive_service_reminders_access ON public.preventive_service_reminders;
  CREATE POLICY preventive_service_reminders_access ON public.preventive_service_reminders FOR ALL TO authenticated
    USING (public.is_staff() OR client_id = auth.uid())
    WITH CHECK (public.is_staff() OR client_id = auth.uid());

  ALTER TABLE public.cashbacks ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS cashbacks_access ON public.cashbacks;
  CREATE POLICY cashbacks_access ON public.cashbacks FOR ALL TO authenticated
    USING (public.is_staff() OR owner_id = auth.uid())
    WITH CHECK (public.is_staff() OR owner_id = auth.uid());

  ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS wallets_access ON public.wallets;
  CREATE POLICY wallets_access ON public.wallets FOR ALL TO authenticated
    USING (public.is_staff() OR owner_id = auth.uid())
    WITH CHECK (public.is_staff() OR owner_id = auth.uid());

  ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS wallet_transactions_access ON public.wallet_transactions;
  CREATE POLICY wallet_transactions_access ON public.wallet_transactions FOR ALL TO authenticated
    USING (public.is_staff() OR owner_id = auth.uid())
    WITH CHECK (public.is_staff() OR owner_id = auth.uid());

  ALTER TABLE public.wallet_bonuses ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS wallet_bonuses_access ON public.wallet_bonuses;
  CREATE POLICY wallet_bonuses_access ON public.wallet_bonuses FOR ALL TO authenticated
    USING (public.is_staff() OR owner_id = auth.uid())
    WITH CHECK (public.is_staff() OR owner_id = auth.uid());

  ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS partners_access ON public.partners;
  CREATE POLICY partners_access ON public.partners FOR ALL TO authenticated
    USING (public.is_staff() OR user_id = auth.uid())
    WITH CHECK (public.is_staff() OR user_id = auth.uid());

  ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS quote_requests_access ON public.quote_requests;
  CREATE POLICY quote_requests_access ON public.quote_requests FOR ALL TO authenticated
    USING (public.is_staff() OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (public.is_staff() OR client_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

  -- provider notifications
  ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS provider_notifications_access ON public.provider_notifications;
  CREATE POLICY provider_notifications_access ON public.provider_notifications
    FOR ALL TO authenticated USING (
      public.is_staff()
      OR EXISTS (
        SELECT 1 FROM public.providers p
        WHERE p.id = provider_notifications.provider_id AND p.user_id = auth.uid()
      )
    );

  -- provider achievements / level history
  ALTER TABLE public.provider_achievements ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS provider_achievements_select ON public.provider_achievements;
  CREATE POLICY provider_achievements_select ON public.provider_achievements
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS provider_achievements_admin ON public.provider_achievements;
  CREATE POLICY provider_achievements_admin ON public.provider_achievements
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

  ALTER TABLE public.provider_level_history ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS provider_level_history_select ON public.provider_level_history;
  CREATE POLICY provider_level_history_select ON public.provider_level_history
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS provider_level_history_admin ON public.provider_level_history;
  CREATE POLICY provider_level_history_admin ON public.provider_level_history
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

  -- professionals marketplace (public read)
  ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS professionals_select ON public.professionals;
  CREATE POLICY professionals_select ON public.professionals
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS professionals_admin ON public.professionals;
  CREATE POLICY professionals_admin ON public.professionals
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

  -- service_price_history
  ALTER TABLE public.service_price_history ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS service_price_history_select ON public.service_price_history;
  CREATE POLICY service_price_history_select ON public.service_price_history
    FOR SELECT TO authenticated USING (true);
  DROP POLICY IF EXISTS service_price_history_write ON public.service_price_history;
  CREATE POLICY service_price_history_write ON public.service_price_history
    FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

  -- chat_messages via service_requests ownership
  ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS chat_messages_access ON public.chat_messages;
  CREATE POLICY chat_messages_access ON public.chat_messages
    FOR ALL TO authenticated USING (
      public.is_staff()
      OR EXISTS (
        SELECT 1 FROM public.service_requests sr
        WHERE sr.id = chat_messages.request_id
          AND (sr.client_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.id = sr.provider_id AND p.user_id = auth.uid()
          ))
      )
    );
END $$;

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_price_history;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.busy_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
