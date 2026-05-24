-- ============================================================
-- ÉPICO 1: Sistema de Locais de Atuação (Service Zones)
-- Adaptado do módulo Admin/Zonas — order-oven-route
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Função de normalização (sem acento, minúsculo, só alfanumérico)
CREATE OR REPLACE FUNCTION normalize_zone_text(_input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(unaccent(trim(_input)), '[^a-z0-9]', '', 'g'));
$$;

-- ── Cidades ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zone_cities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  name_norm           text NOT NULL,
  state               text,
  active              boolean NOT NULL DEFAULT true,
  deliver_whole_city  boolean NOT NULL DEFAULT false,
  -- Taxa de deslocamento quando deliver_whole_city = true
  city_delivery_fee   numeric,
  -- Tempo estimado de chegada (minutos)
  city_eta_minutes    integer,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name_norm)
);

-- ── Bairros ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zone_neighborhoods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id             uuid NOT NULL REFERENCES public.zone_cities(id) ON DELETE CASCADE,
  name                text NOT NULL,
  name_norm           text NOT NULL,
  -- Taxa de deslocamento (null = usa city_delivery_fee como fallback)
  delivery_fee        numeric,
  -- Tempo estimado
  eta_minutes         integer,
  -- Permite atendimento imediato (mesmo dia)
  allow_immediate     boolean NOT NULL DEFAULT true,
  -- Permite agendamento futuro
  allow_scheduled     boolean NOT NULL DEFAULT true,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, name_norm)
);

-- ── Blocklist ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zone_blocklist (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope               text NOT NULL CHECK (scope IN ('city', 'neighborhood')),
  city_id             uuid REFERENCES public.zone_cities(id) ON DELETE CASCADE,
  neighborhood_id     uuid REFERENCES public.zone_neighborhoods(id) ON DELETE CASCADE,
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Chamados de cobertura ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_coverage_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           uuid,
  customer_name         text,
  customer_phone        text,
  city_input            text NOT NULL,
  neighborhood_input    text NOT NULL,
  full_address          text,
  cep                   text,
  service_type          text,
  notes                 text,
  status                text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz
);

-- ── Triggers: name_norm automático ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_zone_name_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.name_norm := normalize_zone_text(NEW.name);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zone_cities_norm ON public.zone_cities;
CREATE TRIGGER trg_zone_cities_norm
  BEFORE INSERT OR UPDATE ON public.zone_cities
  FOR EACH ROW EXECUTE FUNCTION set_zone_name_norm();

DROP TRIGGER IF EXISTS trg_zone_neighborhoods_norm ON public.zone_neighborhoods;
CREATE TRIGGER trg_zone_neighborhoods_norm
  BEFORE INSERT OR UPDATE ON public.zone_neighborhoods
  FOR EACH ROW EXECUTE FUNCTION set_zone_name_norm();

-- ── RPC: suggest_zones ────────────────────────────────────────────────────────
-- Autocomplete fuzzy: retorna cidades ou bairros que batem com a query
CREATE OR REPLACE FUNCTION public.suggest_zones(
  _query      text,
  _scope      text DEFAULT 'city',
  _city_id    uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, name text, parent_name text, similarity float4)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  _norm text := normalize_zone_text(_query);
BEGIN
  IF _scope = 'city' THEN
    RETURN QUERY
      SELECT c.id, c.name, NULL::text,
             similarity(c.name_norm, _norm)
      FROM public.zone_cities c
      WHERE c.active = true
        AND (c.name_norm LIKE '%' || _norm || '%'
             OR similarity(c.name_norm, _norm) > 0.1)
      ORDER BY similarity(c.name_norm, _norm) DESC, c.name
      LIMIT 10;
  ELSE
    RETURN QUERY
      SELECT n.id, n.name, c.name,
             similarity(n.name_norm, _norm)
      FROM public.zone_neighborhoods n
      JOIN public.zone_cities c ON c.id = n.city_id
      WHERE n.active = true
        AND (_city_id IS NULL OR n.city_id = _city_id)
        AND (n.name_norm LIKE '%' || _norm || '%'
             OR similarity(n.name_norm, _norm) > 0.1)
      ORDER BY similarity(n.name_norm, _norm) DESC, n.name
      LIMIT 15;
  END IF;
END;
$$;

-- ── RPC: check_service_coverage ──────────────────────────────────────────────
-- Verifica se atendemos em cidade + bairro. Retorna cobertura, bloqueio e taxa.
CREATE OR REPLACE FUNCTION public.check_service_coverage(
  _city           text,
  _neighborhood   text,
  _order_type     text DEFAULT 'immediate'  -- 'immediate' | 'scheduled'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  _city_norm  text := normalize_zone_text(_city);
  _neigh_norm text := normalize_zone_text(_neighborhood);
  _city_row   public.zone_cities%ROWTYPE;
  _neigh_row  public.zone_neighborhoods%ROWTYPE;
  _block_row  public.zone_blocklist%ROWTYPE;
BEGIN
  -- 1. Busca cidade
  SELECT * INTO _city_row
  FROM public.zone_cities
  WHERE name_norm = _city_norm AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('covered', false, 'blocked', false, 'reason', 'city_not_found');
  END IF;

  -- 2. Verifica blocklist de cidade
  SELECT * INTO _block_row
  FROM public.zone_blocklist
  WHERE scope = 'city' AND city_id = _city_row.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('covered', false, 'blocked', true,
      'reason', COALESCE(_block_row.reason, 'city_blocked'));
  END IF;

  -- 3. deliver_whole_city = true → coberto mesmo sem bairro cadastrado
  IF _city_row.deliver_whole_city THEN
    RETURN jsonb_build_object(
      'covered', true, 'blocked', false,
      'city_id', _city_row.id,
      'fee', _city_row.city_delivery_fee,
      'eta', _city_row.city_eta_minutes,
      'source', 'whole_city'
    );
  END IF;

  -- 4. Busca bairro
  SELECT * INTO _neigh_row
  FROM public.zone_neighborhoods
  WHERE city_id = _city_row.id AND name_norm = _neigh_norm AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('covered', false, 'blocked', false, 'reason', 'neighborhood_not_found',
      'city_id', _city_row.id);
  END IF;

  -- 5. Verifica blocklist de bairro
  SELECT * INTO _block_row
  FROM public.zone_blocklist
  WHERE scope = 'neighborhood' AND neighborhood_id = _neigh_row.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('covered', false, 'blocked', true,
      'reason', COALESCE(_block_row.reason, 'neighborhood_blocked'));
  END IF;

  -- 6. Verifica tipo de atendimento
  IF _order_type = 'immediate' AND NOT _neigh_row.allow_immediate THEN
    RETURN jsonb_build_object('covered', false, 'blocked', false,
      'reason', 'immediate_not_allowed', 'city_id', _city_row.id, 'neighborhood_id', _neigh_row.id);
  END IF;

  IF _order_type = 'scheduled' AND NOT _neigh_row.allow_scheduled THEN
    RETURN jsonb_build_object('covered', false, 'blocked', false,
      'reason', 'scheduled_not_allowed', 'city_id', _city_row.id, 'neighborhood_id', _neigh_row.id);
  END IF;

  -- 7. Coberto!
  RETURN jsonb_build_object(
    'covered', true, 'blocked', false,
    'city_id', _city_row.id,
    'neighborhood_id', _neigh_row.id,
    'fee', COALESCE(_neigh_row.delivery_fee, _city_row.city_delivery_fee),
    'eta', COALESCE(_neigh_row.eta_minutes, _city_row.city_eta_minutes),
    'source', 'neighborhood'
  );
END;
$$;

-- ── RPC: auto_register_neighborhood ──────────────────────────────────────────
-- Cria bairro automaticamente quando cidade tem deliver_whole_city = true
-- SECURITY DEFINER porque clientes não têm INSERT em zone_neighborhoods
CREATE OR REPLACE FUNCTION public.auto_register_neighborhood(
  _city_id            uuid,
  _neighborhood_name  text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _norm text := normalize_zone_text(_neighborhood_name);
  _id   uuid;
BEGIN
  -- Se já existe, retorna o id existente
  SELECT id INTO _id
  FROM public.zone_neighborhoods
  WHERE city_id = _city_id AND name_norm = _norm;

  IF FOUND THEN RETURN _id; END IF;

  INSERT INTO public.zone_neighborhoods (city_id, name, active, allow_immediate, allow_scheduled)
  VALUES (_city_id, _neighborhood_name, true, true, true)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_zone_cities_name_norm         ON public.zone_cities(name_norm);
CREATE INDEX IF NOT EXISTS idx_zone_cities_active            ON public.zone_cities(active);
CREATE INDEX IF NOT EXISTS idx_zone_neighborhoods_city       ON public.zone_neighborhoods(city_id);
CREATE INDEX IF NOT EXISTS idx_zone_neighborhoods_name_norm  ON public.zone_neighborhoods(city_id, name_norm);
CREATE INDEX IF NOT EXISTS idx_zone_neighborhoods_active     ON public.zone_neighborhoods(active);
CREATE INDEX IF NOT EXISTS idx_service_coverage_status       ON public.service_coverage_requests(status);
CREATE INDEX IF NOT EXISTS idx_zone_cities_trgm              ON public.zone_cities USING gin(name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_zone_neighborhoods_trgm       ON public.zone_neighborhoods USING gin(name_norm gin_trgm_ops);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.zone_cities                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_neighborhoods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_blocklist               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_coverage_requests    ENABLE ROW LEVEL SECURITY;

-- Leitura pública (zonas ativas)
CREATE POLICY IF NOT EXISTS "zone_cities_read_public"
  ON public.zone_cities FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "zone_neighborhoods_read_public"
  ON public.zone_neighborhoods FOR SELECT USING (true);

-- Escrita: apenas admin (service_role ou função admin no JWT)
-- Ajuste conforme sua configuração de roles
CREATE POLICY IF NOT EXISTS "zone_cities_admin_all"
  ON public.zone_cities FOR ALL
  USING (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin');

CREATE POLICY IF NOT EXISTS "zone_neighborhoods_admin_all"
  ON public.zone_neighborhoods FOR ALL
  USING (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin');

CREATE POLICY IF NOT EXISTS "zone_blocklist_admin_all"
  ON public.zone_blocklist FOR ALL
  USING (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin')
  WITH CHECK (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin');

-- Chamados: qualquer autenticado pode inserir; admin gerencia
CREATE POLICY IF NOT EXISTS "coverage_requests_insert_authenticated"
  ON public.service_coverage_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "coverage_requests_admin_all"
  ON public.service_coverage_requests FOR ALL
  USING (auth.role() = 'service_role' OR (auth.jwt()->>'role')::text = 'admin');
