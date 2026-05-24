# Configuração dos Cron Jobs (automações)

Os jobs já foram criados pela migration `20260526130000_cron_edge_functions.sql`.
Falta **apenas um passo manual** para eles funcionarem: guardar a chave `service_role` no Vault.

## Por que isso é necessário?

Os cron jobs rodam dentro do banco Postgres e precisam chamar as Edge Functions com permissão de administrador. A chave `service_role` nunca deve ir no código — fica guardada no **Supabase Vault**.

## Passo único (SQL Editor)

1. Abra o [SQL Editor](https://supabase.com/dashboard/project/sedvqswypuhpiglnilxk/sql/new) do projeto.
2. Vá em **Project Settings → API** e copie a chave **`service_role`** (secret).
3. Execute (substituindo `SUA_SERVICE_ROLE_KEY`):

```sql
-- Só precisa rodar uma vez
SELECT vault.create_secret(
  'SUA_SERVICE_ROLE_KEY',
  'service_role_key',
  'Chave service_role para cron jobs invocarem Edge Functions'
);
```

> Se o secret já existir, use `vault.update_secret` ou apague o antigo no Dashboard → Database → Vault.

## Jobs agendados

| Job | Horário (Brasília) | Função |
|-----|-------------------|--------|
| `re_send_service_reminders_24h` | Todo dia 08:00 | Lembretes de serviços amanhã |
| `re_process_recurring_services` | Todo dia 03:00 | Cria serviços recorrentes |
| `re_check_expiring_services` | A cada 30 min | Alerta serviços vencendo |
| `re_process_busy_alerts` | A cada 5 min | Expira alertas de ocupação |
| `re_recalc_provider_levels` | Domingo 03:00 | Recalcula nível dos prestadores |
| `re_credit_pending_bonuses` | Todo dia 09:00 | Credita bônus pendentes |

Horários internos do cron usam **UTC** (Brasília = UTC−3).

## Verificar se está funcionando

```sql
-- Listar jobs
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE 're_%';

-- Ver últimas execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

## Opcional: CRON_SECRET

Alternativa ao Vault com service_role — configure `CRON_SECRET` nas Edge Function secrets e passe header `x-cron-secret` nos jobs. O padrão atual usa service_role via Vault (recomendado pelo Supabase).
