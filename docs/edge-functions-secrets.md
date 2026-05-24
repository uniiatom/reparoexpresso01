# Secrets necessários no painel Supabase (Edge Functions → Secrets)

| Secret | Uso |
|--------|-----|
| `STRIPE_SECRET_KEY` | Checkout Stripe (createCheckoutSession, updateCheckoutWithExtraCharges) |
| `STRIPE_WEBHOOK_SECRET` | Webhook stripeWebhook |
| `APP_BASE_URL` | URLs de retorno do pagamento (ex: `https://seu-dominio.com` ou `http://localhost:3000`) |
| `GOOGLE_MAPS_API_KEY` | getGoogleMapsKey, optimizeRouteV2 |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | sendPushNotification (opcional) |
| `CRON_SECRET` | Jobs agendados (lembretes, recorrência, alertas) |

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo Supabase.

## Funções migradas (Sprint P0–P5)

- P0: pagamentos Stripe/PIX/cupom
- P1: fluxo de serviço (criação, atribuição, conclusão, orçamento)
- P2: cobranças extras
- P3: carteira, termos, CNPJ, gorjeta
- P4: fechamentos admin, rotas, gamificação básica
- P5: automações (push, recorrência, lembretes, níveis prestador, fundo reserva)
- Base: `getGoogleMapsKey`, `generateServicePasswords`, `validateCoupon`, `health`

## Deploy

```bash
pnpm run deploy:functions
```

Ou via Supabase CLI (com projeto linkado):

```bash
supabase functions deploy createCheckoutSession --no-verify-jwt  # apenas stripeWebhook
supabase functions deploy stripeWebhook --no-verify-jwt
```

`stripeWebhook` deve ter JWT desabilitado (webhook externo da Stripe).

## Cron jobs (automações)

Migration `20260526130000_cron_edge_functions.sql` agenda 6 jobs via `pg_cron`.
**Passo manual obrigatório:** guardar `service_role_key` no Vault — instruções em [cron-setup.md](./cron-setup.md).
