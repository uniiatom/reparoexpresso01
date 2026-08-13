-- Histórico de transição de status de OS, pra alimentar as métricas de
-- tempo médio (aceite/chegada/execução) do admin (ver /MIGRATION.md, Fase 6).
-- Capturado via trigger em vez de escrito pela aplicação porque o app do
-- prestador atualiza `service_requests.status` com um UPDATE direto (RLS
-- libera pro dono da OS já atribuída) — um trigger é o único jeito de
-- capturar toda transição sem depender de todo call site lembrar de gravar.

CREATE TABLE IF NOT EXISTS public.service_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_status_transitions_request_idx
  ON public.service_status_transitions (service_request_id);

ALTER TABLE public.service_status_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_status_transitions_staff ON public.service_status_transitions;
CREATE POLICY service_status_transitions_staff ON public.service_status_transitions
  FOR SELECT USING (public.is_staff());

-- Cliente dono da OS ou prestador atribuído também podem ler o histórico
-- da própria OS (ex.: métricas de tempo médio no app do prestador) — mesmo
-- critério de dono usado em `service_requests_select`.
DROP POLICY IF EXISTS service_status_transitions_owner ON public.service_status_transitions;
CREATE POLICY service_status_transitions_owner ON public.service_status_transitions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_status_transitions.service_request_id
        AND (
          sr.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.providers p
            WHERE p.id = sr.provider_id AND p.user_id = auth.uid()
          )
        )
    )
  );

-- SECURITY DEFINER: cliente/prestador não têm INSERT em
-- service_status_transitions via RLS, mas o UPDATE deles em
-- service_requests precisa disparar o registro mesmo assim.
CREATE OR REPLACE FUNCTION public.record_service_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.service_status_transitions (service_request_id, from_status, to_status)
    VALUES (NEW.id, OLD.status::text, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_status_transition ON public.service_requests;
CREATE TRIGGER service_requests_status_transition
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.record_service_status_transition();
