-- Agendamento de Edge Functions via pg_cron + pg_net
-- Requer secrets no Vault: project_url (auto) e service_role_key (manual — ver docs/cron-setup.md)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.invoke_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, pg_catalog
AS $$
DECLARE
  base_url text;
  svc_key text;
BEGIN
  SELECT decrypted_secret INTO base_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF base_url IS NULL OR svc_key IS NULL THEN
    RAISE WARNING 'Cron: configure vault secrets project_url e service_role_key (ver docs/cron-setup.md)';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := payload
  );
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_edge_function(text, jsonb) FROM PUBLIC;

-- URL do projeto (público)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret(
      'https://sedvqswypuhpiglnilxk.supabase.co',
      'project_url',
      'URL base do projeto Supabase para cron jobs'
    );
  END IF;
END $$;

-- Remove jobs antigos com mesmo prefixo (idempotente)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname LIKE 're_%' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- Lembrete de serviços agendados — todo dia às 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  're_send_service_reminders_24h',
  '0 11 * * *',
  $$ SELECT private.invoke_edge_function('sendServiceReminders24h'); $$
);

-- Serviços recorrentes — todo dia às 03:00 BRT (06:00 UTC)
SELECT cron.schedule(
  're_process_recurring_services',
  '0 6 * * *',
  $$ SELECT private.invoke_edge_function('processRecurringServices'); $$
);

-- Serviços vencendo em 2h — a cada 30 minutos
SELECT cron.schedule(
  're_check_expiring_services',
  '*/30 * * * *',
  $$ SELECT private.invoke_edge_function('checkExpiringServices'); $$
);

-- Alertas de ocupação — a cada 5 minutos
SELECT cron.schedule(
  're_process_busy_alerts',
  '*/5 * * * *',
  $$ SELECT private.invoke_edge_function('processBusyAlerts'); $$
);

-- Recalcular níveis dos prestadores — domingo 03:00 BRT (06:00 UTC)
SELECT cron.schedule(
  're_recalc_provider_levels',
  '0 6 * * 0',
  $$ SELECT private.invoke_edge_function('recalcAllProviderLevels'); $$
);

-- Creditar bônus pendentes — todo dia às 09:00 BRT (12:00 UTC)
SELECT cron.schedule(
  're_credit_pending_bonuses',
  '0 12 * * *',
  $$ SELECT private.invoke_edge_function('creditAllPendingBonuses'); $$
);
