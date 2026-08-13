-- Auditoria completa das Edge Functions (2026-08-12, sessão nova) encontrou
-- .update()/.insert() referenciando colunas que não existem no schema real
-- (ver MIGRATION.md seção 0.1). Este arquivo restaura as colunas cujo uso é
-- claro e não-ambíguo (ao contrário dos itens adiados na seção 0):
--
-- 1) service_requests: o webhook do Stripe (stripeWebhook) grava status de
--    pagamento de cartão nessas 3 colunas desde sempre — sem elas, o
--    `.update()` inteiro falha (silenciosamente, erro não checado) e nem
--    `final_price` era gravado quando um pagamento por cartão era concluído.
alter table public.service_requests
  add column if not exists payment_status text,
  add column if not exists payment_session_id text,
  add column if not exists payment_completed_at timestamptz;

-- 2) providers: espelha `clients.terms_accepted_at` (já existe e já é usado
--    no cadastro do cliente) para o mesmo fluxo de aceite de termos do lado
--    prestador (acceptProviderTerms, ainda não ligado no app novo, mas
--    presente no legado e na function).
alter table public.providers
  add column if not exists terms_accepted_at timestamptz;

-- 3) provider_notifications: só tinha paridade parcial com
--    client_notifications (que já tem service_id/service_number). Várias
--    functions (approveExtraCharges, rejectExtraCharges,
--    notifyExtraChargesRejected, approveServiceEstimate) já tentavam gravar
--    service_id — sem a coluna, o insert falhava e a notificação nunca era
--    criada.
alter table public.provider_notifications
  add column if not exists service_id uuid references public.service_requests(id) on delete set null,
  add column if not exists service_number text;
