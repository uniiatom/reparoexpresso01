-- Corrige bug de backend encontrado na auditoria da Fase 6 (ver /MIGRATION.md):
-- as Edge Functions sendExtraChargesRequest / approveExtraCharges /
-- rejectExtraCharges leem e escrevem service_requests.extra_charges, mas
-- essa coluna nunca foi criada em nenhuma migration — as 3 functions
-- quebram sempre que chamadas. As 3 concordam no mesmo formato:
-- { status, provider_id, material_total, labor_total, extra_charges_total,
--   new_total, requested_at, items, labor, photos, approved_at/rejected_at,
--   rejection_notes }
-- então a coluna é só isso, sem ambiguidade de schema.

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS extra_charges jsonb;
