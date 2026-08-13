-- `coupons.service_types`/`surcharge_rules.service_types` guardavam slugs do
-- catálogo antigo (ex. 'eletrica'), que não existe mais desde a
-- reestruturação do schema (ver MIGRATION.md seção 0.1) — o catálogo novo
-- usa `professions`/`sub_services` com UUID próprio (slugs diferentes, ex.
-- 'eletricista'). Isso quebrava o filtro de cupom/acréscimo por tipo de
-- serviço silenciosamente (nunca dava match). Sem dados reais em nenhuma das
-- duas tabelas hoje (confirmado via MCP), então dá pra trocar o modelo sem
-- migração de dados. `service_types` fica na tabela (não usado mais pelo
-- código, mas sem custo em manter) em vez de dropar — reversível se algo
-- externo a este repo ainda depender dela.
alter table public.coupons
  add column if not exists profession_ids uuid[] default '{}'::uuid[];

alter table public.surcharge_rules
  add column if not exists profession_ids uuid[] default '{}'::uuid[];

comment on column public.coupons.service_types is 'Deprecated — usa vocabulário do catálogo antigo. Ver profession_ids.';
comment on column public.surcharge_rules.service_types is 'Deprecated — usa vocabulário do catálogo antigo. Ver profession_ids.';
