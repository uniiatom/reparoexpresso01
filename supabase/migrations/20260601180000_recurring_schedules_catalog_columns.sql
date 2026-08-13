-- `recurring_service_schedules` ainda usava `service_type` (texto livre) do
-- catálogo antigo. O cron `processRecurringServices` insere a OS resultante
-- em `service_requests`, que exige `profession_id` (NOT NULL) — sem essa
-- coluna aqui, todo insert falhava e o cron inteiro ficava 100% quebrado
-- (ver MIGRATION.md seção 0.2). App cliente (`recurring_services_screen.dart`)
-- atualizado na mesma sessão pra usar Profession/SubService do catálogo novo.
alter table public.recurring_service_schedules
  add column if not exists profession_id uuid references public.professions(id),
  add column if not exists sub_service_id uuid references public.sub_services(id);
